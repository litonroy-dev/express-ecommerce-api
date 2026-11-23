const { z } = require("zod");
const UNITS = require("../constants/units");

const { objectId } = require("./common");

// All product fields in one place.
// IMPORTANT: no .default() here. Defaults live in the Mongoose model.
// If we put defaults here, an update (PATCH) would silently reset fields
// the admin didn't send (e.g. stock back to 0).
const productFields = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  description: z.string().trim().optional(),
  category: objectId,
  brand: z.string().trim().optional(),
  sku: z.string().trim().optional(),

  price: z.number("Price must be a number").min(0, "Price cannot be negative"),
  // null is allowed so admin can REMOVE a discount by sending originalPrice: null
  originalPrice: z.number().min(0).nullable().optional(),

  unit: z.enum(UNITS, `Unit must be one of: ${UNITS.join(", ")}`),
  unitSize: z.number().positive().optional(),
  minOrderQty: z.number().positive().optional(),

  stock: z.number().min(0, "Stock cannot be negative").optional(), // decimals allowed
  lowStockThreshold: z.number().min(0).optional(),

  isPerishable: z.boolean().optional(),
  expiryDate: z.coerce.date().optional(), // accepts "2026-12-31"
  isOrganic: z.boolean().optional(),
  origin: z.string().trim().optional(),

  images: z.array(z.string().url("Each image must be a valid URL")).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// Rule that involves TWO fields, so it goes in refine() instead of on one field.
const priceRule = [
  (data) => data.originalPrice == null || data.price === undefined || data.originalPrice >= data.price,
  { message: "originalPrice must be greater than or equal to price", path: ["originalPrice"] },
];

// Create: name, category, price and unit are required (the rest are optional)
const createProductSchema = productFields.refine(...priceRule);

// Update (PATCH): .partial() makes EVERY field optional, so admin sends only what changed.
const updateProductSchema = productFields.partial().refine(...priceRule);

// Query string of GET /api/products, e.g. ?page=2&search=rice&sort=price_asc
// Query values are always strings, so z.coerce converts "2" -> 2.
const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12), // max 50 protects the server
  search: z.string().trim().optional(),
  category: z.string().trim().optional(), // category SLUG, e.g. "fresh-vegetables"
  brand: z.string().trim().optional(),
  // "true" / "false" strings from the URL -> real booleans
  isOrganic: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  // ?featured=true -> only featured products,  ?onSale=true -> only discounted products
  featured: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  onSale: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).default("newest"),
});

module.exports = { createProductSchema, updateProductSchema, listProductsSchema };
