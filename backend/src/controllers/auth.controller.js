const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email já registado.' });

    const user = await User.create({ name, email, password });
    const token = generateToken(user.id);

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('register error:', err.message);
    return res.status(401).json({ message: 'Erro ao registar utilizador.' });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;

    const { pool } = require('../database/connection');
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];

    if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });

    if (user.is_suspended) return res.status(403).json({ message: 'Conta suspensa. Contacta o administrador.' });

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const token = generateToken(user.id);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.is_admin || false },
    });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }
};

const getMe = async (req, res) => {
  const u = req.user;
  return res.json({ user: { id: u.id, name: u.name, email: u.email, isAdmin: u.is_admin || false } });
};

module.exports = { register, login, getMe };
