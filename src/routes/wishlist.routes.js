const router = require("express").Router();
const {
  getWishlist,
  getWishlistIds,
  addItem,
  removeItem,
  clearWishlist,
} = require("../controllers/wishlist.controller");
const { protect } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// Every wishlist route needs a logged-in user.
// We always use req.user._id (never an id from the URL), so nobody sees another user's list.
router.use(protect);

router.get("/", getWishlist);
router.get("/ids", getWishlistIds);
router.delete("/", clearWishlist);

router.post("/items", addItem);
router.delete("/items/:id", validateObjectId, removeItem); // :id = product id

module.exports = router;
