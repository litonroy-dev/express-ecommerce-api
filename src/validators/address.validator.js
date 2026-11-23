const { z } = require("zod");
const { ADDRESS_LABELS } = require("../constants/address");

// The address fields. Also used by the order validator (checkout), so the rules
// are the same everywhere.
const addressFields = {
  fullName: z.string().trim().min(2, "Full name is required"),
  // Optional "+" then 10-15 digits, e.g. 01712345678 or +8801712345678
  phone: z.string().trim().regex(/^\+?\d{10,15}$/, "Invalid phone number"),
  address: z.string().trim().min(5, "Address is too short"),
  city: z.string().trim().min(2, "City is required"),
  area: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
};

// Body of POST /api/addresses
const createAddressSchema = z.object({
  ...addressFields,
  label: z.enum(ADDRESS_LABELS).default("home"),
  isDefault: z.boolean().optional(),
});

// Body of PATCH /api/addresses/:id  (send only the fields you want to change)
const updateAddressSchema = z
  .object({ ...addressFields, label: z.enum(ADDRESS_LABELS) })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Send at least one field to update");

module.exports = { addressFields, createAddressSchema, updateAddressSchema };
