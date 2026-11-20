const multer = require("multer");
const crypto = require("crypto");
const {
  PRODUCT_DIR,
  MAX_IMAGE_SIZE,
  MAX_IMAGES_PER_UPLOAD,
} = require("../config/uploads");

// We pick the file extension from the file TYPE, never from the name the user sent.
// ("shell.php.jpg" or "../../evil.js" can't sneak in this way.)
const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// multer = the library that reads "multipart/form-data" (the format file uploads use).
const upload = multer({
  storage: multer.diskStorage({
    destination: PRODUCT_DIR,
    // Random name: two users uploading "photo.jpg" can't overwrite each other,
    // and nobody can guess the URL of someone else's file.
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString("hex") + EXTENSIONS[file.mimetype]),
  }),
  limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGES_PER_UPLOAD },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true); // accept
    const error = new Error("Only JPG, PNG and WebP images are allowed");
    error.code = "INVALID_FILE_TYPE";
    cb(error);
  },
});

// Wrapper around multer so we can turn its errors into clean 400 responses.
// Files must be sent in a form field named "images".
module.exports = (req, res, next) => {
  upload.array("images", MAX_IMAGES_PER_UPLOAD)(req, res, (err) => {
    if (!err) return next();

    const messages = {
      LIMIT_FILE_SIZE: `Each image must be ${MAX_IMAGE_SIZE / 1024 / 1024}MB or smaller`,
      LIMIT_FILE_COUNT: `You can upload at most ${MAX_IMAGES_PER_UPLOAD} images at once`,
      LIMIT_UNEXPECTED_FILE: `Send at most ${MAX_IMAGES_PER_UPLOAD} files, in a field named "images"`,
      INVALID_FILE_TYPE: err.message,
    };

    if (messages[err.code]) {
      return res.status(400).json({ success: false, message: messages[err.code] });
    }
    next(err); // unknown error -> the 500 handler in app.js
  });
};
