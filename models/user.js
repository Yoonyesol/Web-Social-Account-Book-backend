const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true, unique: true },
  password: { type: String, require: true, minlength: 6 },
  image: { type: String },
  //배열: 여러 개의 가계부 엔트리가 존재, ref: Transaction 모델과 참조관계(외래 키 역할)
  transactions: [
    { type: Schema.Types.ObjectId, ref: "Transaction", require: true },
  ],
  communityPosts: [
    { type: Schema.Types.ObjectId, ref: "CommunityPost", require: true },
  ],
});

//이메일이 기존에 없을 때만 사용자를 생성할 수 있다.
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
