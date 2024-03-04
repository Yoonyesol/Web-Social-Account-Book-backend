const express = require("express");

const router = express.Router();

const challengeController = require("../controllers/challenge-controller");

router.get("/:date", challengeController.getBudgetExpenseRatio);
router.get(
  "/similar/:uid/:date",
  challengeController.getSimilarBudgetExpenseRatio
);

module.exports = router;
