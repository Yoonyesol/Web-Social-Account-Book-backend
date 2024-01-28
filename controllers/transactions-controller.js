const { v4: uuid } = require("uuid");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const Transaction = require("../models/transaction");

let DUMMY_TRANSACTION = [
  {
    uid: "u1",
    date: 1705029633942,
    category: "교통/차량",
    title: "버스비",
    amount: -4000,
    memo: "버스비",
  },
  {
    uid: "u2",
    date: 1705129633942,
    category: "용돈",
    title: "용돈",
    amount: 12000,
    memo: "",
  },
  {
    uid: "u1",
    date: 1705229633942,
    category: "문화비",
    title: "서적구매",
    amount: -25000,
    memo: "컴퓨터공학입문서 구입",
  },
  {
    uid: "u2",
    date: 1709329633942,
    category: "식비",
    title: "외식비",
    amount: -52000,
    memo: "외식",
  },
];

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
  const { uid, category, title, amount, memo } = req.body;

  //모델 생성 완료
  const createdTransaction = new Transaction({
    uid,
    date: new Date().getTime(),
    category,
    title,
    amount,
    memo,
  });

  try {
    await createdTransaction.save();
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

  const { date, category, title, amount, memo } = req.body;
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
  DUMMY_TRANSACTION = DUMMY_TRANSACTION.filter((t) => t.tid !== transactionId);

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
