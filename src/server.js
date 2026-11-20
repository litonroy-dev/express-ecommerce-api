const mongoose = require("mongoose");
const checkEnv = require("./config/checkEnv");

// Check .env BEFORE anything else starts
checkEnv();

const app = require("./app");

const PORT = process.env.PORT || 5000;

async function start() {
  // 1. Connect to MongoDB first
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  // 2. Then start accepting requests
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
