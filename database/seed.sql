-- Catalogos de ejemplo. Las claves unicas permiten volver a ejecutar el seed sin duplicar datos.

INSERT IGNORE INTO clases (nombre, color_insignia) VALUES
('Amigo', '#1E40AF'),
('Compañero', '#DC2626'),
('Explorador', '#166534'),
('Pionero', '#6B7280'),
('Excursionista', '#7C3AED'),
('Guía', '#CA8A04');

-- Cada clase tiene un cuadernillo regular y uno avanzado.
INSERT IGNORE INTO cuadernillos (clase_id, tipo)
SELECT id, 'REGULAR' FROM clases;

INSERT IGNORE INTO cuadernillos (clase_id, tipo)
SELECT id, 'AVANZADA' FROM clases;

-- Las nueve categorías comunes pertenecen a cada cuadernillo regular.
INSERT IGNORE INTO categorias_cuadernillo (cuadernillo_id, nombre, orden)
SELECT cuadernillo.id, categoria.nombre, categoria.orden
FROM cuadernillos AS cuadernillo
CROSS JOIN (
  SELECT 1 AS orden, 'I. Generales' AS nombre
  UNION ALL SELECT 2, 'II. Descubrimiento Espiritual'
  UNION ALL SELECT 3, 'III. Sirviendo a los Demás'
  UNION ALL SELECT 4, 'IV. Desarrollo de la Amistad'
  UNION ALL SELECT 5, 'V. Salud y Aptitud Física'
  UNION ALL SELECT 6, 'VI. Organización y Liderazgo'
  UNION ALL SELECT 7, 'VII. Estudio de la Naturaleza'
  UNION ALL SELECT 8, 'VIII. Arte de Acampar'
  UNION ALL SELECT 9, 'IX. Estilo de Vida'
) AS categoria
WHERE cuadernillo.tipo = 'REGULAR';

-- Cada cuadernillo avanzado tiene una categoría propia por clase.
INSERT IGNORE INTO categorias_cuadernillo (cuadernillo_id, nombre, orden)
SELECT cuadernillo.id, 'Amigo de la Naturaleza', 1
FROM cuadernillos AS cuadernillo
JOIN clases AS clase ON clase.id = cuadernillo.clase_id
WHERE clase.nombre = 'Amigo' AND cuadernillo.tipo = 'AVANZADA';

-- Reubica un dato de prueba antiguo en su requisito oficial, conservando sus firmas.
UPDATE requisitos AS requisito
JOIN categorias_cuadernillo AS categoria_origen
  ON categoria_origen.id = requisito.categoria_id
 AND categoria_origen.nombre = 'II. Descubrimiento Espiritual'
JOIN cuadernillos AS cuadernillo
  ON cuadernillo.id = categoria_origen.cuadernillo_id
 AND cuadernillo.tipo = 'REGULAR'
JOIN clases AS clase
  ON clase.id = cuadernillo.clase_id
 AND clase.nombre = 'Amigo'
JOIN categorias_cuadernillo AS categoria_destino
  ON categoria_destino.cuadernillo_id = cuadernillo.id
 AND categoria_destino.nombre = 'I. Generales'
SET requisito.categoria_id = categoria_destino.id,
    requisito.numero_item = 3,
    requisito.descripcion = 'Memorizar y explicar el Voto y la Ley de los Conquistadores.'
WHERE requisito.numero_item = 1
  AND requisito.descripcion = 'Memorizar y explicar el Voto y la Ley del Conquistador.';

-- Retira únicamente los otros datos de demostración antiguos que no tienen firmas.
DELETE requisito
FROM requisitos AS requisito
JOIN categorias_cuadernillo AS categoria
  ON categoria.id = requisito.categoria_id
JOIN cuadernillos AS cuadernillo
  ON cuadernillo.id = categoria.cuadernillo_id
 AND cuadernillo.tipo = 'REGULAR'
JOIN clases AS clase
  ON clase.id = cuadernillo.clase_id
 AND clase.nombre = 'Amigo'
LEFT JOIN progreso_cuadernillo AS progreso
  ON progreso.requisito_id = requisito.id
WHERE progreso.id IS NULL
  AND (
    (categoria.nombre = 'I. Generales'
      AND requisito.numero_item = 1
      AND requisito.descripcion = 'Tener 10 años de edad como mínimo.')
    OR
    (categoria.nombre = 'III. Sirviendo a los Demás'
      AND requisito.numero_item = 1
      AND requisito.descripcion = 'Ser un buen compañero en el hogar y en la escuela.')
  );

-- Requisitos del cuadernillo regular de Amigo.
INSERT IGNORE INTO requisitos (categoria_id, numero_item, descripcion)
SELECT categoria.id, requisito.numero_item, requisito.descripcion
FROM (
  SELECT 'I. Generales' AS categoria, 1 AS numero_item, 'Tener como mínimo diez años de edad.' AS descripcion
  UNION ALL SELECT 'I. Generales', 2, 'Ser miembro activo del Club de Conquistadores.'
  UNION ALL SELECT 'I. Generales', 3, 'Memorizar y explicar el Voto y la Ley de los Conquistadores.'
  UNION ALL SELECT 'I. Generales', 4, 'Leer el libro del Curso de Lectura del año.'
  UNION ALL SELECT 'I. Generales', 5, 'Leer el libro Por la gracia de Dios.'
  UNION ALL SELECT 'I. Generales', 6, 'Participar activamente de la Clase Bíblica de su Club.'

  UNION ALL SELECT 'II. Descubrimiento Espiritual', 1, 'Memorizar y demostrar conocimiento en: a) la Creación y lo que Dios creó cada día; b) las diez plagas que cayeron sobre Egipto; c) el nombre de cada una de las doce tribus de Israel; d) los 39 libros del Antiguo Testamento y demostrar habilidad para encontrar cualquiera de ellos.'
  UNION ALL SELECT 'II. Descubrimiento Espiritual', 2, 'Leer y explicar Juan 3:16, 2 Timoteo 3:16, Efesios 6:1-3 y Salmo 1.'
  UNION ALL SELECT 'II. Descubrimiento Espiritual', 3, 'Lectura bíblica: Génesis 1; 2; 3; 4:1-16; 6:11-22; 7; 8; 9:1-19; 11:1-9; 12:1-10; 13; 14:18-24; 15; 17:1-8 y 15-22; 18:1-15 y 16-33; 19:1-29; 21:1-21; 22:1-19; 23; 24:1-46 y 48; 24:52-67; 27; 28; 29; 30:25-31; 31:2-3 y 17-18; 32; 33; 37; 39; 40; 41; 42; 43; 44; 45; 47; 50. Éxodo 1; 2; 3; 4:1-17 y 27-31; 5; 7; 8; 9; 10; 11; 12; 13:17, 22; 14; 15:22-27; 16; 17; 18; 19; 20; 24; 32; 33; 34:1-14 y 29-35; 35:4-29 y 40.'

  UNION ALL SELECT 'III. Sirviendo a los Demás', 1, 'Dedicar dos horas a ayudar a alguien de la comunidad, realizando dos de estas actividades: a) visitar a alguien que necesita amistad y orar con esa persona; b) ofrecer y llevar alimento a alguien necesitado; c) participar de un proyecto ecológico o educativo.'
  UNION ALL SELECT 'III. Sirviendo a los Demás', 2, 'Escribir una redacción sobre cómo ser un buen ciudadano en el hogar y en la escuela.'

  UNION ALL SELECT 'IV. Desarrollo de la Amistad', 1, 'Mencionar diez cualidades de un buen amigo y presentar cuatro situaciones diarias en las que practicó la Regla de Oro de Mateo 7:12.'
  UNION ALL SELECT 'IV. Desarrollo de la Amistad', 2, 'Saber cantar el Himno Nacional de su país y conocer su historia. Saber el nombre del autor de la letra y de la música.'

  UNION ALL SELECT 'V. Salud y Aptitud Física', 1, 'Completar una de estas especialidades: Natación - Principiante I, Aptitud física o Nudos y amarras.'
  UNION ALL SELECT 'V. Salud y Aptitud Física', 2, 'Utilizando la experiencia de Daniel: a) explicar los principios de temperancia que defendió o participar de una presentación o escenificación de Daniel 1; b) memorizar y explicar Daniel 1:8; c) escribir su compromiso personal de seguir un estilo de vida saludable.'
  UNION ALL SELECT 'V. Salud y Aptitud Física', 3, 'Aprender los principios de una dieta saludable y ayudar a preparar un cuadro con los grupos básicos de alimentos.'

  UNION ALL SELECT 'VI. Organización y Liderazgo', 1, 'A través de la observación, acompañar todo el proceso de planificación hasta la ejecución de una caminata de 5 km.'

  UNION ALL SELECT 'VII. Estudio de la Naturaleza', 1, 'Completar una de estas especialidades: Felinos, Perros, Mamíferos, Semillas o Aves mascotas.'
  UNION ALL SELECT 'VII. Estudio de la Naturaleza', 2, 'Aprender y demostrar una forma de purificar el agua y escribir un párrafo destacando el significado de Jesús como el agua de Vida.'
  UNION ALL SELECT 'VII. Estudio de la Naturaleza', 3, 'Aprender y armar una carpa en un lugar apropiado.'

  UNION ALL SELECT 'VIII. Arte de Acampar', 1, 'Demostrar cómo cuidar correctamente una cuerda. Hacer y explicar el uso práctico de estos nudos: Simple o Cote, Falso, Verdadero o Llano, Cirujano, As de guía, As de guía doble, Vuelta de escota, Margarita, Pescador, Ancla, Ballestrinque, Vuelta de gancho, Leñador y Grupo de calabrote.'
  UNION ALL SELECT 'VIII. Arte de Acampar', 2, 'Completar la especialidad de Campamento I.'
  UNION ALL SELECT 'VIII. Arte de Acampar', 3, 'Presentar por escrito diez reglas para una caminata y explicar qué hacer en caso de estar perdido.'
  UNION ALL SELECT 'VIII. Arte de Acampar', 4, 'Aprender las señales para seguir una pista. Preparar y seguir una pista con un mínimo de diez señales que también pueda ser seguida por otros.'

  UNION ALL SELECT 'IX. Estilo de Vida', 1, 'Completar una especialidad en el área de Artes y habilidades manuales.'
) AS requisito
JOIN clases AS clase ON clase.nombre = 'Amigo'
JOIN cuadernillos AS cuadernillo
  ON cuadernillo.clase_id = clase.id AND cuadernillo.tipo = 'REGULAR'
JOIN categorias_cuadernillo AS categoria
  ON categoria.cuadernillo_id = cuadernillo.id
  AND categoria.nombre = requisito.categoria;

-- Requisitos de la categoría avanzada propia de la clase Amigo.
INSERT IGNORE INTO requisitos (categoria_id, numero_item, descripcion)
SELECT categoria.id, requisito.numero_item, requisito.descripcion
FROM (
  SELECT 1 AS numero_item, 'Memorizar, cantar o tocar el Himno de los Conquistadores y conocer la historia del himno.' AS descripcion
  UNION ALL SELECT 2, 'En consulta con su líder, escoger uno de estos personajes del Antiguo Testamento y conversar con su grupo sobre el amor y cuidado de Dios y la liberación demostrada en la vida del personaje elegido: José, Jonás, Ester o Rut.'
  UNION ALL SELECT 3, 'Llevar por lo menos dos amigos no adventistas a la Escuela Sabática o al Club de Conquistadores.'
  UNION ALL SELECT 4, 'Conocer los principios de higiene, buenos modales en la mesa y comportamiento delante de personas de diferentes edades. Demostrar y explicar cómo estos buenos modales pueden ser útiles en las reuniones y campamentos del Club.'
  UNION ALL SELECT 5, 'Realizar la especialidad de Arte de Acampar.'
  UNION ALL SELECT 6, 'Conocer e identificar diez flores silvestres y diez insectos de su región.'
  UNION ALL SELECT 7, 'Hacer una fogata utilizando materiales naturales y mantenerla encendida.'
  UNION ALL SELECT 8, 'Usar correctamente un cuchillo, un machete o un hacha y conocer diez reglas para usarlos con seguridad.'
  UNION ALL SELECT 9, 'Escoger y completar una especialidad en una de estas áreas: Actividades misioneras y comunitarias o Actividades agrícolas.'
) AS requisito
JOIN clases AS clase ON clase.nombre = 'Amigo'
JOIN cuadernillos AS cuadernillo
  ON cuadernillo.clase_id = clase.id AND cuadernillo.tipo = 'AVANZADA'
JOIN categorias_cuadernillo AS categoria
  ON categoria.cuadernillo_id = cuadernillo.id
  AND categoria.nombre = 'Amigo de la Naturaleza';

INSERT IGNORE INTO unidades (nombre, logo_url) VALUES
('Amatista', NULL),
('Esmeralda', NULL),
('Calcedonia', NULL);

INSERT IGNORE INTO especialidades (nombre, categoria, insignia_url) VALUES
('Arte de Acampar', 'Actividades al Aire Libre', NULL),
('Naturaleza Silvestre', 'Estudio de la Naturaleza', NULL),
('Primeros Auxilios I', 'Salud y Ciencia', NULL),
('Nudos y Amarres', 'Habilidades Prácticas', NULL);

-- Usuario director por defecto (la contraseña prevista es Admin123!).
INSERT IGNORE INTO usuarios
  (nombre_completo, email, password_hash, fecha_nacimiento, rol, unidad_id, clase_actual_id, estado)
SELECT
  'Director General',
  'director@joyasdecristo.com',
  '$2b$10$ggaRm57w0DKMZhfx5d/NBOWPxzemLH8yH8AcFU.gAdirjpcTpCf62',
  '1990-01-01',
  'DIRECTOR',
  (SELECT id FROM unidades WHERE nombre = 'Amatista' LIMIT 1),
  (SELECT id FROM clases WHERE nombre = 'Guía' LIMIT 1),
  'ACTIVO';

-- Preguntas de EJEMPLO para probar la pantalla de especialidades.
-- Reemplazar por el texto oficial del manual de especialidades antes de usar el sistema con el club.
INSERT IGNORE INTO preguntas_especialidad (especialidad_id, numero, pregunta, desarrollo)
SELECT e.id, p.numero, p.pregunta, p.desarrollo
FROM especialidades e
JOIN (
  SELECT 1 AS numero, '(Ejemplo) Definir los términos básicos de una cuerda: chicote, seno y firme.' AS pregunta,
         '(Ejemplo) Chicote: el extremo libre de la cuerda. Seno: la curva que se forma al doblarla. Firme: la parte que queda sin trabajar.' AS desarrollo
  UNION ALL SELECT 2, '(Ejemplo) Hacer y explicar el uso de diez nudos.', NULL
  UNION ALL SELECT 3, '(Ejemplo) Construir un objeto útil usando amarras.', NULL
) AS p
WHERE e.nombre = 'Nudos y Amarres';
