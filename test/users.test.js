process.env.JWT_KEY = process.env.JWT_KEY || "test_jwt_key";
process.env.FRONT_END_URL = process.env.FRONT_END_URL || "http://localhost:5173";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");

let mongoServer;

const testUser = {
  name: "홍길동",
  email: "hong@test.com",
  password: "password123",
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  // 테스트 간 데이터가 섞이지 않도록 매 테스트 후 모든 컬렉션을 비운다.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("회원가입 (POST /api/users/signup)", () => {
  test("유효한 정보로 회원가입하면 201과 함께 유저 정보/토큰을 반환한다", async () => {
    const res = await request(app).post("/api/users/signup").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.userInfo).toMatchObject({
      email: testUser.email,
      name: testUser.name,
    });
  });

  test("이미 등록된 이메일이면 422를 반환한다", async () => {
    await request(app).post("/api/users/signup").send(testUser);

    const res = await request(app).post("/api/users/signup").send(testUser);

    expect(res.status).toBe(422);
  });

  test("비밀번호가 6자 미만이면 422를 반환한다", async () => {
    const res = await request(app)
      .post("/api/users/signup")
      .send({ ...testUser, password: "123" });

    expect(res.status).toBe(422);
  });

  test("이메일 형식이 아니면 422를 반환한다", async () => {
    const res = await request(app)
      .post("/api/users/signup")
      .send({ ...testUser, email: "not-an-email" });

    expect(res.status).toBe(422);
  });
});

describe("로그인 (POST /api/users/login)", () => {
  beforeEach(async () => {
    await request(app).post("/api/users/signup").send(testUser);
  });

  test("이메일/비밀번호가 올바르면 200과 함께 토큰을 반환한다", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  test("비밀번호가 틀리면 401을 반환한다", async () => {
    const res = await request(app).post("/api/users/login").send({ email: testUser.email, password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  test("존재하지 않는 이메일이면 401을 반환한다", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "nobody@test.com", password: testUser.password });

    expect(res.status).toBe(401);
  });
});

describe("인증 미들웨어 (GET /api/users/likedPosts)", () => {
  test("토큰 없이 요청하면 401을 반환한다", async () => {
    const res = await request(app).get("/api/users/likedPosts");

    expect(res.status).toBe(401);
  });

  test("형식은 있으나 유효하지 않은 토큰이면 401을 반환한다", async () => {
    const res = await request(app).get("/api/users/likedPosts").set("Authorization", "Bearer invalid.token.value");

    expect(res.status).toBe(401);
  });

  test("회원가입으로 발급받은 유효한 토큰이면 200과 likedPosts를 반환한다", async () => {
    const signupRes = await request(app).post("/api/users/signup").send(testUser);
    const { token } = signupRes.body;

    const res = await request(app).get("/api/users/likedPosts").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.likedPosts).toEqual([]);
  });
});
