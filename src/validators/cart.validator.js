const { z } = require("zod");
const { objectId } = require("./common");

// Body of POST /api/cart/items
const addToCartSchema = z.object({
  productId: objectId,
  quantity: z.number("Quantity must be a number").positive("Quantity must be more than 0").default(1),
});

// Body of PATCH /api/cart/items/:id
// To remove an item, use DELETE instead of sending 0.
const updateCartItemSchema = z.object({
  quantity: z.number("Quantity must be a number").positive("Quantity must be more than 0"),
});

module.exports = { addToCartSchema, updateCartItemSchema };
