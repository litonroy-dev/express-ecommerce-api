const mongoose = require("mongoose");
const { ADDRESS_LABELS } = require("../constants/address");

// A saved delivery address in the user's "address book".
// (The order keeps its OWN copy of the address, so editing or deleting an address
// here never changes an old order.)
const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, enum: ADDRESS_LABELS, default: "home" },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }, // house, road, village...
    city: { type: String, required: true },
    area: { type: String },
    postalCode: { type: String },
    // At most one address per user is the default (the code keeps this true)
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// "Show MY addresses" is the main query
addressSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Address", addressSchema);
