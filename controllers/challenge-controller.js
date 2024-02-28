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

exports.getBudgetExpenseRatio = getBudgetExpenseRatio;
