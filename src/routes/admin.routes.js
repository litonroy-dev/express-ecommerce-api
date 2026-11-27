const router = require("express").Router();
const {
  getDashboard,
  listProducts,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  getProduct,
  getOrder,
  deleteOrder,
} = require("../controllers/admin.controller");
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/coupon.controller");
const {
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  uploadBannerImage,
} = require("../controllers/banner.controller");
const uploadBannerImageMiddleware = require("../middlewares/uploadBannerImage");
const { protect, restrictTo } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// One line protects EVERY route below: must be logged in AND be an admin.
// A new admin route added later is safe by default.
router.use(protect, restrictTo("admin"));

router.get("/dashboard", getDashboard);
router.get("/products", listProducts);
router.get("/products/:id", validateObjectId, getProduct);
router.get("/users", listUsers);
router.get("/users/:id", validateObjectId, getUser);
router.patch("/users/:id", validateObjectId, updateUser);
router.delete("/users/:id", validateObjectId, deleteUser);
router.get("/orders/:id", validateObjectId, getOrder);
router.delete("/orders/:id", validateObjectId, deleteOrder);

router.get("/coupons", listCoupons);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", validateObjectId, updateCoupon);
router.delete("/coupons/:id", validateObjectId, deleteCoupon);

router.get("/banners", listAllBanners);
router.post("/banners/image", uploadBannerImageMiddleware, uploadBannerImage);
router.post("/banners", createBanner);
router.patch("/banners/:id", validateObjectId, updateBanner);
router.delete("/banners/:id", validateObjectId, deleteBanner);

// Order list/status admin routes: GET /api/orders/all and PATCH /api/orders/:id/status

module.exports = router;
