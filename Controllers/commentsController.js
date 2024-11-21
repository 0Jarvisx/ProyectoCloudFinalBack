const Comment = require('../Models/Comments');
const Like = require('../Models/Likes');
const Post = require('../Models/Post');
const User = require('../Models/User');
const { logEvent } = require('../inc/Logger');
const {successResponse, errorResponse } = require('../inc/reponses');
require("dotenv").config();
// Agregar un comentario
const addComment = async (req, res) => {
  const { content, postId, userId } = req.body;
  try {
    const comment = await Comment.create({ content, postId, userId });

    // Registrar evento
    const eventData = {
      eventType: "CREATE",
      entityId: comment.id,
      entityType: "COMMENT",
      message: `Comentario agregado al post con ID ${postId} por el usuario ${userId}`,
    };
    
    res
    .status(201)
    .json(successResponse("Comentario agregado exitosamente", comment, 201));
    if(process.env.ENVIROMENT === 'productive') await logEvent(eventData);
  } catch (error) {
    res.status(400).json(errorResponse(error.message, 400));
  }
};

// Obtener comentarios de un post
const getComments = async (req, res) => {
  const { postId } = req.params;
  try {
    const comments = await Comment.findAll({
      where: { postId },
      include: [{ model: User, attributes: ["username"] }],
    });

    const eventData = {
      eventType: "READ",
      entityId: postId,
      entityType: "POST_COMMENTS",
      message: `Comentarios obtenidos para el post con ID ${postId}`,
    };
    
    res
    .status(200)
    .json(successResponse("Comentarios obtenidos exitosamente", comments, 200));
    if(process.env.ENVIROMENT === 'productive') await logEvent(eventData);
  } catch (error) {
    res.status(500).json(errorResponse(error.message, 500));
  }
};

const addLike = async (req, res) => {
  const { postId, userId } = req.body;

  try {
    const existingLike = await Like.findOne({ where: { postId, userId } });

    if (existingLike) {
      await existingLike.destroy();
      return res
        .status(200)
        .json(
          successResponse('El recurso ya existe y se ha eliminado el "like"',{} ,409)
        );
    }
    const like = await Like.create({ postId, userId });
    res.status(201).json(successResponse('Creado', like, 201));
  } catch (error) {
    res.status(400).json(errorResponse(error.message, 400));
  }
};


// Obtener likes de un post
const getLikes = async (req, res) => {
  const { postId } = req.params;
  try {
    const likes = await Like.findAll({
      where: { postId },
      include: [{ model: User, attributes: ['username'] }],
    });
    res.status(200).json(successResponse('Likes',likes, 200));
  } catch (error) {
    res.status(500).json(errorResponse(error.message, 400));
  }
};

module.exports = { addComment, getComments, addLike, getLikes };
