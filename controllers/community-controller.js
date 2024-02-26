const mongoose = require("mongoose");

const Community = require("../models/community");
const User = require("../models/user");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");

//전체 게시글 불러오기
const getPosts = async (req, res, next) => {
  let posts;
  try {
    posts = await Community.find({});
  } catch (err) {
    const error = new HttpError("게시글 정보를 가져오는 데 실패했습니다.", 500);
    return next(error);
  }

  res.json({ posts: posts.map((post) => post.toObject({ getters: true })) });
};

//게시글 ID로 특정 게시글 불러오기
const getPostById = async (req, res, next) => {
  const postId = req.params.cid;

  let post;
  try {
    post = await Community.findById(postId);

    //조회수 증가
    post.hit++;
    await post.save();
  } catch (e) {
    const error = new HttpError("게시글을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (!post) {
    const error = new HttpError("해당 ID의 게시글을 찾지 못했습니다.", 404);
    return next(error);
  }

  res.json({ post: post.toObject({ getters: true }) });
};

//유저 ID로 게시글 가져오기
const getPostByUid = async (req, res, next) => {
  const userId = req.params.uid;

  let posts;
  try {
    posts = await Community.find({ "writer.uid": userId });
  } catch (e) {
    const error = new HttpError("게시글을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (!posts || posts.length === 0) {
    const error = new HttpError("해당 유저의 게시글을 찾지 못했습니다.", 404);
    return next(error);
  }

  res.json({ posts: posts.map((p) => p.toObject({ getters: true })) });
};

const createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(HttpError(errors.array(), 422));
  }

  const { writer, date, category, title, content } = req.body;

  let user;
  try {
    user = await User.findById(writer);
  } catch {
    const error = new HttpError("유저id가 존재하지 않습니다.", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "주어진 id에 해당하는 사용자가 존재하지 않습니다.",
      500
    );
    return next(error);
  }

  const createdPost = new Community({
    writer: {
      uid: user.id,
      name: user.name,
      image: user.image,
    },
    date,
    category,
    title,
    content,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPost.save({ session: sess });
    user.posts.push(createdPost);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (e) {
    const error = new HttpError("해당 ID의 게시글을 불러오지 못했습니다.", 500);
    return next(error);
  }

  res.status(201).json({ post: createdPost });
};

const updatePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(HttpError(errors.array(), 422));
  }

  const { category, title, content } = req.body;
  const postId = req.params.cid;

  let post;
  try {
    post = await Community.findById(postId);
  } catch (e) {
    const error = new HttpError("해당 ID의 게시글을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (post.writer.uid.toString() !== req.userData.userId) {
    const error = new HttpError(
      "게시글을 수정할 수 있는 권한이 없습니다.",
      401
    );
    return next(error);
  }

  post.category = category;
  post.title = title;
  post.content = content;

  try {
    await post.save();
  } catch (e) {
    const error = new HttpError("게시글 수정 실패", 500);
    return next(error);
  }

  res.status(200).json({ post: post.toObject({ getters: true }) });
};

const deletePost = async (req, res, next) => {
  const postId = req.params.cid;

  let post;
  try {
    post = await Community.findById(postId).populate("writer.uid");
  } catch (e) {
    const error = new HttpError("게시글을 불러올 수 없습니다.", 500);
    return next(error);
  }

  if (!post) {
    const error = new HttpError("게시글을 찾을 수 없습니다.", 500);
    return next(error);
  }

  if (post.writer.uid._id.toString() !== req.userData.userId) {
    const error = new HttpError(
      "게시글을 삭제할 수 있는 권한이 없습니다.",
      401
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await post.deleteOne({ session: sess });
    post.writer.uid.posts.pull(post);
    await post.writer.uid.save({ session: sess });
    await sess.commitTransaction();
  } catch (e) {
    const error = new HttpError("게시글을 삭제하지 못했습니다.", 500);
    return next(error);
  }

  res.status(200).json({ message: "삭제 완료", postId });
};

const updateLike = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(HttpError(errors.array(), 422));
  }

  const postId = req.params.cid;
  const userId = req.userData.userId;

  let post;
  try {
    post = await Community.findById(postId);
  } catch (e) {
    const error = new HttpError("해당 ID의 게시글을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (!post) {
    const error = new HttpError("게시글을 찾을 수 없습니다.", 404);
    return next(error);
  }

  let user;
  try {
    user = await User.findById(userId);
  } catch (e) {
    const error = new HttpError("해당 ID의 사용자를 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("사용자를 찾을 수 없습니다.", 404);
    return next(error);
  }

  //현재 사용자가 이미 해당 게시물에 좋아요를 눌렀는지 확인
  const userLiked = post.like.includes(userId);

  try {
    if (userLiked) {
      post.like.pull(userId);
      user.likedPosts.pull(postId);
    } else {
      post.like.push(userId);
      user.likedPosts.push(postId);
    }
    await post.save();
    await user.save();

    res.status(200).json({ message: "좋아요가 업데이트되었습니다." });
  } catch (e) {
    const error = new HttpError("좋아요 업데이트에 실패했습니다.", 500);
    return next(error);
  }
};

exports.getPosts = getPosts;
exports.getPostById = getPostById;
exports.getPostByUid = getPostByUid;
exports.createPost = createPost;
exports.updatePost = updatePost;
exports.deletePost = deletePost;
exports.updateLike = updateLike;
