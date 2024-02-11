const express = require("express");

const router = express.Router();

const communityControllers = require("../controllers/community-controller");

router.get("/", communityControllers.getPosts);
router.get("/:cid", communityControllers.getPostById);
router.get("/user/:uid", communityControllers.getPostByUid);
router.post("/", communityControllers.createPost);
router.patch("/:cid", communityControllers.updatePost);

module.exports = router;
