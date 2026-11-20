const mongoose = require("mongoose");

// One wishlist per user. It only stores product ids.
// Name, price, stock are read from the Product when the wishlist is shown,
// so the customer always sees the latest data.
const wishlistSchema = new mongoose.Schema(
  {
    // unique: every user has exactly ONE wishlist
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);
