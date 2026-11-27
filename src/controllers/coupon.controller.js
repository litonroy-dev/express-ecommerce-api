const Coupon = require("../models/Coupon");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  listCouponsSchema,
} = require("../validators/coupon.validator");
const sendValidationError = require("../utils/sendValidationError");
const { isVisibleToCustomers } = require("../utils/productVisibility");
const { round2 } = require("../utils/quantity");
const { getCouponError, getEligibleSubtotal, calculateDiscount, calculateTotals } = require("../utils/coupon");

// Rules that involve several fields, so they are checked on the FINAL coupon
// (after an update is applied). Returns an error message or null.
const couponRulesError = (coupon) => {
  if (coupon.type === "percentage" && coupon.value > 100) {
    return "A percentage coupon cannot be more than 100";
  }
  if (coupon.startsAt && coupon.expiresAt && coupon.expiresAt <= coupon.startsAt) {
    return "expiresAt must be after startsAt";
  }
  return null;
};

// ---------------------------------------------------------------- customer

// POST /api/coupons/validate   body: { code }
// A PREVIEW for the cart page: "if I use this code, what will I pay?"
// It does not use up the coupon. The coupon is really used when the order is placed.
exports.validateCoupon = async (req, res) => {
  const result = validateCouponSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  // The coupon is checked against the customer's current cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: "Your cart is empty" });
  }

  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  // The items that can still be bought
  const lines = [];
  for (const item of cart.items) {
    const product = productById.get(item.product.toString());
    if (product && isVisibleToCustomers(product)) {
      lines.push({ product: product._id, lineTotal: round2(product.price * item.quantity) });
    }
  }
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  const coupon = await Coupon.findOne({ code: result.data.code });
  // If the coupon is limited to some products, only those items count
  const eligibleSubtotal = getEligibleSubtotal(coupon, lines);
  const problem = await getCouponError(coupon, eligibleSubtotal, req.user._id);
  if (problem) return res.status(400).json({ success: false, message: problem });

  const discount = calculateDiscount(coupon, eligibleSubtotal);

  res.json({
    success: true,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      appliesToAllProducts: coupon.products.length === 0,
    },
    ...calculateTotals(subtotal, discount), // subtotal, discount, shippingFee, total
  });
};

// ------------------------------------------------------------------- admin

// GET /api/admin/coupons
exports.listCoupons = async (req, res) => {
  const result = listCouponsSchema.safeParse(req.query);
  if (!result.success) return sendValidationError(res, result.error);
  const { page, limit, isActive } = result.data;

  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive;

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .populate("products", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Coupon.countDocuments(filter),
  ]);

  res.json({
    success: true,
    coupons,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

// POST /api/admin/coupons
exports.createCoupon = async (req, res) => {
  const result = createCouponSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const coupon = new Coupon(result.data);

  const problem = couponRulesError(coupon);
  if (problem) return res.status(400).json({ success: false, message: problem });

  // Same code twice -> MongoDB error 11000 -> 409 "code already exists" (see app.js)
  await coupon.save();
  await coupon.populate("products", "name");
  res.status(201).json({ success: true, coupon });
};

// PATCH /api/admin/coupons/:id
exports.updateCoupon = async (req, res) => {
  const result = updateCouponSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return res.status(404).json({ success: false, message: "Coupon not found" });
  }

  coupon.set(result.data);

  const problem = couponRulesError(coupon);
  if (problem) return res.status(400).json({ success: false, message: problem });

  await coupon.save();
  await coupon.populate("products", "name");
  res.json({ success: true, coupon });
};

// DELETE /api/admin/coupons/:id
// A coupon that customers already used is kept (switch it off with PATCH isActive:false),
// so the usage numbers stay correct. Only unused coupons are really deleted.
exports.deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return res.status(404).json({ success: false, message: "Coupon not found" });
  }

  if (coupon.usageCount > 0) {
    return res.status(409).json({
      success: false,
      message: "This coupon has been used. Switch it off instead: PATCH { isActive: false }",
    });
  }

  await coupon.deleteOne();
  res.json({ success: true, message: "Coupon deleted" });
};
