-- Migración para una base existente creada con el esquema anterior.
-- Si la base se creó nuevamente con el init.sql actualizado, no ejecutar este archivo.

CREATE TABLE IF NOT EXISTS cuadernillos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    clase_id INT NOT NULL,
    tipo ENUM('REGULAR', 'AVANZADA') NOT NULL,
    UNIQUE KEY uq_cuadernillos_clase_tipo (clase_id, tipo),
    CONSTRAINT fk_cuadernillos_clase
      FOREIGN KEY (clase_id) REFERENCES clases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias_cuadernillo (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cuadernillo_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    orden INT NOT NULL,
    UNIQUE KEY uq_categorias_cuadernillo_nombre (cuadernillo_id, nombre),
    UNIQUE KEY uq_categorias_cuadernillo_orden (cuadernillo_id, orden),
    CONSTRAINT fk_categorias_cuadernillo
      FOREIGN KEY (cuadernillo_id) REFERENCES cuadernillos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cuadernillos (clase_id, tipo)
SELECT id, 'REGULAR' FROM clases;

INSERT IGNORE INTO cuadernillos (clase_id, tipo)
SELECT id, 'AVANZADA' FROM clases;

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

-- Mantiene los requisitos preexistentes al pasar de categoría en texto a categoría relacionada.
SET @agregar_categoria_id = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE requisitos ADD COLUMN categoria_id INT NULL AFTER id',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'requisitos'
    AND column_name = 'categoria_id'
);
PREPARE migracion_stmt FROM @agregar_categoria_id;
EXECUTE migracion_stmt;
DEALLOCATE PREPARE migracion_stmt;

-- Conserva nombres de categorías antiguas que no estén en la lista nueva.
INSERT IGNORE INTO categorias_cuadernillo (cuadernillo_id, nombre, orden)
SELECT legado.cuadernillo_id, legado.nombre, 1000 + legado.primer_requisito_id
FROM (
  SELECT
    cuadernillo.id AS cuadernillo_id,
    CASE LOWER(TRIM(requisito.categoria))
      WHEN 'general' THEN 'I. Generales'
      WHEN 'descubrimiento espiritual' THEN 'II. Descubrimiento Espiritual'
      WHEN 'sirviendo a otros' THEN 'III. Sirviendo a los Demás'
      ELSE TRIM(requisito.categoria)
    END AS nombre,
    MIN(requisito.id) AS primer_requisito_id
  FROM requisitos AS requisito
  JOIN cuadernillos AS cuadernillo
    ON cuadernillo.clase_id = requisito.clase_id
   AND cuadernillo.tipo = 'REGULAR'
  WHERE requisito.categoria IS NOT NULL
  GROUP BY cuadernillo.id,
    CASE LOWER(TRIM(requisito.categoria))
      WHEN 'general' THEN 'I. Generales'
      WHEN 'descubrimiento espiritual' THEN 'II. Descubrimiento Espiritual'
      WHEN 'sirviendo a otros' THEN 'III. Sirviendo a los Demás'
      ELSE TRIM(requisito.categoria)
    END
) AS legado;

UPDATE requisitos AS requisito
JOIN cuadernillos AS cuadernillo
  ON cuadernillo.clase_id = requisito.clase_id
 AND cuadernillo.tipo = 'REGULAR'
JOIN categorias_cuadernillo AS categoria
  ON categoria.cuadernillo_id = cuadernillo.id
 AND categoria.nombre = CASE LOWER(TRIM(requisito.categoria))
   WHEN 'general' THEN 'I. Generales'
   WHEN 'descubrimiento espiritual' THEN 'II. Descubrimiento Espiritual'
   WHEN 'sirviendo a otros' THEN 'III. Sirviendo a los Demás'
   ELSE TRIM(requisito.categoria)
 END
SET requisito.categoria_id = categoria.id
WHERE requisito.categoria_id IS NULL;

-- La columna vieja queda nullable durante la transición; nuevas filas usan categoria_id.
ALTER TABLE requisitos
  MODIFY COLUMN categoria VARCHAR(50) NULL;

SET @agregar_indice_requisitos = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE requisitos ADD UNIQUE KEY uq_requisitos_categoria_numero (categoria_id, numero_item)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'requisitos'
    AND index_name = 'uq_requisitos_categoria_numero'
);
PREPARE migracion_stmt FROM @agregar_indice_requisitos;
EXECUTE migracion_stmt;
DEALLOCATE PREPARE migracion_stmt;

SET @agregar_fk_requisitos = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE requisitos ADD CONSTRAINT fk_requisitos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_cuadernillo(id) ON DELETE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'requisitos'
    AND constraint_name = 'fk_requisitos_categoria'
);
PREPARE migracion_stmt FROM @agregar_fk_requisitos;
EXECUTE migracion_stmt;
DEALLOCATE PREPARE migracion_stmt;
