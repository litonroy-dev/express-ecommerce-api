const jwt = require("jsonwebtoken");
const User = require("../models/User");

// protect: lets only logged-in users continue to the next handler.
// Usage: router.get("/me", protect, getMe)
exports.protect = async (req, res, next) => {
  // Step 1: find the token.
  // Browser frontend -> cookie. Postman / mobile app -> "Authorization: Bearer <token>"
  let token = req.cookies.token;

  const authHeader = req.headers.authorization;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  // Step 2: verify the token (checks the signature and the expiry date)
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  // Step 3: make sure the user still exists (could have been deleted)
  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ success: false, message: "User no longer exists" });
  }

  // Step 4: attach the user to the request so next handlers can use req.user
  req.user = user;
  next();
};
