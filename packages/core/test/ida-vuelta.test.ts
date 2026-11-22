import { describe, expect, it } from 'vitest';
import { formatearNota, midi, parseNota } from '../src/pitch';
import { transponer } from '../src/transpose';
import type { DestinoTransposicion } from '../src/transpose';

interface CasoIdaVuelta {
  nota: string;
  armadura: number;
  desde: DestinoTransposicion;
  hasta: DestinoTransposicion;
  ida: string;
  vuelta: string;
}

const CASOS: CasoIdaVuelta[] = [
  {
    nota: 'Si3',
    armadura: 5,
    desde: 'concierto',
    hasta: 'saxo-tenor',
    ida: 'Reb5',
    vuelta: 'Si3'
  },
  {
    nota: 'Sol#4',
    armadura: 4,
    desde: 'concierto',
    hasta: 'saxo-alto',
    ida: 'Fa5',
    vuelta: 'Sol#4'
  },
  {
    nota: 'Fa#4',
    armadura: 6,
    desde: 'concierto',
    hasta: 'trompeta-sib',
    ida: 'Lab4',
    vuelta: 'Solb4'
  }
];

describe('ida y vuelta tras reescritura enarmónica', () => {
  it.each(CASOS)('$nota → $hasta → $desde conserva la altura', (caso) => {
    const original = parseNota(caso.nota);
    const ida = transponer(original, {
      desde: caso.desde,
      hasta: caso.hasta,
      armaduraOrigen: caso.armadura
    });
    const vuelta = transponer(ida.nota, {
      desde: caso.hasta,
      hasta: caso.desde,
      armaduraOrigen: ida.armadura
    });

    expect(formatearNota(ida.nota)).toBe(caso.ida);
    expect(formatearNota(vuelta.nota)).toBe(caso.vuelta);
    expect(midi(vuelta.nota)).toBe(midi(original));
  });
});
