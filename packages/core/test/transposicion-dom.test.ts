import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMusicXml, serializeMusicXml, type MusicXmlElement } from '../src/musicxml/dom';
import { filtrarPartes, transponerPartitura } from '../src/musicxml/transponer';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function fixture(nombre: string) {
  return parseMusicXml(readFileSync(join(FIXTURES, nombre)));
}

function primeraAltura(elemento: MusicXmlElement) {
  const pitch = elemento.getElementsByTagName('pitch')[0];
  return {
    paso: pitch.getElementsByTagName('step')[0]?.textContent,
    alter: pitch.getElementsByTagName('alter')[0]?.textContent,
    octava: pitch.getElementsByTagName('octave')[0]?.textContent
  };
}

describe('transposición completa del DOM MusicXML', () => {
  it('lleva cada parte transportada a concierto y elimina su transpose', () => {
    const documento = fixture('fragmento-orquestal.musicxml');
    const informe = transponerPartitura(documento, { desde: 'auto', hasta: 'concierto' });
    const partes = documento.getElementsByTagName('part');

    expect(informe.partes.map((parte) => parte.deteccion)).toEqual(['transpose', 'transpose']);
    expect(partes[0].getElementsByTagName('transpose')).toHaveLength(0);
    expect(partes[1].getElementsByTagName('transpose')).toHaveLength(0);
    expect(primeraAltura(partes[0])).toEqual({ paso: 'C', alter: '0', octava: '4' });
    expect(primeraAltura(partes[1])).toEqual({ paso: 'C', alter: '0', octava: '5' });
    expect(partes[0].getElementsByTagName('fifths')[0]?.textContent).toBe('0');
  });

  it('escribe armadura, transpose y nombre al transponer a clarinete en Sib', () => {
    const documento = fixture('escala-sib.musicxml');
    const informe = transponerPartitura(documento, { desde: 'concierto', hasta: 'clarinete-sib' });
    const parte = documento.getElementsByTagName('part')[0];

    expect(informe.partes[0].deteccion).toBe('nombre');
    expect(primeraAltura(parte)).toEqual({ paso: 'C', alter: '0', octava: '5' });
    expect(parte.getElementsByTagName('fifths')[0]?.textContent).toBe('0');
    expect(parte.getElementsByTagName('diatonic')[0]?.textContent).toBe('-1');
    expect(parte.getElementsByTagName('chromatic')[0]?.textContent).toBe('-2');
    expect(documento.getElementsByTagName('part-name')[0]?.textContent).toBe('Clarinete en Sib');
  });

  it('aplica cambio de tonalidad a notas y armaduras', () => {
    const documento = fixture('escala-sib.musicxml');

    transponerPartitura(documento, {
      desde: 'concierto',
      hasta: 'flauta',
      cambioTonalidad: { armadura: 1 }
    });

    const parte = documento.getElementsByTagName('part')[0];

    expect(primeraAltura(parte)).toEqual({ paso: 'G', alter: '0', octava: '4' });
    expect(parte.getElementsByTagName('fifths')[0]?.textContent).toBe('1');
  });

  it('recálculo los accidentales según la nueva armadura', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Flauta</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>1</fifths></key></attributes>
    <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><accidental>sharp</accidental><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>F</step><alter>0</alter><octave>4</octave></pitch><accidental>natural</accidental><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, {
      desde: 'concierto',
      hasta: 'flauta',
      cambioTonalidad: { armadura: 3 }
    });

    const notas = documento.getElementsByTagName('note');
    expect(primeraAltura(notas[0])).toEqual({ paso: 'G', alter: '1', octava: '4' });
    expect(primeraAltura(notas[1])).toEqual({ paso: 'G', alter: '0', octava: '4' });
    expect(notas[0].getElementsByTagName('accidental')).toHaveLength(0);
    expect(notas[1].getElementsByTagName('accidental')[0]?.textContent).toBe('natural');
  });

  it('transpone cifrado americano presente en harmony', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Flauta</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>0</fifths></key></attributes>
    <harmony><root><root-step>C</root-step><root-alter>0</root-alter></root><kind>maj</kind></harmony>
    <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, {
      desde: 'concierto',
      hasta: 'flauta',
      cambioTonalidad: { armadura: 2 }
    });

    expect(documento.getElementsByTagName('root-step')[0]?.textContent).toBe('D');
    expect(documento.getElementsByTagName('root-alter')[0]?.textContent).toBe('0');
  });

  it('escribe sin armadura las trompas naturales y deja los alteres como accidentales', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Trompa en Do alto</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>2</fifths></key></attributes>
    <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'auto', hasta: 'concierto' });

    expect(documento.getElementsByTagName('fifths')[0]?.textContent).toBe('0');
    expect(documento.getElementsByTagName('accidental')[0]?.textContent).toBe('sharp');
  });

  it('escribe armadura en la trompa en Mib de banda española', () => {
    const documento = fixture('escala-sib.musicxml');

    transponerPartitura(documento, { desde: 'concierto', hasta: 'trompa-mib' });

    const parte = documento.getElementsByTagName('part')[0];
    expect(parte.getElementsByTagName('fifths')[0]?.textContent).toBe('1');
    expect(parte.getElementsByTagName('accidental')).toHaveLength(0);
  });

  it('extrae una sola parte y un solo pentagrama', () => {
    const documento = fixture('cuarteto-cuerdas.musicxml');

    filtrarPartes(documento, { partes: ['P2'], pentagrama: 1 });

    expect(documento.getElementsByTagName('score-part')).toHaveLength(1);
    expect(documento.getElementsByTagName('part')).toHaveLength(1);
    expect(documento.getElementsByTagName('part')[0]?.getAttribute('id')).toBe('P2');
  });

  it('inserta alter, accidental y part-abbreviation en orden válido', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1">
    <part-name>Flauta</part-name>
    <score-instrument id="I1"><instrument-name>Fl</instrument-name></score-instrument>
  </score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>0</fifths></key></attributes>
    <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'flauta' });
    const xml = serializeMusicXml(documento);
    const nota = xml.slice(xml.indexOf('<note>'), xml.indexOf('</note>'));

    expect(nota).toMatch(/<step>F<\/step><alter>0<\/alter><octave>4<\/octave>/);
    expect(xml.indexOf('<part-name>')).toBeLessThan(xml.indexOf('<part-abbreviation>'));
    expect(xml.indexOf('<part-abbreviation>')).toBeLessThan(xml.indexOf('<score-instrument'));
  });

  it('escribe armadura cero y accidentales al transponer a un instrumento sin armadura', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Violín</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>2</fifths></key></attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'trompeta-mi' });

    expect(documento.getElementsByTagName('fifths')[0]?.textContent).toBe('0');
    expect(documento.getElementsByTagName('accidental')[0]?.textContent).toBe('flat');
  });

  it('numera claves múltiples y corrige el signo de sol8', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Violín</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>0</fifths></key><clef><sign>G</sign><line>2</line></clef></attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'piano' });
    expect(documento.getElementsByTagName('staves')[0]?.textContent).toBe('2');
    expect(
      Array.from(documento.getElementsByTagName('clef')).map((c) => c.getAttribute('number'))
    ).toEqual(['1', '2']);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'voz-tenor' });
    expect(documento.getElementsByTagName('clef-octave-change')[0]?.textContent).toBe('-1');
  });

  it('usa una sola clave principal en trompa, fagot y violonchelo', () => {
    const casos = [
      ['trompa-fa', 'G', '2'],
      ['fagot', 'F', '4'],
      ['violonchelo', 'F', '4']
    ] as const;

    for (const [id, signo, linea] of casos) {
      const documento = fixture('escala-sib.musicxml');

      transponerPartitura(documento, { desde: 'concierto', hasta: id });

      expect(documento.getElementsByTagName('clef'), id).toHaveLength(1);
      expect(documento.getElementsByTagName('staves'), id).toHaveLength(0);
      expect(documento.getElementsByTagName('sign')[0]?.textContent, id).toBe(signo);
      expect(documento.getElementsByTagName('line')[0]?.textContent, id).toBe(linea);
    }
  });

  it('escribe la clave del destino aunque la partitura original no tenga clef', () => {
    const sinClave = () =>
      parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Violín</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>0</fifths></key></attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    const piano = sinClave();
    transponerPartitura(piano, { desde: 'concierto', hasta: 'piano' });
    expect(piano.getElementsByTagName('clef')).toHaveLength(2);
    expect(
      Array.from(piano.getElementsByTagName('clef')).map((c) => c.getAttribute('number'))
    ).toEqual(['1', '2']);

    const tenor = sinClave();
    transponerPartitura(tenor, { desde: 'concierto', hasta: 'voz-tenor' });
    expect(tenor.getElementsByTagName('clef')).toHaveLength(1);
    expect(tenor.getElementsByTagName('clef-octave-change')[0]?.textContent).toBe('-1');
  });

  it('conserva accidentales advertidos y no repite los de notas ligadas', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Flauta</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><key><fifths>0</fifths></key></attributes>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><tie type="start"/></note>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><accidental cautionary="yes">sharp</accidental><tie type="stop"/></note>
    </measure>
  </part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'flauta' });
    const accidentales = documento.getElementsByTagName('accidental');

    expect(accidentales).toHaveLength(2);
    expect(accidentales[0]?.textContent).toBe('sharp');
    expect(accidentales[1]?.getAttribute('cautionary')).toBe('yes');
  });

  it('detecta el instrumento por la abreviatura antes de dudar', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1">
    <part-name>Melodía</part-name><part-abbreviation>Sx. t.</part-abbreviation>
  </score-part></part-list>
  <part id="P1"><measure number="1">
    <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    const informe = transponerPartitura(documento, { desde: 'auto', hasta: 'concierto' });

    expect(informe.partes[0].origen).toMatchObject({ id: 'saxo-tenor' });
    expect(informe.dudas).toHaveLength(0);
  });

  it('calcula la armadura aunque la partitura original no tenga key', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Violín</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'saxo-tenor' });

    expect(documento.getElementsByTagName('fifths')[0]?.textContent).toBe('2');
    expect(documento.getElementsByTagName('accidental')).toHaveLength(0);
  });

  it('recalcula el signo de un accidental cautionary', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Violín</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>5</fifths></key></attributes>
    <note><pitch><step>C</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><accidental cautionary="yes">sharp</accidental></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'saxo-tenor' });

    expect(documento.getElementsByTagName('accidental')[0]?.textContent).toBe('flat');
    expect(documento.getElementsByTagName('accidental')[0]?.getAttribute('cautionary')).toBe('yes');
  });

  it('colapsa los pentagramas al transponer a un instrumento de una clave', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><staves>2</staves></attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
    <note><pitch><step>C</step><alter>0</alter><octave>3</octave></pitch><duration>1</duration><type>quarter</type><staff>2</staff></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'saxo-tenor' });

    expect(documento.getElementsByTagName('staves')[0]?.textContent).toBe('1');
    expect(documento.getElementsByTagName('note')).toHaveLength(1);
  });

  it('no escribe transpose 0/0/0 para instrumentos en Do', () => {
    const documento = fixture('escala-sib.musicxml');

    transponerPartitura(documento, { desde: 'concierto', hasta: 'flauta' });

    expect(documento.getElementsByTagName('transpose')).toHaveLength(0);
  });

  it('sitúa las claves antes de staff-details', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><staves>2</staves><staff-details number="1"/><staff-details number="2"/></attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'piano' });
    const xml = serializeMusicXml(documento);

    expect(xml.indexOf('<clef ')).toBeLessThan(xml.indexOf('<staff-details'));
  });

  it('deja un solo staff-details al extraer un pentagrama', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes>
      <staves>2</staves>
      <staff-details number="1"/>
      <staff-details number="2"/>
      <clef number="1"><sign>G</sign><line>2</line></clef>
      <clef number="2"><sign>F</sign><line>4</line></clef>
    </attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
    <note><pitch><step>C</step><alter>0</alter><octave>3</octave></pitch><duration>1</duration><type>quarter</type><staff>2</staff></note>
  </measure></part>
</score-partwise>`);

    filtrarPartes(documento, { pentagrama: 2 });

    expect(documento.getElementsByTagName('staff-details')).toHaveLength(1);
    expect(documento.getElementsByTagName('staff-details')[0]?.hasAttribute('number')).toBe(false);
    expect(documento.getElementsByTagName('staves')[0]?.textContent).toBe('1');
  });

  it('reinicia los accidentales al cambiar de armadura dentro del compás', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Flauta</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>1</fifths></key></attributes>
    <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><accidental>sharp</accidental></note>
    <attributes><key><fifths>-1</fifths></key></attributes>
    <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'flauta' });

    const accidentales = documento.getElementsByTagName('accidental');
    expect(accidentales).toHaveLength(1);
    expect(accidentales[0]?.textContent).toBe('sharp');
    expect(
      documento.getElementsByTagName('note')[1]?.getElementsByTagName('accidental')
    ).toHaveLength(1);
  });

  it('no comparte el estado de accidentales entre voces', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Flauta</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>1</fifths></key></attributes>
    <note><pitch><step>F</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><voice>1</voice><accidental>natural</accidental></note>
    <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type><voice>2</voice></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, { desde: 'concierto', hasta: 'flauta' });

    expect(documento.getElementsByTagName('accidental')[1]?.textContent).toBe('sharp');
  });

  it('extrae realmente el segundo pentagrama de una partitura de dos', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes>
      <staves>2</staves>
      <clef number="1"><sign>G</sign><line>2</line></clef>
      <clef number="2"><sign>F</sign><line>4</line></clef>
    </attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>5</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
    <note><pitch><step>C</step><alter>0</alter><octave>3</octave></pitch><duration>1</duration><type>quarter</type><staff>2</staff></note>
  </measure></part>
</score-partwise>`);

    filtrarPartes(documento, { pentagrama: 2 });

    expect(documento.getElementsByTagName('staves')[0]?.textContent).toBe('1');
    expect(documento.getElementsByTagName('clef')).toHaveLength(1);
    expect(documento.getElementsByTagName('clef')[0]?.getAttribute('number')).toBeNull();
    expect(documento.getElementsByTagName('note')).toHaveLength(1);
    expect(documento.getElementsByTagName('octave')[0]?.textContent).toBe('3');
    expect(documento.getElementsByTagName('staff')[0]?.textContent).toBe('1');
  });

  it('devuelve candidatos cuando el nombre del instrumento es ambiguo', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Trompa</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    const informe = transponerPartitura(documento, { desde: 'auto', hasta: 'concierto' });

    expect(informe.dudas).toHaveLength(1);
    expect(informe.dudas[0]?.candidatos.length).toBeGreaterThan(1);
  });

  it('aplica el cambio de tonalidad a las armaduras que aparecen a mitad de obra', () => {
    const documento = parseMusicXml(`<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Flauta</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><key><fifths>0</fifths></key></attributes>
    <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <attributes><key><fifths>1</fifths></key></attributes>
    <note><pitch><step>G</step><alter>0</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`);

    transponerPartitura(documento, {
      desde: 'concierto',
      hasta: 'flauta',
      cambioTonalidad: { armadura: 2 }
    });

    expect(Array.from(documento.getElementsByTagName('fifths')).map((f) => f.textContent)).toEqual([
      '2',
      '3'
    ]);
  });
});
