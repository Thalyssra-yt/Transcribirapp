import {
  abcAMusicXml,
  comprobarRango,
  desplazarOctava,
  escribirMxl,
  fijarTexto,
  formatearNota,
  hijos,
  instrumentoPorId,
  leerMxl,
  nota,
  numeroDe,
  parseMusicXml,
  proponerOctava,
  serializeMusicXml,
  textoDe,
  transponerPartitura as transponerCore,
  type CambioTonalidad,
  type DestinoTransposicion,
  type DudaInstrumento,
  type MusicXmlDocument,
  type Nota,
  type OrigenPartitura,
  type Paso
} from '@transcriptor/core';

export type FormatoPartitura = 'musicxml' | 'mxl' | 'abc';

export interface ParteResumen {
  id: string;
  nombre: string;
}

export interface ArchivoPartitura {
  nombre: string;
  formato: FormatoPartitura;
  documento: MusicXmlDocument;
  xml: string;
  partes: ParteResumen[];
  titulo?: string;
  compositor?: string;
  instrumentoDetectado?: string;
  tonalidadOriginal?: string;
  dudas: DudaInstrumento[];
}

export interface TonalidadOpcion {
  id: string;
  nombre: string;
  armadura: number;
  modo: 'major' | 'minor';
}

export interface OpcionesTranscripcion {
  desde: OrigenPartitura;
  hasta: DestinoTransposicion;
  partes: readonly string[];
  tonalidad?: TonalidadOpcion;
  direccion: 'cercana' | 'arriba' | 'abajo';
  preferir?: 'sostenidos' | 'bemoles';
  octava: number;
}

export interface NotaFuera {
  nota: string;
  parte: string;
  compas: string;
  estado: string;
}

export interface ResultadoTranscripcion {
  xml: string;
  avisos: string[];
  fuera: NotaFuera[];
  octavaSugerida?: number;
  compases: number;
  tonalidad: string;
}

export const TONALIDADES: readonly TonalidadOpcion[] = [
  { id: 'do', nombre: 'Do mayor', armadura: 0, modo: 'major' },
  { id: 'sol', nombre: 'Sol mayor', armadura: 1, modo: 'major' },
  { id: 're', nombre: 'Re mayor', armadura: 2, modo: 'major' },
  { id: 'la', nombre: 'La mayor', armadura: 3, modo: 'major' },
  { id: 'mi', nombre: 'Mi mayor', armadura: 4, modo: 'major' },
  { id: 'si', nombre: 'Si mayor', armadura: 5, modo: 'major' },
  { id: 'fa-sostenido', nombre: 'Fa# mayor', armadura: 6, modo: 'major' },
  { id: 'do-sostenido', nombre: 'Do# mayor', armadura: 7, modo: 'major' },
  { id: 'fa', nombre: 'Fa mayor', armadura: -1, modo: 'major' },
  { id: 'sib', nombre: 'Sib mayor', armadura: -2, modo: 'major' },
  { id: 'mib', nombre: 'Mib mayor', armadura: -3, modo: 'major' },
  { id: 'lab', nombre: 'Lab mayor', armadura: -4, modo: 'major' },
  { id: 'reb', nombre: 'Reb mayor', armadura: -5, modo: 'major' },
  { id: 'solb', nombre: 'Solb mayor', armadura: -6, modo: 'major' },
  { id: 'dob', nombre: 'Dob mayor', armadura: -7, modo: 'major' },
  { id: 'la-menor', nombre: 'La menor', armadura: 0, modo: 'minor' },
  { id: 'mi-menor', nombre: 'Mi menor', armadura: 1, modo: 'minor' },
  { id: 'si-menor', nombre: 'Si menor', armadura: 2, modo: 'minor' },
  { id: 'fa-sostenido-menor', nombre: 'Fa# menor', armadura: 3, modo: 'minor' },
  { id: 'do-sostenido-menor', nombre: 'Do# menor', armadura: 4, modo: 'minor' },
  { id: 'sol-sostenido-menor', nombre: 'Sol# menor', armadura: 5, modo: 'minor' },
  { id: 're-sostenido-menor', nombre: 'Re# menor', armadura: 6, modo: 'minor' },
  { id: 'la-sostenido-menor', nombre: 'La# menor', armadura: 7, modo: 'minor' },
  { id: 're-menor', nombre: 'Re menor', armadura: -1, modo: 'minor' },
  { id: 'sol-menor', nombre: 'Sol menor', armadura: -2, modo: 'minor' },
  { id: 'do-menor', nombre: 'Do menor', armadura: -3, modo: 'minor' },
  { id: 'fa-menor', nombre: 'Fa menor', armadura: -4, modo: 'minor' },
  { id: 'sib-menor', nombre: 'Sib menor', armadura: -5, modo: 'minor' },
  { id: 'mib-menor', nombre: 'Mib menor', armadura: -6, modo: 'minor' },
  { id: 'lab-menor', nombre: 'Lab menor', armadura: -7, modo: 'minor' }
];

function extension(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto === -1 ? '' : nombre.slice(punto).toLowerCase();
}

function clonar(documento: MusicXmlDocument): MusicXmlDocument {
  return parseMusicXml(serializeMusicXml(documento));
}

export function contarCompases(documento: MusicXmlDocument): number {
  const primeraParte = documento.getElementsByTagName('part')[0];
  return primeraParte ? primeraParte.getElementsByTagName('measure').length : 0;
}

export function partesDelDocumento(documento: MusicXmlDocument): ParteResumen[] {
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

export function tonalidadDeDocumento(documento: MusicXmlDocument): string {
  const parte = documento.getElementsByTagName('part')[0];
  const atributos = parte ? Array.from(parte.getElementsByTagName('attributes')) : [];
  const claves = atributos
    .map((atributo) => hijos(atributo, 'key')[0])
    .filter((clave) => clave !== undefined);
  const armadura =
    claves.map((clave) => numeroDe(clave, 'fifths')).find((valor) => valor !== undefined) ?? 0;
  const modo =
    claves
      .map((clave) => textoDe(clave, 'mode')?.trim().toLowerCase())
      .find((valor) => valor === 'major' || valor === 'minor') ?? 'major';

  return (
    TONALIDADES.find((opcion) => opcion.armadura === armadura && opcion.modo === modo)?.nombre ??
    `${armadura} ${modo === 'minor' ? 'menor' : 'mayor'}`
  );
}

export function instrumentoDetectado(documento: MusicXmlDocument): string | undefined {
  const copia = clonar(documento);
  const informe = transponerCore(copia, { desde: 'auto', hasta: 'concierto' });
  const primera = informe.partes[0];

  if (!primera || primera.deteccion === 'concierto') {
    return undefined;
  }

  const origen = primera.origen;
  const id = typeof origen === 'string' ? origen : origen?.id;

  return id && id !== 'concierto' ? id : undefined;
}

export async function leerPartitura(archivo: File): Promise<ArchivoPartitura> {
  const formato = extension(archivo.name);
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  let documento: MusicXmlDocument;
  let tipo: FormatoPartitura;

  if (formato === '.mxl') {
    documento = parseMusicXml(leerMxl(bytes));
    tipo = 'mxl';
  } else if (formato === '.abc') {
    documento = abcAMusicXml(new TextDecoder('utf-8').decode(bytes));
    tipo = 'abc';
  } else if (formato === '.musicxml' || formato === '.xml') {
    documento = parseMusicXml(bytes);
    tipo = 'musicxml';
  } else {
    throw new Error('Formato no soportado. Usa .musicxml, .xml, .mxl o .abc.');
  }

  const copia = clonar(documento);
  const informe = transponerCore(copia, { desde: 'auto', hasta: 'concierto' });

  return {
    nombre: archivo.name,
    formato: tipo,
    documento,
    xml: serializeMusicXml(documento),
    partes: partesDelDocumento(documento),
    titulo:
      documento.getElementsByTagName('work-title')[0]?.textContent ??
      documento.getElementsByTagName('movement-title')[0]?.textContent ??
      undefined,
    compositor:
      Array.from(documento.getElementsByTagName('creator')).find(
        (creador) => creador.getAttribute('type') === 'composer'
      )?.textContent ?? undefined,
    instrumentoDetectado: instrumentoDetectado(documento),
    tonalidadOriginal: tonalidadDeDocumento(documento),
    dudas: informe.dudas
  };
}

const XML_EJEMPLO = String.raw`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <work>
    <work-title>Escala de ejemplo</work-title>
  </work>
  <identification>
    <creator type="composer">Generado por el proyecto</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Flauta</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>-2</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><alter>-1</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>G</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>A</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><alter>-1</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>C</step><alter>0</alter><octave>6</octave></pitch><duration>2</duration><type>half</type></note>
      <note><pitch><step>D</step><alter>0</alter><octave>6</octave></pitch><duration>2</duration><type>half</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>E</step><alter>-1</alter><octave>6</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

export function cargarEjemplo(): Promise<ArchivoPartitura> {
  return leerPartitura(new File([XML_EJEMPLO], 'ejemplo-escala.musicxml'));
}

function notasDe(documento: MusicXmlDocument, ids: readonly string[]): NotaConContexto[] {
  const notas: NotaConContexto[] = [];

  for (const parte of Array.from(documento.getElementsByTagName('part'))) {
    const id = parte.getAttribute('id') ?? '';
    if (!ids.includes(id)) {
      continue;
    }

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

        notas.push({
          nota: nota(paso, numeroDe(pitch, 'alter') ?? 0, octava),
          parte: id,
          compas
        });
      }
    }
  }

  return notas;
}

interface NotaConContexto {
  nota: Nota;
  parte: string;
  compas: string;
}

function aplicarOctava(documento: MusicXmlDocument, octavas: number, ids: readonly string[]): void {
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

function estadoLegible(estado: string): string {
  if (estado === 'fuera-absoluto') {
    return 'fuera del registro absoluto';
  }
  if (estado === 'fuera-comodo') {
    return 'fuera del registro cómodo';
  }

  return estado;
}

function safeInstrumento(destino: DestinoTransposicion) {
  if (destino === 'concierto') {
    return undefined;
  }

  return typeof destino === 'string' ? instrumentoPorId(destino) : destino;
}

export function transponerPartituraWeb(
  archivo: ArchivoPartitura,
  opciones: OpcionesTranscripcion
): ResultadoTranscripcion {
  if (opciones.partes.length === 0) {
    throw new Error('Selecciona al menos una parte para transponer.');
  }

  const documento = clonar(archivo.documento);
  const cambio: CambioTonalidad | undefined = opciones.tonalidad
    ? {
        armadura: opciones.tonalidad.armadura,
        direccion: opciones.direccion,
        modo: opciones.tonalidad.modo
      }
    : undefined;
  const informe = transponerCore(documento, {
    desde: opciones.desde,
    hasta: opciones.hasta,
    partes: opciones.partes,
    ...(cambio ? { cambioTonalidad: cambio } : {}),
    ...(opciones.preferir ? { preferir: opciones.preferir } : {})
  });

  const instrumento = safeInstrumento(opciones.hasta);
  const notasBase = instrumento ? notasDe(documento, opciones.partes) : [];

  aplicarOctava(documento, opciones.octava, opciones.partes);

  const fuera: NotaFuera[] = [];
  let octavaSugerida: number | undefined;

  if (instrumento) {
    for (const entrada of notasDe(documento, opciones.partes)) {
      const comprobacion = comprobarRango(entrada.nota, instrumento);
      if (comprobacion.estado !== 'comodo') {
        fuera.push({
          nota: formatearNota(entrada.nota),
          parte: entrada.parte,
          compas: entrada.compas,
          estado: estadoLegible(comprobacion.estado)
        });
      }
    }

    if (fuera.length > 0) {
      const propuesta = proponerOctava(
        notasBase.map((entrada) => entrada.nota),
        instrumento
      );
      const fueraConPropuesta = notasBase.filter(
        (entrada) =>
          comprobarRango(desplazarOctava(entrada.nota, propuesta), instrumento).estado !== 'comodo'
      ).length;

      if (propuesta !== opciones.octava && fueraConPropuesta < fuera.length) {
        octavaSugerida = propuesta;
      }
    }
  }

  const xml = serializeMusicXml(documento);

  return {
    xml,
    avisos: Array.from(new Set(informe.avisos)),
    fuera,
    ...(octavaSugerida === undefined ? {} : { octavaSugerida }),
    compases: contarCompases(documento),
    tonalidad: tonalidadDeDocumento(documento)
  };
}

export function descargarPartitura(xml: string, nombre: string, formato: 'musicxml' | 'mxl'): void {
  const base = nombre.replace(/\.[^.]+$/, '');
  const contenido = formato === 'mxl' ? escribirMxl(xml) : xml;
  const blob = new Blob([contenido as BlobPart], {
    type: formato === 'mxl' ? 'application/vnd.recordare.musicxml' : 'application/xml'
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = `${base}-transcrito.${formato === 'mxl' ? 'mxl' : 'musicxml'}`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
