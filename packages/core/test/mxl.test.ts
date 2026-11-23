import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { leerMxl, escribirMxl } from '../src/musicxml/mxl';

describe('lectura y escritura de MXL', () => {
  const xml = readFileSync(join(import.meta.dirname, 'fixtures', 'escala-sib.musicxml'), 'utf8');

  it('guarda la partitura y la recupera sin cambios', () => {
    const mxl = escribirMxl(xml, 'partitura/score.musicxml');

    expect(leerMxl(mxl)).toBe(xml);
  });

  it('admite rutas con espacios y tildes', () => {
    const ruta = 'Mi obra/partitura ñ.musicxml';
    const mxl = escribirMxl(xml, ruta);

    expect(leerMxl(mxl)).toBe(xml);
    expect(strFromU8(unzipSync(mxl)[ruta], true)).toBe(xml);
  });

  it('rechaza rutas absolutas, rutas con .. y nombres reservados', () => {
    expect(() => escribirMxl(xml, '/score.musicxml')).toThrow(/no válida/);
    expect(() => escribirMxl(xml, 'C:/score.musicxml')).toThrow(/no válida/);
    expect(() => escribirMxl(xml, '\\\\servidor\\obra\\score.musicxml')).toThrow(/no válida/);
    expect(() => escribirMxl(xml, 'obra/../score.musicxml')).toThrow(/no válida/);
    expect(() => escribirMxl(xml, 'obra\\..\\score.musicxml')).toThrow(/no válida/);
    expect(() => escribirMxl(xml, 'mimetype')).toThrow(/no válida/);
    expect(() => escribirMxl(xml, 'META-INF/container.xml')).toThrow(/no válida/);
  });

  it('escribe mimetype el primero y sin comprimir', () => {
    const mxl = Buffer.from(escribirMxl(xml));

    expect(mxl.subarray(0, 60).toString('latin1')).toContain('mimetype');
    expect(mxl.includes(Buffer.from('application/vnd.recordare.musicxml'))).toBe(true);
    expect(strFromU8(mxl.subarray(30, 38), true)).toBe('mimetype');
    expect(mxl[8]).toBe(0);
    expect(mxl[9]).toBe(0);
  });

  it('escribe un container.xml que apunta al archivo correcto', () => {
    const mxl = escribirMxl(xml, 'partitura/score.musicxml');
    const archivos = unzipSync(mxl);
    const contenedor = strFromU8(archivos['META-INF/container.xml'], true);

    expect(contenedor).toContain('full-path="partitura/score.musicxml"');
    expect(strFromU8(archivos['partitura/score.musicxml'], true)).toBe(xml);
  });

  it('detecta la codificación de la partitura dentro del MXL', () => {
    const utf16 = readFileSync(join(import.meta.dirname, 'fixtures', 'partitura-utf16.musicxml'));
    const contenedor = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="Mi obra.musicxml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles>
</container>`;
    const mxl = zipSync({
      'META-INF/container.xml': strToU8(contenedor),
      'Mi obra.musicxml': utf16
    });

    expect(leerMxl(mxl)).toContain('Ópera ñ');
  });

  it('avisa si el MXL no tiene container.xml', () => {
    const mxl = zipSync({ 'partitura.xml': strToU8(xml) });

    expect(() => leerMxl(mxl)).toThrow(/container/);
  });

  it('rechaza un mimetype incorrecto', () => {
    const mxl = zipSync({ mimetype: strToU8('application/zip'), 'partitura.xml': strToU8(xml) });

    expect(() => leerMxl(mxl)).toThrow(/MIME/);
  });
});
