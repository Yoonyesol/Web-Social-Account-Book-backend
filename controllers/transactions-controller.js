const { v4: uuid } = require("uuid");
const HttpError = require("../models/http-error");

let DUMMY_TRANSACTION = [
  {
    tid: "t1",
    uid: "u1",
    date: 1705029633942,
    category: "교통/차량",
    title: "버스비",
    amount: -4000,
    transaction_type: "지출",
    memo: "버스비",
  },
  {
    tid: "t2",
    uid: "u2",
    date: 1705129633942,
    category: "용돈",
    title: "용돈",
    amount: 12000,
    transaction_type: "수입",
    memo: "",
  },
  {
    tid: "t3",
    uid: "u1",
    date: 1705229633942,
    category: "문화비",
    title: "서적구매",
    amount: -25000,
    transaction_type: "지출",
    memo: "컴퓨터공학입문서 구입",
  },
  {
    tid: "t4",
    uid: "u2",
    date: 1709329633942,
    category: "식비",
    title: "외식비",
    amount: -52000,
    transaction_type: "지출",
    memo: "외식",
  },
];

const getTransactionById = (req, res, next) => {
  const transactionId = req.params.tid; // type: string

  const transaction = DUMMY_TRANSACTION.find((t) => {
    return t.tid === transactionId;
  });

  // 에러 핸들링
  if (!transaction) {
    throw new HttpError("해당 ID에 대한 입출금내역을 찾지 못했습니다.", 404);
  }

  res.json({ transaction: transaction });
};

const getTransactionsByUserId = (req, res, next) => {
  const userId = req.params.uid;

  const transactions = DUMMY_TRANSACTION.filter((u) => {
    return u.uid === userId;
  });

  if (!transactions || transactions.length === 0) {
    throw new HttpError("해당 유저의 입출금내역을 찾지 못했습니다.", 404);
  }

  res.json({ transactions });
};

const createTransaction = (req, res, next) => {
  const { uid, category, title, amount, transaction_type, memo } = req.body;
  const createdTransaction = {
    tid: uuid(),
    uid,
    category,
    title,
    amount,
    transaction_type,
    memo,
  };

  DUMMY_TRANSACTION.push(createdTransaction);

  res.status(201).json({ transaction: createdTransaction });
};

const updateTransaction = (req, res, next) => {
  const { category, title, amount, transaction_type, memo } = req.body;
  const transactionId = req.params.tid;

  const updatedTransaction = {
    ...DUMMY_TRANSACTION.find((t) => t.tid === transactionId),
  };
  const transactionIndex = DUMMY_TRANSACTION.findIndex(
    (t) => t.tid === transactionId
  );
  updatedTransaction.category = category;
  updatedTransaction.title = title;
  updatedTransaction.amount = amount;
  updatedTransaction.transaction_type = transaction_type;
  updatedTransaction.memo = memo;

  DUMMY_TRANSACTION[transactionIndex] = updatedTransaction;

  res.status(200).json({ transaction: updatedTransaction });
};

const deleteTransaction = (req, res, next) => {
  const transactionId = req.params.tid;
  DUMMY_TRANSACTION = DUMMY_TRANSACTION.filter((t) => t.tid !== transactionId);

  res.status(200).json({ message: "삭제 완료", transactionId });
};

exports.getTransactionById = getTransactionById;
exports.getTransactionsByUserId = getTransactionsByUserId;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
