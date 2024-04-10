const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const counterSchema = new Schema({
  totalPosts: { type: Number, required: true },
});

module.exports = mongoose.model("Counter", counterSchema);
