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
    '/api/auth/register': {
      post: {
        summary: 'Registrar un nuevo usuario en la plataforma',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre_completo: { type: 'string', example: 'Joaquín Transillo' },
                  email: { type: 'string', example: 'joaquin@ejemplo.com' },
                  password: { type: 'string', example: '123456' },
                  fecha_nacimiento: { type: 'string', format: 'date', example: '2005-04-10' },
                  rol: { type: 'string', example: 'CONQUISTADOR' },
                  unidad_id: { type: 'integer', example: 1 },
                  clase_actual_id: { type: 'integer', example: 6 }
                },
                required: ['nombre_completo', 'email', 'password']
              }
            }
          }
        },
        responses: {
          201: { description: 'Usuario registrado exitosamente' },
          400: { description: 'El email ya se encuentra registrado' },
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