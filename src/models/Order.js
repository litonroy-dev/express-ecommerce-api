const mongoose = require("mongoose");
const UNITS = require("../constants/units");
const { ORDER_STATUSES, PAYMENT_METHODS } = require("../constants/order");

// A line of the order. Unlike the cart, we COPY name, price, etc. into the order
// ("snapshot"). Later the admin may change the price or delete the product,
// but this order must still show what the customer really bought and paid.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String },
    image: { type: String },
    unit: { type: String, enum: UNITS, required: true },
    unitSize: { type: Number },
    price: { type: Number, required: true }, // price per unit AT THE TIME of ordering
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true }, // price * quantity
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }, // house, road, village...
    city: { type: String, required: true },
    area: { type: String },
    postalCode: { type: String },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Human-friendly number to show the customer, e.g. "ORD-20261120-4F2A9C"
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    note: { type: String },

    // ---- Money ----
    subtotal: { type: Number, required: true }, // sum of lineTotals
    shippingFee: { type: Number, required: true },
    total: { type: Number, required: true }, // subtotal + shippingFee

    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cod" },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },

    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
  },
  { timestamps: true }
);

// "Show MY orders, newest first" is the most common query, so index it.
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 }); // admin: filter by status

module.exports = mongoose.model("Order", orderSchema);
