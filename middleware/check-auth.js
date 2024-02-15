require("dotenv").config();

const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  // 서버에게 확인을 위해 보내는 OPTIONS 요청을 차단하지 않도록 처리
  if (req.method === "OPTIONS") {
    return next(); // 다음 요청 처리
  }

  try {
    // 헤더에 Authorization이 존재하는지 확인
    if (!req.headers.authorization) {
      throw new Error("인증에 실패했습니다!");
    }

    // 새로 들어온 요청의 헤더에서 토큰을 추출
    const token = req.headers.authorization.split(" ")[1];

    // 토큰이 존재하지 않는 경우
    if (!token) {
      throw new Error("인증에 실패했습니다!");
    }

    // 토큰이 존재하는 경우 토큰 검증. 반환값은 토큰에 부호화된 페이로드
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { userId: decodedToken.userId }; // 사용자 id 추출
    next(); // 인증 요구 라우트로 이동
  } catch (err) {
    const error = new HttpError("인증에 실패했습니다!", 401);
    return next(error);
  }
};
