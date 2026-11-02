-- Limpieza previa (útil para reiniciar la BD sin borrarla)
DROP TABLE IF EXISTS avisos, asistencia, recursos_biblioteca, especialidades_usuario, progreso_cuadernillo, requisitos, solicitudes_registro, usuarios, especialidades, clases, unidades CASCADE;

-- 1. Entidades Base Independientes
CREATE TABLE unidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255)
);

CREATE TABLE clases (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    color_insignia VARCHAR(20)
);

CREATE TABLE especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    insignia_url VARCHAR(255)
);

-- 2. Entidades de Usuarios (Dependen de unidades y clases)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE,
    rol VARCHAR(30) NOT NULL, -- CONQUISTADOR, CONSEJERO, SECRETARIA, DIRECTOR
    unidad_id INTEGER REFERENCES unidades(id) ON DELETE SET NULL,
    clase_actual_id INTEGER REFERENCES clases(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'ACTIVO'
);

CREATE TABLE solicitudes_registro (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    fecha_nacimiento DATE,
    clase_sugerida_id INTEGER REFERENCES clases(id),
    unidad_sugerida_id INTEGER REFERENCES unidades(id),
    estado VARCHAR(20) DEFAULT 'PENDIENTE' -- PENDIENTE, APROBADA, RECHAZADA
);

-- 3. Módulo Pedagógico (Dependen de clases y usuarios)
CREATE TABLE requisitos (
    id SERIAL PRIMARY KEY,
    clase_id INTEGER REFERENCES clases(id) ON DELETE CASCADE,
    categoria VARCHAR(50) NOT NULL,
    numero_item INTEGER NOT NULL,
    descripcion TEXT NOT NULL
);

CREATE TABLE progreso_cuadernillo (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    requisito_id INTEGER REFERENCES requisitos(id) ON DELETE CASCADE,
    fecha_firma TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(usuario_id, requisito_id) -- Evita firmar dos veces el mismo ítem
);

CREATE TABLE especialidades_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad_id INTEGER REFERENCES especialidades(id) ON DELETE CASCADE,
    fecha_completado DATE DEFAULT CURRENT_DATE,
    evaluador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(usuario_id, especialidad_id)
);

-- 4. Módulos Administrativos y Comunicación (Dependen de usuarios y unidades)
CREATE TABLE recursos_biblioteca (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL, -- PDF, VIDEO
    enlace_url VARCHAR(255) NOT NULL,
    categoria VARCHAR(50),
    subido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE asistencia (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    puntualidad BOOLEAN DEFAULT false,
    biblia BOOLEAN DEFAULT false,
    uniforme BOOLEAN DEFAULT false,
    cuota BOOLEAN DEFAULT false,
    registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE(usuario_id, fecha) -- Solo un registro de asistencia por persona por día
);

CREATE TABLE avisos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unidad_id INTEGER REFERENCES unidades(id) ON DELETE CASCADE,
    autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);