const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const cartRoutes = require("./routes/cart.routes");

const app = express();

// CORS: allow our frontend (a different origin) to call this API.
// credentials: true lets the browser send/receive cookies.
// origin must be a specific URL (not "*") when credentials are used.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Read JSON from the request body -> available as req.body
app.use(express.json());

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

// Last middleware: catches any error thrown in the app.
// (Express 5 forwards errors from async functions here automatically.)
app.use((err, req, res, next) => {
  // MongoDB error code 11000 = duplicate value on a unique field.
  // err.keyPattern tells which field, e.g. { email: 1 } -> "email"
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong" });
});

module.exports = app;
