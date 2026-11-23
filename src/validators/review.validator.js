const { z } = require("zod");

const rating = z.number().int("Rating must be a whole number").min(1).max(5);
const comment = z.string().trim().max(1000, "Comment can be at most 1000 characters");

// Body of POST /api/products/:id/reviews
const createReviewSchema = z.object({
  rating,
  comment: comment.optional(),
});

// Body of PATCH /api/reviews/:id  (send one or both)
const updateReviewSchema = z
  .object({ rating, comment })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

// Query string of GET /api/products/:id/reviews
const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(["newest", "highest", "lowest"]).default("newest"),
  rating: z.coerce.number().int().min(1).max(5).optional(), // only show e.g. 5-star reviews
});

module.exports = { createReviewSchema, updateReviewSchema, listReviewsSchema };
