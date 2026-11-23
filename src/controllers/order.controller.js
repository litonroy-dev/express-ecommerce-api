const crypto = require("crypto");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Address = require("../models/Address");
const {
  createOrderSchema,
  updateStatusSchema,
  listOrdersSchema,
} = require("../validators/order.validator");
const sendValidationError = require("../utils/sendValidationError");
const { isVisibleToCustomers } = require("../utils/productVisibility");
const { round2, quantityError } = require("../utils/quantity");
const { STATUS_FLOW, CUSTOMER_CANCELLABLE } = require("../constants/order");
const {
  getCouponError,
  calculateDiscount,
  calculateTotals,
  releaseCoupon,
} = require("../utils/coupon");

// "ORD-20261120-4F2A9C": date + 6 random hex characters
const makeOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // 20261120
  return `ORD-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

// Give stock back to the products. Used when an order is cancelled or fails halfway.
// bulkWrite sends all updates to MongoDB in ONE request.
const restockItems = (items) =>
  Product.bulkWrite(
    items.map((item) => ({
      updateOne: { filter: { _id: item.product }, update: { $inc: { stock: item.quantity } } },
    }))
  );

// Pagination helper: builds the same { page, limit, total, totalPages } object everywhere
const paginationInfo = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

// POST /api/orders   (checkout)
exports.createOrder = async (req, res) => {
  const result = createOrderSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  // Step 0: where to deliver. Either typed in, or a saved address (must be MINE).
  let shippingAddress = result.data.shippingAddress;
  if (result.data.addressId) {
    const saved = await Address.findOne({ _id: result.data.addressId, user: req.user._id });
    if (!saved) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }
    // Copy the fields into the order (a snapshot, like the items)
    const { fullName, phone, address, city, area, postalCode } = saved;
    shippingAddress = { fullName, phone, address, city, area, postalCode };
  }

  // Step 1: the order is made from the user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: "Your cart is empty" });
  }

  // Step 2: load the CURRENT product data (one query for all items)
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  // Step 3: check every item and build the order lines.
  // We collect ALL problems first so the customer can fix them in one go.
  const problems = [];
  const orderItems = [];

  for (const item of cart.items) {
    const product = productById.get(item.product.toString());

    if (!product || !isVisibleToCustomers(product)) {
      problems.push({ productId: item.product, message: "This product is no longer available" });
      continue;
    }
    const error = quantityError(product, item.quantity);
    if (error) {
      problems.push({ productId: product._id, name: product.name, message: error });
      continue;
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images[0],
      unit: product.unit,
      unitSize: product.unitSize,
      price: product.price, // frozen price, taken from the DB (never from the client)
      quantity: item.quantity,
      lineTotal: round2(product.price * item.quantity),
    });
  }

  if (problems.length > 0) {
    return res.status(409).json({
      success: false,
      message: "Some items in your cart cannot be ordered",
      problems,
    });
  }

  // Step 4: coupon (optional) and money
  const subtotal = round2(orderItems.reduce((sum, item) => sum + item.lineTotal, 0));

  let coupon = null;
  let discount = 0;
  if (result.data.couponCode) {
    coupon = await Coupon.findOne({ code: result.data.couponCode });
    const couponProblem = await getCouponError(coupon, subtotal, req.user._id);
    if (couponProblem) {
      return res.status(400).json({ success: false, message: couponProblem });
    }
    discount = calculateDiscount(coupon, subtotal);
  }

  // subtotal - discount + shipping fee (the same math as the coupon preview)
  const { shippingFee, total } = calculateTotals(subtotal, discount);

  // Step 5: reduce the stock.
  // The filter { stock: { $gte: quantity } } and the $inc happen as ONE atomic operation.
  // If two customers buy the last item at the same time, only one of them succeeds.
  // modifiedCount 0 means the stock was not enough (someone else got it first).
  const reserved = [];
  for (const item of orderItems) {
    const update = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );

    if (update.modifiedCount === 0) {
      await restockItems(reserved); // undo the items we already took
      return res.status(409).json({
        success: false,
        message: `Sorry, "${item.name}" just went out of stock. Please review your cart.`,
      });
    }
    reserved.push(item);
  }

  // Step 5b: use up one redemption of the coupon.
  // Like the stock, this is ONE atomic operation: the check "usageCount < usageLimit"
  // and the +1 happen together, so the last redemption can't be used by two customers.
  if (coupon) {
    const claimed = await Coupon.updateOne(
      {
        _id: coupon._id,
        isActive: true,
        // usageLimit null = unlimited, otherwise usageCount must still be below it
        $or: [{ usageLimit: null }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }],
      },
      { $inc: { usageCount: 1 } }
    );

    if (claimed.modifiedCount === 0) {
      await restockItems(reserved); // undo the stock we already took
      return res.status(409).json({
        success: false,
        message: "Sorry, this coupon was just fully used. Please try again without it.",
      });
    }
  }

  // Step 6: save the order. If saving fails, give the stock back.
  let order;
  try {
    order = await Order.create({
      orderNumber: makeOrderNumber(),
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: result.data.paymentMethod,
      note: result.data.note,
      subtotal,
      couponCode: coupon?.code,
      discount,
      shippingFee,
      total,
    });
  } catch (err) {
    await restockItems(reserved);
    await releaseCoupon(coupon?.code); // give the coupon use back too
    throw err; // app.js error handler sends the 500
  }

  // Step 7: the cart did its job, empty it
  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
};

// GET /api/orders   (my orders)
exports.listMyOrders = async (req, res) => {
  const result = listOrdersSchema.safeParse(req.query);
  if (!result.success) return sendValidationError(res, result.error);
  const { page, limit, status } = result.data;

  const filter = { user: req.user._id }; // only MY orders
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, orders, pagination: paginationInfo(page, limit, total) });
};

// GET /api/orders/all   (admin: every customer's orders)
exports.listAllOrders = async (req, res) => {
  const result = listOrdersSchema.safeParse(req.query);
  if (!result.success) return sendValidationError(res, result.error);
  const { page, limit, status } = result.data;

  const filter = {};
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email") // show who ordered
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, orders, pagination: paginationInfo(page, limit, total) });
};

// GET /api/orders/:id
exports.getOrder = async (req, res) => {
  const filter = { _id: req.params.id };
  // A customer can open only THEIR order. An admin can open any order.
  if (req.user.role !== "admin") filter.user = req.user._id;

  const order = await Order.findOne(filter);
  // Same 404 for "doesn't exist" and "not yours", so ids of other people's orders stay secret
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  res.json({ success: true, order });
};

// PATCH /api/orders/:id/cancel   (customer cancels their own order)
exports.cancelOrder = async (req, res) => {
  // Check the status AND change it in ONE atomic step. If the customer double-clicks,
  // the second request finds no "pending/confirmed" order, so stock is returned only once.
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: { $in: CUSTOMER_CANCELLABLE } },
    { status: "cancelled" },
    { returnDocument: "after" }
  );

  if (!order) {
    // Find out WHY it failed, to give a useful message
    const exists = await Order.exists({ _id: req.params.id, user: req.user._id });
    return exists
      ? res.status(409).json({ success: false, message: "This order can no longer be cancelled" })
      : res.status(404).json({ success: false, message: "Order not found" });
  }

  await restockItems(order.items);
  await releaseCoupon(order.couponCode); // the customer may use the coupon again
  res.json({ success: true, order });
};

// PATCH /api/orders/:id/status   (admin moves the order forward)
exports.updateOrderStatus = async (req, res) => {
  const result = updateStatusSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);
  const newStatus = result.data.status;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  // Is this change allowed? (see STATUS_FLOW in constants/order.js)
  if (!STATUS_FLOW[order.status].includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: `Cannot change status from "${order.status}" to "${newStatus}"`,
    });
  }

  const changes = { status: newStatus };
  // Cash on delivery: the money is collected when the order is delivered
  if (newStatus === "delivered") changes.paymentStatus = "paid";

  // "status: order.status" makes sure nobody changed it while we were checking
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    changes,
    { returnDocument: "after" }
  );
  if (!updated) {
    return res
      .status(409)
      .json({ success: false, message: "Order was just updated by someone else. Try again." });
  }

  // Admin cancelled it, so the items go back on the shelf
  if (newStatus === "cancelled") {
    await restockItems(updated.items);
    await releaseCoupon(updated.couponCode);
  }

  res.json({ success: true, order: updated });
};
