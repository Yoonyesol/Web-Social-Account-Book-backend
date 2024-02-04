const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  //mongoose.Types.ObjectId: 생성한 사용자에 대한 실제 id 생성
  uid: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  transaction_type: { type: Boolean, require },
  date: { type: Number, required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  memo: { type: String },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
