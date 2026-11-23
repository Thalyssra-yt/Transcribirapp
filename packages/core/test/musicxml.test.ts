import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeXmlBytes, parseMusicXml, serializeMusicXml } from '../src/musicxml/dom';

const DIRECTORIO_FIXTURES = join(import.meta.dirname, 'fixtures');
const FIXTURES = [
  'escala-sib.musicxml',
  'melodia-mi-mayor.musicxml',
  'cuarteto-cuerdas.musicxml',
  'cifrado-americano.musicxml',
  'fragmento-orquestal.musicxml'
];

describe('lector y escritor MusicXML', () => {
  it('parsea y serializa los fixtures sin perder notas ni atributos', () => {
    for (const archivo of FIXTURES) {
      const xml = readFileSync(join(DIRECTORIO_FIXTURES, archivo), 'utf8');
      const documento = parseMusicXml(xml);
      const serializado = serializeMusicXml(documento);
      const reparsado = parseMusicXml(serializado);

      expect(serializeMusicXml(reparsado), archivo).toBe(serializado);
      expect(reparsado.getElementsByTagName('note').length, archivo).toBe(
        documento.getElementsByTagName('note').length
      );
      expect(reparsado.getElementsByTagName('attributes').length, archivo).toBe(
        documento.getElementsByTagName('attributes').length
      );
    }
  });

  it('conserva elementos desconocidos y sus atributos', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <misc-custom origen="maestro"><dato>42</dato></misc-custom>
  <part-list><score-part id="P1"><part-name>Prueba</part-name></score-part></part-list>
  <part id="P1"><measure number="1"><note><rest measure="yes"/><duration>4</duration></note></measure></part>
</score-partwise>`;

    const salida = serializeMusicXml(parseMusicXml(xml));

    expect(salida).toContain('<misc-custom origen="maestro">');
    expect(salida).toContain('<dato>42</dato>');
  });

  it('detecta UTF-16 con BOM en un archivo .musicxml', () => {
    const bytes = readFileSync(join(DIRECTORIO_FIXTURES, 'partitura-utf16.musicxml'));
    const documento = parseMusicXml(bytes);

    expect(documento.getElementsByTagName('work-title')[0]?.textContent).toBe('Ópera ñ');
    expect(serializeMusicXml(documento)).toContain('Ópera ñ');
    expect(serializeMusicXml(documento)).toContain('encoding="utf-8"');
  });

  it('detecta UTF-16 por la declaración cuando no hay BOM', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-16"?><score-partwise version="4.0"><part-list/></score-partwise>';
    const bytes = new Uint8Array(Buffer.from(xml, 'utf16le'));

    expect(parseMusicXml(bytes).documentElement?.nodeName).toBe('score-partwise');
  });

  it('rechaza UTF-32 con un mensaje claro en español', () => {
    const bytes = Uint8Array.from([0xff, 0xfe, 0x00, 0x00, 0x3c, 0x00, 0x3f, 0x00]);

    expect(() => decodeXmlBytes(bytes)).toThrow(/UTF-32.*UTF-8 o UTF-16/);
  });

  it('rechaza documentos que no son score-partwise', () => {
    expect(() => parseMusicXml('<libro><titulo>No es partitura</titulo></libro>')).toThrow(
      /score-partwise/
    );
  });

  it('explica qué hacer con score-timewise', () => {
    expect(() =>
      parseMusicXml('<score-timewise version="4.0"><part-list/></score-timewise>')
    ).toThrow(
      /Conviértelo a score-partwise con Finale, Sibelius o MuseScore antes de transponerlo/
    );
  });
});
