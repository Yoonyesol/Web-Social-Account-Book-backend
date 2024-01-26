class HttpError extends Error {
  constructor(message, errorCode) {
    super(message); //'message' 프로퍼티 추가
    this.code = errorCode; //'code' 프로퍼티 추가
  }
}

module.exports = HttpError;
