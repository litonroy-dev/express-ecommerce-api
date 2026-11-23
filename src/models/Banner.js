const mongoose = require("mongoose");

// A slide for the home page hero slider, managed by the admin.
const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: "" },
    image: { type: String, required: true }, // image URL
    // Where the banner goes when clicked, e.g. "/products?category=fresh-vegetables"
    link: { type: String, trim: true, default: "" },
    // Smaller number shows first
    sortOrder: { type: Number, default: 0 },
    // false = hidden from the website
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bannerSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model("Banner", bannerSchema);
