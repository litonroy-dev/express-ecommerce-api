// Runs once when the server starts. If something important is missing or weak,
// we stop immediately with a clear message ("fail fast"), instead of
// failing in strange ways later, when a customer is already using the site.
module.exports = function checkEnv() {
  const errors = [];

  for (const name of ["MONGO_URI", "JWT_SECRET", "JWT_EXPIRES_IN"]) {
    if (!process.env[name]) errors.push(`${name} is missing in .env`);
  }

  // A short secret can be guessed, and then anyone could create valid login tokens
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters");
  }

  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
    errors.push("CLIENT_URL is required in production (it is used for CORS)");
  }

  if (errors.length > 0) {
    console.error("Environment problems:\n - " + errors.join("\n - "));
    process.exit(1);
  }
};
