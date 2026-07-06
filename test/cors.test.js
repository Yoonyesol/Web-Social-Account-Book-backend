process.env.JWT_KEY = process.env.JWT_KEY || "test_jwt_key";
process.env.FRONT_END_URL = process.env.FRONT_END_URL || "http://localhost:5173";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("CORS 설정", () => {
  test("인증이 필요한 라우트라도 OPTIONS 프리플라이트 요청은 204와 CORS 헤더를 즉시 반환한다", async () => {
    // 수정 전에는 OPTIONS를 처리하는 라우트가 없어 404로 응답하면서
    // 브라우저가 프리플라이트 실패로 판단해 실제 요청(GET)을 보내지 않는 문제가 있었다.
    const res = await request(app)
      .options("/api/users/likedPosts")
      .set("Origin", process.env.FRONT_END_URL)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "Authorization");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(process.env.FRONT_END_URL);
    expect(res.headers["access-control-allow-methods"]).toEqual(expect.stringContaining("GET"));
    expect(res.headers["access-control-allow-headers"]).toEqual(expect.stringContaining("Authorization"));
  });

  test("일반 요청 응답에도 Access-Control-Allow-Origin 헤더가 설정된 FRONT_END_URL 값으로 포함된다", async () => {
    const res = await request(app).get("/api/users").set("Origin", process.env.FRONT_END_URL);

    expect(res.headers["access-control-allow-origin"]).toBe(process.env.FRONT_END_URL);
  });

  test("허용되지 않은 origin으로 요청해도 응답의 Access-Control-Allow-Origin은 FRONT_END_URL 고정값이다", async () => {
    const res = await request(app).get("/api/users").set("Origin", "http://evil.example.com");

    expect(res.headers["access-control-allow-origin"]).toBe(process.env.FRONT_END_URL);
    expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil.example.com");
  });

  test("허용되지 않은 메서드(PUT)로 프리플라이트를 보내면 Access-Control-Allow-Methods에 PUT이 없다", async () => {
    const res = await request(app)
      .options("/api/users/likedPosts")
      .set("Origin", process.env.FRONT_END_URL)
      .set("Access-Control-Request-Method", "PUT");

    expect(res.headers["access-control-allow-methods"]).toEqual(expect.not.stringContaining("PUT"));
  });
});
