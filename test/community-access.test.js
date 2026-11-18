process.env.JWT_KEY = process.env.JWT_KEY || "test_jwt_key";

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const app = require("../app");
const Community = require("../models/community");
const Comment = require("../models/comment");

let database;
let member;
let publicPost;
let legacyPost;
const otherUserId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(database.getUri());

  const signup = await request(app).post("/api/users/signup").send({
    name: "Community member",
    email: "community@example.com",
    password: "password123",
  }).expect(201);
  member = signup.body;
  const writer = { uid: new mongoose.Types.ObjectId(member.userInfo.userId), name: member.userInfo.name };
  const post = {
    writer, index: 1, date: new Date(), category: "general",
    title: "Budget discussion", content: "Test content", hit: 0,
  };
  publicPost = await Community.create({ ...post, isPublic: true, like: [otherUserId] });
  legacyPost = (await Community.collection.insertOne(post)).insertedId;
  await Comment.create({
    postId: publicPost.id, authorId: writer.uid, authorName: writer.name, content: "Public reply",
  });
  await Comment.create({
    postId: legacyPost, authorId: writer.uid, authorName: writer.name, content: "Members-only reply",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await database?.stop();
});

test("guests can list and search only explicitly public posts", async () => {
  const list = await request(app).get("/api/community").expect(200);
  const search = await request(app).get("/api/community/search/title/Budget").expect(200);

  expect(list.headers["cache-control"]).toBe("private, no-store");
  expect(list.body.posts.map(({ id }) => id)).toEqual([publicPost.id]);
  expect(search.body.searchedData.map(({ id }) => id)).toEqual([publicPost.id]);
  expect(list.body.posts[0]).toMatchObject({ likeCount: 1, writer: { name: member.userInfo.name } });
  expect(list.body.posts[0]).not.toHaveProperty("like");
  expect(list.body.posts[0].writer).not.toHaveProperty("uid");
});

test("direct links and comment reads respect the parent post visibility", async () => {
  await request(app).get("/api/community/" + legacyPost).expect(404);
  await request(app).get("/api/comment/" + legacyPost).expect(404);
  await request(app).get("/api/community/" + publicPost.id).expect(200);
  const comments = await request(app).get("/api/comment/" + publicPost.id).expect(200);
  expect(comments.body.comments[0]).toMatchObject({ content: "Public reply" });
  expect(comments.body.comments[0]).not.toHaveProperty("authorId");

  const bearer = "Bearer " + member.token;
  await request(app).get("/api/community/" + legacyPost).set("Authorization", bearer).expect(200);
  const legacyComments = await request(app).get("/api/comment/" + legacyPost).set("Authorization", bearer).expect(200);
  expect(legacyComments.body.comments[0]).toMatchObject({ content: "Members-only reply" });
});

test("write endpoints require a session and use the signed-in author", async () => {
  await request(app).post("/api/community").expect(401);
  await request(app).post("/api/comment").expect(401);
  await request(app).post("/api/community/" + publicPost.id + "/like").expect(401);
  await request(app).get("/api/transactions/" + publicPost.id).expect(401);

  const differentMember = jwt.sign({ userId: String(otherUserId) }, process.env.JWT_KEY);
  await request(app).patch("/api/community/" + publicPost.id)
    .set("Authorization", "Bearer " + differentMember).expect(401);

  const bearer = "Bearer " + member.token;
  const created = await request(app).post("/api/community").set("Authorization", bearer).send({
    writer: otherUserId, title: "New discussion", category: "general", content: "New post", isPublic: true,
  }).expect(201);
  expect(created.body.post.writer.uid).toBe(member.userInfo.userId);
  const postId = created.body.post._id;
  await request(app).get("/api/community/" + postId).expect(200);

  const reply = await request(app).post("/api/comment").set("Authorization", bearer).send({
    postId, authorId: otherUserId, authorName: "Different author", content: "New reply",
  }).expect(200);
  expect(reply.body.comment).toMatchObject({
    authorId: member.userInfo.userId, authorName: member.userInfo.name,
  });
});
