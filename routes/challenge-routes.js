const express = require("express");

const router = express.Router();

const checkAuth = require("../middleware/check-auth");
const challengeController = require("../controllers/challenge-controller");

router.use(checkAuth);

router.get("/:date", challengeController.getBudgetExpenseRatio);
router.get(
  "/similar/:date/:budget",
  challengeController.getSimilarBudgetExpenseRatio
);

module.exports = router;
