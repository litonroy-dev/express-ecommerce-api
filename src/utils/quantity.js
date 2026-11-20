// Shared by the cart and the order, so both use the SAME rules.

// Round to 2 decimals for money (avoids 0.1 + 0.2 = 0.30000000000000004)
exports.round2 = (n) => Math.round(n * 100) / 100;

// Round to 3 decimals for quantities (kg can be 0.25, 1.5 ...)
exports.round3 = (n) => Math.round(n * 1000) / 1000;

// Checks a quantity against the product's rules. Returns an error message, or null if OK.
exports.quantityError = (product, quantity) => {
  if (quantity < product.minOrderQty) {
    return `Minimum order is ${product.minOrderQty} ${product.unit}`;
  }
  if (quantity > product.stock) {
    return `Only ${product.stock} ${product.unit} in stock`;
  }
  return null;
};
