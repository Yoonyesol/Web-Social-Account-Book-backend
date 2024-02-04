const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const Transaction = require("../models/transaction");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

const getTransactionById = async (req, res, next) => {
  const transactionId = req.params.tid; // type: string

  let transaction;
  try {
    transaction = await Transaction.findById(transactionId);
  } catch (e) {
    //GET 요청에 문제가 생겼을 때
    const error = new HttpError("입출금내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  // GET 요청에 문제가 없지만 입출금내역을 찾을 수 없는 경우 에러 핸들링
  if (!transaction) {
    const error = new HttpError(
      "해당 ID에 대한 입출금내역을 찾지 못했습니다.",
      404
    );
    return next(error);
  }

  res.json({ transaction: transaction.toObject({ getters: true }) });
};

const getTransactionsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let transactions;
  try {
    transactions = await Transaction.find({ uid: userId });
  } catch (e) {
    const error = new HttpError("입출금내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (!transactions || transactions.length === 0) {
    return next(
      new HttpError("해당 유저의 입출금내역을 찾지 못했습니다.", 404)
    );
  }

  res.json({
    transactions: transactions.map((t) => t.toObject({ getters: true })),
  });
};

const createTransaction = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(HttpError(errors.array(), 422));
  }
  const { uid, transaction_type, date, category, title, amount, memo } =
    req.body;

  //모델 생성 완료
  const createdTransaction = new Transaction({
    uid,
    transaction_type,
    date,
    category,
    title,
    amount,
    memo,
  });

  //유저 id 존재 여부 확인
  let user;
  try {
    user = await User.findById(uid);
  } catch (err) {
    const error = new HttpError("유저id가 존재하지 않습니다.", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "주어진 id에 해당하는 사용자가 존재하지 않습니다.",
      500
    );
    return next(error);
  }

  try {
    //새로운 가계부 생성 시 시작되는 세션
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdTransaction.save({ session: sess }); //새로운 가계부 생성. 자동으로 가계부 고유 id 생성
    user.transactions.push(createdTransaction); //mongoose 내부에서 참조하는 두 개의 모델 연결
    await user.save({ session: sess }); //업데이트한 문서 저장
    await sess.commitTransaction(); //세션이 트랜잭션 커밋
  } catch (e) {
    const error = new HttpError(
      "해당 ID의 입출금내역을 불러오지 못했습니다.",
      500
    );
    return next(error);
  }

  res.status(201).json({ transaction: createdTransaction });
};

const updateTransaction = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(HttpError(errors.array(), 422));
  }

  const { transaction_type, date, category, title, amount, memo } = req.body;
  const transactionId = req.params.tid;

  //id로 해당 입출금 내역 불러오기
  let transaction;
  try {
    transaction = await Transaction.findById(transactionId);
  } catch (e) {
    const error = new HttpError("입출금내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  //내용 업데이트
  transaction.transaction_type = transaction_type;
  transaction.date = date;
  transaction.category = category;
  transaction.title = title;
  transaction.amount = amount;
  transaction.memo = memo;

  try {
    await transaction.save();
  } catch (e) {
    const error = new HttpError("입출금 내역 수정 실패", 500);
    return next(error);
  }

  res
    .status(200)
    .json({ transaction: transaction.toObject({ getters: true }) });
};

const deleteTransaction = async (req, res, next) => {
  const transactionId = req.params.tid;

  let transaction;
  try {
    transaction = await Transaction.findById(transactionId);
  } catch (e) {
    const error = new HttpError("입출금내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  try {
    await transaction.deleteOne({ id: transactionId });
  } catch (e) {
    const error = new HttpError("입출금내역을 삭제하지 못했습니다.", 500);
    return next(error);
  }

  res.status(200).json({ message: "삭제 완료", transactionId });
};

exports.getTransactionById = getTransactionById;
exports.getTransactionsByUserId = getTransactionsByUserId;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
