const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: "Community", required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
});

module.exports = mongoose.model("Comment", commentSchema);
