const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Joyas de Cristo',
    version: '1.0.0',
    description: 'Documentación centralizada del backend del club'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Servidor Local de Desarrollo'
    }
  ],
  paths: {
    '/api/auth/solicitar-cuenta': {
      post: {
        summary: 'Enviar una solicitud pública de alta',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre_completo: { type: 'string', maxLength: 150, example: 'Joaquín Transillo' },
                  email: { type: 'string', format: 'email', maxLength: 150, example: 'joaquin@ejemplo.com' },
                  fecha_nacimiento: { type: 'string', format: 'date', nullable: true, example: '2005-04-10' },
                  clase_sugerida_id: { type: 'integer', nullable: true, example: 1 },
                  unidad_sugerida_id: { type: 'integer', nullable: true, example: 1 }
                },
                required: ['nombre_completo', 'email']
              }
            }
          }
        },
        responses: {
          201: { description: 'Solicitud creada con estado PENDIENTE' },
          400: { description: 'Datos inválidos o clase/unidad inexistente' },
          409: { description: 'Ya existe una cuenta o solicitud con ese email' },
          500: { description: 'Error interno del servidor' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Autenticar usuario y obtener JWT',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'joaquin@ejemplo.com' },
                  password: { type: 'string', example: '123456' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          200: { description: 'Inicio de sesión exitoso, retorna el JWT y los datos del usuario' },
          400: { description: 'Credenciales inválidas' },
          500: { description: 'Error interno del servidor' }
        }
      }
    }
  }
};

module.exports = { swaggerUi, swaggerDocument };
