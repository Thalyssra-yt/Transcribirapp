import { describe, expect, it } from 'vitest';
import { instrumentoPorId, type InstrumentoId } from '../src/instruments';
import { formatearNota, parseNota } from '../src/pitch';
import { comprobarRango, desplazarOctava, proponerOctava } from '../src/range';
import {
  intervaloEntreInstrumentos,
  transponer,
  transponerCifrado,
  transponerEvento,
  type OpcionesTransposicion,
  type ResultadoTransposicion
} from '../src/transpose';

type Destino = InstrumentoId | 'concierto';

interface Caso {
  numero: number;
  desde: Destino;
  hasta: Destino;
  tipo: 'nota' | 'cifrado' | 'evento';
  origen: string;
  esperada: string;
  armaduraOrigen?: number;
  armaduraEsperada?: number;
  extra?: (resultado: ResultadoTransposicion) => void;
}

const CASOS: Caso[] = [
  {
    numero: 1,
    desde: 'concierto',
    hasta: 'saxo-tenor',
    tipo: 'nota',
    origen: 'Sib3',
    esperada: 'Do5',
    armaduraOrigen: -2,
    armaduraEsperada: 0
  },
  {
    numero: 2,
    desde: 'concierto',
    hasta: 'saxo-alto',
    tipo: 'nota',
    origen: 'Fa4',
    esperada: 'Re5',
    armaduraOrigen: -3,
    armaduraEsperada: 0
  },
  {
    numero: 3,
    desde: 'concierto',
    hasta: 'clarinete-sib',
    tipo: 'nota',
    origen: 'Do4',
    esperada: 'Re4',
    armaduraOrigen: 0,
    armaduraEsperada: 2
  },
  {
    numero: 4,
    desde: 'concierto',
    hasta: 'trompa-fa',
    tipo: 'nota',
    origen: 'Do4',
    esperada: 'Sol4',
    armaduraOrigen: 0,
    armaduraEsperada: 1
  },
  {
    numero: 5,
    desde: 'concierto',
    hasta: 'clarinete-mib',
    tipo: 'nota',
    origen: 'Do5',
    esperada: 'La4',
    armaduraOrigen: 0,
    armaduraEsperada: 3
  },
  {
    numero: 6,
    desde: 'concierto',
    hasta: 'clarinete-la',
    tipo: 'nota',
    origen: 'Do4',
    esperada: 'Mib4',
    armaduraOrigen: 0,
    armaduraEsperada: -3
  },
  {
    numero: 7,
    desde: 'concierto',
    hasta: 'saxo-baritono',
    tipo: 'nota',
    origen: 'Mib3',
    esperada: 'Do5',
    armaduraOrigen: -3,
    armaduraEsperada: 0
  },
  {
    numero: 8,
    desde: 'concierto',
    hasta: 'saxo-tenor',
    tipo: 'nota',
    origen: 'Si3',
    esperada: 'Reb5',
    armaduraOrigen: 5,
    armaduraEsperada: -5
  },
  {
    numero: 9,
    desde: 'concierto',
    hasta: 'saxo-alto',
    tipo: 'nota',
    origen: 'Sol#4',
    esperada: 'Fa5',
    armaduraOrigen: 4,
    armaduraEsperada: -5
  },
  {
    numero: 10,
    desde: 'concierto',
    hasta: 'saxo-tenor',
    tipo: 'nota',
    origen: 'Fa#4',
    esperada: 'Sol#5',
    armaduraOrigen: 2,
    armaduraEsperada: 4
  },
  {
    numero: 11,
    desde: 'saxo-tenor',
    hasta: 'concierto',
    tipo: 'nota',
    origen: 'Re5',
    esperada: 'Do4',
    armaduraOrigen: 0,
    armaduraEsperada: -2
  },
  {
    numero: 12,
    desde: 'trompeta-sib',
    hasta: 'saxo-alto',
    tipo: 'nota',
    origen: 'Re5',
    esperada: 'La5',
    armaduraOrigen: 2,
    armaduraEsperada: 3
  },
  {
    numero: 13,
    desde: 'flauta',
    hasta: 'saxo-tenor',
    tipo: 'nota',
    origen: 'Do6',
    esperada: 'Re7',
    armaduraOrigen: 0,
    armaduraEsperada: 2,
    extra: (resultado) => {
      const instrumento = instrumentoPorId('saxo-tenor');
      expect(comprobarRango(resultado.nota, instrumento).estado).toBe('fuera-absoluto');

      const octava = proponerOctava([resultado.nota], instrumento);
      expect(octava).toBe(-1);
      expect(formatearNota(desplazarOctava(resultado.nota, octava))).toBe('Re6');
    }
  },
  {
    numero: 14,
    desde: 'violonchelo',
    hasta: 'saxo-tenor',
    tipo: 'nota',
    origen: 'Do3',
    esperada: 'Re4',
    armaduraOrigen: 0,
    armaduraEsperada: 2,
    extra: () => {
      expect(instrumentoPorId('saxo-tenor').clave).toBe('sol');
    }
  },
  {
    numero: 15,
    desde: 'concierto',
    hasta: 'piccolo',
    tipo: 'nota',
    origen: 'Do6',
    esperada: 'Do5',
    armaduraOrigen: 0,
    armaduraEsperada: 0
  },
  {
    numero: 16,
    desde: 'concierto',
    hasta: 'guitarra',
    tipo: 'nota',
    origen: 'Mi2',
    esperada: 'Mi3',
    armaduraOrigen: 0,
    armaduraEsperada: 0
  },
  {
    numero: 17,
    desde: 'concierto',
    hasta: 'saxo-tenor',
    tipo: 'nota',
    origen: 'Solb4',
    esperada: 'Lab5',
    armaduraOrigen: -6,
    armaduraEsperada: -4
  },
  {
    numero: 18,
    desde: 'concierto',
    hasta: 'trompeta-sib',
    tipo: 'nota',
    origen: 'Fa#4',
    esperada: 'Lab4',
    armaduraOrigen: 6,
    armaduraEsperada: -4
  },
  {
    numero: 19,
    desde: 'concierto',
    hasta: 'saxo-tenor',
    tipo: 'cifrado',
    origen: 'Bb7',
    esperada: 'C7'
  },
  {
    numero: 20,
    desde: 'concierto',
    hasta: 'saxo-alto',
    tipo: 'cifrado',
    origen: 'F#m7',
    esperada: 'D#m7'
  },
  {
    numero: 21,
    desde: 'concierto',
    hasta: 'saxo-tenor',
    tipo: 'evento',
    origen: 'silencio',
    esperada: 'silencio'
  },
  {
    numero: 22,
    desde: 'concierto',
    hasta: 'concierto',
    tipo: 'nota',
    origen: 'Si#3',
    esperada: 'Do4',
    armaduraOrigen: 7,
    armaduraEsperada: -5
  }
];

describe('casos obligatorios 1–22 de TRANSPOSICION.md §8', () => {
  it.each(CASOS)('caso $numero: $origen → $esperada ($desde → $hasta)', (caso) => {
    const opciones: OpcionesTransposicion = {
      desde: caso.desde,
      hasta: caso.hasta,
      armaduraOrigen: caso.armaduraOrigen ?? 0
    };

    if (caso.tipo === 'cifrado') {
      const intervalo = intervaloEntreInstrumentos(caso.desde, caso.hasta);
      expect(transponerCifrado(caso.origen, intervalo)).toBe(caso.esperada);
      return;
    }

    if (caso.tipo === 'evento') {
      expect(transponerEvento({ tipo: 'silencio' }, opciones)).toEqual({ tipo: 'silencio' });
      expect(transponerEvento({ tipo: 'percusion' }, opciones)).toEqual({ tipo: 'percusion' });
      return;
    }

    const resultado = transponer(parseNota(caso.origen), opciones);

    expect(formatearNota(resultado.nota)).toBe(caso.esperada);
    expect(resultado.armadura).toBe(caso.armaduraEsperada);
    caso.extra?.(resultado);
  });
});
