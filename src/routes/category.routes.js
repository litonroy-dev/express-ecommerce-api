const router = require("express").Router();
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  deleteCategoryImage,
} = require("../controllers/category.controller");
const { protect, restrictTo } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");
const uploadCategoryImageMiddleware = require("../middlewares/uploadCategoryImage");

// Public
router.get("/", listCategories);

// Admin only
router.post("/", protect, restrictTo("admin"), createCategory);
router.patch("/:id", protect, restrictTo("admin"), validateObjectId, updateCategory);
router.delete("/:id", protect, restrictTo("admin"), validateObjectId, deleteCategory);

// Image upload / delete (admin only)
// IMPORTANT: protect + restrictTo BEFORE the upload middleware
router.post(
  "/:id/image",
  protect,
  restrictTo("admin"),
  validateObjectId,
  uploadCategoryImageMiddleware,
  uploadCategoryImage
);
router.delete(
  "/:id/image",
  protect,
  restrictTo("admin"),
  validateObjectId,
  deleteCategoryImage
);

module.exports = router;
