const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const { round2 } = require("./quantity");
const { SHIPPING_FEE, FREE_SHIPPING_OVER } = require("../constants/order");

// Returns a message explaining why the coupon can't be used, or null if it CAN be used.
// "coupon" may be null (code not found), so that case is handled here too.
exports.getCouponError = async (coupon, subtotal, userId) => {
  const now = new Date();

  // Same message for "doesn't exist" and "switched off", so people can't
  // find out which codes exist by trying many of them.
  if (!coupon || !coupon.isActive) return "Invalid coupon code";

  if (coupon.startsAt && coupon.startsAt > now) return "This coupon is not active yet";
  if (coupon.expiresAt && coupon.expiresAt < now) return "This coupon has expired";

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return "This coupon has reached its usage limit";
  }

  if (subtotal < coupon.minOrderAmount) {
    return `Minimum order amount for this coupon is ${coupon.minOrderAmount}`;
  }

  // How many times has THIS customer already used it? (cancelled orders don't count)
  const timesUsed = await Order.countDocuments({
    user: userId,
    couponCode: coupon.code,
    status: { $ne: "cancelled" },
  });
  if (timesUsed >= coupon.perUserLimit) return "You have already used this coupon";

  return null;
};

// How much money the coupon takes off the subtotal
exports.calculateDiscount = (coupon, subtotal) => {
  let discount =
    coupon.type === "percentage" ? (subtotal * coupon.value) / 100 : coupon.value;

  // Cap for percentage coupons (20% off, but at most 200)
  if (coupon.type === "percentage" && coupon.maxDiscount != null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  // The discount can never be more than the items cost (total must not go negative)
  return round2(Math.min(discount, subtotal));
};

// ONE place that does the money math, used by both the coupon preview and checkout,
// so the customer always sees the same total in both.
// Free shipping is checked AFTER the discount.
exports.calculateTotals = (subtotal, discount) => {
  const afterDiscount = round2(subtotal - discount);
  const shippingFee = afterDiscount >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  return { subtotal, discount, shippingFee, total: round2(afterDiscount + shippingFee) };
};

// Gives one use back (when an order is cancelled or checkout fails halfway)
exports.releaseCoupon = async (code) => {
  if (!code) return;
  await Coupon.updateOne({ code, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
};
