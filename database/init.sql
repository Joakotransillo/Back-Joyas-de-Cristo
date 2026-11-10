-- Recrea el esquema completo. No ejecutar sobre una base con datos que se quieran conservar.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS avisos, asistencia, recursos_biblioteca, especialidades_usuario,
  progreso_cuadernillo, requisitos, solicitudes_registro, sesiones, usuarios,
  especialidades, clases, unidades;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE unidades (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    UNIQUE KEY uq_unidades_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clases (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    color_insignia VARCHAR(20),
    UNIQUE KEY uq_clases_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE especialidades (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    insignia_url VARCHAR(255),
    UNIQUE KEY uq_especialidades_nombre_categoria (nombre, categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE,
    rol VARCHAR(30) NOT NULL,
    unidad_id INT,
    clase_actual_id INT,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    UNIQUE KEY uq_usuarios_email (email),
    CONSTRAINT fk_usuarios_unidad
      FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE SET NULL,
    CONSTRAINT fk_usuarios_clase
      FOREIGN KEY (clase_actual_id) REFERENCES clases(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sesiones (
    jti CHAR(36) NOT NULL PRIMARY KEY,
    usuario_id INT NOT NULL,
    expira_en DATETIME(3) NOT NULL,
    revocada_en DATETIME(3),
    creada_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_sesiones_usuario_id (usuario_id),
    CONSTRAINT fk_sesiones_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE solicitudes_registro (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE,
    clase_sugerida_id INT,
    unidad_sugerida_id INT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    UNIQUE KEY uq_solicitudes_registro_email (email),
    CONSTRAINT fk_solicitudes_clase
      FOREIGN KEY (clase_sugerida_id) REFERENCES clases(id),
    CONSTRAINT fk_solicitudes_unidad
      FOREIGN KEY (unidad_sugerida_id) REFERENCES unidades(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE requisitos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    clase_id INT,
    categoria VARCHAR(50) NOT NULL,
    numero_item INT NOT NULL,
    descripcion TEXT NOT NULL,
    UNIQUE KEY uq_requisitos_clase_categoria_item (clase_id, categoria, numero_item),
    CONSTRAINT fk_requisitos_clase
      FOREIGN KEY (clase_id) REFERENCES clases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE progreso_cuadernillo (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    requisito_id INT,
    fecha_firma TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evaluador_id INT,
    UNIQUE KEY uq_progreso_usuario_requisito (usuario_id, requisito_id),
    CONSTRAINT fk_progreso_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_progreso_requisito
      FOREIGN KEY (requisito_id) REFERENCES requisitos(id) ON DELETE CASCADE,
    CONSTRAINT fk_progreso_evaluador
      FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE especialidades_usuario (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    especialidad_id INT,
    fecha_completado DATE NOT NULL DEFAULT (CURRENT_DATE),
    evaluador_id INT,
    UNIQUE KEY uq_especialidades_usuario (usuario_id, especialidad_id),
    CONSTRAINT fk_especialidades_usuario_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_especialidades_usuario_especialidad
      FOREIGN KEY (especialidad_id) REFERENCES especialidades(id) ON DELETE CASCADE,
    CONSTRAINT fk_especialidades_usuario_evaluador
      FOREIGN KEY (evaluador_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recursos_biblioteca (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL,
    enlace_url VARCHAR(255) NOT NULL,
    categoria VARCHAR(50),
    subido_por INT,
    CONSTRAINT fk_recursos_subido_por
      FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE asistencia (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    fecha DATE NOT NULL,
    puntualidad BOOLEAN NOT NULL DEFAULT FALSE,
    biblia BOOLEAN NOT NULL DEFAULT FALSE,
    uniforme BOOLEAN NOT NULL DEFAULT FALSE,
    cuota BOOLEAN NOT NULL DEFAULT FALSE,
    registrado_por INT,
    UNIQUE KEY uq_asistencia_usuario_fecha (usuario_id, fecha),
    CONSTRAINT fk_asistencia_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_asistencia_registrado_por
      FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE avisos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unidad_id INT,
    autor_id INT,
    CONSTRAINT fk_avisos_unidad
      FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE,
    CONSTRAINT fk_avisos_autor
      FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
