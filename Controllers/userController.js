const { hashPassword, comparePassword } = require("../inc/encryptGenerator");
const User = require("../Models/User");
const { successResponse, errorResponse } = require("../inc/reponses");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { logEvent } = require("../inc/Logger");
const { isEmailVerified, subscribeToSNSEmail } = require("../inc/SNSSQS.js");
const secretKey = process.env.JWT_SECRET_KEY || "tu_secreto_aqui";

exports.createUser = async (req, res) => {
  try {
    req.body.password = await hashPassword(req.body.password);
    const user = await User.create(req.body);

    const eventData = {
      eventType: "CREATE",
      entityId: user.id,
      entityType: "USER",
      message: `Usuario creado con ID ${user.id}`,
    };
    await subscribeToSNSEmail(process.env.SNS_URL, user.email);

    res
      .status(200)
      .json(successResponse("Usuario Creado Existosamente", user, 200));
    if (process.env.ENVIROMENT === "productive") await logEvent(eventData);
  } catch (error) {
    res.status(500).json(errorResponse("Algo salio mal", 500, error.message));
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();

    const eventData = {
      eventType: "READ",
      entityType: "USER",
      message: "Listado de todos los usuarios obtenido",
    };

    res.status(200).json(successResponse("Listado de usuarios", users, 200));
    if (process.env.ENVIROMENT === "productive") await logEvent(eventData);
  } catch (error) {
    res.status(500).json(errorResponse("Algo salio mal", 500, error.message));
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (user) {
      const eventData = {
        eventType: "READ",
        entityId: user.id,
        entityType: "USER",
        message: `Usuario con ID ${user.id} leído`,
      };

      res.status(200).json(successResponse("Usuario encontrado", user, 200));
      if (process.env.ENVIROMENT === "productive") await logEvent(eventData);
    } else {
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  } catch (error) {
    res.status(500).json(errorResponse("Algo salio mal", 500, error.message));
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (user) {
      await user.update(req.body);

      const eventData = {
        eventType: "UPDATE",
        entityId: user.id,
        entityType: "USER",
        message: `Usuario con ID ${user.id} actualizado`,
      };

      res.json(successResponse("Usuario Actualizado", user, 200));
      if (process.env.ENVIROMENT === "productive") await logEvent(eventData);
    } else {
      res
        .status(404)
        .json(errorResponse("Algo salio mal", 404, "No encontrado"));
    }
  } catch (error) {
    res.status(500).json(errorResponse("Algo salio mal", 500, error.message));
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (user) {
      await user.destroy();

      const eventData = {
        eventType: "DELETE",
        entityId: req.params.id,
        entityType: "USER",
        message: `Usuario con ID ${req.params.id} eliminado`,
      };

      res.status(200).json(successResponse("Usuario eliminado", {}, 200));
      if (process.env.ENVIROMENT === "productive") await logEvent(eventData);
    } else {
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(404).json(
        errorResponse("Usuario no valido", 404, {
          message: "Usuario no encontrado",
        })
      );

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid)
      return res.status(401).json(
        errorResponse("Usuario no valido", 401, {
          message: "Contraseña incorrecta",
        })
      );
    let isVerified = await isEmailVerified(process.env.SNS_URL, user.email);
    
    if (!isVerified) {
      return res.status(401).json(
        errorResponse("Email no verificado", 401, {
          message: "Email no verificado",
        })
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.rol,
      },
      secretKey,
      { expiresIn: "2h" }
    );

    let eventData = {
      eventType: "LOGIN",
      entityId: user.id,
      entityType: "USER",
      message: "Inicio de Sesion exitoso",
    };
    res.status(200).json(
      successResponse(
        "Inicio de Sesion exitoso",
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.rol,
          phoneNumber: user.phoneNumber,
          token: token,
        },
        200
      )
    );
    if (process.env.ENVIROMENT === "productive") await logEvent(eventData);
  } catch (error) {
    res.status(500).json(errorResponse("Algo salio mal", 500, error.message));
  }
};
