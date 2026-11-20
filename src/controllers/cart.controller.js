const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { addToCartSchema, updateCartItemSchema } = require("../validators/cart.validator");
const sendValidationError = require("../utils/sendValidationError");
const { visibleToCustomers, isVisibleToCustomers } = require("../utils/productVisibility");

// Round to 2 decimals for money (avoids 0.1 + 0.2 = 0.30000000000000004)
const round2 = (n) => Math.round(n * 100) / 100;
// Round to 3 decimals for quantities (kg can be 0.25, 1.5 ...)
const round3 = (n) => Math.round(n * 1000) / 1000;

// Find the user's cart, or create an empty one. "upsert" does it in ONE atomic step,
// so two requests at the same time can't create two carts.
const getOrCreateCart = (userId) =>
  Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } }, // only applied when a new cart is created
    { upsert: true, returnDocument: "after" }
  );

// Checks a quantity against the product's rules. Returns an error message, or null if OK.
const quantityError = (product, quantity) => {
  if (quantity < product.minOrderQty) {
    return `Minimum order is ${product.minOrderQty} ${product.unit}`;
  }
  if (quantity > product.stock) {
    return `Only ${product.stock} ${product.unit} in stock`;
  }
  return null;
};

// Turns the cart into the response the frontend needs:
// product details + line totals + subtotal. Prices come from the CURRENT product data.
const sendCart = async (res, cart) => {
  // Load all products of the cart with ONE query (not one query per item)
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotal = 0;

  const items = cart.items.map((item) => {
    const product = productById.get(item.product.toString());

    // The product may have been hidden, expired, or removed after it was added
    const available = Boolean(product) && isVisibleToCustomers(product);
    if (!available) {
      return {
        productId: item.product,
        quantity: item.quantity,
        available: false,
        issue: "This product is no longer available",
      };
    }

    const lineTotal = round2(product.price * item.quantity);
    subtotal += lineTotal;

    return {
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? null,
      unit: product.unit,
      unitSize: product.unitSize,
      price: product.price,
      originalPrice: product.originalPrice ?? null,
      quantity: item.quantity,
      lineTotal,
      available: true,
      // Stock may have dropped since the item was added. Frontend can show this warning.
      issue: quantityError(product, item.quantity),
    };
  });

  res.json({
    success: true,
    cart: { items, totalItems: items.length, subtotal: round2(subtotal) },
  });
};

// GET /api/cart
exports.getCart = async (req, res) => {
  // No need to save an empty cart just because someone looked at it
  const cart = (await Cart.findOne({ user: req.user._id })) ?? new Cart({ user: req.user._id });
  await sendCart(res, cart);
};

// POST /api/cart/items   body: { productId, quantity }
// If the product is already in the cart, the quantity is ADDED to the existing one.
exports.addItem = async (req, res) => {
  const result = addToCartSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const { productId, quantity } = result.data;

  // Only products customers can see may be added
  const product = await Product.findOne({ _id: productId, ...visibleToCustomers() });
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((item) => item.product.equals(product._id));

  const newQuantity = round3((existing?.quantity ?? 0) + quantity);

  const error = quantityError(product, newQuantity);
  if (error) return res.status(400).json({ success: false, message: error });

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.items.push({ product: product._id, quantity: newQuantity });
  }
  await cart.save();

  await sendCart(res, cart);
};

// PATCH /api/cart/items/:id   body: { quantity }   (:id is the product id)
// Sets the quantity to the new value (it does NOT add).
exports.updateItem = async (req, res) => {
  const result = updateCartItemSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find((i) => i.product.equals(req.params.id));
  if (!item) {
    return res.status(404).json({ success: false, message: "Item is not in your cart" });
  }

  const product = await Product.findOne({ _id: req.params.id, ...visibleToCustomers() });
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "This product is no longer available" });
  }

  const quantity = round3(result.data.quantity);
  const error = quantityError(product, quantity);
  if (error) return res.status(400).json({ success: false, message: error });

  item.quantity = quantity;
  await cart.save();

  await sendCart(res, cart);
};

// DELETE /api/cart/items/:id   (:id is the product id)
exports.removeItem = async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => !i.product.equals(req.params.id));

  if (cart.items.length === before) {
    return res.status(404).json({ success: false, message: "Item is not in your cart" });
  }
  await cart.save();

  await sendCart(res, cart);
};

// DELETE /api/cart   (empty the whole cart)
exports.clearCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();

  await sendCart(res, cart);
};
