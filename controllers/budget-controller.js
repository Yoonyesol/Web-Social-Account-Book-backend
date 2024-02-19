const User = require("../models/user");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");

const getBudgetByMonthYear = async (req, res, next) => {
  const userId = req.params.uid;
  const { date } = req.params;
  const [year, month] = date.split("-");

  try {
    let user = await User.findById(userId);
    if (!user) {
      throw new HttpError("해당 ID의 사용자를 찾을 수 없습니다.", 404);
    }

    let budget = user.budgets.find((budget) => {
      const [bYear, bMonth] = budget.monthYear.split("-");
      return (
        parseInt(bYear) === parseInt(year) &&
        parseInt(bMonth) === parseInt(month)
      );
    });

    // 데이터가 없는 경우 새로운 예산 생성
    if (!budget) {
      budget = { monthYear: `${year}-${month}`, amount: 0 }; // 기본값은 0으로 설정하거나 필요에 따라 변경
      user.budgets.push(budget);
      await user.save();
    }

    res.status(200).json({ budget: budget.toObject({ getters: true }) });
  } catch (err) {
    const error = new HttpError("예산 정보를 가져오는 데 실패했습니다.", 500);
    return next(error);
  }
};

const updateBudget = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("올바르지 않은 입력 값입니다.", 422));
  }

  const { monthYear, amount } = req.body;
  const userId = req.params.uid;
  const budgetId = req.params.bid;

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new HttpError("해당 ID의 사용자를 찾을 수 없습니다.", 404);
    }

    const budgetIndex = user.budgets.findIndex(
      (budget) => budget._id.toString() === budgetId
    );
    if (budgetIndex === -1) {
      throw new HttpError("해당 ID의 예산을 찾을 수 없습니다.", 404);
    }

    user.budgets[budgetIndex].monthYear = monthYear;
    user.budgets[budgetIndex].amount = amount;
    await user.save();

    res
      .status(200)
      .json({ budget: user.budgets[budgetIndex].toObject({ getters: true }) });
  } catch (err) {
    const error = new HttpError(
      "예산 정보를 업데이트하는 데 실패했습니다.",
      500
    );
    return next(error);
  }
};

exports.getBudgetByMonthYear = getBudgetByMonthYear;
exports.updateBudget = updateBudget;
