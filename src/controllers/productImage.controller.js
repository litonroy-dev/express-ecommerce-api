const fs = require("fs/promises");
const path = require("path");
const Product = require("../models/Product");
const { PRODUCT_DIR, MAX_IMAGES_PER_PRODUCT, baseUrl } = require("../config/uploads");
const { removeFiles, hasImageSignature } = require("../utils/imageFile");

// POST /api/products/:id/images   (admin only)
// Send as multipart/form-data, field name "images", up to 5 files.
// By the time this function runs, multer has ALREADY saved the files to disk,
// so every "return" below must delete them first (removeFiles).
exports.uploadImages = async (req, res) => {
  const files = req.files ?? [];

  if (files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'No images received. Use the form field "images"' });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    await removeFiles(files);
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  // Make sure the files really are images (see hasImageSignature)
  const checks = await Promise.all(files.map((file) => hasImageSignature(file.path)));
  if (checks.includes(false)) {
    await removeFiles(files);
    return res
      .status(400)
      .json({ success: false, message: "One or more files are not valid images" });
  }

  if (product.images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
    await removeFiles(files);
    return res.status(400).json({
      success: false,
      message: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images (it has ${product.images.length})`,
    });
  }

  // Save the public URLs, e.g. http://localhost:5000/uploads/products/9f2c...jpg
  const urls = files.map((file) => `${baseUrl()}/uploads/products/${file.filename}`);
  product.images.push(...urls);
  await product.save();

  res.status(201).json({ success: true, product });
};

// DELETE /api/products/:id/images/:filename   (admin only)
exports.deleteImage = async (req, res) => {
  const { filename } = req.params;

  // SECURITY: only accept names that look exactly like the ones WE generate
  // (32 hex characters + extension). This blocks "../../.env" style attacks (path traversal).
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) {
    return res.status(400).json({ success: false, message: "Invalid filename" });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  // Find this image in the product's list
  const url = product.images.find((u) => u.endsWith(`/uploads/products/${filename}`));
  if (!url) {
    return res.status(404).json({ success: false, message: "Image not found on this product" });
  }

  product.images = product.images.filter((u) => u !== url);
  await product.save();

  // Remove the file from disk too (ignore the error if it is already gone)
  await fs.unlink(path.join(PRODUCT_DIR, filename)).catch(() => {});

  res.json({ success: true, product });
};
