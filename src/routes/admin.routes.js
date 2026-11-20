const router = require("express").Router();
const { getDashboard, listProducts, listUsers } = require("../controllers/admin.controller");
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/coupon.controller");
const { protect, restrictTo } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// One line protects EVERY route below: must be logged in AND be an admin.
// A new admin route added later is safe by default.
router.use(protect, restrictTo("admin"));

router.get("/dashboard", getDashboard);
router.get("/products", listProducts);
router.get("/users", listUsers);

router.get("/coupons", listCoupons);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", validateObjectId, updateCoupon);
router.delete("/coupons/:id", validateObjectId, deleteCoupon);

// Orders already have admin routes: GET /api/orders/all and PATCH /api/orders/:id/status

module.exports = router;
