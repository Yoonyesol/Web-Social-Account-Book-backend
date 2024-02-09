const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true, unique: true },
  password: { type: String, require: true, minlength: 6 },
  image: { type: String },
  transactions: [
    { type: Schema.Types.ObjectId, ref: "Transaction", require: true },
  ],
  posts: [{ type: Schema.Types.ObjectId, ref: "Community", require: true }],
  likedPosts: [{ type: Schema.Types.ObjectId, ref: "Community" }],
  comments: [{ type: Schema.Types.ObjectId, ref: "Community" }],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
