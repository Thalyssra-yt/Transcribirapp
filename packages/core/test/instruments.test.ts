import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTO_POR_DEFECTO,
  INSTRUMENTOS,
  instrumentoPorId,
  type InstrumentoId
} from '../src/instruments';
import { formatearNota, midi } from '../src/pitch';
import { intervaloSonido } from '../src/transpose';

const IDS_ESPERADOS: InstrumentoId[] = [
  'flauta',
  'piccolo',
  'flauta-alto',
  'oboe',
  'corno-ingles',
  'fagot',
  'clarinete-sib',
  'clarinete-la',
  'clarinete-mib',
  'clarinete-bajo',
  'saxo-soprano',
  'saxo-alto',
  'saxo-tenor',
  'saxo-baritono',
  'trompeta-sib',
  'trompeta-do',
  'trompeta-mib',
  'trompeta-re',
  'fliscorno',
  'trompa-fa',
  'trombon',
  'trombon-sib-sol',
  'bombardino',
  'bombardino-sib-sol',
  'tuba',
  'violin',
  'viola',
  'violonchelo',
  'contrabajo',
  'guitarra',
  'bajo-electrico',
  'piano',
  'voz-soprano',
  'voz-tenor',
  'glockenspiel'
];

const TRANSPOSE_ESPERADO: Partial<Record<InstrumentoId, readonly [number, number, number]>> = {
  flauta: [0, 0, 0],
  piccolo: [0, 0, 1],
  'flauta-alto': [-3, -5, 0],
  oboe: [0, 0, 0],
  'corno-ingles': [-4, -7, 0],
  fagot: [0, 0, 0],
  'clarinete-sib': [-1, -2, 0],
  'clarinete-la': [-2, -3, 0],
  'clarinete-mib': [2, 3, 0],
  'clarinete-bajo': [-1, -2, -1],
  'saxo-soprano': [-1, -2, 0],
  'saxo-alto': [-5, -9, 0],
  'saxo-tenor': [-1, -2, -1],
  'saxo-baritono': [-5, -9, -1],
  'trompeta-sib': [-1, -2, 0],
  'trompeta-do': [0, 0, 0],
  'trompeta-mib': [2, 3, 0],
  'trompeta-re': [1, 2, 0],
  fliscorno: [-1, -2, 0],
  'trompa-fa': [-4, -7, 0],
  trombon: [0, 0, 0],
  'trombon-sib-sol': [-1, -2, -1],
  bombardino: [0, 0, 0],
  'bombardino-sib-sol': [-1, -2, -1],
  tuba: [0, 0, 0],
  violin: [0, 0, 0],
  viola: [0, 0, 0],
  violonchelo: [0, 0, 0],
  contrabajo: [0, 0, -1],
  guitarra: [0, 0, -1],
  'bajo-electrico': [0, 0, -1],
  piano: [0, 0, 0],
  'voz-soprano': [0, 0, 0],
  'voz-tenor': [0, 0, -1],
  glockenspiel: [0, 0, 2]
};

describe('catálogo de instrumentos', () => {
  it('contiene todos los instrumentos de TRANSPOSICION.md §2 sin duplicados', () => {
    const ids: string[] = INSTRUMENTOS.map((instrumento) => instrumento.id);

    expect(ids).toEqual(expect.arrayContaining(IDS_ESPERADOS));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa el saxo tenor en Sib como instrumento por defecto', () => {
    expect(INSTRUMENTO_POR_DEFECTO).toBe('saxo-tenor');
  });

  it('los triples transpose coinciden con TRANSPOSICION.md §2', () => {
    for (const id of Object.keys(TRANSPOSE_ESPERADO) as InstrumentoId[]) {
      const { diatonic, chromatic, octaveChange } = instrumentoPorId(id).transpose;

      expect([diatonic, chromatic, octaveChange]).toEqual(TRANSPOSE_ESPERADO[id]);
    }
  });

  it('la trompa en Fa usa clave de Sol con Fa en grave', () => {
    expect(instrumentoPorId('trompa-fa').clave).toBe('sol+fa');
  });

  it('el piano no supera los límites reales del teclado', () => {
    const piano = instrumentoPorId('piano');

    expect(formatearNota(piano.rangoAbsoluto.inferior)).toBe('La0');
    expect(formatearNota(piano.rangoAbsoluto.superior)).toBe('Do8');
  });

  it('la voz tenor guarda el registro sonoro escribiendo una octava arriba', () => {
    const tenor = instrumentoPorId('voz-tenor');

    expect(formatearNota(tenor.rangoComodo.inferior)).toBe('Do4');
    expect(formatearNota(tenor.rangoComodo.superior)).toBe('La5');
    expect(formatearNota(tenor.rangoAbsoluto.inferior)).toBe('La3');
    expect(formatearNota(tenor.rangoAbsoluto.superior)).toBe('Do6');
  });

  it('la desviación de quintas es el inverso del transpose', () => {
    for (const instrumento of INSTRUMENTOS) {
      expect(instrumento.deltaQuintas + intervaloSonido(instrumento).quintas).toBe(0);
    }
  });

  it('el rango cómodo está contenido en el rango absoluto', () => {
    for (const instrumento of INSTRUMENTOS) {
      expect(midi(instrumento.rangoAbsoluto.inferior)).toBeLessThanOrEqual(
        midi(instrumento.rangoComodo.inferior)
      );
      expect(midi(instrumento.rangoAbsoluto.superior)).toBeGreaterThanOrEqual(
        midi(instrumento.rangoComodo.superior)
      );
    }
  });
});
