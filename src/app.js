const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { globalLimiter } = require("./middlewares/rateLimiters");
const { UPLOAD_ROOT } = require("./config/uploads");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const adminRoutes = require("./routes/admin.routes");
const couponRoutes = require("./routes/coupon.routes");
const addressRoutes = require("./routes/address.routes");
const reviewRoutes = require("./routes/review.routes");
const homeRoutes = require("./routes/home.routes");

const app = express();

// Behind a proxy (nginx, Heroku, Render...) every request seems to come from the
// proxy's IP, so the rate limiter would treat ALL users as one person.
// Set TRUST_PROXY=1 in .env ONLY when you really are behind one proxy.
// (If you are not, a hacker could fake their IP with the X-Forwarded-For header.)
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));

// helmet adds security headers (hides "X-Powered-By: Express", blocks clickjacking,
// stops browsers from guessing file types...). Always the first middleware.
// crossOriginResourcePolicy "cross-origin": by default helmet stops OTHER websites from
// loading our files. Our frontend (another origin) must show our product images, so allow it.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS: allow our frontend (a different origin) to call this API.
// credentials: true lets the browser send/receive cookies.
// origin must be a specific URL (not "*") when credentials are used.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Serve uploaded images: GET /uploads/products/<file> -> file from the uploads folder.
// Placed BEFORE the rate limiter, so a page with many images doesn't use up the API limit.
// maxAge: browsers may keep the image for 7 days (file names never change).
app.use("/uploads", express.static(UPLOAD_ROOT, { maxAge: "7d" }));

// Limit requests per IP for the whole API (login/register have stricter limits)
app.use(globalLimiter);

// Read JSON from the request body -> available as req.body.
// 10kb limit: nobody needs to send a 50MB JSON to this API.
app.use(express.json({ limit: "10kb" }));

// Read cookies from the request -> available as req.cookies
app.use(cookieParser());

// Every route in auth.routes.js starts with /api/auth
app.use("/api/auth", authRoutes);

// Every route in product.routes.js starts with /api/products
app.use("/api/products", productRoutes);

// Every route in category.routes.js starts with /api/categories
app.use("/api/categories", categoryRoutes);

// Every route in cart.routes.js starts with /api/cart
app.use("/api/cart", cartRoutes);

// Every route in order.routes.js starts with /api/orders
app.use("/api/orders", orderRoutes);

// Every route in wishlist.routes.js starts with /api/wishlist
app.use("/api/wishlist", wishlistRoutes);

// Every route in admin.routes.js starts with /api/admin (admins only)
app.use("/api/admin", adminRoutes);

// Every route in coupon.routes.js starts with /api/coupons
app.use("/api/coupons", couponRoutes);

// Every route in address.routes.js starts with /api/addresses
app.use("/api/addresses", addressRoutes);

// Every route in review.routes.js starts with /api/reviews
app.use("/api/reviews", reviewRoutes);

// GET /api/home and GET /api/banners (public home page data)
app.use("/api", homeRoutes);

// Unknown URL -> JSON 404 (Express would send an HTML page by default)
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Last middleware: catches any error thrown in the app.
// (Express 5 forwards errors from async functions here automatically.)
app.use((err, req, res, next) => {
  // The client sent broken JSON, e.g. a missing quote. This is the client's mistake (400), not ours.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }
  // Body bigger than the 10kb limit
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large" });
  }

  // MongoDB error code 11000 = duplicate value on a unique field.
  // err.keyPattern tells which field, e.g. { email: 1 } -> "email"
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  // Anything else is OUR bug. Log it for us, but never show details to the client.
  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong" });
});

module.exports = app;
