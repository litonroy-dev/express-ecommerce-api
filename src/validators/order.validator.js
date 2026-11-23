const { z } = require("zod");
const { ORDER_STATUSES, PAYMENT_METHODS } = require("../constants/order");
const { addressFields } = require("./address.validator");
const { objectId } = require("./common");

const shippingAddressSchema = z.object(addressFields);

// Body of POST /api/orders
// Notice: NO items, NO prices. The server takes them from the cart and the products.
// The delivery address is EITHER typed in (shippingAddress) OR picked from the
// address book (addressId), not both.
const createOrderSchema = z
  .object({
    shippingAddress: shippingAddressSchema.optional(),
    addressId: objectId.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).default("cod"),
    // Optional coupon. The server calculates the discount, the client never sends an amount.
    couponCode: z.string().trim().toUpperCase().optional(),
    note: z.string().trim().max(300, "Note can be at most 300 characters").optional(),
  })
  .refine((data) => Boolean(data.shippingAddress) !== Boolean(data.addressId), {
    message: "Send either shippingAddress or addressId (not both)",
    path: ["shippingAddress"],
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
