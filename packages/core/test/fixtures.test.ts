import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIRECTORIO_FIXTURES = join(import.meta.dirname, 'fixtures');

describe('fixtures MusicXML de la Fase 0', () => {
  const archivos = readdirSync(DIRECTORIO_FIXTURES).filter((archivo) =>
    archivo.endsWith('.musicxml')
  );

  it('incluye al menos cinco partituras de prueba', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(5);
  });

  it.each(archivos)('%s es un score-partwise 4.0 completo', (archivo) => {
    const contenido = readFileSync(join(DIRECTORIO_FIXTURES, archivo), 'utf8');

    expect(contenido).toContain('<score-partwise version="4.0">');
    expect(contenido).toContain('<part-list>');
    expect(contenido).toContain('<part id="P1">');
    expect(contenido.trimEnd().endsWith('</score-partwise>')).toBe(true);
  });
});
