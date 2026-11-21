-- Guarda cuándo llegó cada solicitud de registro, para ordenarlas y mostrar su antigüedad.
ALTER TABLE solicitudes_registro
  ADD COLUMN fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER estado;
