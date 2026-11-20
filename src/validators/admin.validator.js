const { z } = require("zod");

// "true" / "false" strings from the URL -> real booleans
const booleanString = z.enum(["true", "false"]).transform((v) => v === "true");

// Query string of GET /api/admin/products
// Example: ?stock=low&isActive=true&search=rice&page=1
const adminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(), // matches name OR sku
  category: z.string().trim().optional(), // category slug
  isActive: booleanString.optional(), // false = show only hidden (deleted) products
  // in  = has stock
  // low = stock is above 0 but at or below the product's lowStockThreshold
  // out = stock is 0
  stock: z.enum(["in", "low", "out"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "stock_asc"]).default("newest"),
});

// Query string of GET /api/admin/users
const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(), // matches name OR email
  role: z.enum(["user", "admin"]).optional(),
});

module.exports = { adminProductsQuerySchema, adminUsersQuerySchema };
