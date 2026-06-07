const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const connectDB = async () => {
  const client = await pool.connect();
  console.log('PostgreSQL conectado:', client.connectionParameters?.host || 'localhost');
  client.release();
};

module.exports = { pool, connectDB };
