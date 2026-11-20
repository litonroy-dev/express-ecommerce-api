const Category = require("../models/Category");
const Product = require("../models/Product");
const {
  createCategorySchema,
  updateCategorySchema,
} = require("../validators/category.validator");
const sendValidationError = require("../utils/sendValidationError");
const { slugify } = require("../utils/slug");

// GET /api/categories  (public)
// Few categories exist, so no pagination is needed.
exports.listCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, categories });
};

// POST /api/categories  (admin only)
exports.createCategory = async (req, res) => {
  const result = createCategorySchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  // Duplicate name/slug -> MongoDB error 11000 -> handled in app.js (409)
  const category = await Category.create({
    ...result.data,
    slug: slugify(result.data.name),
  });

  res.status(201).json({ success: true, category });
};

// PATCH /api/categories/:id  (admin only)
exports.updateCategory = async (req, res) => {
  const result = updateCategorySchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  category.set(result.data); // only the fields that were sent are changed
  // Keep the slug in sync with the name (categories are few, so this is safe)
  if (result.data.name) category.slug = slugify(result.data.name);
  await category.save();

  res.json({ success: true, category });
};

// DELETE /api/categories/:id  (admin only)
exports.deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  // Don't delete a category that products still use, they would lose their category.
  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${productCount} product(s) use this category. Move or remove them first.`,
    });
  }

  await category.deleteOne();
  res.json({ success: true, message: "Category deleted" });
};
