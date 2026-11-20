const router = require("express").Router();
const { validateCoupon } = require("../controllers/coupon.controller");
const { protect } = require("../middlewares/auth");
const { couponLimiter } = require("../middlewares/rateLimiters");

// Customers can only PREVIEW a coupon here. Admin routes are in admin.routes.js.
// The limiter stops people from trying thousands of codes to guess a real one.
router.post("/validate", protect, couponLimiter, validateCoupon);

module.exports = router;
