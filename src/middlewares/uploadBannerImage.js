const multer = require("multer");
const crypto = require("crypto");
const { BANNER_DIR, MAX_IMAGE_SIZE } = require("../config/uploads");

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: BANNER_DIR,
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString("hex") + EXTENSIONS[file.mimetype]),
  }),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true);
    const error = new Error("Only JPG, PNG and WebP images are allowed");
    error.code = "INVALID_FILE_TYPE";
    cb(error);
  },
});

// Single image in a field named "image"
module.exports = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();

    const messages = {
      LIMIT_FILE_SIZE: `Image must be ${MAX_IMAGE_SIZE / 1024 / 1024}MB or smaller`,
      LIMIT_UNEXPECTED_FILE: 'Send the file in a field named "image"',
      INVALID_FILE_TYPE: err.message,
    };

    if (messages[err.code]) {
      return res.status(400).json({ success: false, message: messages[err.code] });
    }
    next(err);
  });
};
