import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { INSTRUMENTOS, instrumentoPorId, type InstrumentoId } from '../src/instruments';
import { invertirIntervalo, intervaloEntreNotas } from '../src/interval';
import { midi, type Nota, type Paso } from '../src/pitch';
import {
  armaduraConciertoDesdeEscrita,
  armaduraEscritaDesdeConcierto,
  intervaloEscritura,
  transponer,
  transponerNota
} from '../src/transpose';

const notaArbitraria: fc.Arbitrary<Nota> = fc.record({
  paso: fc.constantFrom<Paso>('C', 'D', 'E', 'F', 'G', 'A', 'B'),
  alter: fc.integer({ min: -1, max: 1 }),
  octava: fc.integer({ min: 2, max: 6 })
});

const instrumentoArbitrario = fc.constantFrom<InstrumentoId>(
  ...INSTRUMENTOS.map((instrumento) => instrumento.id)
);

describe('propiedades del motor musical', () => {
  it('ida y vuelta concierto → instrumento → concierto es la identidad', () => {
    fc.assert(
      fc.property(notaArbitraria, instrumentoArbitrario, (notaBase, id) => {
        const intervalo = intervaloEscritura(instrumentoPorId(id));
        const escrita = transponerNota(notaBase, intervalo);
        const vuelta = transponerNota(escrita, invertirIntervalo(intervalo));

        expect(vuelta).toEqual(notaBase);
      }),
      { numRuns: 200 }
    );
  });

  it('ida y vuelta con armadura 0 es la identidad grafía a grafía', () => {
    fc.assert(
      fc.property(notaArbitraria, instrumentoArbitrario, (notaBase, id) => {
        const escrita = transponer(notaBase, {
          desde: 'concierto',
          hasta: id,
          armaduraOrigen: 0
        });
        const vuelta = transponer(escrita.nota, {
          desde: id,
          hasta: 'concierto',
          armaduraOrigen: escrita.armadura
        });

        expect(vuelta.nota).toEqual(notaBase);
        expect(vuelta.armadura).toBe(0);
      }),
      { numRuns: 200 }
    );
  });

  it('la diferencia de midi siempre coincide con los semitonos del intervalo', () => {
    fc.assert(
      fc.property(notaArbitraria, notaArbitraria, (origen, destino) => {
        const intervalo = intervaloEntreNotas(origen, destino);
        const resultado = transponerNota(origen, intervalo);

        expect(resultado).toEqual(destino);
        expect(midi(resultado) - midi(origen)).toBe(intervalo.semitonos);
      }),
      { numRuns: 200 }
    );
  });

  it('la armadura escrita y la de concierto son inversas entre -6 y +6', () => {
    fc.assert(
      fc.property(instrumentoArbitrario, fc.integer({ min: -6, max: 6 }), (id, fifths) => {
        const concierto = armaduraConciertoDesdeEscrita(id, fifths);
        const escrita = armaduraEscritaDesdeConcierto(id, concierto);

        expect(escrita).toBe(fifths);
      }),
      { numRuns: 200 }
    );
  });
});
