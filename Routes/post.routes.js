const express = require('express');
require("dotenv").config();
const { createPost, getPosts, getPostsExcludingUser, getPostsByUser } = require('../Controllers/postController');
const router = express.Router();

const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
        console.log('----------file', file);
        
      cb(null, `images/${Date.now()}_${file.originalname}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  })
});

router.get('/admin', getPosts);
router.get('/exclude/:id', getPostsExcludingUser);
router.get('/:id', getPostsByUser)
router.post('/create',/*  upload.single('image'), */ createPost);


module.exports = router;
