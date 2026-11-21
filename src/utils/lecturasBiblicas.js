function referenciasDeLibro(nombre, contenido) {
  let capituloActual = null;
  const referencias = [];

  for (const parte of contenido.split(';')) {
    const coincidencia = parte.trim().replace(/[.]$/, '').match(/^(\d+)(?::\s*(.+))?$/);
    if (!coincidencia) continue;

    capituloActual = coincidencia[1];
    if (!coincidencia[2]) {
      referencias.push(`${nombre} ${capituloActual}`);
      continue;
    }

    const pasajes = coincidencia[2].split(/\s+y\s+|,\s*/i);
    for (const pasaje of pasajes) {
      const referencia = pasaje.trim();
      if (/^\d+(?:-\d+)?$/.test(referencia)) {
        referencias.push(`${nombre} ${capituloActual}:${referencia}`);
      }
    }
  }

  return referencias;
}

function extraerReferenciasBiblicas(descripcion = '') {
  const texto = String(descripcion);
  if (!/lectura\s+b[ií]blica\s*:/i.test(texto)) return [];

  const coincidencia = texto.match(/G[eé]nesis\s+([\s\S]*?)\.\s*Éxodo\s+([\s\S]+?)\.?\s*$/iu);
  if (!coincidencia) return [];

  return [
    ...referenciasDeLibro('Génesis', coincidencia[1]),
    ...referenciasDeLibro('Éxodo', coincidencia[2])
  ];
}

module.exports = { extraerReferenciasBiblicas };
