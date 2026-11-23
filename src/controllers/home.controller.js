const Banner = require("../models/Banner");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { visibleToCustomers } = require("../utils/productVisibility");

const SECTION_SIZE = 8; // products per home page section
const BEST_SELLING_DAYS = 30;

const withCategory = (query) => query.populate("category", "name slug");

// Best sellers = products with the most quantity ordered in the last 30 days
// (cancelled orders don't count). Returns products in best-first order.
const getBestSelling = async () => {
  const since = new Date(Date.now() - BEST_SELLING_DAYS * 24 * 60 * 60 * 1000);

  const top = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: since } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", sold: { $sum: "$items.quantity" } } },
    { $sort: { sold: -1 } },
    { $limit: SECTION_SIZE * 3 }, // extra, because some may be hidden or out of stock now
  ]);
  if (top.length === 0) return [];

  const products = await withCategory(
    Product.find({
      _id: { $in: top.map((t) => t._id) },
      stock: { $gt: 0 },
      ...visibleToCustomers(),
    })
  );

  // find() doesn't keep our order, so sort by the sales ranking again
  const rank = new Map(top.map((t, i) => [t._id.toString(), i]));
  return products
    .sort((a, b) => rank.get(a._id.toString()) - rank.get(b._id.toString()))
    .slice(0, SECTION_SIZE);
};

// GET /api/home   (public)
// Everything the home page needs in ONE request, so the page loads fast.
exports.getHome = async (req, res) => {
  // Same rules as the product list, plus "in stock" so the home page doesn't promote
  // things nobody can buy.
  const shelf = { stock: { $gt: 0 }, ...visibleToCustomers() };

  const [banners, categories, featured, newArrivals, deals, bestSelling] = await Promise.all([
    Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }),
    Category.find({ isActive: true }).sort({ name: 1 }),
    withCategory(Product.find({ ...shelf, isFeatured: true }).sort({ createdAt: -1 }).limit(SECTION_SIZE)),
    withCategory(Product.find(shelf).sort({ createdAt: -1 }).limit(SECTION_SIZE)),
    // Deals = products that have an old (crossed out) price higher than the current one
    withCategory(
      Product.find({ ...shelf, $expr: { $gt: ["$originalPrice", "$price"] } })
        .sort({ createdAt: -1 })
        .limit(SECTION_SIZE)
    ),
    getBestSelling(),
  ]);

  res.json({ success: true, banners, categories, featured, newArrivals, deals, bestSelling });
};
