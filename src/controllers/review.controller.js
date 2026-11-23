const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const {
  createReviewSchema,
  updateReviewSchema,
  listReviewsSchema,
} = require("../validators/review.validator");
const sendValidationError = require("../utils/sendValidationError");

// Recalculate the product's average rating and review count and store them ON the
// product, so product lists can show stars without counting reviews every time.
const refreshProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    {
      ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0, // 4.3
      ratingCount: stats ? stats.count : 0,
    }
  );
};

// Only customers who RECEIVED this product may review it (no fake reviews)
const hasPurchased = (userId, productId) =>
  Order.exists({ user: userId, status: "delivered", "items.product": productId });

const notFound = (res, what) =>
  res.status(404).json({ success: false, message: `${what} not found` });

// GET /api/products/:id/reviews   (public)
exports.listProductReviews = async (req, res) => {
  const result = listReviewsSchema.safeParse(req.query);
  if (!result.success) return sendValidationError(res, result.error);
  const { page, limit, sort, rating } = result.data;

  const product = await Product.findById(req.params.id).select("ratingAverage ratingCount");
  if (!product) return notFound(res, "Product");

  const filter = { product: product._id };
  if (rating) filter.rating = rating;

  const sortOptions = {
    newest: { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 },
  };

  const [reviews, total, breakdown] = await Promise.all([
    Review.find(filter)
      .populate("user", "name") // show the name only, never the email
      .sort(sortOptions[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]),
  ]);

  // { 5: 10, 4: 3, 3: 0, 2: 0, 1: 1 } for the "5 star: 10" bars
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of breakdown) distribution[row._id] = row.count;

  res.json({
    success: true,
    summary: { average: product.ratingAverage, count: product.ratingCount, distribution },
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

// GET /api/products/:id/reviews/me   (logged in)
// Tells the product page what to show: the review form, "edit your review", or nothing.
exports.getMyReview = async (req, res) => {
  if (!(await Product.exists({ _id: req.params.id }))) return notFound(res, "Product");

  const review = await Review.findOne({ product: req.params.id, user: req.user._id });
  const canReview = !review && Boolean(await hasPurchased(req.user._id, req.params.id));

  res.json({ success: true, review, canReview });
};

// POST /api/products/:id/reviews   body: { rating, comment? }
exports.createReview = async (req, res) => {
  const result = createReviewSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  const product = await Product.findById(req.params.id).select("_id");
  if (!product) return notFound(res, "Product");

  if (!(await hasPurchased(req.user._id, product._id))) {
    return res.status(403).json({
      success: false,
      message: "You can review a product only after your order with it is delivered",
    });
  }

  let review;
  try {
    review = await Review.create({ ...result.data, product: product._id, user: req.user._id });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "You have already reviewed this product" });
    }
    throw err;
  }

  await refreshProductRating(product._id);
  await review.populate("user", "name");
  res.status(201).json({ success: true, review });
};

// PATCH /api/reviews/:id   (only the author)
exports.updateReview = async (req, res) => {
  const result = updateReviewSchema.safeParse(req.body);
  if (!result.success) return sendValidationError(res, result.error);

  // user: req.user._id in the filter = "not yours" looks the same as "doesn't exist"
  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    result.data,
    { returnDocument: "after", runValidators: true }
  ).populate("user", "name");
  if (!review) return notFound(res, "Review");

  await refreshProductRating(review.product);
  res.json({ success: true, review });
};

// DELETE /api/reviews/:id   (the author, or an admin to remove abuse)
exports.deleteReview = async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== "admin") filter.user = req.user._id;

  const review = await Review.findOneAndDelete(filter);
  if (!review) return notFound(res, "Review");

  await refreshProductRating(review.product);
  res.json({ success: true, message: "Review deleted" });
};
