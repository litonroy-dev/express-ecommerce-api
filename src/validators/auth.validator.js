const { z } = require("zod");

// Rules for the register request body.
// trim()        -> removes spaces around the value
// toLowerCase() -> "Liton@Test.com" and "liton@test.com" become the same email
const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
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

module.exports = { registerSchema, loginSchema };
