const rateLimit = require("express-rate-limit");

// Rate limiting = "one IP address may only send N requests in a time window".
// It slows down password guessing, spam sign-ups and scrapers.
// When the limit is passed, the client gets 429 Too Many Requests.
// (Counters live in server memory, so a server restart resets them.)
const createLimiter = ({ windowMs, limit, message, ...rest }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7", // tells the client how many requests are left (RateLimit header)
    legacyHeaders: false, // don't send the old X-RateLimit-* headers
    message: { success: false, message },
    ...rest,
  });

// For the whole API: generous, only stops abuse
exports.globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  message: "Too many requests, please try again later",
});

// Login: 10 FAILED attempts per 15 minutes. Successful logins are not counted,
// so a real customer is never blocked, but password guessing is.
exports.loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many login attempts, please try again in 15 minutes",
});

// Coupon check: 20 tries per 15 minutes, so nobody can guess coupon codes
exports.couponLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many coupon attempts, please try again later",
});

// Register: 5 accounts per hour per IP stops bots from creating fake accounts
exports.registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  message: "Too many accounts created from this IP, please try again later",
});
