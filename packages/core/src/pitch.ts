export type Paso = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type IdiomaNota = 'es' | 'en';

export interface Nota {
  paso: Paso;
  alter: number;
  octava: number;
}

const PASOS: Paso[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const CIRCULO_DE_QUINTAS = 'FCGDAEB';

const CLASES: Record<Paso, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

const QUINTAS_DE_PASO: Record<Paso, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: -1,
  G: 1,
  A: 3,
  B: 5
};

const RAICES: Record<string, Paso> = {
  Do: 'C',
  Re: 'D',
  Mi: 'E',
  Fa: 'F',
  Sol: 'G',
  La: 'A',
  Si: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  F: 'F',
  G: 'G',
  A: 'A',
  B: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
  g: 'G',
  a: 'A',
  b: 'B'
};

const NOMBRES_ESPANOL: Record<Paso, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si'
};

export function mod(valor: number, modulo: number): number {
  return ((valor % modulo) + modulo) % modulo;
}

export function nota(paso: Paso, alter: number, octava: number): Nota {
  return { paso, alter, octava };
}

export function indicePaso(paso: Paso): number {
  return PASOS.indexOf(paso);
}

export function pasoPorIndice(indice: number): Paso {
  return PASOS[mod(indice, 7)];
}

export function quintasDePaso(paso: Paso): number {
  return QUINTAS_DE_PASO[paso];
}

export function claseDePaso(paso: Paso): number {
  return CLASES[paso];
}

export function quintas(nota: Nota): number {
  return QUINTAS_DE_PASO[nota.paso] + 7 * nota.alter;
}

export function diatonico(nota: Nota): number {
  return nota.octava * 7 + indicePaso(nota.paso);
}

export function midi(nota: Nota): number {
  return 12 * (nota.octava + 1) + CLASES[nota.paso] + nota.alter;
}

export function deQuintas(valor: number): Pick<Nota, 'paso' | 'alter'> {
  const k = valor + 1;

  return {
    paso: CIRCULO_DE_QUINTAS[mod(k, 7)] as Paso,
    alter: Math.floor(k / 7)
  };
}

export function deDiatonico(valor: number): Nota {
  return {
    paso: pasoPorIndice(valor),
    alter: 0,
    octava: Math.floor(valor / 7)
  };
}

export function parseNota(texto: string): Nota {
  const coincidencia = /^(Do|Re|Mi|Fa|Sol|La|Si|[A-Ga-g])(#{1,2}|b{1,2})?(-?\d+)$/.exec(
    texto.trim()
  );

  if (!coincidencia) {
    throw new Error(`No se puede interpretar la nota "${texto}"`);
  }

  const raiz = RAICES[coincidencia[1]];
  if (!raiz) {
    throw new Error(`No se puede interpretar la nota "${texto}"`);
  }

  const alter = !coincidencia[2]
    ? 0
    : coincidencia[2].startsWith('#')
      ? coincidencia[2].length
      : -coincidencia[2].length;

  return nota(raiz, alter, Number(coincidencia[3]));
}

export function formatearNota(nota: Nota, idioma: IdiomaNota = 'es'): string {
  const nombre = idioma === 'es' ? NOMBRES_ESPANOL[nota.paso] : nota.paso;
  const sufijo =
    nota.alter > 0 ? '#'.repeat(nota.alter) : nota.alter < 0 ? 'b'.repeat(-nota.alter) : '';

  return `${nombre}${sufijo}${nota.octava}`;
}
