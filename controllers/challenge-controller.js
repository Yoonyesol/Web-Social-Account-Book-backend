const User = require("../models/user");
const HttpError = require("../models/http-error");

const getBudgetExpenseRatio = async (req, res, next) => {
  const { date } = req.params;
  const [year, month] = date.split("-");

  let challenge;

  try {
    const users = await User.find(
      {},
      { _id: 1, name: 1, email: 1, budgets: 1, transactions: 1 }
    ).populate("transactions");

    if (!users || users.length === 0) {
      throw new HttpError("사용자 정보를 불러올 수 없습니다.", 404);
    }

    const ranking = users
      .map((user) => {
        const { budgets, transactions } = user;

        let budget;
        //파라미터로 받은 연도-월에 해당하는 예산 찾기
        for (const b of budgets) {
          const [bYear, bMonth] = b.monthYear.split("-");
          if (bYear === year && bMonth === month) {
            budget = b;
            break;
          }
        }

        //예산이 없거나 0인 경우 랭킹에서 제외(사용자가 예산을 설정하지 않은 경우)
        if (!budget || budget.amount === 0) {
          return null;
        }

        //파라미터로 받은 연도-월에 해당하는 지출 합계 계산
        const totalExpense = transactions.reduce((total, transaction) => {
          const transactionYear = new Date(transaction.date).getFullYear();
          const transactionMonth = new Date(transaction.date).getMonth() + 1;
          if (
            transactionYear === parseInt(year) &&
            transactionMonth === parseInt(month) &&
            transaction.transaction_type === false
          ) {
            return total + transaction.amount;
          } else {
            return total;
          }
        }, 0);

        //예산 대비 지출 비율 계산
        const expenseRatio = totalExpense / budget.amount;

        return {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          expenseRatio,
        };
      })
      .filter((item) => item !== null); //예산 대비 지출 비율이 0인 경우 제외(제거 시 에러남)

    //예산 대비 지출 비율이 작은 순으로 정렬
    ranking.sort((a, b) => a.expenseRatio - b.expenseRatio);

    challenge = ranking;
  } catch (error) {
    const err = new HttpError(
      "예산 대비 지출 정보를 가져오는 데 실패했습니다.",
      500
    );
    return next(err);
  }

  res.status(200).json({ challenge });
};

const getSimilarBudgetExpenseRatio = async (req, res, next) => {
  const { uid, date } = req.params;
  const [year, month] = date.split("-");

  try {
    const user = await User.findById(uid, {
      name: 1,
      email: 1,
      budgets: 1,
      transactions: 1,
    }).populate("transactions");
    if (!user) {
      throw new HttpError("사용자 정보를 찾을 수 없습니다.", 404);
    }

    const { budgets, transactions } = user;

    let budget;
    //파라미터로 받은 연도-월에 해당하는 예산 찾기
    for (const b of budgets) {
      const [bYear, bMonth] = b.monthYear.split("-");
      if (bYear === year && bMonth === month) {
        budget = b;
        break;
      }
    }

    //예산이 0이거나 null인 사용자들만 비교(예산 설정 안 한 사람들)
    if (!budget || budget.amount === 0) {
      const zeroUsers = await User.find({
        "budgets.amount": 0,
      })
        .populate("transactions")
        .sort({ name: 1 }); //이름순 정렬

      const zeroBudgetUsers = [];

      zeroUsers.map((user) => {
        zeroBudgetUsers.push({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          expenseRatio: 0, //지출이 없는 경우 비율을 0으로 처리
        });
      });

      return res.status(200).json({
        similarBudgetUsers: zeroBudgetUsers,
      });
    }

    //예산이 0이 아닌 사용자들 중에서 유사한 범위의 예산을 가진 사용자 찾기
    const tolerance = 0.1; //10% 허용 오차
    const similarUsers = await User.find({
      "budgets.amount": { $ne: 0 }, //예산이 0이 아닌 사용자들만 비교
      "budgets.amount": {
        $gte: budget.amount * (1 - tolerance), //하한선
        $lte: budget.amount * (1 + tolerance), //상한선
      },
    }).populate("transactions");

    //각 사용자의 expenseRatio 계산 후 similarBudgetUsers 배열에 추가
    const similarBudgetUsers = similarUsers.map((user) => {
      const userTotalExpense = transactions.reduce((total, transaction) => {
        const transactionYear = new Date(transaction.date).getFullYear();
        const transactionMonth = new Date(transaction.date).getMonth() + 1;
        if (
          transactionYear === parseInt(year) &&
          transactionMonth === parseInt(month) &&
          transaction.transaction_type === false
        ) {
          return total + transaction.amount;
        } else {
          return total;
        }
      }, 0);
      const expenseRatio = userTotalExpense / budget.amount;

      return {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        expenseRatio,
      };
    });

    similarBudgetUsers.sort((a, b) => b.expenseRatio - a.expenseRatio);

    res.status(200).json({
      similarBudgetUsers,
    });
  } catch (error) {
    const err = new HttpError(
      "유사한 예산 범위를 가진 사용자 정보를 가져오는 데 실패했습니다.",
      500
    );
    return next(err);
  }
};

exports.getBudgetExpenseRatio = getBudgetExpenseRatio;
exports.getSimilarBudgetExpenseRatio = getSimilarBudgetExpenseRatio;
