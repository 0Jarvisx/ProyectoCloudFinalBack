const express = require('express');
const router = express.Router();
const { addComment, getComments, addLike, getLikes } = require('../Controllers/commentsController');

// Rutas de comentarios
router.post('/posts/:postId/comments', addComment);
router.get('/posts/:postId/comments', getComments);

// Rutas de likes
router.post('/posts/:postId/likes', addLike);
router.get('/posts/:postId/likes', getLikes);

module.exports = router;