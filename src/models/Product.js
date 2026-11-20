const mongoose = require("mongoose");
const UNITS = require("../constants/units");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // URL-friendly name, e.g. "miniket-rice-5kg-a1b2"
    slug: { type: String, required: true, unique: true },

    description: { type: String, default: "" },

    // Points to a document in the "categories" collection.
    // .populate("category") swaps the id for the real category data.
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: String, trim: true },

    // Stock Keeping Unit: your own product code, e.g. "RICE-MIN-5KG".
    // unique + sparse = must be unique, BUT products without a sku are allowed.
    sku: { type: String, unique: true, sparse: true, uppercase: true, trim: true },

    // ---- Price ----
    // "price" is ALWAYS what the customer pays now. Filtering and sorting use this field.
    price: { type: Number, required: true, min: 0 },
    // Optional old price, shown crossed out. Only set it when the product is on discount.
    originalPrice: { type: Number, min: 0 },

    // ---- How it is sold ----
    // Example: unit "g" + unitSize 500 -> "500 g pack".
    unit: { type: String, enum: UNITS, required: true },
    unitSize: { type: Number, default: 1, min: 0 },
    // Smallest quantity a customer can order (0.5 for loose vegetables sold by kg)
    minOrderQty: { type: Number, default: 1, min: 0 },

    // ---- Stock ----
    // Decimal is allowed because loose items are weighed (e.g. 12.5 kg)
    stock: { type: Number, default: 0, min: 0 },
    // When stock falls to this number or lower, the admin should restock
    lowStockThreshold: { type: Number, default: 5, min: 0 },

    // ---- Grocery details ----
    isPerishable: { type: Boolean, default: false }, // milk, eggs, vegetables...
    expiryDate: { type: Date }, // expired products are hidden from customers
    isOrganic: { type: Boolean, default: false },
    origin: { type: String, trim: true }, // e.g. "Dinajpur" or "Imported"

    images: { type: [String], default: [] },

    // false = hidden from customers (like a soft delete) without losing the data
    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    // Include virtual fields (like discountPercent) when we send the product as JSON
    toJSON: { virtuals: true },
  }
);

// Virtual = a field calculated on the fly. It is NOT stored in MongoDB.
// originalPrice 200, price 150 -> 25 (%)
productSchema.virtual("discountPercent").get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Virtual: is the product available to buy right now?
productSchema.virtual("inStock").get(function () {
  return this.stock >= this.minOrderQty;
});

// Indexes make filtering and sorting fast when there are many products.
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
