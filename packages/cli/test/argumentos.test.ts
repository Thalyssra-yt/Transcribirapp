import { describe, expect, it } from 'vitest';
import {
  esBooleana,
  parseArgumentos,
  textoOpcion,
  textoSOpciones,
  type DefinicionOpcion
} from '../src/argumentos';

const DEFINICIONES: readonly DefinicionOpcion[] = [
  { nombre: 'de' },
  { nombre: 'a' },
  { nombre: 'salida', alias: 'o' },
  { nombre: 'parte', multiple: true },
  { nombre: 'octava' },
  { nombre: 'json', booleana: true }
];

describe('parseArgumentos', () => {
  it('lee opciones largas, alias, valores negativos y repetidos', () => {
    const args = parseArgumentos(
      [
        'entrada.musicxml',
        '--de=concierto',
        '--a',
        'clarinete-sib',
        '-o',
        'salida.mxl',
        '--parte',
        '1',
        '--parte',
        'P2',
        '--octava',
        '-2',
        '--json'
      ],
      DEFINICIONES
    );

    expect(args.posicionales).toEqual(['entrada.musicxml']);
    expect(textoOpcion(args, 'de')).toBe('concierto');
    expect(textoOpcion(args, 'a')).toBe('clarinete-sib');
    expect(textoOpcion(args, 'salida')).toBe('salida.mxl');
    expect(textoSOpciones(args, 'parte')).toEqual(['1', 'P2']);
    expect(textoOpcion(args, 'octava')).toBe('-2');
    expect(esBooleana(args, 'json')).toBe(true);
  });

  it('rechaza opciones desconocidas', () => {
    expect(() => parseArgumentos(['archivo', '--inventada'], DEFINICIONES)).toThrow(
      /Opción desconocida: --inventada/
    );
  });

  it('rechaza una opción sin valor', () => {
    expect(() => parseArgumentos(['archivo', '--de'], DEFINICIONES)).toThrow(
      /La opción --de necesita un valor/
    );
  });

  it('rechaza un valor explícito en una opción booleana', () => {
    expect(() => parseArgumentos(['archivo', '--json=sí'], DEFINICIONES)).toThrow(
      /--json no admite valor/
    );
  });
});
