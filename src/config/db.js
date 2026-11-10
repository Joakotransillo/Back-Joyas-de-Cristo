const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: true,
});

pool.getConnection()
  .then((connection) => {
    console.log('📦 Conexión a MySQL establecida con éxito');
    connection.release();
  })
  .catch((error) => {
    console.error('❌ Error al conectar a MySQL:', error.message);
  });

module.exports = pool;
