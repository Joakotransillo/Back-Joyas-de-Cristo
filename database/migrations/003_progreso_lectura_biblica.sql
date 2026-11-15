-- Guarda las lecturas personales por pasaje sin confundirlas con la firma oficial del requisito.
CREATE TABLE IF NOT EXISTS progreso_lectura_biblica (
    usuario_id INT NOT NULL,
    requisito_id INT NOT NULL,
    referencia VARCHAR(120) NOT NULL,
    fecha_completado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, requisito_id, referencia),
    CONSTRAINT fk_lectura_biblica_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_lectura_biblica_requisito
      FOREIGN KEY (requisito_id) REFERENCES requisitos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
