const fs = require("fs/promises");
const path = require("path");
const Category = require("../models/Category");
const Product = require("../models/Product");
const {
  createCategorySchema,
  updateCategorySchema,
} = require("../validators/category.validator");
const sendValidationError = require("../utils/sendValidationError");
const { slugify } = require("../utils/slug");
const { removeFiles, hasImageSignature } = require("../utils/imageFile");
const { CATEGORY_DIR, baseUrl } = require("../config/uploads");

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

// POST /api/categories/:id/image  (admin only)
// Send multipart/form-data with field "image" (single file, JPG/PNG/WebP, max 2 MB).
exports.uploadCategoryImage = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No image received. Use the form field "image"' });
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    await removeFiles([file]);
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  // Verify real image signature (not just MIME type)
  const isValid = await hasImageSignature(file.path);
  if (!isValid) {
    await removeFiles([file]);
    return res.status(400).json({ success: false, message: "File is not a valid image" });
  }

  // Delete old image file from disk if it was one of ours
  if (category.image) {
    const oldFilename = category.image.split("/uploads/categories/")[1];
    if (oldFilename && /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(oldFilename)) {
      await fs.unlink(path.join(CATEGORY_DIR, oldFilename)).catch(() => {});
    }
  }

  category.image = `${baseUrl()}/uploads/categories/${file.filename}`;
  await category.save();

  res.json({ success: true, category });
};

// DELETE /api/categories/:id/image  (admin only)
exports.deleteCategoryImage = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  if (!category.image) {
    return res.status(404).json({ success: false, message: "This category has no image" });
  }

  const filename = category.image.split("/uploads/categories/")[1];
  if (filename && /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) {
    await fs.unlink(path.join(CATEGORY_DIR, filename)).catch(() => {});
  }

  category.image = undefined;
  await category.save();

  res.json({ success: true, category });
};
