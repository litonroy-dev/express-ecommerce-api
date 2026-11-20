const { z } = require("zod");

// Rules for the register request body.
// trim()        -> removes spaces around the value
// toLowerCase() -> "Liton@Test.com" and "liton@test.com" become the same email
const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Rules for the login request body.
// We only check the password is not empty (the real check is bcrypt.compare).
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

module.exports = { registerSchema, loginSchema };
