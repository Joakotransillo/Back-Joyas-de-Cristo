ENTREGABLE (ENDPOINTS QUE CREAMOS NECESARIOS)

Listado de Endpoints necesarios (Front)
El front es una app web que renderiza vistas y consume el backend. Dado que los formularios HTML nativos envían principalmente GET y POST: cuando el backend usa PATCH o DELETE, el front recibe un POST y llama al backend con el verbo HTTP correspondiente. Entre paréntesis se indica el endpoint del backend que consume cada ruta. Roles: conquistador, consejero, secretaria y director.

1. Usuarios y sesión
- GET /login : Formulario de inicio de sesión.
- POST /login : Inicia sesión. (POST /api/auth/login)
- GET /solicitar-cuenta : Formulario de solicitud de acceso para nuevos integrantes.
- POST /solicitar-cuenta : Envía la solicitud de registro a la bandeja del director. (POST /api/auth/solicitar-cuenta)
- POST /logout : Cierra la sesión activa. (DELETE /api/auth/sesiones)
- GET /perfil : Datos del usuario, clase progresiva, unidad y especialidades. (GET /api/auth/me)
- POST /perfil : Edita datos personales del usuario. (PATCH /api/auth/me)

2. Cuadernillo y progreso (Conquistador)
- GET / : Tablón principal con anuncios de la unidad y progreso general. (GET /api/conquis/inicio)
- GET /cuadernillo : Muestra el cuadernillo de la clase correspondiente (Regular / Avanzada) con los requisitos aprobados y pendientes. (GET /api/conquis/cuadernillo)
- GET /especialidades : Listado de especialidades disponibles, en curso y completadas. (GET /api/conquis/especialidades)

3. Evaluación presencial y gestión de Unidad (Consejero)
- GET /unidad : Listado de integrantes de la unidad asignada con su porcentaje de avance. (GET /api/consejero/mi-unidad)
- GET /unidad/evaluar : Vista de firma presencial para tildar requisitos completados en la reunión del sábado. (GET /api/consejero/requisitos)
- POST /unidad/evaluar : Aprueba individual o masivamente los requisitos presentados presencialmente. (POST /api/consejero/evaluar)
- GET /unidad/anuncios : Listado de anuncios publicados para la unidad. (GET /api/consejero/anuncios)
- POST /unidad/anuncios : Publica un aviso en el tablón de la unidad. (POST /api/consejero/anuncios)
- POST /unidad/anuncios/<id>/baja : Elimina un aviso del tablón. (DELETE /api/consejero/anuncios/<id>)

4. Asistencia y Secretaría (Secretaría / Consejero)
- GET /secretaria/asistencia : Planilla de toma de asistencia semanal por unidad (Puntualidad, Biblia, Uniforme, Cuota). (GET /api/secretaria/asistencia)
- POST /secretaria/asistencia : Carga el registro de asistencia del sábado. (POST /api/secretaria/asistencia)

5. Panel de Dirección (Director y Secretaría)
- GET /director : Dashboard principal con métricas generales del club. (GET /api/director/metricas)
- GET /director/solicitudes : Bandeja de solicitudes de registro pendientes de aprobación. (GET /api/director/solicitudes)
- POST /director/solicitudes/<id>/aprobar : Aprueba la solicitud, crea el usuario y le asigna clase y unidad. (PATCH /api/director/solicitudes/<id>/aprobar)
- POST /director/solicitudes/<id>/rechazar : Rechaza y elimina una solicitud de registro. (PATCH /api/director/solicitudes/<id>/rechazar)
- GET /director/usuarios : Listado completo del personal y conquistadores activos del club. (GET /api/director/usuarios)
- POST /director/usuarios/<id>/edicion : Modifica el rol, unidad o clase progresiva de un integrante. (PATCH /api/director/usuarios/<id>)
- POST /director/usuarios/<id>/baja : Da de baja o inactiva a un usuario del club. (DELETE /api/director/usuarios/<id>)
- GET /director/unidades : Gestión general de unidades del club y asignación de consejeros. (GET /api/director/unidades)
- POST /director/unidades : Alta de una nueva unidad en el club. (POST /api/director/unidades)
- POST /director/unidades/<id>/edicion : Modifica datos de una unidad o cambia su consejero. (PATCH /api/director/unidades/<id>)

6. Reportes e Informes (Secretaría / Director)
- GET /director/reportes/avance : Reporte de progreso general agrupado por clases y unidades. (GET /api/reportes/avance-general)
- GET /director/reportes/avance.pdf (deseable) : Descarga en PDF del informe de avance para la directiva o la zona. (GET /api/reportes/avance-general?formato=pdf)