const Order = require("../models/Order");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const {
  adminProductsQuerySchema,
  adminUsersQuerySchema,
} = require("../validators/admin.validator");
const sendValidationError = require("../utils/sendValidationError");
const escapeRegex = require("../utils/escapeRegex");
const { round2 } = require("../utils/quantity");
const { ORDER_STATUSES } = require("../constants/order");

// "Today" depends on the time zone. 11pm in Dhaka is already tomorrow in UTC,
// so we do all day calculations in the shop's own time zone.
const TIMEZONE = process.env.TIMEZONE || "Asia/Dhaka";
const DAY_MS = 24 * 60 * 60 * 1000;

// Date -> "2026-11-21" (the day in the shop's time zone)
const dayKey = (date) => date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });

// Same pagination object as everywhere else
const paginationInfo = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

// GET /api/admin/dashboard
// Numbers for the admin home page.
// "sales" = total of all orders that are NOT cancelled.
exports.getDashboard = async (req, res) => {
  const since = new Date(Date.now() - 8 * DAY_MS); // a little extra, we trim below
  const notCancelled = { status: { $ne: "cancelled" } };

  // These queries don't depend on each other, so run them ALL at the same time
  const [daily, byStatus, allTime, customers, activeProducts, lowStock, outOfStock] =
    await Promise.all([
      // Sales per day for the last week
      Order.aggregate([
        { $match: { ...notCancelled, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE },
            },
            orders: { $sum: 1 },
            sales: { $sum: "$total" },
          },
        },
      ]),

      // How many orders are in each status
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

      // Everything since the shop started
      Order.aggregate([
        { $match: notCancelled },
        { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: "$total" } } },
      ]),

      User.countDocuments({ role: "user" }),
      Product.countDocuments({ isActive: true }),

      // low stock: more than 0, but at or below the product's own threshold
      Product.countDocuments({
        isActive: true,
        $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] },
      }),
      Product.countDocuments({ isActive: true, stock: 0 }),
    ]);

  // Build exactly 7 days (oldest first). Days with no orders show as 0, not missing.
  const dailyByDate = new Map(daily.map((d) => [d._id, d]));
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = dayKey(new Date(Date.now() - i * DAY_MS));
    const row = dailyByDate.get(date);
    last7Days.push({ date, orders: row?.orders ?? 0, sales: round2(row?.sales ?? 0) });
  }

  // Every status appears in the result, even with 0 orders
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const row of byStatus) statusCounts[row._id] = row.count;

  res.json({
    success: true,
    dashboard: {
      today: last7Days[6],
      last7Days,
      orderStatus: statusCounts,
      allTime: {
        orders: allTime[0]?.orders ?? 0,
        sales: round2(allTime[0]?.sales ?? 0),
      },
      customers,
      activeProducts,
      inventory: { lowStock, outOfStock },
    },
  });
};

// GET /api/admin/products
// Like the public list, but admin also sees hidden products and can filter by stock.
exports.listProducts = async (req, res) => {
  const result = adminProductsQuerySchema.safeParse(req.query);
  if (!result.success) return sendValidationError(res, result.error);
  const { page, limit, search, category, isActive, stock, sort } = result.data;

  // NO "visibleToCustomers" filter here, so hidden and expired products are included
  const filter = {};

  if (isActive !== undefined) filter.isActive = isActive;

  if (search) {
    const regex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ name: regex }, { sku: regex }];
  }

  if (category) {
    const found = await Category.findOne({ slug: category });
    filter.category = found ? found._id : null; // unknown slug -> matches nothing
  }

  if (stock === "in") filter.stock = { $gt: 0 };
  if (stock === "out") filter.stock = 0;
  if (stock === "low") {
    // Compare two fields of the SAME product, so we need $expr
    filter.$expr = { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] };
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    stock_asc: { stock: 1 }, // lowest stock first: what to restock next
  };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sortOptions[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, products, pagination: paginationInfo(page, limit, total) });
};

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  const result = adminUsersQuerySchema.safeParse(req.query);
  if (!result.success) return sendValidationError(res, result.error);
  const { page, limit, search, role } = result.data;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    // select = send ONLY these fields. The password hash must never leave the server.
    User.find(filter)
      .select("name email role createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, users, pagination: paginationInfo(page, limit, total) });
};
