const { z } = require("zod");

// No .default() here (same reason as products): a PATCH must not reset fields.
const bannerFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  subtitle: z.string().trim().max(200).optional(),
  image: z.string().trim().url("Image must be a valid URL"),
  // a site path ("/products?sale=true") or a full URL
  link: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const createBannerSchema = bannerFields;
const updateBannerSchema = bannerFields
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

module.exports = { createBannerSchema, updateBannerSchema };
