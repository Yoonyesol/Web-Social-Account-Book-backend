const DUMMY_TRANSACTION = [
  {
    tid: "t1",
    uid: "u1",
    date: 1705029633942,
    category: "교통/차량",
    description: "버스비",
    amount: -4000,
    transaction_type: "지출",
    memo: "버스비",
  },
  {
    tid: "t2",
    uid: "u2",
    date: 1705129633942,
    category: "용돈",
    description: "용돈",
    amount: 12000,
    transaction_type: "수입",
    memo: "",
  },
  {
    tid: "t3",
    uid: "u1",
    date: 1705229633942,
    category: "문화비",
    description: "서적구매",
    amount: -25000,
    transaction_type: "지출",
    memo: "컴퓨터공학입문서 구입",
  },
  {
    tid: "t4",
    uid: "u2",
    date: 1709329633942,
    category: "식비",
    description: "외식비",
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
    const error = new Error("해당 ID에 대한 입출금내역을 찾지 못했습니다.");
    error.code = 404; //오류 상태
    throw error;
  }

  res.json({ transaction: transaction });
};

const getTransactionByUserId = (req, res, next) => {
  const userId = req.params.uid;

  console.log("0000");
  const user = DUMMY_TRANSACTION.filter((u) => {
    return u.uid === userId;
  });

  if (!user) {
    const error = new Error(
      "해당 유저 ID에 대한 입출금내역을 찾지 못했습니다."
    );
    error.code = 404;
    throw error;
  }

  res.json({ user: user });
};

exports.getTransactionById = getTransactionById;
exports.getTransactionByUserId = getTransactionByUserId;