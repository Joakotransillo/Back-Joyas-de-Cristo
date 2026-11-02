const express = require('express');
const cors = require('cors');
const { swaggerUi, swaggerDocument } = require('./swagger');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const db = require('./config/db');

app.listen(5000, () => {
  console.log('🚀 Servidor en http://localhost:5000');
  console.log('📄 Swagger en http://localhost:5000/api/docs');
});