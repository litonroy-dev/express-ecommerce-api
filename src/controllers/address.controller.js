const Address = require("../models/Address");
const {
  createAddressSchema,
  updateAddressSchema,
} = require("../validators/address.validator");
const sendValidationError = require("../utils/sendValidationError");
const { MAX_ADDRESSES } = require("../constants/address");

const notFound = (res) => res.status(404).json({ success: false, message: "Address not found" });

// Make ONE address the default and clear the flag on all the others.
const makeDefault = async (userId, addressId) => {
  await Address.updateMany({ user: userId, _id: { $ne: addressId } }, { isDefault: false });
  return Address.findOneAndUpdate(
    { _id: addressId, user: userId },
    { isDefault: true },
    { returnDocument: "after" }
  );
};

// GET /api/addresses   (default address first, then newest)
exports.listAddresses = async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });
  res.json({ success: true, addresses });
};

// GET /api/addresses/:id
exports.getAddress = async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return notFound(res);
  res.json({ success: true, address });
};

// POST /api/addresses
exports.createAddress = async (req, res) => {
  const result = createAddressSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);
  const { isDefault, ...fields } = result.data;

  const count = await Address.countDocuments({ user: req.user._id });
  if (count >= MAX_ADDRESSES) {
    return res.status(400).json({
      success: false,
      message: `You can save at most ${MAX_ADDRESSES} addresses`,
    });
  }

  // The first address is always the default
  let address = await Address.create({ ...fields, user: req.user._id, isDefault: count === 0 });
  if (isDefault && count > 0) address = await makeDefault(req.user._id, address._id);

  res.status(201).json({ success: true, address });
};

// PATCH /api/addresses/:id
exports.updateAddress = async (req, res) => {
  const result = updateAddressSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  // The filter has user: req.user._id, so nobody can edit another user's address
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    result.data,
    { returnDocument: "after" }
  );
  if (!address) return notFound(res);

  res.json({ success: true, address });
};

// PATCH /api/addresses/:id/default
exports.setDefaultAddress = async (req, res) => {
  const exists = await Address.exists({ _id: req.params.id, user: req.user._id });
  if (!exists) return notFound(res);

  const address = await makeDefault(req.user._id, req.params.id);
  res.json({ success: true, address });
};

// DELETE /api/addresses/:id
exports.deleteAddress = async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!address) return notFound(res);

  // The default one is gone, so the newest remaining address becomes the default
  if (address.isDefault) {
    const newest = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (newest) await makeDefault(req.user._id, newest._id);
  }

  res.json({ success: true, message: "Address deleted" });
};
