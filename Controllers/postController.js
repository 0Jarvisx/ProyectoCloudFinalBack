const { successResponse, errorResponse } = require("../inc/reponses");
const Post = require("../Models/Post");
const User = require("../Models/User");
const Comment = require("../Models/Comments");
const Like = require("../Models/Likes");
const { Op } = require("sequelize");
const { logEvent } = require("../inc/Logger");
require("dotenv").config();
const AWS = require("aws-sdk");
const { publishToSNS, isEmailVerified } = require("../inc/SNSSQS");
const { handler } = require("../Lambda/Miniaturas");
// Configuración de AWS
AWS.config.update({ region: "us-east-1" });
const sns = new AWS.SNS();
const s3 = new AWS.S3();
const lambda = new AWS.Lambda()

exports.createPost = async (req, res) => {
  try {
    const { title, description, userId, image } = req.body;

    let imageUrl = null; // Valor predeterminado si no hay imagen

    if (image) {
      // Procesar la imagen si existe
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${Date.now()}.jpg`;
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `images/${fileName}`,
        Body: buffer,
        ContentType: "image/jpeg",
      };

      // Subir la imagen a S3
      const uploadResponse = await s3.upload(params).promise();
      imageUrl = uploadResponse.Location; // URL de la imagen en S3
      console.log("Imagen subida a S3:", imageUrl);

      // Invocar la función Lambda para generar la miniatura
      const lambdaParams = {
        FunctionName: process.env.LAMBDA_FUNCTION_NAME_MINIATURA, 
        InvocationType: "Event", 
        Payload: JSON.stringify({
          Records: [
            {
              s3: {
                bucket: { name: process.env.S3_BUCKET_NAME },
                object: { key: `images/${fileName}` },
              },
            },
          ],
        }),
      };

     /*  const mockEvent = {
        Records: [
          {
            s3: {
              bucket: { name: process.env.S3_BUCKET_NAME },
              object: { key: `images/${fileName}` },
            },
          },
        ],
      };
      handler(mockEvent)
      .then((response) => console.log("Resultado:", response))
      .catch((error) => console.error("Error:", error)); */
      /* await lambda.invoke(lambdaParams).promise(); */
      console.log("Función Lambda invocada para generar miniatura.");
    }

    // Insertar en la base de datos
    const post = await Post.create({
      title,
      description,
      image: imageUrl, // Puede ser null o la URL de la imagen
      userId,
    });

    const user = await User.findByPk(userId);

    // Construir el evento para el log
    const eventData = {
      eventType: "CREATE",
      entityId: post.id,
      recurso: post.image,
      entityType: "Post",
      message: `El post con ID ${post.id} fue creado por el usuario con ID ${userId}`,
    };

    if (process.env.ENVIROMENT === "productive") logEvent(eventData);

    // Configurar parámetros de SNS
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

    // Registrar eventos en segundo plano
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

    // Registrar eventos en segundo plano
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

    // Registrar eventos en segundo plano
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
