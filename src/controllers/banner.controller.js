const Banner = require("../models/Banner");
const { createBannerSchema, updateBannerSchema } = require("../validators/banner.validator");
const sendValidationError = require("../utils/sendValidationError");

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

  const banner = await Banner.findByIdAndUpdate(req.params.id, result.data, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!banner) return notFound(res);

  res.json({ success: true, banner });
};

// DELETE /api/admin/banners/:id
exports.deleteBanner = async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) return notFound(res);

  res.json({ success: true, message: "Banner deleted" });
};
