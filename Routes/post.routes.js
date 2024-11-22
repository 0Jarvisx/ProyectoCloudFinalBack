const express = require('express');
require("dotenv").config();
const { createPost, getPosts, getPostsExcludingUser, getPostsByUser } = require('../Controllers/postController');
const router = express.Router();

router.get('/admin', getPosts);
router.get('/exclude/:id', getPostsExcludingUser);
router.get('/:id', getPostsByUser)
router.post('/create', createPost);


module.exports = router;
