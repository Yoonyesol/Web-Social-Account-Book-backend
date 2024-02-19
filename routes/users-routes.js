const express = require("express");
const { check } = require("express-validator");

const router = express.Router();

const userControllers = require("../controllers/user-controller");
const budgetControllers = require("../controllers/budget-controller");

router.get("/", userControllers.getUsers);
router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  userControllers.signUp
);
router.post("/login", userControllers.login);

router.get("/budget/:uid/:date", budgetControllers.getBudgetByMonthYear);
router.patch("/budget/:uid/:bid", budgetControllers.updateBudget);

module.exports = router;
