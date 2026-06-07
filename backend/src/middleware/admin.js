const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ message: 'Acesso restrito a administradores.' });
  }
  next();
};

module.exports = { requireAdmin };
