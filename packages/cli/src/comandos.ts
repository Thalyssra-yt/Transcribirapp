import {
  INSTRUMENTOS,
  buscarInstrumento,
  instrumentoPorId,
  instrumentosDeAgrupacion,
  parseNota,
  quintas,
  transponerPartitura,
  type Agrupacion,
  type CambioTonalidad,
  type DestinoTransposicion,
  type DireccionCambio,
  type EstadoRango,
  type InstrumentoId,
  type OpcionesTransponerPartitura,
  type OrigenPartitura,
  type PreferenciaEnarmonia
} from '@transcriptor/core';
import {
  esBooleana,
  parseArgumentos,
  textoOpcion,
  textoSOpciones,
  type Argumentos,
  type DefinicionOpcion
} from './argumentos.js';
import {
  aplicarOctava,
  cargarPartitura,
  guardarPartitura,
  informacionPartitura,
  informeRango,
  mismasRutas,
  resolverPartes,
  textoArmadura,
  type InformacionPartitura,
  type InformeRangoCli
} from './partitura.js';

export interface ResultadoComando {
  texto: string[];
  json: unknown;
}

interface TonalidadLeida {
  armadura: number;
  modo?: 'major' | 'minor';
}

const VERSION = '0.1.0';

const OPCION_JSON: DefinicionOpcion = { nombre: 'json', booleana: true };
const OPCION_AYUDA: DefinicionOpcion = { nombre: 'ayuda', alias: 'h', booleana: true };
const OPCION_HELP: DefinicionOpcion = { nombre: 'ayuda', alias: 'help', booleana: true };

const AGRUPACIONES: readonly Agrupacion[] = [
  'orquesta',
  'banda',
  'brass-band',
  'big-band',
  'camara',
  'coro',
  'moderna',
  'historico'
];

const AYUDA_GENERAL: readonly string[] = [
  'Uso: pnpm partitura <comando> [opciones]',
  '',
  'Comandos:',
  '  instrumentos   Buscar instrumentos por nombre, alias o agrupación',
  '  info           Mostrar partes, tonalidades, registro y dudas de una partitura',
  '  transponer     Transponer una partitura a otro instrumento o tonalidad',
  '  rango          Comprobar el registro para un instrumento',
  '',
  'Opciones comunes:',
  '  --json         Salida en JSON',
  '  -h, --help     Ayuda general o de un comando',
  '  --version      Mostrar la versión'
];

const AYUDAS: Record<string, readonly string[]> = {
  instrumentos: [
    'Uso: pnpm partitura instrumentos [--buscar <texto>] [--agrupacion <grupo>] [--json]',
    '',
    'Muestra el id, el nombre y la afinación de cada instrumento.',
    '  --buscar <texto>       Buscar por nombre, alias, abreviatura o id',
    '  --agrupacion <grupo>   orquesta, banda, brass-band, big-band, camara, coro, moderna u historico',
    `  -h, --help             Mostrar esta ayuda`
  ],
  info: [
    'Uso: pnpm partitura info <archivo> [--json]',
    '',
    'Muestra partes, tonalidad, compás, transporte detectado, registro y dudas.',
    '  -h, --help   Mostrar esta ayuda'
  ],
  transponer: [
    'Uso: pnpm partitura transponer <archivo> --a <destino> -o <salida> [opciones]',
    '',
    'Entrada: .musicxml, .xml, .mxl o .abc. Salida: .musicxml, .xml o .mxl.',
    '  --de <origen>            concierto, auto o id de instrumento; por defecto, auto',
    '  --a <destino>            concierto o id de instrumento',
    '  -o, --salida <archivo>   Archivo de salida',
    '  --parte <id|número>      Parte a transponer; se puede repetir',
    '  --octava <±N>            Subir o bajar N octavas (de -2 a +2)',
    '  --tonalidad <valor>      Armadura -7..7 o nombre: Sol, Mib, Re menor, F# (menor cambia el modo)',
    '  --direccion <valor>      cercana, arriba o abajo',
    '  --preferir <valor>       sostenidos o bemoles',
    '  --forzar                 Permitir que la salida sobrescriba la entrada',
    '  --json                   Salida en JSON',
    '  -h, --help               Mostrar esta ayuda'
  ],
  rango: [
    'Uso: pnpm partitura rango <archivo> --instrumento <id> [--json]',
    '',
    'Comprueba el registro después de llevar cada parte a concierto y al instrumento destino.',
    '  --instrumento <id>     Instrumento destino',
    '  --parte <id|número>    Parte a analizar; se puede repetir',
    '  -h, --help             Mostrar esta ayuda'
  ]
};

const ESTADOS_RANGO: Record<EstadoRango, string> = {
  comodo: 'cómodo',
  'fuera-comodo': 'fuera del registro cómodo',
  'fuera-absoluto': 'fuera del registro absoluto'
};

function comoJson(valor: unknown): string[] {
  return [JSON.stringify(valor, null, 2)];
}

function ayuda(comando: string): ResultadoComando {
  const texto = AYUDAS[comando] ?? AYUDA_GENERAL;

  return { texto: [...texto], json: { ayuda: comando } };
}

function esAyuda(args: Argumentos): boolean {
  return esBooleana(args, 'ayuda');
}

function exigirArchivo(posicionales: string[], uso: string): string {
  if (posicionales.length !== 1) {
    throw new Error(`Uso: ${uso}`);
  }

  return posicionales[0];
}

function normalizarParaBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.\s]+/g, ' ')
    .trim();
}

function distanciaEdicion(izquierda: string, derecha: string): number {
  const a = normalizarParaBusqueda(izquierda);
  const b = normalizarParaBusqueda(derecha);
  const fila = Array.from({ length: b.length + 1 }, (_, indice) => indice);

  for (let i = 1; i <= a.length; i += 1) {
    let anterior = fila[0];
    fila[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const temporal = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = temporal;
    }
  }

  return fila[b.length];
}

function sugerirInstrumento(texto: string): string | undefined {
  const encontrados = buscarInstrumento(texto);
  const candidatos = encontrados.length > 0 ? encontrados : INSTRUMENTOS;

  let mejor: string | undefined;
  let mejorDistancia = Number.POSITIVE_INFINITY;

  for (const instrumento of candidatos) {
    const distancia = distanciaEdicion(texto, instrumento.id);
    if (distancia < mejorDistancia) {
      mejor = instrumento.id;
      mejorDistancia = distancia;
    }
  }

  const umbral = Math.max(2, Math.ceil(normalizarParaBusqueda(texto).length / 3));

  return mejor !== undefined && (encontrados.length > 0 || mejorDistancia <= umbral)
    ? mejor
    : undefined;
}

function resolverInstrumentoId(texto: string): InstrumentoId {
  try {
    return instrumentoPorId(texto).id as InstrumentoId;
  } catch {
    const sugerencia = sugerirInstrumento(texto);
    const detalle = sugerencia ? ` ¿Quisiste decir ${sugerencia}?` : '';

    throw new Error(`Instrumento desconocido: ${texto}.${detalle}`);
  }
}

function resolverOrigen(texto: string): OrigenPartitura {
  if (texto === 'auto' || texto === 'concierto') {
    return texto;
  }

  return resolverInstrumentoId(texto);
}

function resolverDestino(texto: string): DestinoTransposicion {
  if (texto === 'concierto') {
    return texto;
  }

  return resolverInstrumentoId(texto);
}

function resolverAgrupacion(texto: string | undefined): Agrupacion | undefined {
  if (texto === undefined) {
    return undefined;
  }

  const normalizado = normalizarParaBusqueda(texto);
  const alias: Record<string, Agrupacion> = {
    'brass band': 'brass-band',
    'big band': 'big-band',
    camara: 'camara',
    historico: 'historico'
  };
  const valor = alias[normalizado] ?? normalizado;

  if (AGRUPACIONES.includes(valor as Agrupacion)) {
    return valor as Agrupacion;
  }

  throw new Error(`Agrupación desconocida: ${texto}. Usa ${AGRUPACIONES.join(', ')}`);
}

function resolverDireccion(texto: string | undefined): DireccionCambio {
  if (texto === undefined || texto === 'cercana') {
    return 'cercana';
  }
  if (texto === 'arriba' || texto === 'abajo') {
    return texto;
  }

  throw new Error('La dirección debe ser cercana, arriba o abajo');
}

function resolverPreferencia(texto: string | undefined): PreferenciaEnarmonia | undefined {
  if (texto === undefined) {
    return undefined;
  }
  if (texto === 'sostenidos' || texto === 'bemoles') {
    return texto;
  }

  throw new Error('La preferencia debe ser sostenidos o bemoles');
}

function resolverArmadura(texto: string | undefined): TonalidadLeida | undefined {
  if (texto === undefined) {
    return undefined;
  }

  const limpio = texto.trim().replace(/\s+/g, ' ');
  const error = () =>
    new Error(
      `No se puede interpretar la tonalidad "${texto}". Usa -7..7 o un nombre como "Sol", "Mib", "Re menor" o "F#".`
    );

  if (/^[+-]?\d+$/.test(limpio)) {
    const armadura = Number(limpio);
    if (armadura < -7 || armadura > 7) {
      throw error();
    }

    return { armadura };
  }

  const menor = /\s(?:menor|minor)$/i.test(limpio);
  const tonica = limpio.replace(/\s(?:menor|minor)$/i, '');
  const nombres: Record<string, string> = {
    do: 'Do',
    re: 'Re',
    mi: 'Mi',
    fa: 'Fa',
    sol: 'Sol',
    la: 'La',
    si: 'Si'
  };
  const conAlteracion = /^(do|re|mi|fa|sol|la|si)([#b]{1,2})$/i.exec(tonica);
  const conMayuscula = conAlteracion
    ? `${nombres[conAlteracion[1].toLowerCase()]}${conAlteracion[2].toLowerCase()}`
    : (nombres[tonica.toLowerCase()] ?? tonica);

  try {
    const armadura = quintas(parseNota(`${conMayuscula}4`)) - (menor ? 3 : 0);
    if (armadura < -7 || armadura > 7) {
      throw error();
    }

    return { armadura, modo: menor ? 'minor' : 'major' };
  } catch (errorTonica) {
    if (errorTonica instanceof Error && errorTonica.message.includes('tonalidad')) {
      throw errorTonica;
    }

    throw error();
  }
}

function octavaDe(texto: string | undefined): number {
  if (texto === undefined) {
    return 0;
  }

  const octavas = Number(texto);
  if (!Number.isInteger(octavas) || Math.abs(octavas) > 2) {
    throw new Error('La octava debe ser un número entero entre -2 y +2');
  }

  return octavas;
}

function comandoInstrumentos(resto: readonly string[]): ResultadoComando {
  const args = parseArgumentos(resto, [
    { nombre: 'buscar' },
    { nombre: 'agrupacion' },
    OPCION_JSON,
    OPCION_AYUDA,
    OPCION_HELP
  ]);

  if (esAyuda(args)) {
    return ayuda('instrumentos');
  }
  if (args.posicionales.length !== 0) {
    throw new Error(
      'Uso: pnpm partitura instrumentos [--buscar <texto>] [--agrupacion <grupo>] [--json]'
    );
  }

  const busqueda = textoOpcion(args, 'buscar');
  const agrupacion = resolverAgrupacion(textoOpcion(args, 'agrupacion'));
  const seleccion = agrupacion ? instrumentosDeAgrupacion(agrupacion) : [...INSTRUMENTOS];
  const coincidencias = busqueda === undefined ? seleccion : buscarInstrumento(busqueda);
  const ids = new Set(coincidencias.map((instrumento) => instrumento.id));
  const instrumentos = seleccion
    .filter((instrumento) => ids.has(instrumento.id))
    .map((instrumento) => ({
      id: instrumento.id,
      nombre: instrumento.nombre,
      afinacion: instrumento.afinacion,
      familia: instrumento.familia,
      agrupaciones: [...instrumento.agrupaciones]
    }));
  const json = { instrumentos, busqueda: busqueda ?? null, agrupacion: agrupacion ?? null };
  const texto = esBooleana(args, 'json')
    ? comoJson(json)
    : [
        `Instrumentos (${instrumentos.length}):`,
        ...instrumentos.map(
          (instrumento) => `${instrumento.id} — ${instrumento.nombre} (${instrumento.afinacion})`
        ),
        ...(instrumentos.length === 0 ? ['No se encontraron instrumentos con esos filtros.'] : [])
      ];

  return { texto, json };
}

function formatearInfo(info: InformacionPartitura): string[] {
  const lineas: string[] = [`Archivo: ${info.archivo}`];

  if (info.titulo) {
    lineas.push(`Título: ${info.titulo}`);
  }
  if (info.compositor) {
    lineas.push(`Compositor: ${info.compositor}`);
  }

  for (const parte of info.partes) {
    lineas.push('', `Parte ${parte.id} — ${parte.nombre}`);
    lineas.push(`  Tonalidad: ${textoArmadura(parte.tonalidad)} (${parte.tonalidad})`);
    lineas.push(`  Compás: ${parte.compases.join(', ') || 'no declarado'}`);
    const transporte = parte.transportada
      ? `sí (${parte.origen ?? 'instrumento desconocido'}, detectado por ${parte.deteccion})`
      : 'no';
    lineas.push(`  Transportada: ${transporte}`);
    const registro = parte.registro.notas
      ? `${parte.registro.inferior} — ${parte.registro.superior} (${parte.registro.notas} notas)`
      : 'sin notas';
    lineas.push(`  Registro: ${registro}`);
  }

  lineas.push('', `Dudas: ${info.dudas.length === 0 ? 'ninguna' : info.dudas.length}`);
  for (const duda of info.dudas) {
    lineas.push(`  ${duda.nombre}: ${duda.candidatos.join(', ')}`);
  }

  return lineas;
}

function comandoInfo(resto: readonly string[]): ResultadoComando {
  const args = parseArgumentos(resto, [OPCION_JSON, OPCION_AYUDA, OPCION_HELP]);

  if (esAyuda(args)) {
    return ayuda('info');
  }

  const archivo = exigirArchivo(args.posicionales, 'pnpm partitura info <archivo> [--json]');
  const info = informacionPartitura(archivo);

  return {
    texto: esBooleana(args, 'json') ? comoJson(info) : formatearInfo(info),
    json: info
  };
}

function comandoTransponer(resto: readonly string[]): ResultadoComando {
  const definiciones: DefinicionOpcion[] = [
    { nombre: 'de' },
    { nombre: 'a' },
    { nombre: 'salida', alias: 'o' },
    { nombre: 'parte', multiple: true },
    { nombre: 'octava' },
    { nombre: 'tonalidad' },
    { nombre: 'direccion' },
    { nombre: 'preferir' },
    { nombre: 'forzar', booleana: true },
    OPCION_JSON,
    OPCION_AYUDA,
    OPCION_HELP
  ];
  const args = parseArgumentos(resto, definiciones);

  if (esAyuda(args)) {
    return ayuda('transponer');
  }

  const archivo = exigirArchivo(
    args.posicionales,
    'pnpm partitura transponer <archivo> --a <destino> -o <salida>'
  );
  const textoOrigen = textoOpcion(args, 'de') ?? 'auto';
  const textoDestino = textoOpcion(args, 'a');
  const salida = textoOpcion(args, 'salida');

  if (!textoDestino) {
    throw new Error('Falta la opción --a (concierto o un id de instrumento)');
  }
  if (!salida) {
    throw new Error('Falta la opción -o/--salida con el archivo de destino');
  }
  if (mismasRutas(archivo, salida) && !esBooleana(args, 'forzar')) {
    throw new Error(
      `La salida coincide con la entrada (${salida}). Usa --forzar para sobrescribir.`
    );
  }

  const desde = resolverOrigen(textoOrigen);
  const hasta = resolverDestino(textoDestino);
  const octavas = octavaDe(textoOpcion(args, 'octava'));
  const tonalidad = resolverArmadura(textoOpcion(args, 'tonalidad'));
  const direccion = resolverDireccion(textoOpcion(args, 'direccion'));
  const preferir = resolverPreferencia(textoOpcion(args, 'preferir'));
  const cargado = cargarPartitura(archivo);
  const ids = resolverPartes(cargado.documento, textoSOpciones(args, 'parte'));
  const opciones: OpcionesTransponerPartitura = { desde, hasta, partes: ids };

  if (tonalidad !== undefined) {
    const cambio: CambioTonalidad = {
      armadura: tonalidad.armadura,
      direccion,
      ...(tonalidad.modo ? { modo: tonalidad.modo } : {})
    };
    opciones.cambioTonalidad = cambio;
  }
  if (preferir !== undefined) {
    opciones.preferir = preferir;
  }

  const informe = transponerPartitura(cargado.documento, opciones);
  aplicarOctava(cargado.documento, octavas, ids);
  const guardado = guardarPartitura(cargado.documento, salida);
  const avisos = [...informe.avisos];

  const datos = {
    archivo: cargado.ruta,
    salida: guardado.ruta,
    formato: guardado.formato,
    desde: textoOrigen,
    hasta: textoDestino,
    tonalidad: tonalidad?.armadura ?? null,
    modo: tonalidad?.modo ?? null,
    direccion: tonalidad === undefined ? null : direccion,
    preferir: preferir ?? null,
    octava: octavas,
    informe: {
      avisos,
      partes: informe.partes.map((parte) => ({
        ...parte,
        origen: typeof parte.origen === 'string' ? parte.origen : parte.origen.id
      })),
      dudas: informe.dudas
    }
  };
  const texto = esBooleana(args, 'json')
    ? comoJson(datos)
    : [
        `Archivo: ${cargado.ruta}`,
        `Salida: ${guardado.ruta} (${guardado.formato})`,
        `De: ${textoOrigen} → A: ${textoDestino}`,
        ...(tonalidad === undefined
          ? []
          : [
              `Tonalidad: ${tonalidad.armadura}${tonalidad.modo === 'minor' ? ' menor' : ''} (${direccion})`
            ]),
        `Partes: ${datos.informe.partes.map((parte) => `${parte.id} (${parte.nombre})`).join(', ') || 'ninguna'}`,
        ...(octavas === 0 ? [] : [`Octava aplicada: ${octavas > 0 ? '+' : ''}${octavas}`]),
        `Avisos: ${avisos.length === 0 ? 'ninguno' : avisos.length}`,
        ...avisos.map((aviso) => `  ${aviso}`),
        `Dudas: ${datos.informe.dudas.length === 0 ? 'ninguna' : datos.informe.dudas.length}`,
        ...datos.informe.dudas.map((duda) => `  ${duda.nombre}: ${duda.candidatos.join(', ')}`)
      ];

  return { texto, json: datos };
}

function formatearRango(informe: InformeRangoCli): string[] {
  const instrumento = instrumentoPorId(informe.instrumento);
  const sugerencia =
    informe.octavaSugerida === 0
      ? 'sin cambio'
      : `${informe.octavaSugerida > 0 ? '+' : ''}${informe.octavaSugerida}`;
  const lineas = [
    `Archivo: ${informe.archivo}`,
    `Instrumento: ${instrumento.nombre} (${informe.instrumento})`,
    `Notas analizadas: ${informe.notasAnalizadas}`,
    `Fuera de registro: ${informe.fuera.length}`
  ];

  for (const nota of informe.fuera) {
    lineas.push(
      `  ${nota.nota} — ${ESTADOS_RANGO[nota.estado]} (parte ${nota.parte}, compás ${nota.compas})`
    );
  }

  lineas.push(`Octava sugerida: ${sugerencia}`);
  lineas.push('La octava sugerida no se ha aplicado.');

  return lineas;
}

function comandoRango(resto: readonly string[]): ResultadoComando {
  const definiciones: DefinicionOpcion[] = [
    { nombre: 'instrumento' },
    { nombre: 'parte', multiple: true },
    OPCION_JSON,
    OPCION_AYUDA,
    OPCION_HELP
  ];
  const args = parseArgumentos(resto, definiciones);

  if (esAyuda(args)) {
    return ayuda('rango');
  }

  const archivo = exigirArchivo(
    args.posicionales,
    'pnpm partitura rango <archivo> --instrumento <id> [--json]'
  );
  const instrumento = textoOpcion(args, 'instrumento');

  if (!instrumento) {
    throw new Error('Falta la opción --instrumento');
  }

  const informe = informeRango(
    archivo,
    resolverInstrumentoId(instrumento),
    textoSOpciones(args, 'parte')
  );

  return {
    texto: esBooleana(args, 'json') ? comoJson(informe) : formatearRango(informe),
    json: informe
  };
}

export function ejecutarComando(argv: readonly string[]): ResultadoComando {
  const limpios = argv[0] === '--' ? argv.slice(1) : argv;

  if (limpios.includes('--version')) {
    return { texto: [`partitura ${VERSION}`], json: { version: VERSION } };
  }

  const [comando, ...resto] = limpios;

  if (comando === undefined || comando === '--help' || comando === '-h') {
    return { texto: [...AYUDA_GENERAL], json: { ayuda: 'general' } };
  }

  switch (comando) {
    case 'instrumentos':
      return comandoInstrumentos(resto);
    case 'info':
      return comandoInfo(resto);
    case 'transponer':
      return comandoTransponer(resto);
    case 'rango':
      return comandoRango(resto);
    default:
      throw new Error(
        `Comando desconocido: ${comando}. Usa instrumentos, info, transponer o rango.`
      );
  }
}
