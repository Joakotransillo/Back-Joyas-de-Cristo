require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { swaggerUi, swaggerDocument } = require('./swagger');
const db = require('./config/db');

// Rutas
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Documentación
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Endpoints
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
  console.log(`📄 Swagger en http://localhost:${PORT}/api/docs`);
});