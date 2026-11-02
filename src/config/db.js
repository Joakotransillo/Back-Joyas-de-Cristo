const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Forzar una prueba de conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
  } else {
    console.log('📦 Conexión a PostgreSQL establecida con éxito');
    release(); // Devuelve la conexión al pool
  }
});

module.exports = pool;