const router = require("express").Router();
const {
  createOrder,
  previewOrder,
  listMyOrders,
  listAllOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
} = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// Every order route needs a logged-in user
router.use(protect);

// Customer
router.post("/preview", previewOrder);
router.post("/", createOrder);
router.get("/", listMyOrders);

// Admin. IMPORTANT: "/all" must be BEFORE "/:id", otherwise Express would
// treat the word "all" as an order id.
router.get("/all", restrictTo("admin"), listAllOrders);

router.get("/:id", validateObjectId, getOrder);
router.patch("/:id/cancel", validateObjectId, cancelOrder);
router.patch("/:id/status", restrictTo("admin"), validateObjectId, updateOrderStatus);

module.exports = router;
