const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password"); //비밀번호 제외한 모든 정보 가져오기
  } catch (err) {
    const error = new HttpError("유저 정보를 가져오는 데 실패했습니다.", 500);
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
      "회원가입에 실패했습니다.(기존 이메일 확인 절차 실패)",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("이미 등록된 이메일이 존재합니다.", 422);
    return next(error);
  }

  //회원가입
  const createdUser = new User({
    name,
    email,
    image:
      "https://www.google.com/url?sa=i&url=https%3A%2F%2Fgongu.copyright.or.kr%2Fgongu%2Fwrt%2Fwrt%2Fview.do%3FwrtSn%3D9046601%26menuNo%3D200018&psig=AOvVaw3wWURbvBWruX9ZYmAlvBnx&ust=1707057306920000&source=images&cd=vfe&opi=89978449&ved=0CBIQjRxqFwoTCLjtj56yj4QDFQAAAAAdAAAAABAE",
    password,
    transactions: [], //새 장소가 추가되면 자동으로 배열에 추가
    communityPosts: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      "회원가입에 실패했습니다. 재시도 해주세요.(새로운 회원 정보 저장 실패)",
      500
    );
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  //이메일 존재 여부 검증 위해 사전작업
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "로그인에 실패했습니다.(로그인 데이터베이스 접근 실패)",
      500
    );
    return next(error);
  }

  //이메일 존재 여부, 비밀번호 일치하는지 검사
  if (!existingUser || existingUser.password !== password) {
    const error = new HttpError(
      "이메일 혹은 비밀번호가 일치하지 않습니다.",
      401
    );
    return next(error);
  }

  const userInfo = new User({
    id: existingUser.id,
    email: existingUser.email,
    name: existingUser.username,
    image: existingUser.image,
    transactions: existingUser.transactions,
    communityPosts: existingUser.communityPosts,
  });

  res.json({ userInfo: userInfo.toObject({ getters: true }) });
};

exports.getUsers = getUsers;
exports.signUp = signUp;
exports.login = login;
