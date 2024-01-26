const express = require("express");

const router = express.Router(); //특수 객체 생성

const transactionsControllers = require("../controllers/transactions-controller");

//라우트에 요청이 도달하면 실행되는 함수
router.get("/:tid", transactionsControllers.getTransactionById);

router.get("/user/:uid", transactionsControllers.getTransactionByUserId);

router.post("/", transactionsControllers.createTransaction);

module.exports = router;
