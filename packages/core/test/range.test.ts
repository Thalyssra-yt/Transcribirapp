import { describe, expect, it } from 'vitest';
import { instrumentoPorId } from '../src/instruments';
import { parseNota } from '../src/pitch';
import { comprobarRango, desplazarOctava, proponerOctava } from '../src/range';

describe('registro y octava', () => {
  const tenor = instrumentoPorId('saxo-tenor');

  it('clasifica notas cómodas, incómodas y fuera de registro', () => {
    expect(comprobarRango(parseNota('Do5'), tenor).estado).toBe('comodo');
    expect(comprobarRango(parseNota('F#6'), tenor).estado).toBe('fuera-comodo');
    expect(comprobarRango(parseNota('Sol#6'), tenor).estado).toBe('fuera-absoluto');
    expect(comprobarRango(parseNota('Do7'), tenor).estado).toBe('fuera-absoluto');
    expect(comprobarRango(parseNota('Sib3'), tenor).estado).toBe('fuera-comodo');
    expect(comprobarRango(parseNota('La3'), tenor).estado).toBe('fuera-absoluto');
  });

  it('propone la octava que deja menos notas fuera', () => {
    const notas = [parseNota('Re7'), parseNota('Mi7')];
    expect(proponerOctava(notas, tenor)).toBe(-1);
    expect(
      proponerOctava(
        notas.map((nota) => desplazarOctava(nota, -1)),
        tenor
      )
    ).toBe(0);
    expect(proponerOctava([parseNota('Mi7'), parseNota('Sib2')], tenor)).toBe(-1);
  });

  it('desplaza la octava sin cambiar paso ni alteración', () => {
    const nota = parseNota('Reb5');
    expect(desplazarOctava(nota, -1)).toEqual({ ...nota, octava: 4 });
  });
});
