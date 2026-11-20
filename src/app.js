const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");

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

// Last middleware: catches any error thrown in the app.
// (Express 5 forwards errors from async functions here automatically.)
app.use((err, req, res, next) => {
  // MongoDB error code 11000 = duplicate value on a unique field (email)
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "Email already registered" });
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong" });
});

module.exports = app;
