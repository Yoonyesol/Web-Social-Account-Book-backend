require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const transactionsRouter = require("./routes/transactions-routes");
const HttpError = require("./models/http-error");

const app = express();

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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    //db 연결이 성공할 경우 서버 연결
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
