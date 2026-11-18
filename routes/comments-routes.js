const express = require("express");

const router = express.Router();

const commentControllers = require("../controllers/comment-controller");
const checkAuth = require("../middleware/check-auth");

router.get("/:cid", checkAuth.optional, commentControllers.getCommentsByPostId);

router.use(checkAuth);
router.get("/user/:uid", commentControllers.getCommentsByUserId);

router.post("/", commentControllers.createComment);
router.patch("/:rid", commentControllers.updateComment);
router.delete("/:rid", commentControllers.deleteComment);

module.exports = router;
