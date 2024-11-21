require("dotenv").config();
const express = require("express");
const userRoutes = require("./Routes/user.routes");
const postRoutes = require('./Routes/post.routes.js');
const commentsRoutes = require('./Routes/commets.routes.js');
const cors = require("cors");
const sequelize = require("./inc/DB");
const authenticateToken = require('./Middleware/token.js');
const { loginUser, createUser } = require('./Controllers/userController');
const app = express();

const port = process.env.PORT || 3000;
const domain = process.env.DOMAIN;


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
