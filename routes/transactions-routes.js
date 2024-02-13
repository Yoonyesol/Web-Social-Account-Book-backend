const express = require("express");

const router = express.Router(); //특수 객체 생성

const transactionsControllers = require("../controllers/transactions-controller");
const checkAuth = require("../middleware/check-auth");

//라우트에 요청이 도달하면 실행되는 함수
router.get("/:tid", transactionsControllers.getTransactionById);
router.get("/user/:uid", transactionsControllers.getTransactionsByUserId);

//이 아래 라우트부터는 토큰을 검증하여 접근가능.(라우트 보호)
router.use(checkAuth);

router.post("/", transactionsControllers.createTransaction);
router.patch("/:tid", transactionsControllers.updateTransaction);
router.delete("/:tid", transactionsControllers.deleteTransaction);

module.exports = router;
