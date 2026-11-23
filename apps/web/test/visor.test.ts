import { describe, expect, it } from 'vitest';
import { notaLegible } from '../src/components/VisorPartitura';

describe('notaLegible', () => {
  const nota = {
    sourceNote: {
      isRest: () => false,
      Pitch: {
        FundamentalNote: 0,
        AccidentalHalfTones: 0,
        Octave: 1
      }
    }
  };

  it('convierte la octava interna de OSMD a la octava MusicXML', () => {
    expect(notaLegible(nota, 3)).toBe('Do4');
  });

  it('respeta el desplazamiento cero para octavas ya legibles', () => {
    expect(notaLegible(nota, 0)).toBe('Do1');
  });
});
