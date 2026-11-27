const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    // What the customer types, e.g. "WELCOME10". Always stored in UPPERCASE.
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },

    // "percentage": value 10 = 10% off.   "fixed": value 50 = 50 taka off.
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },

    // Only for "percentage": the discount can never be more than this. null = no cap.
    // Example: 20% off, but max 200 taka.
    maxDiscount: { type: Number, default: null },

    // The cart must be at least this much to use the coupon
    minOrderAmount: { type: Number, default: 0, min: 0 },

    // How many times the coupon can be used by ALL customers together. null = unlimited.
    usageLimit: { type: Number, default: null },
    // How many times it has been used so far (goes down again if an order is cancelled)
    usageCount: { type: Number, default: 0, min: 0 },
    // How many times ONE customer may use it
    perUserLimit: { type: Number, default: 1, min: 1 },

    // Only these products get the discount. Empty = the coupon works on every product.
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    // Valid period. null = no start / no end.
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    // Admin can switch a coupon off without deleting it
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
