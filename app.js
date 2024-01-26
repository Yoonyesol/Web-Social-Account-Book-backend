const express = require("express");

const app = express();

const transactionsRouter = require("./routes/transactions-routes");
const HttpError = require("./models/http-error");

const bodyParser = require("body-parser");

app.use(bodyParser.json());

app.use("/api/transactions", transactionsRouter);

// 앞선 라우트에게서 응답을 받지 못했을 경우에만 실행
app.use((req, res, next) => {
  throw new HttpError("라우트를 찾지 못했습니다.", 404);
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }

  res.status(error.code || 500);
  res.json({ message: error.message || "정의되지 않은 에러 발생" });
});

app.listen(5000);
