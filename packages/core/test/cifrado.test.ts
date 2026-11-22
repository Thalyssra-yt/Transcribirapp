import { describe, expect, it } from 'vitest';
import {
  intervaloEntreInstrumentos,
  transponerCifrado,
  transponerCifradoConOpciones
} from '../src/transpose';

describe('transposición de cifrado americano', () => {
  it('aplica la armadura de destino a la raíz', () => {
    const intervalo = intervaloEntreInstrumentos('concierto', 'trompeta-sib');

    expect(transponerCifrado('F#7', intervalo, 8)).toBe('Ab7');
  });

  it('corrige alteraciones imposibles en la raíz', () => {
    const intervalo = intervaloEntreInstrumentos('clarinete-la', 'saxo-alto');

    expect(transponerCifrado('C##7', intervalo)).toBe('G#7');
  });

  it('transpone cada raíz de un acorde con bajo', () => {
    const intervalo = intervaloEntreInstrumentos('concierto', 'clarinete-sib');

    expect(transponerCifrado('C/E/G', intervalo)).toBe('D/F#/A');
  });

  it('calcula la armadura desde las opciones de instrumento', () => {
    expect(
      transponerCifradoConOpciones('F#7', {
        desde: 'concierto',
        hasta: 'trompeta-sib',
        armaduraOrigen: 6
      })
    ).toBe('Ab7');
  });
});
