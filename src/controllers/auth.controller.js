const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require("../validators/auth.validator");
const { sendEmail } = require("../utils/email");
const { signToken, cookieOptions } = require("../utils/token");
const sendValidationError = require("../utils/sendValidationError");

// Helper: the user data that is safe to send to the client (no password!)
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || null,
});

// POST /api/auth/register
exports.register = async (req, res) => {
  // Step 1: validate the input
  const result = registerSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const { name, email, password } = result.data; // cleaned data

  // Step 2: hash the password (10 = how much work bcrypt does; 10-12 is normal)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Step 3: save the user
  // We don't read "role" from the request, so nobody can register as admin.
  // If the email already exists, MongoDB throws error 11000 and app.js handles it.
  const user = await User.create({ name, email, password: hashedPassword });

  // Step 4: respond WITHOUT the password
  res.status(201).json({
    success: true,
    message: "Registered successfully",
    user: publicUser(user),
  });
};

const RESET_TOKEN_MINUTES = 15;
const RESET_COOLDOWN_SECONDS = 60; // one reset email per minute per user

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// POST /api/auth/forgot-password   body: { email }
exports.forgotPassword = async (req, res) => {
  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  // The answer is ALWAYS the same, whether the email exists or not, so an attacker
  // can't use this form to find out which emails are registered.
  const reply = () =>
    res.json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });

  const user = await User.findOne({ email: result.data.email }).select("+passwordResetExpires");
  if (!user) return reply();

  // Cooldown: the token lives 15 minutes, so (expires - 15 min) = when it was created
  if (user.passwordResetExpires) {
    const sentAt = user.passwordResetExpires.getTime() - RESET_TOKEN_MINUTES * 60 * 1000;
    if (Date.now() - sentAt < RESET_COOLDOWN_SECONDS * 1000) return reply();
  }

  // Random token. The email gets the real token, the database gets only its hash.
  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
  await user.save();

  const link = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text:
        `Hi ${user.name},\n\n` +
        `Use this link to set a new password (valid for ${RESET_TOKEN_MINUTES} minutes):\n${link}\n\n` +
        `If you didn't ask for this, you can ignore this email.`,
    });
  } catch (err) {
    // Don't tell the client (that would reveal the email exists). Just log it.
    console.error("Could not send reset email:", err.message);
  }

  reply();
};

// POST /api/auth/reset-password   body: { token, password }
exports.resetPassword = async (req, res) => {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);
  const { token, password } = result.data;

  const resetToken = hashToken(token);
  const invalid = () =>
    res.status(400).json({ success: false, message: "Reset link is invalid or has expired" });

  const user = await User.findOne({
    passwordResetToken: resetToken,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) return invalid();

  const hashedPassword = await bcrypt.hash(password, 10);

  // Change the password AND use up the token in ONE atomic step, so the same link
  // can't be used twice, even by two requests at the same moment.
  const updated = await User.findOneAndUpdate(
    { _id: user._id, passwordResetToken: resetToken },
    {
      $set: { password: hashedPassword, passwordChangedAt: new Date() },
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    }
  );
  if (!updated) return invalid();

  res.clearCookie("token", cookieOptions);
  res.json({ success: true, message: "Password reset successfully. Please log in." });
};

// POST /api/auth/logout
// The cookie is httpOnly, so frontend JavaScript can't delete it.
// Only the server can, by clearing it. The options (httpOnly, sameSite, secure)
// must match the ones used in res.cookie(), otherwise the browser won't remove it.
// (JWTs can't be "cancelled" on the server; removing the cookie is how we log out.)
exports.logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ success: true, message: "Logged out successfully" });
};

// GET /api/auth/me
// "protect" middleware already verified the token and set req.user,
// so here we just return it.
exports.getMe = (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  // Step 1: validate the input
  const result = loginSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const { email, password } = result.data;

  // Step 2: find the user by email
  const user = await User.findOne({ email });

  // Step 3: compare the typed password with the stored hash.
  // If the email is unknown, we still send the SAME message as a wrong password,
  // so an attacker can't find out which emails are registered.
  const isPasswordCorrect = user && (await bcrypt.compare(password, user.password));

  if (!isPasswordCorrect) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  // Step 4: create a JWT and put it in an httpOnly cookie
  const token = signToken(user._id);
  res.cookie("token", token, cookieOptions);

  // Step 5: respond. The token is also returned in the body so tools like
  // Postman or a mobile app can use it in the "Authorization: Bearer <token>" header.
  res.json({
    success: true,
    message: "Logged in successfully",
    token,
    user: publicUser(user),
  });
};

// PATCH /api/auth/me   body: { name?, phone? }
// Email and role can't be changed here (the schema is strict, unknown fields are rejected).
exports.updateMe = async (req, res) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const user = await User.findByIdAndUpdate(req.user._id, result.data, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, message: "Profile updated", user: publicUser(user) });
};

// PATCH /api/auth/change-password   body: { currentPassword, newPassword }
exports.changePassword = async (req, res) => {
  const result = changePasswordSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);
  const { currentPassword, newPassword } = result.data;

  const ok = await bcrypt.compare(currentPassword, req.user.password);
  if (!ok) {
    return res.status(400).json({ success: false, message: "Current password is incorrect" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  // passwordChangedAt logs out every OTHER device (old tokens are rejected by protect).
  // Also cancel any pending reset link.
  await User.findByIdAndUpdate(req.user._id, {
    $set: { password: hashed, passwordChangedAt: new Date() },
    $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
  });

  // Give THIS device a fresh token so the user stays logged in here.
  const token = signToken(req.user._id);
  res.cookie("token", token, cookieOptions);
  res.json({ success: true, message: "Password changed successfully", token });
};
