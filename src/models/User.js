const mongoose = require("mongoose");

// Shape of a user document in MongoDB
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // MongoDB will reject a second user with the same email
      lowercase: true,
      trim: true,
    },
    // The stored value is a bcrypt HASH, never the real password
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    // false = blocked by an admin: can't log in and existing tokens stop working.
    // (Users created before this field existed have none, so we treat only an
    // explicit false as blocked.)
    isActive: { type: Boolean, default: true },
    phone: { type: String, trim: true }, // optional, set from the profile page

    // ---- Forgot password ----
    // We store only a HASH of the reset token (like a password), so even someone who
    // can read the database can't use it. select:false = never loaded unless asked.
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    // When the password last changed. Tokens (JWT) issued BEFORE this are rejected,
    // so after a reset, anyone who stole the old login stays logged out.
    passwordChangedAt: { type: Date },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);
