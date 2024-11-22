const { successResponse, errorResponse } = require("../inc/reponses");
const Post = require("../Models/Post");
const User = require("../Models/User");
const Comment = require("../Models/Comments");
const Like = require("../Models/Likes");
const { Op } = require("sequelize");
const { logEvent } = require("../inc/Logger");
require("dotenv").config();
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
const sns = new AWS.SNS();

exports.createPost = async (req, res) => {
  try {
    const { title, description, userId, image } = req.body;

    let imageUrl = null; 

    if (image) {

      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${Date.now()}.jpg`;
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `images/${fileName}`,
        Body: buffer,
        ContentType: "image/jpeg",
      };

      const uploadResponse = await s3.upload(params).promise();
      imageUrl = uploadResponse.Location;
      console.log("Imagen subida a S3:", imageUrl);
    }

    const post = await Post.create({
      title,
      description,
      image: imageUrl, 
      userId,
    });

    const user = await User.findByPk(userId);

    const eventData = {
      eventType: "CREATE",
      entityId: post.id,
      recurso: post.image,
      entityType: "Post",
      message: `El post con ID ${post.id} fue creado por el usuario con ID ${userId}`,
    };

    if (process.env.ENVIROMENT === "productive") logEvent(eventData);

    const topicArn = process.env.SNS_URL;
    const response = await sns.listSubscriptionsByTopic({ TopicArn: topicArn }).promise();

    const verifiedSubscribers = response.Subscriptions.filter(
      (subscription) =>
        subscription.SubscriptionArn !== "PendingConfirmation" &&
        subscription.Endpoint !== user.email
    );

    const message = `Nueva publicación de ${user.name}, te podría interesar:
      - Descripción: ${description}
      - ID del Post: ${post.id}
    `;

   /*  await publishToSNS(topicArn, message, "Nuevo Post", subscriber.Endpoint);
    */

    res.status(201).json(successResponse("Creado exitosamente", post, 200));
  } catch (error) {
    res.status(400).json(errorResponse(error.message, 400));
  }
};


exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.findAll({
      include: [
        { model: User, attributes: ["id", "name"] },
        { model: Comment, include: { model: User, attributes: ["name"] } },
        { model: Like, attributes: ["id"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      author: post.User?.name || "Desconocido",
      content: post.description,
      image: post.image || null,
      likes: post.Likes.length,
      comments: post.Comments.map((comment) => ({
        content: comment.content,
        author: comment.User?.name || "Anónimo",
      })),
      timestamp: new Date(post.createdAt),
    }));

    res
      .status(200)
      .json(successResponse("Todos los posts", formattedPosts, 200));

    formattedPosts.forEach(async (post) => {
      if (process.env.ENVIROMENT === "productive")
        await logEvent({
          eventType: "FETCH_POST",
          entityId: post.image,
          entityType: "Post",
          message: `Post con ID ${post.id} fue recuperado.`,
        });
    });
  } catch (error) {
    res.status(500).json(errorResponse(error.message, 500));
  }
};

exports.getPostsExcludingUser = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Post.findAndCountAll({
      where: { userId: { [Op.ne]: userId } },
      include: [
        { model: User, attributes: ["id", "name"] },
        { model: Comment, include: { model: User, attributes: ["name"] } },
        { model: Like, attributes: ["id"] },
      ],
      limit: limitNum,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const formattedPosts = rows.map((post) => ({
      id: post.id,
      author: post.User?.name || "Desconocido",
      content: post.description,
      image: post.image || null,
      likes: post.Likes.length,
      comments: post.Comments.map((comment) => ({
        content: comment.content,
        author: comment.User?.name || "Anónimo",
      })),
      timestamp: new Date(post.createdAt).toLocaleString("es-ES", {
        timeZone: "UTC",
      }),
    }));

    res.status(200).json(
      successResponse(
        "Posts",
        {
          currentPage: pageNum,
          totalPages: Math.ceil(count / limitNum),
          totalPosts: count,
          posts: formattedPosts,
        },
        200
      )
    );

    formattedPosts.forEach(async (post) => {
      if (process.env.ENVIROMENT === "productive")
        await logEvent({
          eventType: "FETCH_POST_EXCLUDE_USER",
          entityId: post.id,
          entityType: "Post",
          message: `Post con ID ${post.id} fue recuperado excluyendo al usuario ${userId}.`,
        });
    });
  } catch (error) {
    res.status(500).json(errorResponse(error.message, 500));
  }
};

exports.getPostsByUser = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Post.findAndCountAll({
      where: { userId },
      include: [
        { model: User, attributes: ["id", "name"] },
        { model: Comment, include: { model: User, attributes: ["name"] } },
        { model: Like, attributes: ["id"] },
      ],
      limit: limitNum,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const formattedPosts = rows.map((post) => ({
      id: post.id,
      author: post.User?.name || "Desconocido",
      content: post.description,
      image: post.image || null,
      likes: post.Likes.length,
      comments: post.Comments.map((comment) => ({
        content: comment.content,
        author: comment.User?.name || "Anónimo",
      })),
      timestamp: new Date(post.createdAt).toLocaleString("es-ES", {
        timeZone: "UTC",
      }),
    }));

    res.status(200).json(
      successResponse(
        "Posts",
        {
          currentPage: pageNum,
          totalPages: Math.ceil(count / limitNum),
          totalPosts: count,
          posts: formattedPosts,
        },
        200
      )
    );

    formattedPosts.forEach(async (post) => {
      if (process.env.ENVIROMENT === "productive")
        await logEvent({
          eventType: "FETCH_POST_BY_USER",
          entityId: post.id,
          entityType: "Post",
          message: `Post con ID ${post.id} recuperado para el usuario ${userId}.`,
        });
    });
  } catch (error) {
    res.status(500).json(errorResponse(error.message, 500));
  }
};
