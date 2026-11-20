const { z } = require("zod");
const { ORDER_STATUSES, PAYMENT_METHODS } = require("../constants/order");

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  // Optional "+" then 10-15 digits, e.g. 01712345678 or +8801712345678
  phone: z.string().trim().regex(/^\+?\d{10,15}$/, "Invalid phone number"),
  address: z.string().trim().min(5, "Address is too short"),
  city: z.string().trim().min(2, "City is required"),
  area: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
});

// Body of POST /api/orders
// Notice: NO items, NO prices. The server takes them from the cart and the products.
const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(PAYMENT_METHODS).default("cod"),
  note: z.string().trim().max(300, "Note can be at most 300 characters").optional(),
});

// Body of PATCH /api/orders/:id/status  (admin)
const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, `Status must be one of: ${ORDER_STATUSES.join(", ")}`),
});

// Query string of GET /api/orders and GET /api/orders/all
const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(ORDER_STATUSES).optional(),
});

module.exports = { createOrderSchema, updateStatusSchema, listOrdersSchema };
