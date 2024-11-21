const jwt = require('jsonwebtoken');
const { errorResponse } = require('../inc/reponses');

const secretKey = process.env.JWT_SECRET_KEY || 'tu_secreto_aqui';
  
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  
  const token = authHeader && authHeader.split(' ')[1]; //Bearer
  if (!token) {
    return res.status(401).json(errorResponse('No autorizado, token no proporcionado.', 401, 'No autorizado'));
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json(errorResponse('Token inválido.', 403, err.message));
    }
    
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
