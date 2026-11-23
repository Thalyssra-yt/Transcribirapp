import { describe, expect, it } from 'vitest';
import { parseMusicXml, serializeMusicXml, transponerPartitura } from '../src/musicxml';

const cab = (partes: string, cuerpo: string) => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list>${partes}</part-list>${cuerpo}</score-partwise>`;
const n = (step: string, alter: number, oct: number, extra = '', dur = 1, tipo = 'quarter') =>
  `<note><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${oct}</octave></pitch><duration>${dur}</duration>${extra}<type>${tipo}</type></note>`;
const tieS = '<tie type="start"/>';
const tieE = '<tie type="stop"/>';

function accidentales(xml: string): (string | null)[][] {
  const doc = parseMusicXml(xml);
  return Array.from(doc.getElementsByTagName('measure')).map((m) =>
    Array.from(m.getElementsByTagName('note'))
      .filter((x) => x.getElementsByTagName('pitch').length)
      .map((x) => x.getElementsByTagName('accidental')[0]?.textContent ?? null)
  );
}
function run(xml: string, opciones: Parameters<typeof transponerPartitura>[1], _nombre: string) {
  const doc = parseMusicXml(xml);
  const informe = transponerPartitura(doc, opciones);
  const out = serializeMusicXml(doc);
  return { out, informe };
}

const ATTR =
  '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>';

describe('revisión externa de la Fase 2', () => {
  it('ligaduras: la alteración no se arrastra a otras notas del compás siguiente', () => {
    const xml = cab(
      '<score-part id="P1"><part-name>Flauta</part-name></score-part>',
      `<part id="P1">
       <measure number="1">${ATTR}${n('F', 1, 4, tieS)}${n('F', 1, 4, tieE)}${n('G', 0, 4, '', 2, 'half')}</measure>
       <measure number="2">${n('F', 1, 4)}${n('F', 1, 4, tieS)}${n('G', 0, 4, '', 2, 'half')}</measure>
       <measure number="3">${n('F', 1, 4, tieE)}${n('F', 1, 4)}${n('G', 0, 4, '', 2, 'half')}</measure>
      </part>`
    );
    // Ojo: el compás 2 tiene la ligadura en la 2.ª nota pero va a la 1.ª del compás 3.
    const { out } = run(xml, { desde: 'concierto', hasta: 'clarinete-sib' }, 'ligaduras');
    expect(accidentales(out)).toEqual([
      ['sharp', null, null],
      ['sharp', null, null],
      [null, 'sharp', null]
    ]);
  });

  it('<cancel> se transpone junto a la armadura', () => {
    const xml = cab(
      '<score-part id="P1"><part-name>Flauta</part-name></score-part>',
      `<part id="P1">
       <measure number="1">${ATTR.replace('<fifths>0</fifths>', '<fifths>3</fifths>')}${n('A', 0, 4, '', 4, 'whole')}</measure>
       <measure number="2"><attributes><key><cancel>3</cancel><fifths>-1</fifths></key></attributes>${n('F', 0, 4, '', 4, 'whole')}</measure>
      </part>`
    );
    const { out } = run(xml, { desde: 'concierto', hasta: 'saxo-alto' }, 'cancel');
    const doc = parseMusicXml(out);
    const keys = Array.from(doc.getElementsByTagName('key'));
    expect(keys[0].getElementsByTagName('fifths')[0].textContent).toBe('6');
    expect(keys[1].getElementsByTagName('fifths')[0].textContent).toBe('2');
    expect(keys[1].getElementsByTagName('cancel')[0]?.textContent).toBe('6');
  });

  it('un attributes sin key conserva la armadura que ya estaba vigente', () => {
    const xml = cab(
      '<score-part id="P1"><part-name>Flauta</part-name></score-part>',
      `<part id="P1">
       <measure number="1">${ATTR.replace('<fifths>0</fifths>', '<fifths>1</fifths>')}${n('F', 1, 4)}</measure>
       <measure number="2"><attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>${n('G', 0, 4)}</measure>
      </part>`
    );
    const { out } = run(xml, { desde: 'concierto', hasta: 'flauta' }, 'sin-key');
    const doc = parseMusicXml(out);

    expect(Array.from(doc.getElementsByTagName('fifths')).map((f) => f.textContent)).toEqual([
      '1',
      '1'
    ]);
  });

  it('<cancel> se normaliza igual que la armadura cuando pasa de 7 a -5', () => {
    const xml = cab(
      '<score-part id="P1"><part-name>Flauta</part-name></score-part>',
      `<part id="P1">
       <measure number="1">${ATTR.replace('<fifths>0</fifths>', '<fifths>4</fifths>')}${n('A', 0, 4, '', 4, 'whole')}</measure>
       <measure number="2"><attributes><key><cancel>4</cancel><fifths>-1</fifths></key></attributes>${n('F', 0, 4, '', 4, 'whole')}</measure>
      </part>`
    );
    const { out } = run(xml, { desde: 'concierto', hasta: 'saxo-alto' }, 'cancel-enarmonia');
    const doc = parseMusicXml(out);
    const keys = Array.from(doc.getElementsByTagName('key'));

    expect(keys[0].getElementsByTagName('fifths')[0].textContent).toBe('-5');
    expect(keys[1].getElementsByTagName('fifths')[0].textContent).toBe('2');
    expect(keys[1].getElementsByTagName('cancel')[0]?.textContent).toBe('-5');
  });

  it('piano (2 pentagramas con backup) → saxo tenor deja una sola voz válida y avisa', () => {
    const xml = cab(
      '<score-part id="P1"><part-name>Piano</part-name></score-part>',
      `<part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
       ${n('E', 0, 5, '<voice>1</voice>', 4, 'whole').replace('<type>', '<type>').replace('</note>', '<staff>1</staff></note>')}
       <backup><duration>4</duration></backup>
       ${n('C', 0, 3, '<voice>5</voice>', 4, 'whole').replace('</note>', '<staff>2</staff></note>')}
      </measure></part>`
    );
    const { out, informe } = run(xml, { desde: 'concierto', hasta: 'saxo-tenor' }, 'piano-a-saxo');
    expect(out).not.toContain('<staves>2');
    expect(out).not.toContain('<backup>');
    expect(informe.avisos.join(' ')).toMatch(/pentagrama|mano izquierda/i);
  });

  it('concierto Re mayor → trompa en Re (natural): sin armadura y en Do', () => {
    const xml = cab(
      '<score-part id="P1"><part-name>Flauta</part-name></score-part>',
      `<part id="P1"><measure number="1">${ATTR.replace('<fifths>0</fifths>', '<fifths>2</fifths>')}${n('D', 0, 4)}${n('F', 1, 4)}${n('A', 0, 4)}${n('C', 1, 5)}</measure></part>`
    );
    const { out } = run(xml, { desde: 'concierto', hasta: 'trompa-re' }, 'trompa-re');
    const doc = parseMusicXml(out);
    expect(doc.getElementsByTagName('fifths')[0].textContent).toBe('0');
    const notas = Array.from(doc.getElementsByTagName('step')).map((s) => s.textContent);
    expect(notas).toEqual(['C', 'E', 'G', 'B']);
    expect(accidentales(out)).toEqual([[null, null, null, null]]);
  });

  it('violonchelo → saxo tenor y concierto → trompa en Fa generan MusicXML válido', () => {
    const xml = cab(
      '<score-part id="P1"><part-name>Violonchelo</part-name></score-part>',
      `<part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>-3</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef></attributes>${n('E', -1, 3)}${n('G', 0, 3)}${n('B', -1, 3)}${n('E', -1, 4)}</measure></part>`
    );
    run(xml, { desde: 'auto', hasta: 'saxo-tenor' }, 'chelo-a-tenor');
    run(xml, { desde: 'auto', hasta: 'trompa-fa' }, 'chelo-a-trompa');
    run(
      xml,
      { desde: 'auto', hasta: 'saxo-alto', cambioTonalidad: { armadura: 0 } },
      'chelo-a-alto-do'
    );
  });
});
