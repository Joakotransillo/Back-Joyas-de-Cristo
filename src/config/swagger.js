const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Club de Conquistadores - Joyas de Cristo',
    version: '1.0.0',
    description: 'Documentación oficial de endpoints para la plataforma del club.',
  },
  servers: [{ url: 'http://localhost:5000/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string' }, password: { type: 'string' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Login OK' } }
      }
    },
    '/auth/solicitar-cuenta': {
      post: {
        tags: ['Autenticación'],
        summary: 'Solicitar registro',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre_completo: { type: 'string' },
                  fecha_nacimiento: { type: 'string' },
                  email: { type: 'string' },
                  clase_sugerida: { type: 'string' },
                  unidad_sugerida: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Solicitud enviada' } }
      }
    },
    '/auth/me': {
      get: { tags: ['Autenticación'], summary: 'Perfil actual', responses: { 200: { description: 'OK' } } },
      patch: { tags: ['Autenticación'], summary: 'Editar perfil', responses: { 200: { description: 'OK' } } }
    },
    '/auth/sesiones': {
      delete: { tags: ['Autenticación'], summary: 'Cerrar sesión', responses: { 200: { description: 'OK' } } }
    },
    '/conquis/inicio': {
      get: { tags: ['Conquistadores'], summary: 'Tablón de inicio y progreso', responses: { 200: { description: 'OK' } } }
    },
    '/conquis/cuadernillo': {
      get: { tags: ['Conquistadores'], summary: 'Ver cuadernillo', responses: { 200: { description: 'OK' } } }
    },
    '/conquis/especialidades': {
      get: { tags: ['Conquistadores'], summary: 'Ver especialidades', responses: { 200: { description: 'OK' } } }
    },
    '/consejero/mi-unidad': {
      get: { tags: ['Consejero'], summary: 'Listar miembros de la unidad', responses: { 200: { description: 'OK' } } }
    },
    '/consejero/evaluar': {
      post: {
        tags: ['Consejero'],
        summary: 'Firma de puntos presencial (masivo o individual)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { requisito_id: { type: 'integer' }, usuarios_ids: { type: 'array', items: { type: 'integer' } } }
              }
            }
          }
        },
        responses: { 200: { description: 'Evaluado OK' } }
      }
    },
    '/consejero/anuncios': {
      get: { tags: ['Consejero'], summary: 'Ver anuncios de la unidad', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Consejero'], summary: 'Crear anuncio', responses: { 201: { description: 'Creado' } } }
    },
    '/secretaria/asistencia': {
      get: { tags: ['Secretaría'], summary: 'Planilla de asistencia', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Secretaría'], summary: 'Cargar asistencia del sábado', responses: { 200: { description: 'OK' } } }
    },
    '/director/metricas': {
      get: { tags: ['Director'], summary: 'Métricas generales', responses: { 200: { description: 'OK' } } }
    },
    '/director/solicitudes': {
      get: { tags: ['Director'], summary: 'Bandeja de solicitudes pendientes', responses: { 200: { description: 'OK' } } }
    },
    '/director/solicitudes/{id}/aprobar': {
      patch: { tags: ['Director'], summary: 'Aprobar solicitud y crear cuenta', responses: { 200: { description: 'OK' } } }
    },
    '/director/solicitudes/{id}/rechazar': {
      patch: { tags: ['Director'], summary: 'Rechazar solicitud', responses: { 200: { description: 'OK' } } }
    },
    '/director/usuarios': {
      get: { tags: ['Director'], summary: 'Listado completo de integrantes', responses: { 200: { description: 'OK' } } }
    },
    '/director/unidades': {
      get: { tags: ['Director'], summary: 'Listar unidades y consejeros', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Director'], summary: 'Crear nueva unidad', responses: { 201: { description: 'OK' } } }
    }
  }
};

module.exports = { swaggerUi, swaggerDocument };