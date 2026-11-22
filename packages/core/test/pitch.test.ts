import { describe, expect, it } from 'vitest';
import { deQuintas, diatonico, formatearNota, midi, parseNota, quintas } from '../src/pitch';

describe('pitch', () => {
  it('calcula la posición en la línea de quintas', () => {
    expect(quintas(parseNota('Sib3'))).toBe(-2);
    expect(quintas(parseNota('Fa#4'))).toBe(6);
    expect(quintas(parseNota('Sol#4'))).toBe(8);
    expect(quintas(parseNota('Mib3'))).toBe(-3);
  });

  it('recupera letra y alteración desde quintas', () => {
    expect(deQuintas(-2)).toEqual({ paso: 'B', alter: -1 });
    expect(deQuintas(6)).toEqual({ paso: 'F', alter: 1 });
    expect(deQuintas(-3)).toEqual({ paso: 'E', alter: -1 });
    expect(deQuintas(12)).toEqual({ paso: 'B', alter: 1 });
  });

  it('calcula diatónico y midi con Do4 como referencia', () => {
    expect(diatonico(parseNota('Do4'))).toBe(28);
    expect(midi(parseNota('Do4'))).toBe(60);
    expect(midi(parseNota('Si#3'))).toBe(60);
    expect(midi(parseNota('Reb5'))).toBe(73);
  });

  it('formatea y parsea nombres en español e inglés', () => {
    expect(formatearNota(parseNota('Sib3'))).toBe('Sib3');
    expect(formatearNota(parseNota('Bb3'), 'en')).toBe('Bb3');
    expect(formatearNota(parseNota('Fa#4'))).toBe('Fa#4');
    expect(formatearNota(parseNota('Reb5'))).toBe('Reb5');
    expect(parseNota('Lab5')).toEqual(parseNota('Ab5'));
  });
});
