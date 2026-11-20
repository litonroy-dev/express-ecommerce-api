const crypto = require("crypto");

// "Fresh Milk & Dairy!" -> "fresh-milk-dairy"
exports.slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // anything that's not a letter/number -> "-"
    .replace(/^-+|-+$/g, ""); // remove "-" at the start and end

// "Miniket Rice 5kg" -> "miniket-rice-5kg-a1b2"
// The random suffix keeps slugs unique even when two products share a name.
exports.uniqueSlug = (text) => `${exports.slugify(text)}-${crypto.randomBytes(2).toString("hex")}`;
