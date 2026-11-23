import { instrumentoPorId } from '../instruments';
import { parseMusicXml, type MusicXmlDocument } from '../musicxml/dom';

const QUINTAS_MAYOR: Record<string, number> = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  'C#': 7,
  F: -1,
  Bb: -2,
  Eb: -3,
  Ab: -4,
  Db: -5,
  Gb: -6
};

const TIPOS: Record<number, { nombre: string; puntos: number }> = {
  48: { nombre: 'whole', puntos: 1 },
  32: { nombre: 'whole', puntos: 0 },
  24: { nombre: 'half', puntos: 1 },
  16: { nombre: 'half', puntos: 0 },
  12: { nombre: 'quarter', puntos: 1 },
  8: { nombre: 'quarter', puntos: 0 },
  6: { nombre: 'eighth', puntos: 1 },
  4: { nombre: 'eighth', puntos: 0 },
  3: { nombre: '16th', puntos: 1 },
  2: { nombre: '16th', puntos: 0 },
  1: { nombre: '32nd', puntos: 0 }
};

export interface OpcionesAbc {
  titulo?: string;
  compositor?: string;
  instrumento?: string;
}

interface NotaAbc {
  paso: string;
  alter: number;
  octava: number;
  duracion: number;
  silencio: boolean;
}

interface CompasAbc {
  notas: NotaAbc[][];
  silencio: boolean;
}

export function abcAMusicXml(abc: string, opciones: OpcionesAbc = {}): MusicXmlDocument {
  const cabeceras = new Map<string, string>();
  const cuerpo: string[] = [];

  for (const lineaOriginal of abc.split(/\r?\n/)) {
    const linea = lineaOriginal.trim();
    const coincidencia = /^([A-Za-z]):\s*(.*)$/.exec(linea);

    if (/^w:/i.test(linea)) {
      continue;
    }

    if (coincidencia && cuerpo.length === 0) {
      cabeceras.set(coincidencia[1].toUpperCase(), coincidencia[2]);
    } else if (linea && !linea.startsWith('%')) {
      cuerpo.push(linea.replace(/"[^"]*"/g, ''));
    }
  }

  const longitud = analizarFraccion(cabeceras.get('L') ?? '1/8', 1 / 8);
  const armadura = analizarArmadura(cabeceras.get('K') ?? 'C');
  const compas = /^(\d+)\/(\d+)$/.exec(cabeceras.get('M') ?? '4/4');
  const instrumento = opciones.instrumento ? instrumentoPorId(opciones.instrumento) : undefined;
  const duracionCompas = Math.round(32 * (Number(compas?.[1] ?? 4) / Number(compas?.[2] ?? 4)));
  const compases = cuerpo.flatMap(analizarLinea(longitud, armadura, duracionCompas));
  const atributos = `        <attributes>
          <divisions>8</divisions>
          <key><fifths>${armadura}</fifths></key>
          <time><beats>${compas?.[1] ?? 4}</beats><beat-type>${compas?.[2] ?? 4}</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
        </attributes>`;
  const partidas = compases
    .map(
      (medida, indice) => `      <measure number="${indice + 1}">
${indice === 0 ? atributos : ''}
${medida.notas
  .map(
    (acorde) =>
      `        ${acorde
        .map(
          (notaAbc, indiceNota) =>
            `<note>${indiceNota > 0 ? '<chord/>' : ''}${notaAbc.silencio ? '<rest/>' : `<pitch><step>${notaAbc.paso}</step><alter>${notaAbc.alter}</alter><octave>${notaAbc.octava}</octave></pitch>`}<duration>${notaAbc.duracion}</duration>${tipoDeDuracion(notaAbc.duracion)}</note>`
        )
        .join('')}`
  )
  .join('\n')}
      </measure>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <work><work-title>${escapar(opciones.titulo ?? cabeceras.get('T') ?? 'Partitura ABC')}</work-title></work>
  <identification><creator type="composer">${escapar(
    opciones.compositor ?? cabeceras.get('C') ?? ''
  )}</creator></identification>
  <part-list><score-part id="P1"><part-name>${escapar(
    instrumento?.nombre ?? 'Melodía'
  )}</part-name></score-part></part-list>
  <part id="P1">
${partidas}
  </part>
</score-partwise>`;

  return parseMusicXml(xml);
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function analizarFraccion(texto: string, porDefecto: number): number {
  const coincidencia = /^(\d+)\/(\d+)$/.exec(texto.trim());

  if (!coincidencia) {
    return porDefecto;
  }

  return Number(coincidencia[1]) / Number(coincidencia[2]);
}

function analizarArmadura(texto: string): number {
  const coincidencia = /^(F#|C#|Bb|Eb|Ab|Db|Gb|[A-G])(m|min|minor|maj|major)?(?:\s|$)/i.exec(
    texto.trim()
  );
  if (!coincidencia) {
    return 0;
  }

  const raiz = coincidencia[1][0].toUpperCase() + coincidencia[1].slice(1);
  const quintas = QUINTAS_MAYOR[raiz] ?? 0;

  return /^(m|min|minor)$/i.test(coincidencia[2] ?? '') ? quintas - 3 : quintas;
}

function analizarLinea(
  longitud: number,
  armadura: number,
  duracionCompas: number
): (linea: string) => CompasAbc[] {
  return (lineaOriginal: string) => {
    const linea = lineaOriginal
      .replace(/\[\|/g, '|')
      .replace(/\|\]/g, '|')
      .replace(/\|\|/g, '|')
      .replace(/\|:/g, '|')
      .replace(/:\|/g, '|');
    const tokenizador = /(\^{1,2}|_{1,2}|=)?([A-Ga-gxzXZ])([',]*)([0-9]*)((?:\/)+)?([0-9]*)/g;

    return linea
      .split('|')
      .map((segmento) => segmento.trim())
      .filter((segmento) => segmento.length > 0)
      .map((segmento) => {
        const compas: CompasAbc = { notas: [], silencio: false };
        let indice = 0;
        let acordeActual = false;

        for (const encontrado of segmento.matchAll(tokenizador)) {
          const inicio = encontrado.index ?? 0;
          const dentroDeAcorde =
            segmento.lastIndexOf('[', inicio) > segmento.lastIndexOf(']', inicio);
          if (dentroDeAcorde) {
            if (!acordeActual) {
              compas.notas.push([]);
              indice = compas.notas.length - 1;
              acordeActual = true;
            }
          } else {
            acordeActual = false;
            indice = compas.notas.length;
            compas.notas.push([]);
          }

          const notaAbc = crearNota(encontrado, longitud, armadura, duracionCompas);
          if (notaAbc) {
            compas.notas[indice].push(notaAbc);
          }
        }

        return compas;
      });
  };
}

function crearNota(
  encontrado: RegExpMatchArray,
  longitud: number,
  armadura: number,
  duracionCompas: number
): NotaAbc | undefined {
  const [, alterTexto, letra, octavaTexto, numeroTexto, barrasTexto, denominadorTexto] = encontrado;
  const esSilencio = ['z', 'Z', 'x', 'X'].includes(letra);

  if (!/[A-Ga-gxzXZ]/.test(letra)) {
    return undefined;
  }

  const paso = letra.toUpperCase();
  const alter = alterTexto?.startsWith('^')
    ? alterTexto.length
    : alterTexto?.startsWith('_')
      ? -alterTexto.length
      : alterTexto?.startsWith('=')
        ? 0
        : alterDeArmadura(armadura, paso);
  const octava =
    (letra === letra.toUpperCase() ? 4 : 5) +
    (octavaTexto?.match(/'/g)?.length ?? 0) -
    (octavaTexto?.match(/,/g)?.length ?? 0);
  const factor = numeroTexto ? Number(numeroTexto) : 1;
  const barras = barrasTexto?.length ?? 0;
  const divisor = denominadorTexto ? Number(denominadorTexto) : barras > 0 ? 2 ** barras : 1;
  const duracion =
    letra === 'Z' || letra === 'X'
      ? duracionCompas
      : Math.round((32 * longitud * factor) / divisor);

  return { paso, alter, octava, duracion, silencio: esSilencio };
}

function alterDeArmadura(armadura: number, paso: string): number {
  const sostenidos = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const bemoles = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

  if (armadura > 0 && sostenidos.slice(0, armadura).includes(paso)) {
    return 1;
  }
  if (armadura < 0 && bemoles.slice(0, -armadura).includes(paso)) {
    return -1;
  }
  return 0;
}

function tipoDeDuracion(duracion: number): string {
  const tipo = TIPOS[duracion];
  if (!tipo) {
    return '';
  }
  const puntos = '<dot/>'.repeat(tipo.puntos);

  return `<type>${tipo.nombre}</type>${puntos}`;
}
