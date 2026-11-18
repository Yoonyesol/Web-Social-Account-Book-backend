const express = require("express");

const router = express.Router();

const communityControllers = require("../controllers/community-controller");
const checkAuth = require("../middleware/check-auth");

router.get("/", checkAuth.optional, communityControllers.getPosts);
router.get("/search/:option/:keyword", checkAuth.optional, communityControllers.getSearchedPosts);
router.get("/:cid", checkAuth.optional, communityControllers.getPostById);

router.use(checkAuth);

router.get("/user/:uid", communityControllers.getPostByUid);
router.post("/:cid/like", communityControllers.updateLike);
router.post("/", communityControllers.createPost);
router.patch("/:cid", communityControllers.updatePost);
router.delete("/:cid", communityControllers.deletePost);

module.exports = router;
