// Life of an order, from first to last
exports.ORDER_STATUSES = [
  "pending", // customer placed the order
  "confirmed", // shop accepted it
  "processing", // packing the items
  "out_for_delivery", // delivery person has it
  "delivered", // customer received it
  "cancelled",
];

// Which status can change to which. Anything not listed here is NOT allowed.
// Example: a "delivered" order can never go back to "pending".
exports.STATUS_FLOW = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

// A customer may cancel only before the shop starts packing
exports.CUSTOMER_CANCELLABLE = ["pending", "confirmed"];

// Only cash on delivery for now. Online payment (bKash, card...) comes later.
exports.PAYMENT_METHODS = ["cod"];

// Delivery charge. Free when the cart total reaches FREE_SHIPPING_OVER.
// (Amounts are in your shop's currency.)
exports.SHIPPING_FEE = 60;
exports.FREE_SHIPPING_OVER = 1000;
