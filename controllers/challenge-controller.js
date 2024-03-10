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
  const { date, budget } = req.params;
  const [year, month] = date.split("-");

  let similarBudgetUsers;

  try {
    const users = await User.find(
      {},
      { _id: 1, name: 1, email: 1, budgets: 1, transactions: 1 }
    ).populate("transactions");

    if (!users || users.length === 0) {
      throw new HttpError("사용자 정보를 불러올 수 없습니다.", 404);
    }

    //예산이 0인 사용자와 아닌 사용자 분리
    const zeroBudgetUsers = [];
    const nonZeroBudgetUsers = [];

    users.forEach((user) => {
      const { budgets } = user;
      const userBudget = budgets.find((b) => {
        const [bYear, bMonth] = b.monthYear.split("-");
        return bYear === year && bMonth === month;
      });

      if (userBudget) {
        if (userBudget.amount === 0) {
          zeroBudgetUsers.push(user);
        } else {
          nonZeroBudgetUsers.push(user);
        }
      }
    });

    //나의 예산이 0인 경우, 이번 달 예산이 0인 사람들의 랭킹을 카운트
    if (parseFloat(budget) === 0) {
      zeroBudgetUsers.sort((a, b) => a.name.localeCompare(b.name));
      similarBudgetUsers = zeroBudgetUsers.map((user) => {
        return {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          expenseRatio: 0, // 예산이 0인 경우 지출 비율은 항상 0
        };
      });
    } else {
      //나의 예산이 0이 아닌 경우, 내 예산 기준 ±10%의 예산을 가진 사람들 랭킹을 카운트
      similarBudgetUsers = nonZeroBudgetUsers
        .map((user) => {
          const { budgets, transactions } = user;

          let userBudget;
          for (const b of budgets) {
            const [bYear, bMonth] = b.monthYear.split("-");
            if (bYear === year && bMonth === month) {
              userBudget = b;
              break;
            }
          }

          if (!userBudget || userBudget.amount === 0) {
            return null;
          }

          const tolerance = 0.1; //10% 허용 오차
          if (
            userBudget.amount >= parseFloat(budget) * (1 - tolerance) &&
            userBudget.amount <= parseFloat(budget) * (1 + tolerance)
          ) {
            const totalExpense = transactions.reduce((total, transaction) => {
              const transactionYear = new Date(transaction.date).getFullYear();
              const transactionMonth =
                new Date(transaction.date).getMonth() + 1;
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

            const expenseRatio = totalExpense / userBudget.amount;

            return {
              userId: user._id,
              userName: user.name,
              userEmail: user.email,
              expenseRatio,
            };
          } else {
            return null;
          }
        })
        .filter((item) => item !== null)
        .sort((a, b) => a.expenseRatio - b.expenseRatio);
    }
  } catch (error) {
    const err = new HttpError(
      "예산 대비 지출 정보를 가져오는 데 실패했습니다.",
      500
    );
    return next(err);
  }

  res.status(200).json({ similarBudgetUsers });
};

exports.getBudgetExpenseRatio = getBudgetExpenseRatio;
exports.getSimilarBudgetExpenseRatio = getSimilarBudgetExpenseRatio;
