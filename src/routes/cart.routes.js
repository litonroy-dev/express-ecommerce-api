const router = require("express").Router();
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} = require("../controllers/cart.controller");
const { protect } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// router.use(protect) = EVERY route below needs a logged-in user.
// Each user only ever sees their own cart (we use req.user._id, never an id from the URL).
router.use(protect);

router.get("/", getCart);
router.delete("/", clearCart);

router.post("/items", addItem);
router.patch("/items/:id", validateObjectId, updateItem); // :id = product id
router.delete("/items/:id", validateObjectId, removeItem);

module.exports = router;
