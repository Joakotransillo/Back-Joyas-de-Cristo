require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { swaggerUi, swaggerDocument } = require('./swagger');
const db = require('./config/db');

// Rutas
const authRoutes = require('./routes/authRoutes');
const conquisRoutes = require('./routes/conquisRoutes');
const consejeroRoutes = require('./routes/consejeroRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const consejeroCuadernilloRoutes = require('./routes/consejeroCuadernilloRoutes');
const directorRoutes = require('./routes/directorRoutes');
const asistenciaRoutes = require('./routes/asistenciaRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Documentación
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/conquis', conquisRoutes);
app.use('/api/consejero', consejeroRoutes);
app.use('/api/consejero', consejeroCuadernilloRoutes);
app.use('/api/director', directorRoutes);
app.use('/api/secretaria', asistenciaRoutes);
app.use('/api/especialidades', especialidadesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
  console.log(`📄 Swagger en http://localhost:${PORT}/api/docs`);
});
