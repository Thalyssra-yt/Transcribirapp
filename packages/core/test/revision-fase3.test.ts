import { describe, expect, it } from 'vitest';
import { parseMusicXml, serializeMusicXml, transponerPartitura } from '../src/musicxml';

const cab = (cuerpo: string) => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Concierto</part-name></score-part></part-list>${cuerpo}</score-partwise>`;
const nota =
  '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>';
const atributos = (mode: string) =>
  `<attributes><divisions>1</divisions><key><fifths>0</fifths>${mode}</key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`;

function clave(xml: string): { fifths: string | undefined; mode: string | undefined } {
  const documento = parseMusicXml(xml);
  const key = documento.getElementsByTagName('key')[0];

  return {
    fifths: key?.getElementsByTagName('fifths')[0]?.textContent ?? undefined,
    mode: key?.getElementsByTagName('mode')[0]?.textContent ?? undefined
  };
}

function transponer(xml: string, cambio: { armadura: number; modo?: 'major' | 'minor' }): string {
  const documento = parseMusicXml(xml);
  transponerPartitura(documento, {
    desde: 'concierto',
    hasta: 'concierto',
    cambioTonalidad: cambio
  });

  return serializeMusicXml(documento);
}

describe('cambio de tonalidad con modo', () => {
  it('escribe el modo menor indicado', () => {
    const xml = cab(
      `<part id="P1"><measure number="1">${atributos('<mode>major</mode>')}${nota}</measure></part>`
    );

    expect(clave(transponer(xml, { armadura: -1, modo: 'minor' }))).toEqual({
      fifths: '-1',
      mode: 'minor'
    });
  });

  it('escribe el modo mayor indicado aunque la armadura no cambie', () => {
    const xml = cab(
      `<part id="P1"><measure number="1">${atributos('<mode>minor</mode>')}${nota}</measure></part>`
    );

    expect(clave(transponer(xml, { armadura: 0, modo: 'major' }))).toEqual({
      fifths: '0',
      mode: 'major'
    });
  });

  it('añade <mode> cuando la partitura no lo declaraba', () => {
    const xml = cab(`<part id="P1"><measure number="1">${atributos('')}${nota}</measure></part>`);

    expect(clave(transponer(xml, { armadura: 2, modo: 'minor' }))).toEqual({
      fifths: '2',
      mode: 'minor'
    });
  });
});
