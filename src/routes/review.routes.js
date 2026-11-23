const router = require("express").Router();
const { updateReview, deleteReview } = require("../controllers/review.controller");
const { protect } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// Product-scoped routes (list / create / mine) live in product.routes.js:
//   GET|POST /api/products/:id/reviews    GET /api/products/:id/reviews/me
router.patch("/:id", protect, validateObjectId, updateReview);
router.delete("/:id", protect, validateObjectId, deleteReview);

module.exports = router;
