import { deDiatonico, diatonico, nota, type Nota, type Paso } from './pitch';

export type Clave = 'sol' | 'fa' | 'do3' | 'do4' | 'sol8' | 'sol+fa' | 'fa-do4-sol';

export interface Rango {
  inferior: Nota;
  superior: Nota;
}

export interface Instrumento {
  id: string;
  nombre: string;
  clave: Clave;
  transpose: {
    diatonic: number;
    chromatic: number;
    octaveChange: number;
  };
  deltaQuintas: number;
  rangoComodo: Rango;
  rangoAbsoluto: Rango;
}

function n(paso: Paso, alter: number, octava: number): Nota {
  return nota(paso, alter, octava);
}

function moverGrado(notaBase: Nota, grados: number): Nota {
  const destino = deDiatonico(diatonico(notaBase) + grados);

  return n(destino.paso, notaBase.alter, destino.octava);
}

function rango(
  inferior: Nota,
  superior: Nota,
  absolutoInferior?: Nota,
  absolutoSuperior?: Nota
): Pick<Instrumento, 'rangoComodo' | 'rangoAbsoluto'> {
  return {
    rangoComodo: { inferior, superior },
    rangoAbsoluto: {
      inferior: absolutoInferior ?? moverGrado(inferior, -1),
      superior: absolutoSuperior ?? moverGrado(superior, 1)
    }
  };
}

export const INSTRUMENTOS = [
  {
    id: 'flauta',
    nombre: 'Flauta',
    clave: 'sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('C', 0, 4), n('C', 0, 7))
  },
  {
    id: 'piccolo',
    nombre: 'Flautín',
    clave: 'sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 1 },
    deltaQuintas: 0,
    ...rango(n('D', 0, 4), n('C', 0, 7))
  },
  {
    id: 'flauta-alto',
    nombre: 'Flauta alto en Sol',
    clave: 'sol',
    transpose: { diatonic: -3, chromatic: -5, octaveChange: 0 },
    deltaQuintas: -1,
    ...rango(n('C', 0, 4), n('C', 0, 7))
  },
  {
    id: 'oboe',
    nombre: 'Oboe',
    clave: 'sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('B', -1, 3), n('A', 0, 6))
  },
  {
    id: 'corno-ingles',
    nombre: 'Corno inglés en Fa',
    clave: 'sol',
    transpose: { diatonic: -4, chromatic: -7, octaveChange: 0 },
    deltaQuintas: 1,
    ...rango(n('B', 0, 3), n('G', 0, 6))
  },
  {
    id: 'fagot',
    nombre: 'Fagot',
    clave: 'fa-do4-sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('B', -1, 1), n('E', 0, 5))
  },
  {
    id: 'clarinete-sib',
    nombre: 'Clarinete en Sib',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: 0 },
    deltaQuintas: 2,
    ...rango(n('E', 0, 3), n('G', 0, 6), n('E', 0, 3), n('C', 0, 7))
  },
  {
    id: 'clarinete-la',
    nombre: 'Clarinete en La',
    clave: 'sol',
    transpose: { diatonic: -2, chromatic: -3, octaveChange: 0 },
    deltaQuintas: -3,
    ...rango(n('E', 0, 3), n('C', 0, 7))
  },
  {
    id: 'clarinete-mib',
    nombre: 'Requinto (clarinete en Mib)',
    clave: 'sol',
    transpose: { diatonic: 2, chromatic: 3, octaveChange: 0 },
    deltaQuintas: 3,
    ...rango(n('E', 0, 3), n('G', 0, 6))
  },
  {
    id: 'clarinete-bajo',
    nombre: 'Clarinete bajo en Sib (notación francesa)',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: -1 },
    deltaQuintas: 2,
    ...rango(n('E', -1, 3), n('G', 0, 6))
  },
  {
    id: 'saxo-soprano',
    nombre: 'Saxo soprano en Sib',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: 0 },
    deltaQuintas: 2,
    ...rango(n('B', -1, 3), n('F', 1, 6))
  },
  {
    id: 'saxo-alto',
    nombre: 'Saxo alto en Mib',
    clave: 'sol',
    transpose: { diatonic: -5, chromatic: -9, octaveChange: 0 },
    deltaQuintas: 3,
    ...rango(n('B', -1, 3), n('F', 1, 6))
  },
  {
    id: 'saxo-tenor',
    nombre: 'Saxo tenor en Sib',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: -1 },
    deltaQuintas: 2,
    ...rango(n('B', -1, 3), n('F', 1, 6))
  },
  {
    id: 'saxo-baritono',
    nombre: 'Saxo barítono en Mib',
    clave: 'sol',
    transpose: { diatonic: -5, chromatic: -9, octaveChange: -1 },
    deltaQuintas: 3,
    ...rango(n('A', 0, 3), n('F', 1, 6))
  },
  {
    id: 'trompeta-sib',
    nombre: 'Trompeta en Sib',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: 0 },
    deltaQuintas: 2,
    ...rango(n('F', 1, 3), n('C', 0, 6))
  },
  {
    id: 'trompeta-do',
    nombre: 'Trompeta en Do',
    clave: 'sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('F', 1, 3), n('C', 0, 6))
  },
  {
    id: 'trompeta-mib',
    nombre: 'Trompeta en Mib',
    clave: 'sol',
    transpose: { diatonic: 2, chromatic: 3, octaveChange: 0 },
    deltaQuintas: 3,
    ...rango(n('F', 1, 3), n('G', 0, 5))
  },
  {
    id: 'trompeta-re',
    nombre: 'Trompeta en Re',
    clave: 'sol',
    transpose: { diatonic: 1, chromatic: 2, octaveChange: 0 },
    deltaQuintas: -2,
    ...rango(n('F', 1, 3), n('A', 0, 5))
  },
  {
    id: 'fliscorno',
    nombre: 'Fliscorno en Sib',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: 0 },
    deltaQuintas: 2,
    ...rango(n('F', 1, 3), n('C', 0, 6))
  },
  {
    id: 'trompa-fa',
    nombre: 'Trompa en Fa',
    clave: 'sol+fa',
    transpose: { diatonic: -4, chromatic: -7, octaveChange: 0 },
    deltaQuintas: 1,
    ...rango(n('F', 1, 2), n('C', 0, 6))
  },
  {
    id: 'trombon',
    nombre: 'Trombón',
    clave: 'fa-do4-sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('E', 0, 2), n('F', 0, 5))
  },
  {
    id: 'trombon-sib-sol',
    nombre: 'Trombón en clave de Sol (banda británica)',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: -1 },
    deltaQuintas: 2,
    ...rango(n('F', 1, 3), n('C', 0, 6))
  },
  {
    id: 'bombardino',
    nombre: 'Bombardino/Eufonio',
    clave: 'fa',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('B', -1, 1), n('B', -1, 4))
  },
  {
    id: 'bombardino-sib-sol',
    nombre: 'Bombardino en clave de Sol',
    clave: 'sol',
    transpose: { diatonic: -1, chromatic: -2, octaveChange: -1 },
    deltaQuintas: 2,
    ...rango(n('F', 1, 3), n('C', 0, 6))
  },
  {
    id: 'tuba',
    nombre: 'Tuba',
    clave: 'fa',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('D', 0, 1), n('F', 0, 4))
  },
  {
    id: 'violin',
    nombre: 'Violín',
    clave: 'sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('G', 0, 3), n('E', 0, 7))
  },
  {
    id: 'viola',
    nombre: 'Viola',
    clave: 'do3',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('C', 0, 3), n('E', 0, 6))
  },
  {
    id: 'violonchelo',
    nombre: 'Violonchelo',
    clave: 'fa-do4-sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('C', 0, 2), n('A', 0, 5))
  },
  {
    id: 'contrabajo',
    nombre: 'Contrabajo',
    clave: 'fa',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: -1 },
    deltaQuintas: 0,
    ...rango(n('E', 0, 2), n('G', 0, 4))
  },
  {
    id: 'guitarra',
    nombre: 'Guitarra',
    clave: 'sol8',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: -1 },
    deltaQuintas: 0,
    ...rango(n('E', 0, 3), n('B', 0, 5))
  },
  {
    id: 'bajo-electrico',
    nombre: 'Bajo eléctrico',
    clave: 'fa',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: -1 },
    deltaQuintas: 0,
    ...rango(n('E', 0, 2), n('G', 0, 4))
  },
  {
    id: 'piano',
    nombre: 'Piano',
    clave: 'sol+fa',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('A', 0, 0), n('C', 0, 8), n('A', 0, 0), n('C', 0, 8))
  },
  {
    id: 'voz-soprano',
    nombre: 'Voz soprano',
    clave: 'sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 0 },
    deltaQuintas: 0,
    ...rango(n('C', 0, 4), n('A', 0, 5))
  },
  {
    id: 'voz-tenor',
    nombre: 'Voz tenor',
    clave: 'sol8',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: -1 },
    deltaQuintas: 0,
    ...rango(n('C', 0, 4), n('A', 0, 5))
  },
  {
    id: 'glockenspiel',
    nombre: 'Glockenspiel / lira',
    clave: 'sol',
    transpose: { diatonic: 0, chromatic: 0, octaveChange: 2 },
    deltaQuintas: 0,
    ...rango(n('G', 0, 3), n('C', 0, 6))
  }
] as const satisfies readonly Instrumento[];

export type InstrumentoId = (typeof INSTRUMENTOS)[number]['id'];

export const INSTRUMENTO_POR_DEFECTO: InstrumentoId = 'saxo-tenor';

const POR_ID = new Map<string, Instrumento>(
  INSTRUMENTOS.map((instrumento) => [instrumento.id, instrumento])
);

export function instrumentoPorId(id: InstrumentoId | string): Instrumento {
  const instrumento = POR_ID.get(id);

  if (!instrumento) {
    throw new Error(`Instrumento desconocido: ${id}`);
  }

  return instrumento;
}
