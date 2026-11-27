const path = require("path");
const fs = require("fs");

// Uploaded files are stored in <project>/uploads/products, /uploads/categories /uploads/products  &  /uploads/categories /uploads/banners
exports.UPLOAD_ROOT = path.join(__dirname, "../../uploads");
exports.PRODUCT_DIR = path.join(exports.UPLOAD_ROOT, "products");
exports.CATEGORY_DIR = path.join(exports.UPLOAD_ROOT, "categories");
exports.BANNER_DIR = path.join(exports.UPLOAD_ROOT, "banners");

// Create the folders if they don't exist yet (recursive = create parents too)
fs.mkdirSync(exports.PRODUCT_DIR, { recursive: true });
fs.mkdirSync(exports.CATEGORY_DIR, { recursive: true });
fs.mkdirSync(exports.BANNER_DIR, { recursive: true });

// Limits, in one place
exports.MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB per image
exports.MAX_IMAGES_PER_UPLOAD = 5; // files in ONE request
exports.MAX_IMAGES_PER_PRODUCT = 8; // total images on one product

// The public address of this API. Saved image URLs start with it.
// Set BASE_URL in .env when you deploy (e.g. https://api.yourshop.com)
exports.baseUrl = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
