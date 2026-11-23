import { DOMParser, XMLSerializer, type Document, type Element, type Node } from '@xmldom/xmldom';

export type MusicXmlDocument = Document;
export type MusicXmlElement = Element;
export type MusicXmlNode = Node;
export type EntradaXml = string | Uint8Array;

const MIME_TYPE_XML = 'application/xml';

const BOMS: ReadonlyArray<{ bytes: readonly number[]; encoding: string }> = [
  { bytes: [0xef, 0xbb, 0xbf], encoding: 'utf-8' },
  { bytes: [0xff, 0xfe, 0x00, 0x00], encoding: 'utf-32le' },
  { bytes: [0x00, 0x00, 0xfe, 0xff], encoding: 'utf-32be' },
  { bytes: [0xff, 0xfe], encoding: 'utf-16le' },
  { bytes: [0xfe, 0xff], encoding: 'utf-16be' }
];

const ALIAS_ENCODING: Record<string, string> = {
  utf8: 'utf-8',
  utf16: 'utf-16',
  utf16le: 'utf-16le',
  utf16be: 'utf-16be',
  unicode: 'utf-16le',
  latin1: 'windows-1252',
  iso88591: 'windows-1252'
};

function empiezaCon(bytes: Uint8Array, prefijo: readonly number[]): boolean {
  return prefijo.every((byte, indice) => bytes[indice] === byte);
}

function normalizarEncoding(encoding: string): string {
  const limpio = encoding
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, '');
  const sinGuiones = limpio.replace(/[-_]/g, '');

  return ALIAS_ENCODING[sinGuiones] ?? limpio;
}

function codigoDeclareado(bytes: Uint8Array): string | undefined {
  const inicio = new TextDecoder('windows-1252').decode(bytes.subarray(0, 1024));
  const coincidencia = /<\?xml\b[^>]*\bencoding\s*=\s*['"]([^'"]+)['"]/i.exec(inicio);

  return coincidencia ? normalizarEncoding(coincidencia[1]) : undefined;
}

export function detectarEncoding(bytes: Uint8Array): string {
  for (const bom of BOMS) {
    if (empiezaCon(bytes, bom.bytes)) {
      return bom.encoding;
    }
  }

  if (bytes.length >= 4 && bytes[0] === 0x3c && bytes[1] === 0 && bytes[2] === 0x3f) {
    return 'utf-16le';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0 &&
    bytes[1] === 0x3c &&
    bytes[2] === 0 &&
    bytes[3] === 0x3f
  ) {
    return 'utf-16be';
  }

  return codigoDeclareado(bytes) ?? 'utf-8';
}

export function decodeXmlBytes(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    throw new Error('El XML está vacío');
  }

  const encoding = detectarEncoding(bytes);
  if (encoding.startsWith('utf-32')) {
    throw new Error('Codificación XML no soportada: UTF-32; usa UTF-8 o UTF-16');
  }

  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    throw new Error(`Codificación XML no soportada: ${encoding}`);
  }
}

export function parseXml(xml: EntradaXml): MusicXmlDocument {
  const texto = typeof xml === 'string' ? xml.replace(/^\uFEFF/, '') : decodeXmlBytes(xml);

  if (!texto.trim()) {
    throw new Error('El XML está vacío');
  }

  return new DOMParser().parseFromString(texto, MIME_TYPE_XML);
}

export function parseMusicXml(xml: EntradaXml): MusicXmlDocument {
  const documento = parseXml(xml);
  const raiz = documento.documentElement;

  if (raiz?.nodeName === 'score-timewise') {
    throw new Error(
      'Este MusicXML está en formato score-timewise. Conviértelo a score-partwise con Finale, Sibelius o MuseScore antes de transponerlo.'
    );
  }

  if (!raiz || raiz.nodeName !== 'score-partwise') {
    throw new Error('El documento no es un MusicXML score-partwise');
  }

  return documento;
}

export function serializeMusicXml(documento: MusicXmlDocument): string {
  return new XMLSerializer()
    .serializeToString(documento)
    .replace(/<\?xml[^>]*\?>/, '<?xml version="1.0" encoding="utf-8"?>');
}

export function escaparAtributo(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function hijos(nodo: Node, nombre: string): Element[] {
  const encontrados: Element[] = [];

  for (let actual = nodo.firstChild; actual; actual = actual.nextSibling) {
    if (actual.nodeType === 1 && (actual as Element).nodeName === nombre) {
      encontrados.push(actual as Element);
    }
  }

  return encontrados;
}

export function primerHijo(nodo: Node, nombre: string): Element | undefined {
  return hijos(nodo, nombre)[0];
}

export function textoDe(nodo: Node, nombre: string): string | undefined {
  return primerHijo(nodo, nombre)?.textContent ?? undefined;
}

export function numeroDe(nodo: Node, nombre: string): number | undefined {
  const texto = textoDe(nodo, nombre);
  if (texto === undefined) {
    return undefined;
  }

  const numero = Number(texto.trim());

  return Number.isFinite(numero) ? numero : undefined;
}

const ORDEN_MUSICXML: Record<string, readonly string[]> = {
  pitch: ['step', 'alter', 'octave'],
  attributes: [
    'divisions',
    'key',
    'time',
    'staves',
    'part-symbol',
    'instruments',
    'clef',
    'staff-details',
    'transpose'
  ],
  key: ['fifths', 'mode'],
  clef: ['sign', 'line', 'clef-octave-change'],
  transpose: ['diatonic', 'chromatic', 'octave-change'],
  'score-part': ['part-name', 'part-abbreviation', 'score-instrument', 'midi-instrument'],
  note: [
    'chord',
    'pitch',
    'duration',
    'tie',
    'voice',
    'type',
    'dot',
    'accidental',
    'time-modification',
    'stem',
    'notehead',
    'staff',
    'beam',
    'notations'
  ],
  root: ['root-step', 'root-alter'],
  bass: ['bass-step', 'bass-alter']
};

function insertarOrdenado(nodo: Node, elemento: Element): void {
  const orden = ORDEN_MUSICXML[nodo.nodeName];

  if (nodo.nodeName === 'score-part' && elemento.nodeName === 'part-abbreviation') {
    const partName = primerHijo(nodo, 'part-name');
    if (partName) {
      nodo.insertBefore(elemento, partName.nextSibling);
      return;
    }
  }

  if (!orden || !orden.includes(elemento.nodeName)) {
    nodo.appendChild(elemento);
    return;
  }

  const posicion = orden.indexOf(elemento.nodeName);

  for (let actual = nodo.firstChild; actual; actual = actual.nextSibling) {
    const actualPosicion = orden.indexOf(actual.nodeName);
    if (actualPosicion > posicion) {
      nodo.insertBefore(elemento, actual);
      return;
    }
  }

  nodo.appendChild(elemento);
}

export function fijarTexto(nodo: Node, nombre: string, valor: string | number): Element {
  let elemento = primerHijo(nodo, nombre);

  if (!elemento) {
    const documento = nodo.nodeType === 9 ? (nodo as Document) : nodo.ownerDocument;

    if (!documento) {
      throw new Error(`No se puede crear el elemento ${nombre}`);
    }

    elemento = documento.createElement(nombre);
    insertarOrdenado(nodo, elemento);
  }

  elemento.textContent = String(valor);

  return elemento;
}

export function fijarAtributo(elemento: Element, nombre: string, valor: string | number): void {
  elemento.setAttribute(nombre, String(valor));
}

export function quitarHijos(nodo: Node, nombre: string): void {
  for (const elemento of hijos(nodo, nombre)) {
    nodo.removeChild(elemento);
  }
}
