const fs = require("fs/promises");
const path = require("path");
const Banner = require("../models/Banner");
const { removeFiles, hasImageSignature } = require("../utils/imageFile");
const { BANNER_DIR, baseUrl } = require("../config/uploads");
const { createBannerSchema, updateBannerSchema } = require("../validators/banner.validator");
const sendValidationError = require("../utils/sendValidationError");

// Delete a banner image file from disk, but only if it is one of our own uploads.
const removeOwnImage = async (url) => {
  const filename = url?.split("/uploads/banners/")[1];
  if (filename && /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) {
    await fs.unlink(path.join(BANNER_DIR, filename)).catch(() => {});
  }
};

const notFound = (res) => res.status(404).json({ success: false, message: "Banner not found" });

// GET /api/banners   (public: only active banners, in display order)
exports.listActiveBanners = async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, banners });
};

// GET /api/admin/banners   (admin: all banners, including hidden)
exports.listAllBanners = async (req, res) => {
  const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, banners });
};

// POST /api/admin/banners/image
// multipart/form-data with field "image" (JPG/PNG/WebP, max 2 MB). Returns the public URL;
// the admin then sends that URL when creating/updating the banner.
exports.uploadBannerImage = async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: 'No image received. Use the form field "image"' });
  }
  if (!(await hasImageSignature(file.path))) {
    await removeFiles([file]);
    return res.status(400).json({ success: false, message: "File is not a valid image" });
  }
  res.status(201).json({ success: true, url: `${baseUrl()}/uploads/banners/${file.filename}` });
};

// POST /api/admin/banners
exports.createBanner = async (req, res) => {
  const result = createBannerSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const banner = await Banner.create(result.data);
  res.status(201).json({ success: true, banner });
};

// PATCH /api/admin/banners/:id
exports.updateBanner = async (req, res) => {
  const result = updateBannerSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const old = await Banner.findById(req.params.id);
  if (!old) return notFound(res);

  const banner = await Banner.findByIdAndUpdate(req.params.id, result.data, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!banner) return notFound(res);

  // Image was replaced: remove the old file
  if (result.data.image && result.data.image !== old.image) await removeOwnImage(old.image);

  res.json({ success: true, banner });
};

// DELETE /api/admin/banners/:id
exports.deleteBanner = async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) return notFound(res);

  await removeOwnImage(banner.image);
  res.json({ success: true, message: "Banner deleted" });
};
