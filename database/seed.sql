-- Catalogos de ejemplo. Las claves unicas permiten volver a ejecutar el seed sin duplicar datos.

INSERT IGNORE INTO clases (nombre, color_insignia) VALUES
('Amigo', '#1E40AF'),
('Compañero', '#DC2626'),
('Explorador', '#166534'),
('Pionero', '#65A30D'),
('Excursionista', '#7C3AED'),
('Guía', '#CA8A04');

INSERT IGNORE INTO unidades (nombre, logo_url) VALUES
('Amatista', NULL),
('Esmeralda', NULL),
('Calcedonia', NULL);

INSERT IGNORE INTO especialidades (nombre, categoria, insignia_url) VALUES
('Arte de Acampar', 'Actividades al Aire Libre', NULL),
('Naturaleza Silvestre', 'Estudio de la Naturaleza', NULL),
('Primeros Auxilios I', 'Salud y Ciencia', NULL),
('Nudos y Amarres', 'Habilidades Prácticas', NULL);

INSERT IGNORE INTO requisitos (clase_id, categoria, numero_item, descripcion)
SELECT id, 'General', 1, 'Tener 10 años de edad como mínimo.'
FROM clases WHERE nombre = 'Amigo';

INSERT IGNORE INTO requisitos (clase_id, categoria, numero_item, descripcion)
SELECT id, 'Descubrimiento Espiritual', 1,
       'Memorizar y explicar el Voto y la Ley del Conquistador.'
FROM clases WHERE nombre = 'Amigo';

INSERT IGNORE INTO requisitos (clase_id, categoria, numero_item, descripcion)
SELECT id, 'Sirviendo a Otros', 1,
       'Ser un buen compañero en el hogar y en la escuela.'
FROM clases WHERE nombre = 'Amigo';

-- Usuario director por defecto (la contraseña prevista es Admin123!).
INSERT IGNORE INTO usuarios
  (nombre_completo, email, password_hash, fecha_nacimiento, rol, unidad_id, clase_actual_id, estado)
SELECT
  'Director General',
  'director@joyasdecristo.com',
  '$2a$10$e8w.x.U50xS6Z6e5PZ7q/eJmG7W3j2Y.3h2Z8Z8Z8Z8Z8Z8Z8Z8Z8',
  '1990-01-01',
  'DIRECTOR',
  (SELECT id FROM unidades WHERE nombre = 'Amatista' LIMIT 1),
  (SELECT id FROM clases WHERE nombre = 'Guía' LIMIT 1),
  'ACTIVO';
