const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Não autorizado. Token em falta.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado. Por favor, autentique-se novamente.' });
      }
      return res.status(401).json({ message: 'Token inválido.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Utilizador não encontrado.' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Não autorizado.' });
  }
};

module.exports = { protect };
