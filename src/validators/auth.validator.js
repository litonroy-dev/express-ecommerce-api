const { z } = require("zod");

// Rules for the register request body.
// trim()        -> removes spaces around the value
// toLowerCase() -> "Liton@Test.com" and "liton@test.com" become the same email
const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  registrationToken: z.string().min(1, "Verify your email before registering"),
  // max 72: bcrypt only uses the first 72 bytes anyway, and a huge password
  // would make the server waste time hashing it.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

// Rules for the login request body.
// We only check the password is not empty (the real check is bcrypt.compare).
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Body of POST /api/auth/forgot-password
const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

// Body of POST /api/auth/verify-email
const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const registrationEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

// Body of POST /api/auth/reset-password
const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Token is required").max(200),
  // same password rules as register
  password: registerSchema.shape.password,
});

// Body of PATCH /api/auth/me  (only the fields the user may change; email and role are NOT here)
const updateProfileSchema = z
  .object({
    name: registerSchema.shape.name,
    // same phone rule as addresses; empty string or null clears the phone
    phone: z
      .union([z.string().trim().regex(/^\+?\d{10,15}$/, "Invalid phone number"), z.literal(""), z.null()])
      .transform((v) => v || null),
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

// Body of PATCH /api/auth/change-password
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(72),
    newPassword: registerSchema.shape.password,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
  registrationEmailSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
};
