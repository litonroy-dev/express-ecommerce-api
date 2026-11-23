const router = require("express").Router();
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateMe,
  changePassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth");
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
} = require("../middlewares/rateLimiters");

// POST /api/auth/register  (limiter runs first, then the controller)
router.post("/register", registerLimiter, register);

// POST /api/auth/login
router.post("/login", loginLimiter, login);

// POST /api/auth/forgot-password  (sends a reset link by email)
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

// POST /api/auth/reset-password  (sets the new password using the emailed token)
router.post("/reset-password", resetPasswordLimiter, resetPassword);

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/me (protect runs first; if not logged in, getMe never runs)
router.get("/me", protect, getMe);

// PATCH /api/auth/me  (update name / phone)
router.patch("/me", protect, updateMe);

// PATCH /api/auth/change-password  (needs the current password)
router.patch("/change-password", protect, changePasswordLimiter, changePassword);

module.exports = router;
