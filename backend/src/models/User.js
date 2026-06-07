const { pool } = require('../database/connection');
const bcrypt = require('bcryptjs');

const User = {
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, is_admin, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, password }) {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    return rows[0];
  },

  async comparePassword(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  },
};

module.exports = User;
