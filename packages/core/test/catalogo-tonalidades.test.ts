import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTOS,
  PLANTILLAS,
  buscarInstrumento,
  definirInstrumento,
  instrumentoPorId,
  instrumentosDeAgrupacion,
  quintasDeAfinacion,
  registrarInstrumento,
  type InstrumentoId
} from '../src/instruments';
import { formatearNota, midi, parseNota } from '../src/pitch';
import {
  intervaloEntreTonalidades,
  planificarTransposicion,
  transponer,
  transponerCifradoConOpciones
} from '../src/transpose';

describe('catálogo completo de orquesta y banda', () => {
  it('cada instrumento "en X" lee en Do mayor una obra en X mayor de concierto', () => {
    for (const instrumento of INSTRUMENTOS) {
      const { armaduraDestino } = planificarTransposicion({
        desde: 'concierto',
        hasta: instrumento.id,
        armaduraOrigen: quintasDeAfinacion(instrumento.afinacion)
      });
      expect(armaduraDestino, instrumento.nombre).toBe(0);
    }

    const naturales = [
      'trompa-do-alto',
      'trompa-sib-alto',
      'trompa-la',
      'trompa-lab',
      'trompa-sol',
      'trompa-mi',
      'trompa-re',
      'trompa-do-basso',
      'trompa-sib-basso',
      'trompeta-mi',
      'trompeta-fa'
    ] as InstrumentoId[];

    for (const id of naturales) expect(instrumentoPorId(id).sinArmadura, id).toBe(true);
    for (const id of [
      'trompa-mib',
      'trompa-fa',
      'trompeta-re',
      'trompeta-mib',
      'trompeta-sol',
      'trompeta-la',
      'trompeta-sib',
      'trompeta-do',
      'trompeta-piccolo-sib'
    ] as InstrumentoId[])
      expect(instrumentoPorId(id).sinArmadura, id).toBeFalsy();
  });

  it('el Do4 escrito suena exactamente lo declarado', () => {
    for (const instrumento of INSTRUMENTOS) {
      const sonido = transponer(parseNota('Do4'), { desde: instrumento.id, hasta: 'concierto' });
      expect(midi(sonido.nota), instrumento.nombre).toBe(midi(instrumento.suena));
    }
  });

  it.each([
    ['trompa-re', 'Re mayor → Do mayor', 'Re4', 'Do5'],
    ['trompa-mib', 'Mib4', 'Mib4', 'Do5'],
    ['trompa-sol', 'Sol4', 'Sol4', 'Do5'],
    ['trompa-sib-basso', 'Sib2', 'Sib2', 'Do4'],
    ['trompa-do-basso', 'Do3', 'Do3', 'Do4'],
    ['trompeta-la', 'La3', 'La3', 'Do4'],
    ['trompeta-fa', 'Fa4', 'Fa4', 'Do4'],
    ['trompeta-piccolo-sib', 'Sib4', 'Sib4', 'Do4'],
    ['saxo-bajo', 'Sib1', 'Sib1', 'Do4'],
    ['saxo-sopranino', 'Mib4', 'Mib4', 'Do4'],
    ['clarinete-alto', 'Mib3', 'Mib3', 'Do4'],
    ['clarinete-contrabajo', 'Sib1', 'Sib1', 'Do4'],
    ['tuba-mib-sol', 'Mib1', 'Mib1', 'Do4'],
    ['tuba-sib-sol', 'Sib1', 'Sib1', 'Do4'],
    ['contrafagot', 'Do3', 'Do3', 'Do4'],
    ['xilofono', 'Do5', 'Do5', 'Do4'],
    ['celesta', 'Do5', 'Do5', 'Do4'],
    ['oboe-amor', 'La3', 'La3', 'Do4']
  ] as const)('%s: concierto %s → escrito %s', (id, _desc, concierto, escrita) => {
    const r = transponer(parseNota(concierto), { desde: 'concierto', hasta: id as InstrumentoId });
    expect(formatearNota(r.nota)).toBe(escrita);
  });

  it('cualquier pareja de instrumentos del catálogo es transponible y reversible', () => {
    for (const a of INSTRUMENTOS)
      for (const b of INSTRUMENTOS) {
        const ida = transponer(parseNota('Sol4'), { desde: a.id, hasta: b.id, armaduraOrigen: 0 });
        const vuelta = transponer(ida.nota, {
          desde: b.id,
          hasta: a.id,
          armaduraOrigen: ida.armadura
        });
        expect(midi(vuelta.nota)).toBe(midi(parseNota('Sol4')));
      }
  });

  it('las plantillas solo usan instrumentos del catálogo', () => {
    for (const plantilla of PLANTILLAS)
      for (const id of plantilla.instrumentos) expect(() => instrumentoPorId(id)).not.toThrow();

    expect(
      PLANTILLAS.find((plantilla) => plantilla.id === 'cuarteto-cuerda')?.instrumentos
    ).toEqual(['violin', 'violin', 'viola', 'violonchelo']);
  });

  it('la banda de música incluye toda la familia de saxofones y el requinto', () => {
    const banda = instrumentosDeAgrupacion('banda').map((i) => i.id);
    expect(banda).toEqual(
      expect.arrayContaining([
        'clarinete-mib',
        'saxo-alto',
        'saxo-tenor',
        'saxo-baritono',
        'fliscorno',
        'bombardino'
      ])
    );
  });

  it('encuentra instrumentos por nombre, abreviatura o alias (sin tildes)', () => {
    expect(buscarInstrumento('requinto').map((i) => i.id)).toContain('clarinete-mib');
    expect(buscarInstrumento('Cl. b.').map((i) => i.id)).toContain('clarinete-bajo');
    expect(buscarInstrumento('eufonio').map((i) => i.id)).toContain('bombardino');
    expect(buscarInstrumento('violin').map((i) => i.id)).toContain('violin');
  });
});

describe('instrumentos personalizados', () => {
  it('una trompa en Si basso de una partitura antigua', () => {
    const trompaSi = registrarInstrumento(
      definirInstrumento({
        id: 'trompa-si-basso',
        nombre: 'Trompa en Si basso',
        abreviatura: 'Tpa. Si b.',
        familia: 'metal',
        agrupaciones: ['historico'],
        suena: 'Si2',
        clave: 'sol-o-fa',
        rango: ['Do4', 'Sol5', 'Do3', 'Do6'],
        sinArmadura: true
      })
    );
    expect(trompaSi.transpose).toEqual({ diatonic: -1, chromatic: -1, octaveChange: -1 });
    // Obra en Si mayor de concierto → la trompa lee en Do mayor.
    const r = transponer(parseNota('Si3'), {
      desde: 'concierto',
      hasta: trompaSi,
      armaduraOrigen: 5
    });
    expect(formatearNota(r.nota)).toBe('Do5');
    expect(r.armadura).toBe(0);
    expect(instrumentoPorId('trompa-si-basso')).toBe(trompaSi);
  });

  it('no deja sustituir un instrumento del catálogo', () => {
    expect(() => registrarInstrumento(instrumentoPorId('saxo-tenor'))).toThrow();
  });
});

describe('cambio de tonalidad', () => {
  it.each([
    [0, -3, 'cercana', 'Do4', 'Mib4'],
    [0, 3, 'cercana', 'Do4', 'La3'],
    [0, 3, 'arriba', 'Do4', 'La4'],
    [-1, 4, 'cercana', 'Fa4', 'Mi4'],
    [-2, 0, 'cercana', 'Sol4', 'La4'],
    [0, 6, 'cercana', 'Do4', 'Fa#4'],
    [0, -6, 'cercana', 'Do4', 'Solb4'],
    [4, -3, 'cercana', 'Mi4', 'Mib4'],
    [4, -3, 'arriba', 'Mi4', 'Mib5'],
    [5, -7, 'cercana', 'Si3', 'Si3']
  ] as const)('armadura %i → %i (%s): %s → %s', (origen, destino, direccion, nota, esperada) => {
    const intervalo = intervaloEntreTonalidades(origen, destino, direccion);
    expect(intervalo.quintas).toBe(destino - origen);
    expect(Math.abs(intervalo.semitonos)).toBeLessThanOrEqual(12);
    const r = transponer(parseNota(nota), {
      desde: 'concierto',
      hasta: 'concierto',
      armaduraOrigen: origen,
      cambioTonalidad: { armadura: destino, direccion },
      preferir: destino === 6 ? 'sostenidos' : undefined
    });
    expect(formatearNota(r.nota)).toBe(esperada);
  });

  it('obra en Fa mayor tocada en Sol mayor por un saxo tenor: escrito en La mayor', () => {
    const opciones = {
      desde: 'concierto' as const,
      hasta: 'saxo-tenor' as const,
      armaduraOrigen: -1,
      cambioTonalidad: { armadura: 1, direccion: 'arriba' as const }
    };
    const r = transponer(parseNota('Fa4'), opciones);
    expect(formatearNota(r.nota)).toBe('La5');
    expect(r.armadura).toBe(3);
    expect(transponerCifradoConOpciones('C7', opciones)).toBe('E7');
  });

  it('partitura de trompeta en Sib pasada a requinto y subida un tono', () => {
    // Trompeta escribe en Re mayor (concierto Do mayor) → concierto Re mayor → requinto Si mayor
    const r = transponer(parseNota('Re5'), {
      desde: 'trompeta-sib',
      hasta: 'clarinete-mib',
      armaduraOrigen: 2,
      cambioTonalidad: { armadura: 2, direccion: 'arriba' }
    });
    expect(r.armadura).toBe(5);
    expect(formatearNota(r.nota)).toBe('Si4');
  });
});
