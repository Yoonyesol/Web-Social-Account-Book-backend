const express = require("express");

const app = express();

const transactionsRouter = require("./routes/transactions-routes");

const bodyParser = require("body-parser");
// 본문을 먼저 파싱 -> 본문의 json 데이터를 추출해서 객체나 배열 같이 일반적인 js 구조로 변환
app.use(bodyParser.json());

// 경로가 "/api/transactions"로 시작된다면 transactionsRouter 실행
app.use("/api/transactions", transactionsRouter);

//오류 처리 미들웨어 함수
app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }

  res.status(error.code || 500);
  res.json({ message: error.message || "정의되지 않은 에러 발생" });
});

app.listen(5000);
