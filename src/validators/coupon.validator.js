const { z } = require("zod");

// "welcome10" -> "WELCOME10". Only letters, numbers, - and _ (3 to 20 characters).
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,20}$/, "Code must be 3-20 characters: letters, numbers, - or _");

const couponFields = z.object({
  code,
  description: z.string().trim().optional(),
  type: z.enum(["percentage", "fixed"], 'Type must be "percentage" or "fixed"'),
  value: z.number("Value must be a number").positive("Value must be more than 0"),
  // null = "no cap" / "unlimited"
  maxDiscount: z.number().positive().nullable().optional(),
  minOrderAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().positive().optional(),
  // Product ids this coupon is limited to. [] (or leave out) = all products.
  products: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, "Invalid product id"))
    .max(200, "Too many products")
    .optional(),
  // accepts "2026-12-01" or an ISO date; null = clear it (no start / no end)
  startsAt: z.union([z.null(), z.coerce.date()]).optional(),
  expiresAt: z.union([z.null(), z.coerce.date()]).optional(),
  isActive: z.boolean().optional(),
});

// Create: code, type and value are required
const createCouponSchema = couponFields;

// Update (PATCH): every field optional. The CODE can't be changed,
// because old orders refer to it.
const updateCouponSchema = couponFields.omit({ code: true }).partial();

// Body of POST /api/coupons/validate
const validateCouponSchema = z.object({ code });

// Query string of GET /api/admin/coupons
const listCouponsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  listCouponsSchema,
};
