const mongoose = require("mongoose");

// One line in the cart. We store ONLY the product id and the quantity.
// Price, name, stock are read from the Product when the cart is shown,
// so the cart always has the latest price. (The price is frozen later, in the Order.)
const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // Decimal allowed because loose items are sold by weight (0.5 kg)
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false } // items don't need their own id; "product" identifies them
);

const cartSchema = new mongoose.Schema(
  {
    // unique: every user has exactly ONE cart
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
