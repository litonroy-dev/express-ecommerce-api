const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { addToWishlistSchema } = require("../validators/wishlist.validator");
const sendValidationError = require("../utils/sendValidationError");
const { visibleToCustomers } = require("../utils/productVisibility");

// A wishlist is a "nice to have" list, so keep it small. Stops abuse (millions of ids).
const MAX_WISHLIST_ITEMS = 100;

// Sends the wishlist with full product details.
// Products that are hidden, expired or removed are left out (customers can't buy them).
const sendWishlist = async (res, wishlist) => {
  const ids = wishlist.products;

  // ONE query for all products
  const products = await Product.find({ _id: { $in: ids }, ...visibleToCustomers() }).populate(
    "category",
    "name slug"
  );
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  // "$in" doesn't keep our order, so we rebuild it from the ids.
  // reverse() = the product added LAST is shown FIRST.
  const ordered = [...ids]
    .reverse()
    .map((id) => productById.get(id.toString()))
    .filter(Boolean); // drop the ones that are no longer visible

  res.json({
    success: true,
    wishlist: { products: ordered, totalItems: ordered.length },
  });
};

// GET /api/wishlist
exports.getWishlist = async (req, res) => {
  // No need to save an empty wishlist just because someone looked at it
  const wishlist =
    (await Wishlist.findOne({ user: req.user._id })) ?? new Wishlist({ user: req.user._id });
  await sendWishlist(res, wishlist);
};

// GET /api/wishlist/ids
// Only the ids: small and fast. The frontend uses it to show a filled heart
// on product cards (is this product in my wishlist?) without loading everything.
exports.getWishlistIds = async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  res.json({ success: true, productIds: wishlist?.products ?? [] });
};

// POST /api/wishlist/items   body: { productId }
// Safe to call twice: adding a product that is already there changes nothing.
exports.addItem = async (req, res) => {
  const result = addToWishlistSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const product = await Product.findOne({
    _id: result.data.productId,
    ...visibleToCustomers(),
  });
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  // Find the wishlist or create an empty one, in ONE atomic step (see cart controller)
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { user: req.user._id } },
    { upsert: true, returnDocument: "after" }
  );

  const alreadyThere = wishlist.products.some((id) => id.equals(product._id));
  if (!alreadyThere && wishlist.products.length >= MAX_WISHLIST_ITEMS) {
    return res.status(400).json({
      success: false,
      message: `Your wishlist is full (max ${MAX_WISHLIST_ITEMS} products)`,
    });
  }

  // $addToSet = push the id ONLY if it isn't in the array yet. No duplicates, even
  // if the user double-clicks the heart and two requests arrive together.
  const updated = await Wishlist.findOneAndUpdate(
    { _id: wishlist._id },
    { $addToSet: { products: product._id } },
    { returnDocument: "after" }
  );

  await sendWishlist(res, updated);
};

// DELETE /api/wishlist/items/:id   (:id is the product id)
// Safe to call twice: removing a product that isn't there is fine (no error).
exports.removeItem = async (req, res) => {
  const wishlist =
    (await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: req.params.id } }, // $pull = remove this id from the array
      { returnDocument: "after" }
    )) ?? new Wishlist({ user: req.user._id });

  await sendWishlist(res, wishlist);
};

// DELETE /api/wishlist   (empty the whole wishlist)
exports.clearWishlist = async (req, res) => {
  const wishlist =
    (await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $set: { products: [] } },
      { returnDocument: "after" }
    )) ?? new Wishlist({ user: req.user._id });

  await sendWishlist(res, wishlist);
};
