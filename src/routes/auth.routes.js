const router = require("express").Router();
const { register, login, logout, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/me (protect runs first; if not logged in, getMe never runs)
router.get("/me", protect, getMe);

module.exports = router;
