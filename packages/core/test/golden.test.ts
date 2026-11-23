import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { midi, nota, type Paso } from '../src/pitch';
import { decodeXmlBytes, parseMusicXml, serializeMusicXml } from '../src/musicxml/dom';
import { transponerPartitura } from '../src/musicxml/transponer';

const DIRECTORIO_FIXTURES = join(import.meta.dirname, 'fixtures');
const DIRECTORIO_GOLDEN = join(import.meta.dirname, 'golden');
const ARCHIVOS = readdirSync(DIRECTORIO_FIXTURES)
  .filter((archivo) => archivo.endsWith('.musicxml'))
  .sort();

interface Altura {
  paso: Paso;
  alter: number;
  octava: number;
}

function alturas(documento: ReturnType<typeof parseMusicXml>): Altura[] {
  const resultado: Altura[] = [];

  for (const pitch of Array.from(documento.getElementsByTagName('pitch'))) {
    const paso = pitch.getElementsByTagName('step')[0]?.textContent?.trim() as Paso | undefined;
    const alter = Number(pitch.getElementsByTagName('alter')[0]?.textContent ?? 0);
    const octava = Number(pitch.getElementsByTagName('octave')[0]?.textContent);

    if (paso && Number.isFinite(octava)) {
      resultado.push({ paso, alter, octava });
    }
  }

  return resultado;
}

function fuente(archivo: string) {
  return readFileSync(join(DIRECTORIO_FIXTURES, archivo));
}

function golden(caso: string, archivo: string) {
  return readFileSync(join(DIRECTORIO_GOLDEN, `${caso}-${archivo}.xml`), 'utf8');
}

describe('tests 23–24: ida y vuelta sobre todos los fixtures', () => {
  it.each(ARCHIVOS)('23 · %s vuelve nota a nota desde saxo tenor', (archivo) => {
    const original = parseMusicXml(fuente(archivo));
    const esperado = alturas(original);
    const documento = parseMusicXml(fuente(archivo));

    transponerPartitura(documento, { desde: 'concierto', hasta: 'saxo-tenor' });
    transponerPartitura(documento, { desde: 'auto', hasta: 'concierto' });

    expect(alturas(documento)).toEqual(esperado);
    expect(serializeMusicXml(documento)).toBe(golden('23', archivo));
  });

  it.each(ARCHIVOS)('24 · %s vuelve desde saxo alto y trompeta en Sib', (archivo) => {
    const original = parseMusicXml(fuente(archivo));
    const esperado = alturas(original).map((altura) =>
      midi(nota(altura.paso, altura.alter, altura.octava))
    );
    const documento = parseMusicXml(fuente(archivo));

    transponerPartitura(documento, { desde: 'concierto', hasta: 'saxo-alto' });
    transponerPartitura(documento, { desde: 'auto', hasta: 'trompeta-sib' });
    transponerPartitura(documento, { desde: 'auto', hasta: 'concierto' });

    expect(
      alturas(documento).map((altura) => midi(nota(altura.paso, altura.alter, altura.octava)))
    ).toEqual(esperado);
    expect(serializeMusicXml(documento)).toBe(golden('24', archivo));
  });

  it('todos los fixtures se decodifican antes de comparar', () => {
    for (const archivo of ARCHIVOS) {
      expect(decodeXmlBytes(fuente(archivo))).toContain('<score-partwise');
    }
  });
});
