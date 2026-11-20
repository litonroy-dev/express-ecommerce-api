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
const uploadImagesMiddleware = require("../middlewares/uploadImages");
const { uploadImages, deleteImage } = require("../controllers/productImage.controller");

// Public: anyone can browse products
router.get("/", listProducts);
router.get("/:id", validateObjectId, getProduct);

// Admin only. Order matters:
// protect (who are you?) -> restrictTo (are you admin?) -> validateObjectId -> handler
router.post("/", protect, restrictTo("admin"), createProduct);
router.patch("/:id", protect, restrictTo("admin"), validateObjectId, updateProduct);
router.delete("/:id", protect, restrictTo("admin"), validateObjectId, deleteProduct);

// Images. IMPORTANT: protect + restrictTo come BEFORE the upload middleware,
// otherwise anyone could fill our disk with files before we check who they are.
router.post(
  "/:id/images",
  protect,
  restrictTo("admin"),
  validateObjectId,
  uploadImagesMiddleware,
  uploadImages
);
router.delete(
  "/:id/images/:filename",
  protect,
  restrictTo("admin"),
  validateObjectId,
  deleteImage
);

module.exports = router;
