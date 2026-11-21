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
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
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
    },
    '/api/auth/me': {
      get: {
        summary: 'Consultar el perfil del usuario autenticado',
        tags: ['Autenticación'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Perfil, unidad, clase y especialidades' },
          401: { description: 'Token inválido, vencido o sesión cerrada' },
          500: { description: 'Error interno del servidor' }
        }
      },
      patch: {
        summary: 'Actualizar datos personales del usuario autenticado',
        tags: ['Autenticación'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre_completo: { type: 'string', maxLength: 150 },
                  email: { type: 'string', format: 'email', maxLength: 150 },
                  fecha_nacimiento: { type: 'string', format: 'date', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Perfil actualizado' },
          400: { description: 'Datos inválidos o campos no editables' },
          401: { description: 'Token inválido, vencido o sesión cerrada' },
          409: { description: 'El email ya está registrado' },
          500: { description: 'Error interno del servidor' }
        }
      }
    },
    '/api/auth/sesiones': {
      delete: {
        summary: 'Cerrar la sesión actual y revocar su JWT',
        tags: ['Autenticación'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Sesión cerrada' },
          401: { description: 'Token inválido, vencido o sesión cerrada' },
          500: { description: 'Error interno del servidor' }
        }
      }
    },
    '/api/consejero/mi-unidad': {
      get: {
        summary: 'Listar los conquistadores de la unidad del consejero y su avance',
        tags: ['Consejeros'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Unidad asignada y lista de conquistadores con su porcentaje de avance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    unidad: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        nombre: { type: 'string' }
                      }
                    },
                    conquistadores: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          nombre_completo: { type: 'string' },
                          clase: { type: 'object', nullable: true },
                          avance: {
                            type: 'object',
                            properties: {
                              requisitos_completados: { type: 'integer' },
                              total_requisitos: { type: 'integer' },
                              porcentaje: { type: 'integer', minimum: 0, maximum: 100 }
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
          403: { description: 'El usuario no tiene el rol de consejero' },
          404: { description: 'No se encontró el consejero autenticado' },
          409: { description: 'El consejero no tiene una unidad asignada' },
          500: { description: 'Error interno del servidor' }
        }
      }
    },
    '/api/consejero/evaluar': {
      post: {
        summary: 'Registrar la aprobación presencial de requisitos',
        description: 'Cada entrada asocia un conquistador con uno o más requisitos aprobados. Se admiten varios conquistadores en una operación para evaluar a la unidad; todos deben pertenecer a la unidad del consejero y cada requisito debe corresponder a la clase actual del conquistador. La operación es atómica.',
        tags: ['Consejeros'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['evaluaciones'],
                properties: {
                  evaluaciones: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 200,
                    items: {
                      type: 'object',
                      required: ['conquistador_id', 'requisitos_ids'],
                      properties: {
                        conquistador_id: { type: 'integer', minimum: 1 },
                        requisitos_ids: {
                          type: 'array',
                          minItems: 1,
                          maxItems: 100,
                          uniqueItems: true,
                          items: { type: 'integer', minimum: 1 }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Evaluaciones registradas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string' },
                    conquistadores_evaluados: { type: 'integer' },
                    firmas_creadas: { type: 'integer' },
                    ya_firmados: { type: 'integer' }
                  }
                }
              }
            }
          },
          400: { description: 'Solicitud inválida, requisito inexistente o de otra clase' },
          401: { description: 'Falta un token válido o la sesión está vencida' },
          403: { description: 'El usuario no tiene el rol de consejero' },
          404: { description: 'No se encontró el consejero o uno de los conquistadores no pertenece a su unidad' },
          409: { description: 'El consejero no tiene unidad o uno de los conquistadores no tiene clase' },
          500: { description: 'Error interno del servidor' }
        }
      }
    }
  }
};

module.exports = { swaggerUi, swaggerDocument };
