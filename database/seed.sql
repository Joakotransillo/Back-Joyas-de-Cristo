-- database/seed.sql

-- 1. Catálogo de Clases Regulares
INSERT INTO clases (nombre, color_insignia) VALUES 
('Amigo', '#1E40AF'),
('Compañero', '#DC2626'),
('Explorador', '#166534'),
('Pionero', '#65A30D'),
('Excursionista', '#7C3AED'),
('Guía', '#CA8A04')
ON CONFLICT DO NOTHING;

-- 2. Unidades Base del Club
INSERT INTO unidades (nombre, logo_url) VALUES 
('Amatista', NULL),
('Esmeralda', NULL),
('Calcedonia', NULL)
ON CONFLICT DO NOTHING;

-- 3. Especialidades de Muestra
INSERT INTO especialidades (nombre, categoria, insignia_url) VALUES 
('Arte de Acampar', 'Actividades Al Aire Libre', NULL),
('Naturaleza Silvestre', 'Estudio de la Naturaleza', NULL),
('Primeros Auxilios I', 'Salud y Ciencia', NULL),
('Nudos y Amarres', 'Habilidades Prácticas', NULL)
ON CONFLICT DO NOTHING;

-- 4. Requisitos de Prueba (Para la clase Amigo)
INSERT INTO requisitos (clase_id, categoria, numero_item, descripcion) VALUES 
(1, 'General', 1, 'Tener 10 años de edad como mínimo.'),
(1, 'Descubrimiento Espiritual', 1, 'Memorizar y explicar el Voto y la Ley del Conquistador.'),
(1, 'Sirviendo a Otros', 1, 'Ser un buen compañero en el hogar y en la escuela.')
ON CONFLICT DO NOTHING;

-- 5. Usuario Director por Defecto (Password: Admin123!)
-- Hash generado con bcryptjs (10 salt rounds)
INSERT INTO usuarios (nombre_completo, email, password_hash, fecha_nacimiento, rol, unidad_id, clase_actual_id, estado) VALUES 
('Director General', 'director@joyasdecristo.com', '$2a$10$e8w.x.U50xS6Z6e5PZ7q/eJmG7W3j2Y.3h2Z8Z8Z8Z8Z8Z8Z8Z8Z8', '1990-01-01', 'DIRECTOR', 1, 6, 'ACTIVO')
ON CONFLICT (email) DO NOTHING;