const Product = require("../models/Product");
const Category = require("../models/Category");
const {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
} = require("../validators/product.validator");
const sendValidationError = require("../utils/sendValidationError");
const { uniqueSlug } = require("../utils/slug");
const { visibleToCustomers } = require("../utils/productVisibility");

// Escape special regex characters so user input like "a+b(" can't break the search.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Which category fields we send inside a product (instead of just an id)
const CATEGORY_FIELDS = "name slug";

// Returns true if a category with this id exists. Used before saving a product.
const categoryExists = async (id) => Boolean(await Category.exists({ _id: id }));

// POST /api/products  (admin only)
exports.createProduct = async (req, res) => {
  const result = createProductSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  if (!(await categoryExists(result.data.category))) {
    return res.status(400).json({ success: false, message: "Category not found" });
  }

  const product = await Product.create({
    ...result.data,
    slug: uniqueSlug(result.data.name),
    createdBy: req.user._id, // req.user was set by the protect middleware
  });
  await product.populate("category", CATEGORY_FIELDS);

  res.status(201).json({ success: true, product });
};

// GET /api/products  (public)
// Supports: ?page=1&limit=12&search=rice&category=rice&brand=pran&isOrganic=true
//           &minPrice=10&maxPrice=100&sort=price_asc
exports.listProducts = async (req, res) => {
  const result = listProductsSchema.safeParse(req.query);
  if (!result.success) return sendValidationError(res, result.error);

  const { page, limit, search, category, brand, isOrganic, minPrice, maxPrice, sort } =
    result.data;

  // Step 1: build the MongoDB filter, starting with what customers may see.
  const filter = visibleToCustomers();

  if (search) {
    // "i" = case-insensitive. Matches part of the name too ("ric" finds "Rice").
    filter.name = { $regex: escapeRegex(search), $options: "i" };
  }
  if (category) {
    // The URL has the category slug, but products store the category id. Convert it.
    const found = await Category.findOne({ slug: category });
    // Unknown slug -> null -> matches nothing (category is required on every product)
    filter.category = found ? found._id : null;
  }
  if (brand) filter.brand = brand;
  if (isOrganic !== undefined) filter.isOrganic = isOrganic;

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice; // greater than or equal
    if (maxPrice !== undefined) filter.price.$lte = maxPrice; // less than or equal
  }

  // Step 2: choose the sort order (1 = ascending, -1 = descending)
  const sortOptions = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
  };

  // Step 3: pagination. Page 3 with limit 12 -> skip the first 24 products.
  const skip = (page - 1) * limit;

  // Step 4: run both queries at the same time (faster than one after another)
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", CATEGORY_FIELDS)
      .sort(sortOptions[sort])
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter), // total matches, needed for the page buttons
  ]);

  res.json({
    success: true,
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// GET /api/products/:id  (public)
exports.getProduct = async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    ...visibleToCustomers(),
  }).populate("category", CATEGORY_FIELDS);

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.json({ success: true, product });
};

// PATCH /api/products/:id  (admin only)
// PATCH = partial update: send only the fields you want to change.
exports.updateProduct = async (req, res) => {
  const result = updateProductSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  // Admin can edit hidden (inactive) products too, so no visibleToCustomers() here.
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  if (result.data.category && !(await categoryExists(result.data.category))) {
    return res.status(400).json({ success: false, message: "Category not found" });
  }

  // Apply only the fields that were sent. The slug is NOT changed on purpose,
  // so product links that were already shared keep working.
  product.set(result.data);

  // The zod rule only sees the fields in THIS request, so check the final values again.
  // Example: product price is 100, admin sends originalPrice 80 -> invalid.
  if (product.originalPrice != null && product.originalPrice < product.price) {
    return res.status(400).json({
      success: false,
      message: "originalPrice must be greater than or equal to price",
    });
  }

  await product.save();
  await product.populate("category", CATEGORY_FIELDS);

  res.json({ success: true, product });
};

// DELETE /api/products/:id  (admin only)
// SOFT delete: we only hide the product (isActive = false), we don't erase it.
// Old orders still need to show what the customer bought.
// To bring it back: PATCH /api/products/:id with { "isActive": true }
exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  product.isActive = false;
  await product.save();

  res.json({ success: true, message: "Product deleted" });
};
