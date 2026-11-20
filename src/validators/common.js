const { z } = require("zod");

// A MongoDB id is a 24-character hex string, e.g. "6b0046c2398bd574c15570b7"
exports.objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
