const mongoose = require("mongoose");

const registrationOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true, select: false },
  otpExpiresAt: { type: Date, required: true, select: false },
  attempts: { type: Number, default: 0, select: false },
  registrationTokenHash: { type: String, select: false },
  registrationTokenExpiresAt: { type: Date, select: false },
});

module.exports = mongoose.model("RegistrationOtp", registrationOtpSchema);
