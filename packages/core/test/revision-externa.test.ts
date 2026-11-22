import { describe, expect, it } from 'vitest';
import { INSTRUMENTOS, instrumentoPorId } from '../src/instruments';
import { formatearNota, midi, nota, parseNota, type Paso } from '../src/pitch';
import { comprobarRango, proponerOctava } from '../src/range';
import {
  intervaloEntreInstrumentos,
  transponer,
  transponerCifrado,
  transponerCifradoConOpciones,
  type DestinoTransposicion
} from '../src/transpose';

describe('registro: notas imposibles', () => {
  it.each([
    ['saxo-tenor', 'La3'],
    ['saxo-alto', 'Lab3'],
    ['saxo-baritono', 'Sol#3'],
    ['clarinete-sib', 'Re3'],
    ['trompeta-sib', 'Fa3'],
    ['flauta', 'Si3']
  ] as const)('%s no puede tocar %s escrito', (id, texto) => {
    expect(comprobarRango(parseNota(texto), instrumentoPorId(id)).estado).toBe('fuera-absoluto');
  });

  it('no baja una octava entera una melodía solo para que una nota sea cómoda', () => {
    // Re4–Mi6 cabe en el saxo tenor; el Mi6 es incómodo pero posible: no se propone mover.
    const melodia = ['Re4', 'Sol4', 'Do5', 'Sol5', 'Mi6'].map(parseNota);
    expect(proponerOctava(melodia, instrumentoPorId('saxo-tenor'))).toBe(0);
  });
});

describe('cifrado americano: casos reales', () => {
  const tenor = intervaloEntreInstrumentos('concierto', 'saxo-tenor');

  it.each([
    ['C6/9', 'D6/9'],
    ['N.C.', 'N.C.'],
    ['Bb7(b9)', 'C7(b9)'],
    ['F#m7b5/E', 'G#m7b5/F#'],
    ['B♭maj7', 'Cmaj7'],
    ['Ebm/Gb', 'Fm/Ab']
  ])('%s → saxo tenor %s', (origen, esperado) => {
    expect(transponerCifrado(origen, tenor)).toBe(esperado);
  });

  it('respeta la armadura reescrita en el bajo', () => {
    expect(
      transponerCifradoConOpciones('Bb7(b9)/Ab', {
        desde: 'concierto',
        hasta: 'saxo-tenor',
        armaduraOrigen: -2
      })
    ).toBe('C7(b9)/Bb');
  });
});

describe('enarmonía de una escala completa', () => {
  it('Si mayor de concierto → saxo tenor queda en Reb mayor sin alteraciones extrañas', () => {
    const escala = ['Si3', 'Do#4', 'Re#4', 'Mi4', 'Fa#4', 'Sol#4', 'La#4'].map(parseNota);
    const resultado = escala.map((x) =>
      formatearNota(
        transponer(x, { desde: 'concierto', hasta: 'saxo-tenor', armaduraOrigen: 5 }).nota
      )
    );
    expect(resultado).toEqual(['Reb5', 'Mib5', 'Fa5', 'Solb5', 'Lab5', 'Sib5', 'Do6']);
  });
});

describe('barrido exhaustivo', () => {
  it('cualquier instrumento → cualquier instrumento, en cualquier armadura', () => {
    const pasos: Paso[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const ids: DestinoTransposicion[] = ['concierto', ...INSTRUMENTOS.map((x) => x.id)];

    for (const desde of ids)
      for (const hasta of ids) {
        const semitonos = intervaloEntreInstrumentos(desde, hasta).semitonos;
        for (let armadura = -7; armadura <= 7; armadura += 1)
          for (const paso of pasos)
            for (const alter of [-1, 0, 1]) {
              const original = nota(paso, alter, 4);
              const ida = transponer(original, { desde, hasta, armaduraOrigen: armadura });
              const vuelta = transponer(ida.nota, {
                desde: hasta,
                hasta: desde,
                armaduraOrigen: ida.armadura
              });
              if (
                midi(ida.nota) !== midi(original) + semitonos ||
                Math.abs(ida.nota.alter) > 2 ||
                Math.abs(ida.armadura) > 6 ||
                midi(vuelta.nota) !== midi(original)
              ) {
                throw new Error(
                  `Fallo: ${formatearNota(original)} k=${armadura} ${desde}→${hasta} = ${formatearNota(ida.nota)}`
                );
              }
            }
      }
  }, 60_000);
});
