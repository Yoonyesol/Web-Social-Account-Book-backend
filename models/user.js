const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  image: { type: String },
  budgets: [
    {
      monthYear: { type: String, required: true },
      amount: { type: Number, default: 0, required: true },
    },
  ],
  transactions: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
  posts: [{ type: Schema.Types.ObjectId, ref: "Community" }],
  likedPosts: [{ type: Schema.Types.ObjectId, ref: "Community" }],
  comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
