// Makes an existing user an admin.
// Usage: npm run make-admin -- liton@test.com
// (Register the user first, then run this.)
const mongoose = require("mongoose");
const User = require("../src/models/User");

async function run() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) {
    console.log("Usage: npm run make-admin -- <email>");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { new: true });
  console.log(user ? `${user.email} is now an admin` : `No user found with email ${email}`);
}

run()
  .catch((err) => console.error(err.message))
  .finally(() => mongoose.disconnect());
