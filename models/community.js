const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const communitySchema = new Schema({
  writer: {
    uid: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    image: { type: String },
  },
  date: { type: Date, default: Date.now, required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  hit: { type: Number, default: 0, required: true },
  like: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  comments: [{ type: mongoose.Types.ObjectId, ref: "Comment" }],
});

module.exports = mongoose.model("Community", communitySchema);
