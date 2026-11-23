import { describe, expect, it } from 'vitest';
import { abcAMusicXml } from '../src/abc';
import { transponerPartitura } from '../src/musicxml/transponer';

describe('importador ABC', () => {
  const abc = `X:1
T:Prueba ABC
M:4/4
L:1/4
K:G
C D E F|G A B c|`;

  it('convierte cabeceras y notas a MusicXML partwise', () => {
    const documento = abcAMusicXml(abc, { instrumento: 'flauta' });

    expect(documento.getElementsByTagName('divisions')[0]?.textContent).toBe('8');
    expect(documento.getElementsByTagName('work-title')[0]?.textContent).toBe('Prueba ABC');
    expect(documento.getElementsByTagName('part-name')[0]?.textContent).toBe('Flauta');
    expect(documento.getElementsByTagName('fifths')[0]?.textContent).toBe('1');
    expect(documento.getElementsByTagName('note')).toHaveLength(8);
    expect(documento.getElementsByTagName('step')[0]?.textContent).toBe('C');
    expect(documento.getElementsByTagName('step')[7]?.textContent).toBe('C');
    expect(documento.getElementsByTagName('octave')[7]?.textContent).toBe('5');
    expect(documento.getElementsByTagName('duration')[0]?.textContent).toBe('8');
  });

  it('permite transponer directamente la partitura importada', () => {
    const documento = abcAMusicXml(abc);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'clarinete-sib' });

    expect(documento.getElementsByTagName('step')[0]?.textContent).toBe('D');
  });

  it('calcula duraciones con denominador y puntillos', () => {
    const documento = abcAMusicXml(`X:1\nM:4/4\nL:1/4\nK:C\nC/2 C3/2|`);

    expect(
      Array.from(documento.getElementsByTagName('duration')).map((n) => n.textContent)
    ).toEqual(['4', '12']);
    expect(documento.getElementsByTagName('type')[0]?.textContent).toBe('eighth');
    expect(documento.getElementsByTagName('type')[1]?.textContent).toBe('quarter');
    expect(documento.getElementsByTagName('dot')).toHaveLength(1);
  });

  it('reconoce armaduras con sostenido y modo menor', () => {
    expect(
      abcAMusicXml(`X:1\nL:1/8\nK:F#m\nC|`).getElementsByTagName('fifths')[0]?.textContent
    ).toBe('3');
  });

  it('no crea compases vacíos con barras dobles', () => {
    const documento = abcAMusicXml(`X:1\nL:1/8\nK:C\nC D||E F|`);

    expect(documento.getElementsByTagName('measure')).toHaveLength(2);
  });

  it('interpreta mayores y no confunde maj con menor', () => {
    const armadura = (clave: string) =>
      abcAMusicXml(`X:1\nL:1/8\nK:${clave}\nC|`).getElementsByTagName('fifths')[0]?.textContent;

    expect(armadura('Cmaj')).toBe('0');
    expect(armadura('Gmaj')).toBe('1');
    expect(armadura('Bbmaj')).toBe('-2');
  });

  it('admite barras simples y dobles sin denominador', () => {
    const documento = abcAMusicXml(`X:1\nL:1/4\nK:C\nC/ C//|`);

    expect(
      Array.from(documento.getElementsByTagName('duration')).map((n) => n.textContent)
    ).toEqual(['4', '2']);
    expect(documento.getElementsByTagName('type')[0]?.textContent).toBe('eighth');
    expect(documento.getElementsByTagName('type')[1]?.textContent).toBe('16th');
  });

  it('conserva silencios x y Z', () => {
    const documento = abcAMusicXml(`X:1\nL:1/4\nK:C\nx Z|`);

    expect(documento.getElementsByTagName('rest')).toHaveLength(2);
    expect(documento.getElementsByTagName('note')).toHaveLength(2);
  });

  it('aplica la armadura ABC a las notas sin alteración explícita', () => {
    const documento = abcAMusicXml(`X:1\nL:1/4\nK:G\nF|=F|_F|`);

    expect(Array.from(documento.getElementsByTagName('alter')).map((n) => n.textContent)).toEqual([
      '1',
      '0',
      '-1'
    ]);
  });

  it('escribe acordes con chord', () => {
    const documento = abcAMusicXml(`X:1\nL:1/4\nK:C\n[EG]|`);

    expect(documento.getElementsByTagName('note')).toHaveLength(2);
    expect(documento.getElementsByTagName('chord')).toHaveLength(1);
    expect(documento.getElementsByTagName('step')[1]?.textContent).toBe('G');
  });

  it('da a Z la duración del compás completo', () => {
    const documento = abcAMusicXml(`X:1\nM:4/4\nL:1/4\nK:C\nZ|`);

    expect(documento.getElementsByTagName('duration')[0]?.textContent).toBe('32');
    expect(documento.getElementsByTagName('type')[0]?.textContent).toBe('whole');
  });

  it('ignora las líneas de letra posteriores al cuerpo', () => {
    const documento = abcAMusicXml(`X:1\nL:1/4\nK:C\nC D|E F|\nw: cada cosa\n`);

    expect(documento.getElementsByTagName('note')).toHaveLength(4);
  });
});
