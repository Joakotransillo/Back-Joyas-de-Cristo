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
      get: {
        tags: ['Conquistadores'],
        summary: 'Consultar el resumen del conquistador',
        description: 'Devuelve el perfil, el avance global de la clase, los próximos eventos publicados para su unidad o para todo el club y los anuncios de su consejero de unidad.',
        responses: {
          200: {
            description: 'Resumen del conquistador',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    perfil: { type: 'object' },
                    avance_clase: {
                      type: 'object',
                      properties: {
                        requisitos_completados: { type: 'integer' },
                        total_requisitos: { type: 'integer' },
                        porcentaje: { type: 'integer', minimum: 0, maximum: 100 }
                      }
                    },
                    proximos_eventos: { type: 'array', items: { type: 'object' } },
                    anuncios: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          },
          401: { description: 'Falta un token válido o la sesión está vencida' },
          403: { description: 'El usuario no tiene el rol de conquistador' },
          404: { description: 'No se encontró el usuario autenticado' },
          500: { description: 'Error interno del servidor' }
        }
      }
    },
    '/conquis/cuadernillo': {
      get: {
        tags: ['Conquistadores'],
        summary: 'Consultar los cuadernillos de la clase actual',
        description: 'Devuelve las categorías y requisitos de los cuadernillos Regular y Avanzado, junto con el estado de firma del conquistador autenticado.',
        responses: {
          200: {
            description: 'Cuadernillos y progreso del conquistador',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    clase: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        nombre: { type: 'string' },
                        color_insignia: { type: 'string', nullable: true }
                      }
                    },
                    cuadernillos: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          tipo: { type: 'string', enum: ['REGULAR', 'AVANZADA'] },
                          categorias: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'integer' },
                                nombre: { type: 'string' },
                                orden: { type: 'integer' },
                                requisitos: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      id: { type: 'integer' },
                                      numero_item: { type: 'integer' },
                                      descripcion: { type: 'string' },
                                      completado: { type: 'boolean' },
                                      firmado: { type: 'boolean' },
                                      fecha_firma: { type: 'string', nullable: true }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Falta un token válido o la sesión está vencida' },
          403: { description: 'El usuario no tiene el rol de conquistador' },
          404: { description: 'No se encontró el usuario o los cuadernillos de su clase' },
          409: { description: 'El usuario no tiene una clase asignada' },
          500: { description: 'Error interno del servidor' }
        }
      }
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
