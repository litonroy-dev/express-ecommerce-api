const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { registerSchema, loginSchema } = require("../validators/auth.validator");
const { signToken, cookieOptions } = require("../utils/token");
const sendValidationError = require("../utils/sendValidationError");

// Helper: the user data that is safe to send to the client (no password!)
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
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
