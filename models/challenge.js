const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ChallengeSchema = new Schema({
  name: { type: String, required: true },
  updatedTime: { type: Date, required: true },
  content: {
    ranking: { type: Number, required: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    like: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  },
});

module.exports = mongoose.model("Challenge", ChallengeSchema);
