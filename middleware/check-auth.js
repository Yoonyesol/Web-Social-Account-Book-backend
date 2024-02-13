const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  try {
    //새로 들어온 요청의 헤더에서 토큰을 추출
    const token = req.headers.authorization.split(" ")[1];
    //토큰이 존재하지 않는 경우
    if (!token) {
      throw new Error("인증에 실패했습니다!");
    }
    //토큰이 존재하는 경우 토큰 검증. 반환값은 토큰에 부호화된 페이로드
    const decodedToken = jwt.verify(
      token,
      "social_accountbook_secret_key_important"
    );

    req.useData = { userId: decodedToken.userId }; //사용자 id 추출
    next(); //인증 요구 라우트로 이동
  } catch (err) {
    const error = new HttpError("인증에 실패했습니다!", 401);
    return next(error);
  }
};
