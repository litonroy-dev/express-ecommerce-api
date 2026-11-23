const router = require("express").Router();
const {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} = require("../controllers/address.controller");
const { protect } = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

// Every address route needs a logged-in user, and every query filters by req.user._id,
// so nobody can see or change another user's addresses.
router.use(protect);

router.get("/", listAddresses);
router.post("/", createAddress);

router.get("/:id", validateObjectId, getAddress);
router.patch("/:id", validateObjectId, updateAddress);
router.delete("/:id", validateObjectId, deleteAddress);
router.patch("/:id/default", validateObjectId, setDefaultAddress);

module.exports = router;
