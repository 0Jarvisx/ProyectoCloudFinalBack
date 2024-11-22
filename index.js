require("dotenv").config();
const express = require("express");
const userRoutes = require("./Routes/user.routes");
const postRoutes = require('./Routes/post.routes.js');
const commentsRoutes = require('./Routes/commets.routes.js');
const cors = require("cors");
const sequelize = require("./inc/DB");
const authenticateToken = require('./Middleware/token.js');
const { loginUser, createUser } = require('./Controllers/userController');
const AWS = require("aws-sdk");
const cron = require("node-cron");

AWS.config.update({ region: "us-east-1" });
const app = express();
const lambda = new AWS.Lambda(); 

const port = process.env.PORT || 3000;
const domain = process.env.DOMAIN;
const sqsQueueUrl = process.env.SQS_QUEUE_URL;
app.use(
  cors({
    origin: "*",
    allowedHeaders: ["Content-Type", 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.post("/login", loginUser);
app.post('/register', createUser);

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "HOLA DESDE EL BACKEND",
  });
});

app.use("/user", authenticateToken, userRoutes);
app.use("/post", authenticateToken, postRoutes);
app.use('/comments', authenticateToken, commentsRoutes);

sequelize
  .sync()
  .then(() => {
    console.log("Database connected");
    app.listen(port, () => {
      console.log(`Escuchando en: ${domain}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
  });

const lambdaParams = {
  FunctionName: process.env.LAMBDA_FUNCTION_NAME_LIMPIEZA,
  InvocationType: "Event", 
  Payload: JSON.stringify({
    Records: [],
  }),
};


cron.schedule("30 19 * * *", async () => {
  console.log("Ejecutando la función Lambda programada...");

  try {
    const response = await lambda.invoke(lambdaParams).promise();
    console.log("Lambda ejecutada con éxito:", response);
  } catch (error) {
    console.error("Error al ejecutar Lambda:", error);
  }
});


cron.schedule("0 9,18 * * *", async () => {
  console.log("Enviando recordatorio a SQS...");

  const params = {
    QueueUrl: sqsQueueUrl,
    MessageBody: JSON.stringify({
      message: "Recordatorio: ¡No olvides usar la aplicación!",
      timestamp: new Date().toISOString(),
    }),
  };

  try {
    const response = await sqs.sendMessage(params).promise();
    console.log("Mensaje enviado a SQS:", response.MessageId);
  } catch (error) {
    console.error("Error al enviar mensaje a SQS:", error);
  }
});