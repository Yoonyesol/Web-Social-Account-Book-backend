const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const Comment = require("../models/comment");
const User = require("../models/user");
const Community = require("../models/community");
const mongoose = require("mongoose");

const getCommentsByPostId = async (req, res, next) => {
  const postId = req.params.cid;

  let comments;
  try {
    comments = await Comment.find({ postId });
  } catch (e) {
    const error = new HttpError("댓글 내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (!comments) {
    const error = new HttpError(
      "해당 포스트에 대한 댓글 내역을 찾지 못했습니다.",
      404
    );
    return next(error);
  }

  res.status(200).json({ comments });
};

const getCommentsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let comments;
  try {
    comments = await Comment.find({ authorId: userId });
  } catch (e) {
    const error = new HttpError("댓글 내역을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (!comments || comments.length === 0) {
    return next(new HttpError("해당 유저의 댓글 내역을 찾지 못했습니다.", 404));
  }

  res.status(200).json({
    comments: comments.map((c) => c.toObject({ getters: true })),
  });
};

const createComment = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(HttpError(errors.array(), 422));
  }
  const { postId, authorId, authorName, content } = req.body;

  const createdComment = new Comment({
    postId,
    authorId,
    authorName,
    content,
    createdAt: new Date().getTime(),
  });

  let user;
  try {
    user = await User.findById(authorId);
  } catch (err) {
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

  let post;
  try {
    post = await Community.findById(postId);
  } catch (err) {
    const error = new HttpError("게시물id가 존재하지 않습니다.", 500);
    return next(error);
  }

  if (!post) {
    const error = new HttpError(
      "주어진 id에 해당하는 게시물을 찾을 수 없습니다.",
      404
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdComment.save({ session: sess });

    user.comments.push(createdComment);
    await user.save({ session: sess });

    post.comments.push(createdComment);
    await post.save({ session: sess });

    await sess.commitTransaction();
  } catch (e) {
    const error = new HttpError(
      "해당 ID의 댓글 내역을 저장하지 못했습니다.",
      500
    );
    return next(error);
  }

  res.status(200).json({ comment: createdComment });
};

const updateComment = async (req, res, next) => {
  const { content } = req.body;
  const commentId = req.params.rid;

  let comment;
  try {
    comment = await Comment.findById(commentId);
  } catch (e) {
    const error = new HttpError("해당 ID의 댓글을 불러오지 못했습니다.", 500);
    return next(error);
  }

  if (comment.authorId.toString() !== req.userData.userId) {
    const error = new HttpError("댓글을 수정할 수 있는 권한이 없습니다.", 401);
    return next(error);
  }

  comment.content = content;

  try {
    await comment.save();
  } catch (e) {
    const error = new HttpError("댓글 수정에 실패했습니다.", 500);
    return next(error);
  }

  res.status(200).json({ comment: comment.toObject({ getters: true }) });
};

const deleteComment = async (req, res, next) => {
  const commentId = req.params.rid;

  let comment;
  try {
    comment = await Comment.findById(commentId)
      .populate("authorId")
      .populate("postId");
  } catch (e) {
    const error = new HttpError("댓글을 불러올 수 없습니다.", 500);
    return next(error);
  }

  if (!comment) {
    const error = new HttpError("댓글을 찾을 수 없습니다.", 500);
    return next(error);
  }

  if (comment.authorId._id.toString() !== req.userData.userId) {
    const error = new HttpError("댓글을 삭제할 수 있는 권한이 없습니다.", 401);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await comment.deleteOne({ session: sess });

    comment.authorId.comments.pull(comment);
    await comment.authorId.save({ session: sess });

    comment.postId.comments.pull(comment);
    await comment.postId.save({ session: sess });

    await sess.commitTransaction();
  } catch (e) {
    const error = new HttpError("댓글을 삭제하지 못했습니다.", 500);
    return next(error);
  }

  res.status(200).json({ message: "삭제 완료", commentId });
};

exports.getCommentsByPostId = getCommentsByPostId;
exports.getCommentsByUserId = getCommentsByUserId;
exports.createComment = createComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
