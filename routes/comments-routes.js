const express = require("express");

const router = express.Router();

const commentControllers = require("../controllers/comment-controller");
const checkAuth = require("../middleware/check-auth");

router.get("/:cid", commentControllers.getCommentsByPostId);
router.get("/user/:uid", commentControllers.getCommentsByUserId);

router.use(checkAuth);

router.post("/", commentControllers.createComment);
router.patch("/:rid", commentControllers.updateComment);

module.exports = router;
