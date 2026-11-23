import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { escribirMxl, parseMusicXml, textoDe } from '@transcriptor/core';
import { TONALIDADES, leerPartitura, transponerPartituraWeb } from '../src/lib/partitura';

const fixture = new URL(
  '../../../packages/core/test/fixtures/escala-sib.musicxml',
  import.meta.url
);

async function cargarFixture(nombre = 'escala.musicxml') {
  const contenido = await readFile(fixture);
  return leerPartitura(new File([contenido], nombre));
}

describe('biblioteca web de partituras', () => {
  it('lee un MusicXML y resume sus partes', async () => {
    const archivo = await cargarFixture();

    expect(archivo.formato).toBe('musicxml');
    expect(archivo.titulo).toBe('Escala en Sib mayor');
    expect(archivo.compositor).toBe('Fixture del proyecto');
    expect(archivo.partes).toEqual([{ id: 'P1', nombre: 'Flauta' }]);
    expect(archivo.instrumentoDetectado).toBe('flauta');
    expect(archivo.tonalidadOriginal).toBe('Sib mayor');
    expect(archivo.xml).toContain('<score-partwise');
  });

  it('lee un MXL y un ABC', async () => {
    const contenido = await readFile(fixture, 'utf8');
    const mxl = await leerPartitura(new File([escribirMxl(contenido)], 'escala.mxl'));
    const abc = await leerPartitura(
      new File(['X:1\nT:Prueba ABC\nM:4/4\nL:1/4\nK:G\nC D E F|G A B c|'], 'prueba.abc')
    );

    expect(mxl.formato).toBe('mxl');
    expect(mxl.partes).toEqual([{ id: 'P1', nombre: 'Flauta' }]);
    expect(abc.formato).toBe('abc');
    expect(abc.titulo).toBe('Prueba ABC');
  });

  it('transpone a saxo tenor y aplica la tonalidad de concierto elegida', async () => {
    const archivo = await cargarFixture();
    const resultado = transponerPartituraWeb(archivo, {
      desde: 'auto',
      hasta: 'saxo-tenor',
      partes: ['P1'],
      tonalidad: { id: 're-menor', nombre: 'Re menor', armadura: -1, modo: 'minor' },
      direccion: 'cercana',
      octava: 0
    });
    const documento = parseMusicXml(resultado.xml);
    const clave = documento.getElementsByTagName('key')[0];
    const transpose = documento.getElementsByTagName('transpose')[0];
    const primeraNota = documento.getElementsByTagName('pitch')[0];

    expect(textoDe(clave, 'fifths')).toBe('1');
    expect(textoDe(clave, 'mode')).toBe('minor');
    expect(textoDe(transpose, 'diatonic')).toBe('-1');
    expect(textoDe(transpose, 'chromatic')).toBe('-2');
    expect(textoDe(transpose, 'octave-change')).toBe('-1');
    expect(textoDe(primeraNota, 'step')).toBe('E');
    expect(textoDe(primeraNota, 'octave')).toBe('6');
    expect(resultado.tonalidad).toBe('Mi menor');
  });

  it('mantiene la tónica y el modo al cambiar a una tonalidad mayor', async () => {
    const archivo = await cargarFixture();
    const resultado = transponerPartituraWeb(archivo, {
      desde: 'auto',
      hasta: 'saxo-tenor',
      partes: ['P1'],
      tonalidad: { id: 'fa', nombre: 'Fa mayor', armadura: -1, modo: 'major' },
      direccion: 'cercana',
      octava: 0
    });
    const documento = parseMusicXml(resultado.xml);
    const clave = documento.getElementsByTagName('key')[0];

    expect(textoDe(clave, 'fifths')).toBe('1');
    expect(textoDe(clave, 'mode')).toBe('major');
    expect(textoDe(documento.getElementsByTagName('pitch')[0], 'step')).toBe('G');
  });

  it('no escribe transpose cuando el destino es concierto', async () => {
    const archivo = await cargarFixture();
    const resultado = transponerPartituraWeb(archivo, {
      desde: 'auto',
      hasta: 'concierto',
      partes: ['P1'],
      direccion: 'cercana',
      octava: 0
    });

    expect(parseMusicXml(resultado.xml).getElementsByTagName('transpose')).toHaveLength(0);
  });

  it('aplica la octava después de transponer y recalcula los avisos de registro', async () => {
    const archivo = await cargarFixture();
    const opciones = {
      desde: 'auto' as const,
      hasta: 'saxo-tenor' as const,
      partes: ['P1'],
      direccion: 'cercana' as const,
      octava: -1
    };
    const sinOctava = transponerPartituraWeb(archivo, { ...opciones, octava: 0 });
    const conOctava = transponerPartituraWeb(archivo, opciones);
    const conOctavaIncorrecta = transponerPartituraWeb(archivo, { ...opciones, octava: 1 });
    const sugerida = sinOctava.octavaSugerida;

    expect(sugerida).toBe(-1);
    expect(conOctavaIncorrecta.octavaSugerida).toBe(-1);
    expect(conOctava.octavaSugerida).toBeUndefined();
    expect(sinOctava.fuera.length).toBeGreaterThan(0);
    expect(conOctava.fuera.length).toBeLessThan(sinOctava.fuera.length);
    expect(textoDe(parseMusicXml(conOctava.xml).getElementsByTagName('pitch')[0], 'octave')).toBe(
      '5'
    );
    expect(
      textoDe(parseMusicXml(conOctava.xml).getElementsByTagName('transpose')[0], 'octave-change')
    ).toBe('-1');

    if (sugerida !== undefined) {
      const aplicada = transponerPartituraWeb(archivo, { ...opciones, octava: sugerida });
      expect(
        aplicada.fuera.filter((entrada) => entrada.estado === 'fuera del registro absoluto')
      ).toHaveLength(0);
    }
  });

  it('exige al menos una parte', async () => {
    const archivo = await cargarFixture();

    expect(() =>
      transponerPartituraWeb(archivo, {
        desde: 'auto',
        hasta: 'saxo-tenor',
        partes: [],
        direccion: 'cercana',
        octava: 0
      })
    ).toThrow('Selecciona al menos una parte para transponer.');
  });

  it('usa nombres de tonalidades en español', () => {
    expect(TONALIDADES.find((tonalidad) => tonalidad.id === 'dob')?.nombre).toBe('Dob mayor');
    expect(TONALIDADES.find((tonalidad) => tonalidad.id === 'fa-sostenido')?.nombre).toBe(
      'Fa# mayor'
    );
  });

  it('rechaza formatos no soportados con un mensaje en español', async () => {
    await expect(leerPartitura(new File(['x'], 'partitura.pdf'))).rejects.toThrow(
      'Formato no soportado'
    );
  });
});
