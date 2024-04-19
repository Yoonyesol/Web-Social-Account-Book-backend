const express = require("express");

const router = express.Router();

const communityControllers = require("../controllers/community-controller");
const checkAuth = require("../middleware/check-auth");

router.get("/", communityControllers.getPosts);
router.get("/:cid", communityControllers.getPostById);
router.get("/user/:uid", communityControllers.getPostByUid);
router.get("/search/:option/:keyword", communityControllers.getSearchedPosts);

router.use(checkAuth);

router.post("/:cid/like", communityControllers.updateLike);
router.post("/", communityControllers.createPost);
router.patch("/:cid", communityControllers.updatePost);
router.delete("/:cid", communityControllers.deletePost);

module.exports = router;
