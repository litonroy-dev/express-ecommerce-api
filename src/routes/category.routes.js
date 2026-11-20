const router = require("express").Router();
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const { protect, restrictTo } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// Public
router.get("/", listCategories);

// Admin only
router.post("/", protect, restrictTo("admin"), createCategory);
router.patch("/:id", protect, restrictTo("admin"), validateObjectId, updateCategory);
router.delete("/:id", protect, restrictTo("admin"), validateObjectId, deleteCategory);

module.exports = router;
