-- Migración aditiva para bases existentes. Crea el catálogo de eventos del club.
CREATE TABLE IF NOT EXISTS eventos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME,
    lugar VARCHAR(180),
    unidad_id INT,
    estado ENUM('BORRADOR', 'PUBLICADO', 'CANCELADO') NOT NULL DEFAULT 'PUBLICADO',
    autor_id INT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_eventos_estado_fecha (estado, fecha_inicio),
    KEY idx_eventos_unidad_fecha (unidad_id, fecha_inicio),
    CONSTRAINT fk_eventos_unidad
      FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE,
    CONSTRAINT fk_eventos_autor
      FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
