const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = mongoose.Schema(
  {
    agentId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    affiliation: {
      type: String,
      required: true,
      trim: true,
    },
    birthdate: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    rights: {
      type: Array,
      required: true,
    },
    weapons: {
      type: Object,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/)) {
          throw new Error(
            "Password must contain at least one letter, one number and on special character"
          );
        }
      },
    },
    salt: {
      type: String,
      default: "salt",
    },
    policies: {
      type: Array,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(user.salt + password, user.password);
};
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.salt = crypto.randomBytes(32).toString("hex");
    user.password = await bcrypt.hash(user.salt + user.password, 8);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.connection.useDb("users").model("User", userSchema);

module.exports = User;
