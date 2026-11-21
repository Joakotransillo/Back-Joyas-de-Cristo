-- Agrega el código de cada especialidad y sus preguntas.
-- El desarrollo de cada pregunta es material para consejeros: la API solo lo envía a CONSEJERO y DIRECTOR.
ALTER TABLE especialidades
  ADD COLUMN codigo VARCHAR(20) NULL AFTER nombre,
  ADD UNIQUE KEY uq_especialidades_codigo (codigo);

CREATE TABLE IF NOT EXISTS preguntas_especialidad (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    especialidad_id INT NOT NULL,
    numero INT NOT NULL,
    pregunta TEXT NOT NULL,
    desarrollo TEXT NULL,
    UNIQUE KEY uq_preguntas_especialidad_numero (especialidad_id, numero),
    CONSTRAINT fk_preguntas_especialidad
      FOREIGN KEY (especialidad_id) REFERENCES especialidades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
