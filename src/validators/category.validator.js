const { z } = require("zod");

const categoryFields = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  description: z.string().trim().optional(),
  image: z.string().url("Image must be a valid URL").optional(),
  isActive: z.boolean().optional(),
});

// Create: name is required.
const createCategorySchema = categoryFields;

// Update (PATCH): every field becomes optional, so admin sends only what changed.
const updateCategorySchema = categoryFields.partial();

module.exports = { createCategorySchema, updateCategorySchema };
