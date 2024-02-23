const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const Transaction = require("../models/transaction");
const User = require("../models/user");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

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
    const error = new HttpError("uid: 입출금내역을 불러오지 못했습니다.", 500);
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
    const error = new HttpError("tid: 입출금내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  //생성자가 아니면 내용 수정 불가
  if (transaction.uid.toString() !== req.userData.userId) {
    const error = new HttpError(
      "입출금내역을 업데이트할 수 있는 권한이 없습니다.",
      401
    );
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
    //몽구스가 uid를 가지고 User 데이터 전체를 대상으로 검색. 이 검색결과로 해당 User의 모든 정보를 불러온다.
    transaction = await Transaction.findById(transactionId).populate("uid");
  } catch (e) {
    const error = new HttpError("입출금내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  //존재하지 않는 가계부인 경우
  if (!transaction) {
    const error = new HttpError("해당 id의 가계부를 찾지 못했습니다.", 404);
    return next(error);
  }

  //생성자가 아니면 내용 수정 불가
  if (transaction.uid._id.toString() !== req.userData.userId) {
    const error = new HttpError(
      "입출금내역을 삭제할 수 있는 권한이 없습니다.",
      401
    );
    return next(error);
  }

  //가계부 삭제
  try {
    //문서에서 가계부 삭제
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await transaction.deleteOne({ session: sess });
    transaction.uid.transactions.pull(transaction); //pull을 이용해 transaction 호출, 자동으로 id 제거
    //새로 생성된 사용자를 db에 저장
    await transaction.uid.save({ session: sess });
    await sess.commitTransaction();
  } catch (e) {
    const error = new HttpError("입출금내역을 삭제하지 못했습니다.", 500);
    return next(error);
  }

  res.status(200).json({ message: "삭제 완료", transactionId });
};

const getMonthlyTransactions = async (req, res, next) => {
  const { uid, date } = req.params;
  const [year, month] = date.split("-");
  const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getTime();
  const lastDay = new Date(
    parseInt(year),
    parseInt(month),
    0,
    23,
    59,
    59
  ).getTime();

  let income, expense;
  try {
    // 특정 월의 수입을 계산
    income = await Transaction.aggregate([
      {
        $match: {
          uid: new ObjectId(uid),
          transaction_type: true, // 수입인 경우 필터링
          date: { $gte: firstDay, $lte: lastDay }, // 특정 월의 데이터만 선택
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }, // 수입의 총합 계산
        },
      },
    ]);

    // 특정 월의 지출을 계산
    expense = await Transaction.aggregate([
      {
        $match: {
          uid: new ObjectId(uid),
          transaction_type: false, // 지출인 경우 필터링
          date: { $gte: firstDay, $lte: lastDay }, // 특정 월의 데이터만 선택
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }, // 지출의 총합 계산
        },
      },
    ]);
  } catch (err) {
    const error = new HttpError(
      "요청한 월별 입출금 합계를 불러오지 못했습니다:",
      err
    );
    return next(error);
  }

  // 배열이 비어있을 경우 0 리턴
  res.json({
    income: income[0]?.total || 0,
    expense: expense[0]?.total || 0,
  });
};

const getLatestYearExpenses = async (req, res, next) => {
  const userId = req.params.uid;
  let monthlyExpenses = [];
  let totalYearlyExpense = 0;

  try {
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      ).getTime();
      const lastDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i + 1,
        0,
        23,
        59,
        59
      ).getTime();

      const expenses = await Transaction.aggregate([
        {
          $match: {
            uid: new ObjectId(userId),
            transaction_type: false,
            date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const totalExpense = expenses.length > 0 ? expenses[0].total : 0;
      totalYearlyExpense += totalExpense;

      monthlyExpenses.push({
        year: new Date(firstDayOfMonth).getFullYear(),
        month: new Date(firstDayOfMonth).getMonth() + 1,
        total: totalExpense,
      });
    }
  } catch (err) {
    const error = new HttpError(
      "요청한 최근 1년 지출을 불러오지 못했습니다:",
      err
    );
    return next(error);
  }

  res.status(200).json({
    monthlyExpenses,
    totalYearlyExpense,
  });
};

exports.getTransactionById = getTransactionById;
exports.getTransactionsByUserId = getTransactionsByUserId;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
exports.getMonthlyTransactions = getMonthlyTransactions;
exports.getLatestYearExpenses = getLatestYearExpenses;
