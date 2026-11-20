const { z } = require("zod");
const { objectId } = require("./common");

// Body of POST /api/wishlist/items
const addToWishlistSchema = z.object({
  productId: objectId,
});

module.exports = { addToWishlistSchema };
