const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // URL-friendly name, e.g. "fresh-vegetables". Used for filtering: /products?category=fresh-vegetables
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    image: { type: String }, // image URL
    // false = hidden from customers
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
