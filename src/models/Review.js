const mongoose = require("mongoose");

// One customer's review of one product.
const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true }
);

// A customer can review a product only ONCE (they can edit the review instead).
// This index also protects us if two requests arrive at the same moment.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
// "Show the newest reviews of this product"
reviewSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
