const router = require("express").Router();
const {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");
const { protect, restrictTo } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// Public: anyone can browse products
router.get("/", listProducts);
router.get("/:id", validateObjectId, getProduct);

// Admin only. Order matters:
// protect (who are you?) -> restrictTo (are you admin?) -> validateObjectId -> handler
router.post("/", protect, restrictTo("admin"), createProduct);
router.patch("/:id", protect, restrictTo("admin"), validateObjectId, updateProduct);
router.delete("/:id", protect, restrictTo("admin"), validateObjectId, deleteProduct);

module.exports = router;
