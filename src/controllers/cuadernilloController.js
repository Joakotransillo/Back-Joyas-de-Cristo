const pool = require('../config/db');
const { extraerReferenciasBiblicas } = require('../utils/lecturasBiblicas');

const obtenerCuadernillo = async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT
        u.id AS usuario_id,
        c.id AS clase_id,
        c.nombre AS clase_nombre,
        c.color_insignia,
        b.id AS cuadernillo_id,
        b.tipo AS cuadernillo_tipo,
        categoria.id AS categoria_id,
        categoria.nombre AS categoria_nombre,
        categoria.orden AS categoria_orden,
        requisito.id AS requisito_id,
        requisito.numero_item,
        requisito.descripcion,
        progreso.id AS progreso_id,
        progreso.fecha_firma
      FROM usuarios AS u
      LEFT JOIN clases AS c
        ON c.id = u.clase_actual_id
      LEFT JOIN cuadernillos AS b
        ON b.clase_id = c.id
      LEFT JOIN categorias_cuadernillo AS categoria
        ON categoria.cuadernillo_id = b.id
      LEFT JOIN requisitos AS requisito
        ON requisito.categoria_id = categoria.id
      LEFT JOIN progreso_cuadernillo AS progreso
        ON progreso.requisito_id = requisito.id
       AND progreso.usuario_id = u.id
      WHERE u.id = ?
        AND u.estado = 'ACTIVO'
      ORDER BY
        CASE b.tipo WHEN 'REGULAR' THEN 1 WHEN 'AVANZADA' THEN 2 ELSE 3 END,
        categoria.orden,
        requisito.numero_item`,
      [req.auth.userId]
    );

    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontró el usuario autenticado' });
    }

    const primeraFila = filas[0];
    if (primeraFila.clase_id === null) {
      return res.status(409).json({ mensaje: 'El usuario no tiene una clase asignada' });
    }

    const [lecturas] = await pool.execute(
      `SELECT requisito_id, referencia
       FROM progreso_lectura_biblica
       WHERE usuario_id = ?`,
      [req.auth.userId]
    );
    const lecturasPorRequisito = new Map();
    for (const lectura of lecturas) {
      const referencias = lecturasPorRequisito.get(lectura.requisito_id) || [];
      referencias.push(lectura.referencia);
      lecturasPorRequisito.set(lectura.requisito_id, referencias);
    }

    const cuadernillosPorId = new Map();

    for (const fila of filas) {
      if (fila.cuadernillo_id === null) continue;

      if (!cuadernillosPorId.has(fila.cuadernillo_id)) {
        cuadernillosPorId.set(fila.cuadernillo_id, {
          id: fila.cuadernillo_id,
          tipo: fila.cuadernillo_tipo,
          categorias: [],
          categoriasPorId: new Map()
        });
      }

      const cuadernillo = cuadernillosPorId.get(fila.cuadernillo_id);
      if (fila.categoria_id === null) continue;

      if (!cuadernillo.categoriasPorId.has(fila.categoria_id)) {
        const categoria = {
          id: fila.categoria_id,
          nombre: fila.categoria_nombre,
          orden: fila.categoria_orden,
          requisitos: []
        };
        cuadernillo.categoriasPorId.set(fila.categoria_id, categoria);
        cuadernillo.categorias.push(categoria);
      }

      if (fila.requisito_id === null) continue;

      const referenciasLectura = fila.categoria_nombre === 'II. Descubrimiento Espiritual'
        && Number(fila.numero_item) === 3
        ? extraerReferenciasBiblicas(fila.descripcion)
        : [];

      cuadernillo.categoriasPorId.get(fila.categoria_id).requisitos.push({
        id: fila.requisito_id,
        numero_item: fila.numero_item,
        descripcion: fila.descripcion,
        completado: fila.progreso_id !== null,
        firmado: fila.progreso_id !== null,
        fecha_firma: fila.fecha_firma,
        referencias_lectura: referenciasLectura,
        lecturas_completadas: (lecturasPorRequisito.get(fila.requisito_id) || [])
          .filter((referencia) => referenciasLectura.includes(referencia))
      });
    }

    const cuadernillos = [...cuadernillosPorId.values()].map(({ categoriasPorId, ...cuadernillo }) => cuadernillo);

    if (cuadernillos.length === 0) {
      return res.status(404).json({ mensaje: 'No hay cuadernillos cargados para la clase actual' });
    }

    return res.json({
      clase: {
        id: primeraFila.clase_id,
        nombre: primeraFila.clase_nombre,
        color_insignia: primeraFila.color_insignia
      },
      cuadernillos
    });
  } catch (error) {
    console.error('Error en GET /api/conquis/cuadernillo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const actualizarLecturaBiblica = async (req, res) => {
  const requisitoId = Number(req.params.requisitoId);
  const referencia = typeof req.body?.referencia === 'string' ? req.body.referencia.trim() : '';
  const { completado } = req.body || {};

  if (!Number.isInteger(requisitoId) || requisitoId < 1 || typeof completado !== 'boolean') {
    return res.status(400).json({ mensaje: 'El requisito y el estado de lectura son obligatorios' });
  }

  if (referencia.length === 0 || referencia.length > 120) {
    return res.status(400).json({ mensaje: 'La referencia bíblica no es válida' });
  }

  try {
    const [requisitos] = await pool.execute(
      `SELECT requisito.descripcion, requisito.numero_item,
              categoria.nombre AS categoria_nombre,
              progreso.id AS progreso_id
       FROM usuarios AS usuario
       JOIN clases AS clase
         ON clase.id = usuario.clase_actual_id
       JOIN cuadernillos AS cuadernillo
         ON cuadernillo.clase_id = clase.id
        AND cuadernillo.tipo = 'REGULAR'
       JOIN categorias_cuadernillo AS categoria
         ON categoria.cuadernillo_id = cuadernillo.id
       JOIN requisitos AS requisito
         ON requisito.categoria_id = categoria.id
       LEFT JOIN progreso_cuadernillo AS progreso
         ON progreso.requisito_id = requisito.id
        AND progreso.usuario_id = usuario.id
       WHERE usuario.id = ?
         AND usuario.estado = 'ACTIVO'
         AND requisito.id = ?
         AND categoria.nombre = 'II. Descubrimiento Espiritual'
         AND requisito.numero_item = 3
       LIMIT 1`,
      [req.auth.userId, requisitoId]
    );

    if (requisitos.length === 0) {
      return res.status(404).json({ mensaje: 'No encontramos ese punto de lectura en tu cuadernillo' });
    }

    const requisito = requisitos[0];
    if (requisito.progreso_id !== null) {
      return res.status(409).json({ mensaje: 'Este punto ya fue firmado por tu consejero' });
    }

    const referenciasPermitidas = extraerReferenciasBiblicas(requisito.descripcion);
    if (!referenciasPermitidas.includes(referencia)) {
      return res.status(400).json({ mensaje: 'La referencia no pertenece a este punto del cuadernillo' });
    }

    if (completado) {
      await pool.execute(
        `INSERT INTO progreso_lectura_biblica (usuario_id, requisito_id, referencia)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE fecha_completado = CURRENT_TIMESTAMP`,
        [req.auth.userId, requisitoId, referencia]
      );
    } else {
      await pool.execute(
        `DELETE FROM progreso_lectura_biblica
         WHERE usuario_id = ? AND requisito_id = ? AND referencia = ?`,
        [req.auth.userId, requisitoId, referencia]
      );
    }

    return res.json({ requisito_id: requisitoId, referencia, completado });
  } catch (error) {
    console.error('Error al actualizar una lectura bíblica:', error);
    return res.status(500).json({ mensaje: 'No pudimos guardar el avance de lectura' });
  }
};

module.exports = { obtenerCuadernillo, actualizarLecturaBiblica };
