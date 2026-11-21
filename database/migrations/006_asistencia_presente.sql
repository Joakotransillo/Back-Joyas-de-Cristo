-- La planilla del sábado necesita saber si el conquistador vino; puntualidad, Biblia,
-- uniforme y cuota solo cuentan si estuvo presente. registrado_en guarda cuándo se cargó.
ALTER TABLE asistencia
  ADD COLUMN presente BOOLEAN NOT NULL DEFAULT FALSE AFTER fecha,
  ADD COLUMN registrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER registrado_por;
