import { strToU8, unzipSync, zipSync } from 'fflate';
import { decodeXmlBytes, escaparAtributo, parseXml } from './dom';

const CONTENEDOR = 'META-INF/container.xml';
const RUTA_POR_DEFECTO = 'score.musicxml';
const MIME_TYPE = 'application/vnd.recordare.musicxml';

function validarRuta(ruta: string): void {
  if (!ruta.trim()) {
    throw new Error('La ruta MXL no puede estar vacía');
  }

  const absoluta = ruta.startsWith('/') || /^[A-Za-z]:[\\/]/.test(ruta) || ruta.startsWith('\\\\');

  if (
    absoluta ||
    ruta.split(/[\\/]/).includes('..') ||
    ruta === 'mimetype' ||
    ruta === CONTENEDOR
  ) {
    throw new Error(`Ruta MXL no válida: ${ruta}`);
  }
}

export function leerMxl(datos: Uint8Array): string {
  const archivos = unzipSync(datos);
  const mimetype = archivos.mimetype;

  if (mimetype) {
    const tipo = new TextDecoder('utf-8').decode(mimetype).trim();
    if (tipo !== MIME_TYPE) {
      throw new Error(`Tipo MIME MXL no válido: ${tipo}`);
    }
  }

  const contenedor = archivos[CONTENEDOR];

  if (!contenedor) {
    throw new Error('El MXL no contiene META-INF/container.xml');
  }

  const documento = parseXml(decodeXmlBytes(contenedor));
  const rootfile = documento.getElementsByTagName('rootfile')[0];
  const ruta = rootfile?.getAttribute('full-path');

  if (!ruta) {
    throw new Error('El container.xml del MXL no declara rootfile');
  }

  validarRuta(ruta);
  const partitura = archivos[ruta];

  if (!partitura) {
    throw new Error(`El MXL no contiene la partitura ${ruta}`);
  }

  return decodeXmlBytes(partitura);
}

export function escribirMxl(xml: string, ruta = RUTA_POR_DEFECTO): Uint8Array {
  validarRuta(ruta);
  const contenedor = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${escaparAtributo(ruta)}" media-type="application/vnd.recordare.musicxml+xml"/>
  </rootfiles>
</container>`;

  return zipSync({
    mimetype: [strToU8(MIME_TYPE), { level: 0 }],
    [CONTENEDOR]: strToU8(contenedor),
    [ruta]: strToU8(xml)
  });
}
