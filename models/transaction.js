const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  uid: { type: String, required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  memo: { type: String },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
