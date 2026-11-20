const mongoose = require("mongoose");

// Checks that :id in the URL looks like a MongoDB id (24 hex characters).
// Without this, /products/abc would make Mongoose throw an error.
// Usage: router.get("/:id", validateObjectId, getProduct)
module.exports = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  next();
};
