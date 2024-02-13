const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password"); //비밀번호 제외한 모든 정보 가져오기
  } catch (err) {
    const error = new HttpError(
      "유저 정보를 가져오는 데 실패했습니다. 잠시 후 다시 시도 해주세요.",
      500
    );
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signUp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("유효하지 않은 데이터가 존재합니다.", 422));
  }

  const { name, email, password } = req.body;

  //기존 등록된 이메일인지 확인
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "회원가입에 실패했습니다. 잠시 후 다시 시도 해주세요.(기존 이메일 확인 절차 실패)",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "이미 등록된 이메일이 존재합니다. 다른 이메일로 회원가입 해주세요.",
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    hashedPassword = await bcrypt.hash(password, salt);
  } catch (err) {
    const error = new HttpError("유저를 생성할 수 없습니다.", 500);
    return next(error);
  }

  //회원가입
  const createdUser = new User({
    name,
    email,
    image:
      "https://www.google.com/url?sa=i&url=https%3A%2F%2Fgongu.copyright.or.kr%2Fgongu%2Fwrt%2Fwrt%2Fview.do%3FwrtSn%3D9046601%26menuNo%3D200018&psig=AOvVaw3wWURbvBWruX9ZYmAlvBnx&ust=1707057306920000&source=images&cd=vfe&opi=89978449&ved=0CBIQjRxqFwoTCLjtj56yj4QDFQAAAAAdAAAAABAE",
    password: hashedPassword,
    transactions: [], //새 장소가 추가되면 자동으로 배열에 추가
    communityPosts: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      "회원가입에 실패했습니다. 잠시 후 다시 시도 해주세요.(새로운 회원 정보 저장 실패)",
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
      }, //토큰에 인코딩할 정보
      "social_accountbook_secret_key_important", //private key
      { expiresIn: "3h" } //만료기간
    );
  } catch (err) {
    const error = new HttpError(
      "회원가입에 실패했습니다. 잠시 후 다시 시도 해주세요.",
      500
    );
    return next(error);
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
    token: token,
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  //이메일 존재 여부 검증 위해 사전작업
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "로그인에 실패했습니다. 잠시 후 다시 시도 해주세요.(로그인 데이터베이스 접근 실패)",
      500
    );
    return next(error);
  }

  //이메일 존재 여부, 비밀번호 일치하는지 검사
  if (!existingUser) {
    const error = new HttpError(
      "이메일 혹은 비밀번호가 일치하지 않습니다.",
      401
    );
    return next(error);
  }

  //입력받은 비밀번호와 기존 회원의 비밀번호 비교
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "비밀번호가 일치하지 않습니다. 비밀번호를 확인 후 다시 시도해주세요.",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "이메일 혹은 비밀번호가 일치하지 않습니다.",
      401
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
      },
      "social_accountbook_secret_key_important", //private key
      { expiresIn: "3h" } //만료기간
    );
  } catch (err) {
    const error = new HttpError("로그인에 실패했습니다. 재시도 해주세요.", 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signUp = signUp;
exports.login = login;
