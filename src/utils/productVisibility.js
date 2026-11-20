// Rules for "can a customer see/buy this product?" live here, so the product list,
// the cart and (later) checkout all use the SAME rules.

// MongoDB filter version: use it inside Product.find(...) / findOne(...)
// Visible = active AND not expired. No expiryDate (null/missing) means never expires.
exports.visibleToCustomers = () => ({
  isActive: true,
  $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
});

// JavaScript version: use it on a product you already loaded. Same rules.
exports.isVisibleToCustomers = (product) =>
  product.isActive && (!product.expiryDate || product.expiryDate > new Date());
