require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./database/connection');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((err) => {
  console.error('Falha ao conectar à base de dados:', err.message);
  process.exit(1);
});
