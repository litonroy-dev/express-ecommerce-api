const jwt = require("jsonwebtoken");

// Create a signed token that stores the user's id.
// Only our server knows JWT_SECRET, so nobody else can create a valid token.
exports.signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Options for the cookie that will carry the token.
exports.cookieOptions = {
  httpOnly: true, // browser JavaScript cannot read it (protects against XSS)
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "lax", // basic protection against CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, same as JWT_EXPIRES_IN
};
