import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import {
  abcAMusicXml,
  comprobarRango,
  buscarInstrumento,
  escribirMxl,
  formatearNota,
  fijarTexto,
  hijos,
  instrumentoPorId,
  instrumentoPorTranspose,
  leerMxl,
  midi,
  nota,
  numeroDe,
  parseMusicXml,
  proponerOctava,
  serializeMusicXml,
  textoDe,
  transponerPartitura,
  type DestinoTransposicion,
  type DudaInstrumento,
  type EstadoRango,
  type MusicXmlDocument,
  type MusicXmlElement,
  type Nota,
  type Paso
} from '@transcriptor/core';

export type FormatoPartitura = 'musicxml' | 'mxl' | 'abc';

export interface SalidaGuardada {
  formato: FormatoPartitura;
  ruta: string;
}

export interface DocumentoCargado {
  documento: MusicXmlDocument;
  formato: FormatoPartitura;
  ruta: string;
}

export interface TransposicionLeida {
  diatonic: number;
  chromatic: number;
  octaveChange: number;
}

export interface NotaConContexto {
  nota: Nota;
  compas: string;
}

export interface RegistroParte {
  inferior?: string;
  superior?: string;
  notas: number;
}

export interface InformacionParte {
  id: string;
  nombre: string;
  tonalidad: number;
  tonalidades: number[];
  compases: string[];
  transportada: boolean;
  deteccion: string;
  origen?: string;
  transposicion?: TransposicionLeida;
  registro: RegistroParte;
}

export interface InformacionPartitura {
  archivo: string;
  formato: FormatoPartitura;
  titulo?: string;
  compositor?: string;
  partes: InformacionParte[];
  dudas: DudaInstrumento[];
}

export interface NotaFueraRango {
  nota: string;
  estado: EstadoRango;
  parte: string;
  compas: string;
}

export interface InformeRangoCli {
  archivo: string;
  instrumento: string;
  notasAnalizadas: number;
  octavaSugerida: number;
  fuera: NotaFueraRango[];
}

export function rutaDesdeCwd(ruta: string): string {
  return isAbsolute(ruta) ? ruta : resolve(process.env.INIT_CWD ?? process.cwd(), ruta);
}

export function mismasRutas(primera: string, segunda: string): boolean {
  const normalizar = (ruta: string): string => {
    const resuelta = rutaDesdeCwd(ruta);

    return process.platform === 'win32' ? resuelta.toLowerCase() : resuelta;
  };

  return normalizar(primera) === normalizar(segunda);
}

function validarExtension(ruta: string, permitidas: readonly string[], uso: string): void {
  const extension = extname(ruta).toLowerCase();

  if (!permitidas.includes(extension)) {
    throw new Error(
      `Extensión no soportada para ${uso}: ${extension || '(sin extensión)'}. Usa ${permitidas.join(', ')}`
    );
  }
}

function formatoDe(ruta: string): FormatoPartitura {
  const extension = extname(ruta).toLowerCase();

  if (extension === '.mxl') {
    return 'mxl';
  }
  if (extension === '.abc') {
    return 'abc';
  }

  return 'musicxml';
}

export function cargarPartitura(ruta: string): DocumentoCargado {
  const resuelta = rutaDesdeCwd(ruta);
  validarExtension(resuelta, ['.musicxml', '.xml', '.mxl', '.abc'], 'entrada');

  if (!existsSync(resuelta)) {
    throw new Error(`No existe el archivo ${resuelta}`);
  }

  const bytes = readFileSync(resuelta);
  const formato = formatoDe(resuelta);
  let documento: MusicXmlDocument;

  if (formato === 'mxl') {
    documento = parseMusicXml(leerMxl(bytes));
  } else if (formato === 'abc') {
    documento = abcAMusicXml(new TextDecoder('utf-8').decode(bytes));
  } else {
    documento = parseMusicXml(bytes);
  }

  return { documento, formato, ruta: resuelta };
}

export function guardarPartitura(documento: MusicXmlDocument, ruta: string): SalidaGuardada {
  const resuelta = rutaDesdeCwd(ruta);
  validarExtension(resuelta, ['.musicxml', '.xml', '.mxl'], 'salida');
  const formato = formatoDe(resuelta);
  const xml = serializeMusicXml(documento);

  if (formato === 'mxl') {
    writeFileSync(resuelta, escribirMxl(xml));
  } else {
    writeFileSync(resuelta, xml, 'utf8');
  }

  return { formato, ruta: resuelta };
}

export function partesDelDocumento(documento: MusicXmlDocument): { id: string; nombre: string }[] {
  const nombres = new Map<string, string>();

  for (const scorePart of Array.from(documento.getElementsByTagName('score-part'))) {
    const id = scorePart.getAttribute('id');
    if (id) {
      nombres.set(id, textoDe(scorePart, 'part-name') ?? id);
    }
  }

  return Array.from(documento.getElementsByTagName('part')).map((parte) => {
    const id = parte.getAttribute('id') ?? '';

    return { id, nombre: nombres.get(id) ?? textoDe(parte, 'part-name') ?? id };
  });
}

export function resolverPartes(
  documento: MusicXmlDocument,
  seleccion: readonly string[]
): string[] {
  const partes = partesDelDocumento(documento);

  if (seleccion.length === 0) {
    return partes.map((parte) => parte.id);
  }

  const resueltas = seleccion.map((valor) => {
    if (/^\d+$/.test(valor)) {
      const indice = Number(valor) - 1;
      const parte = partes[indice];
      if (!parte) {
        throw new Error(`No existe la parte ${valor}; hay ${partes.length} partes`);
      }

      return parte.id;
    }

    const parte = partes.find((candidata) => candidata.id === valor);
    if (!parte) {
      throw new Error(`No existe la parte ${valor}`);
    }

    return parte.id;
  });

  return Array.from(new Set(resueltas));
}

export function notasDeParte(parte: MusicXmlElement): NotaConContexto[] {
  const notas: NotaConContexto[] = [];

  for (const medida of hijos(parte, 'measure')) {
    const compas = medida.getAttribute('number') ?? '?';

    for (const elemento of hijos(medida, 'note')) {
      const pitch = hijos(elemento, 'pitch')[0];
      if (!pitch) {
        continue;
      }

      const paso = textoDe(pitch, 'step') as Paso | undefined;
      const octava = numeroDe(pitch, 'octave');
      if (!paso || octava === undefined) {
        continue;
      }

      notas.push({ nota: nota(paso, numeroDe(pitch, 'alter') ?? 0, octava), compas });
    }
  }

  return notas;
}

function leerTransposicion(parte: MusicXmlElement): TransposicionLeida | undefined {
  const nodo = parte.getElementsByTagName('transpose')[0];
  if (!nodo) {
    return undefined;
  }

  const diatonic = numeroDe(nodo, 'diatonic');
  const chromatic = numeroDe(nodo, 'chromatic');
  const octaveChange = numeroDe(nodo, 'octave-change') ?? 0;

  if (diatonic === undefined || chromatic === undefined) {
    return undefined;
  }

  return { diatonic, chromatic, octaveChange };
}

function idOrigen(origen: DestinoTransposicion | undefined): string | undefined {
  if (origen === undefined || typeof origen === 'string') {
    return origen;
  }

  return origen.id;
}

function tieneTransposicion(instrumentoId: string): boolean {
  try {
    const { diatonic, chromatic, octaveChange } = instrumentoPorId(instrumentoId).transpose;

    return diatonic !== 0 || chromatic !== 0 || octaveChange !== 0;
  } catch {
    return true;
  }
}

function todosEnDo(nombres: readonly string[]): boolean {
  const instrumentos = nombres.map((nombre) =>
    buscarInstrumento(nombre).find((instrumento) => instrumento.nombre === nombre)
  );

  return instrumentos.every(
    (instrumento) => instrumento !== undefined && !tieneTransposicion(instrumento.id)
  );
}

function textoArmadura(fifths: number): string {
  if (fifths === 0) {
    return 'Do (sin alteraciones)';
  }

  const numero = Math.abs(fifths);
  const alteracion =
    fifths > 0 ? (numero === 1 ? 'sostenido' : 'sostenidos') : numero === 1 ? 'bemol' : 'bemoles';

  return `${numero} ${alteracion}`;
}

function registroDe(notas: NotaConContexto[]): RegistroParte {
  if (notas.length === 0) {
    return { notas: 0 };
  }

  const conAltura = notas.map((entrada) => ({ ...entrada, altura: midi(entrada.nota) }));
  const inferior = conAltura.reduce((mejor, actual) =>
    actual.altura < mejor.altura ? actual : mejor
  );
  const superior = conAltura.reduce((mejor, actual) =>
    actual.altura > mejor.altura ? actual : mejor
  );

  return {
    inferior: formatearNota(inferior.nota),
    superior: formatearNota(superior.nota),
    notas: notas.length
  };
}

export function informacionPartitura(ruta: string): InformacionPartitura {
  const { documento, formato, ruta: resuelta } = cargarPartitura(ruta);
  const copia = parseMusicXml(serializeMusicXml(documento));
  const informe = transponerPartitura(copia, { desde: 'auto', hasta: 'concierto' });
  const nombresParte = partesDelDocumento(documento);
  const elementosParte = Array.from(documento.getElementsByTagName('part'));
  const titulo =
    documento.getElementsByTagName('work-title')[0]?.textContent ??
    documento.getElementsByTagName('movement-title')[0]?.textContent;
  const creadores = Array.from(documento.getElementsByTagName('creator'));
  const compositor = creadores.find(
    (creador) => creador.getAttribute('type') === 'composer'
  )?.textContent;

  const partes: InformacionParte[] = elementosParte.map((parte, indice) => {
    const id = parte.getAttribute('id') ?? '';
    const nombre = nombresParte.find((entrada) => entrada.id === id)?.nombre ?? id;
    const tonalidades = Array.from(parte.getElementsByTagName('fifths'))
      .map((nodo) => Number(nodo.textContent))
      .filter((valor) => Number.isFinite(valor));
    const compases = Array.from(parte.getElementsByTagName('time'))
      .map((time) => {
        const beats = textoDe(time, 'beats');
        const beatType = textoDe(time, 'beat-type');

        return beats && beatType ? `${beats}/${beatType}` : undefined;
      })
      .filter((valor): valor is string => valor !== undefined);
    const transposicion = leerTransposicion(parte);
    const detectada = informe.partes[indice];
    const origen =
      idOrigen(detectada?.origen) ??
      (transposicion ? instrumentoPorTranspose(transposicion)?.id : undefined);

    return {
      id,
      nombre,
      tonalidad: tonalidades[0] ?? 0,
      tonalidades,
      compases: Array.from(new Set(compases)),
      transportada:
        transposicion !== undefined ||
        detectada?.deteccion === 'transpose' ||
        (origen !== undefined && origen !== 'concierto' && tieneTransposicion(origen)),
      deteccion: detectada?.deteccion ?? 'concierto',
      ...(origen ? { origen } : {}),
      ...(transposicion ? { transposicion } : {}),
      registro: registroDe(notasDeParte(parte))
    };
  });

  const dudas = informe.dudas.filter((duda) => !todosEnDo(duda.candidatos));

  return {
    archivo: resuelta,
    formato,
    ...(titulo ? { titulo } : {}),
    ...(compositor ? { compositor } : {}),
    partes,
    dudas
  };
}

export function informeRango(
  ruta: string,
  instrumentoId: string,
  seleccion: readonly string[]
): InformeRangoCli {
  const instrumento = instrumentoPorId(instrumentoId);
  const { documento, ruta: resuelta } = cargarPartitura(ruta);
  const ids = resolverPartes(documento, seleccion);
  const copia = parseMusicXml(serializeMusicXml(documento));

  transponerPartitura(copia, { desde: 'auto', hasta: instrumento, partes: ids });

  const partes = Array.from(copia.getElementsByTagName('part')).filter((parte) =>
    ids.includes(parte.getAttribute('id') ?? '')
  );
  const notas = partes.flatMap((parte) => {
    const id = parte.getAttribute('id') ?? '';

    return notasDeParte(parte).map((entrada) => ({ ...entrada, parte: id }));
  });
  const fuera = notas.flatMap((entrada) => {
    const informe = comprobarRango(entrada.nota, instrumento);

    if (informe.estado === 'comodo') {
      return [];
    }

    return [
      {
        nota: formatearNota(entrada.nota),
        estado: informe.estado,
        parte: entrada.parte,
        compas: entrada.compas
      }
    ];
  });

  return {
    archivo: resuelta,
    instrumento: instrumento.id,
    notasAnalizadas: notas.length,
    octavaSugerida: proponerOctava(
      notas.map((entrada) => entrada.nota),
      instrumento
    ),
    fuera
  };
}

export function aplicarOctava(
  documento: MusicXmlDocument,
  octavas: number,
  ids: readonly string[]
): void {
  if (octavas === 0) {
    return;
  }

  for (const parte of Array.from(documento.getElementsByTagName('part'))) {
    if (!ids.includes(parte.getAttribute('id') ?? '')) {
      continue;
    }

    for (const medida of hijos(parte, 'measure')) {
      for (const elemento of hijos(medida, 'note')) {
        for (const pitch of hijos(elemento, 'pitch')) {
          const octava = numeroDe(pitch, 'octave');
          if (octava !== undefined) {
            fijarTexto(pitch, 'octave', String(octava + octavas));
          }
        }
      }
    }
  }
}

export { textoArmadura };
