// Sends a 400 response with a readable list of Zod validation errors.
// Shared by all controllers so we don't repeat this code.
module.exports = (res, zodError) =>
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: zodError.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
