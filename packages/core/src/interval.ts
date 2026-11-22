import {
  claseDePaso,
  deQuintas,
  diatonico,
  indicePaso,
  midi,
  mod,
  quintas,
  type Nota
} from './pitch';

export interface Intervalo {
  pasos: number;
  semitonos: number;
  quintas: number;
}

export function intervalo(pasos: number, semitonos: number, quintas: number): Intervalo {
  return { pasos, semitonos, quintas };
}

export function intervaloEntreNotas(origen: Nota, destino: Nota): Intervalo {
  return {
    pasos: diatonico(destino) - diatonico(origen),
    semitonos: midi(destino) - midi(origen),
    quintas: quintas(destino) - quintas(origen)
  };
}

export function intervaloDesde(pasos: number, semitonos: number): Intervalo {
  const octava = Math.floor(pasos / 7);
  const indice = mod(pasos, 7);

  for (let candidato = -48; candidato <= 48; candidato += 1) {
    const { paso, alter } = deQuintas(candidato);

    if (indicePaso(paso) !== indice) {
      continue;
    }

    if (12 * octava + claseDePaso(paso) + alter === semitonos) {
      return { pasos, semitonos, quintas: candidato };
    }
  }

  throw new Error(`No existe un intervalo con ${pasos} pasos y ${semitonos} semitonos`);
}

export function intervaloDesdeTranspose(
  diatonic: number,
  chromatic: number,
  octaveChange: number
): Intervalo {
  return intervaloDesde(diatonic + 7 * octaveChange, chromatic + 12 * octaveChange);
}

export function invertirIntervalo(intervalo: Intervalo): Intervalo {
  return {
    pasos: -intervalo.pasos,
    semitonos: -intervalo.semitonos,
    quintas: -intervalo.quintas
  };
}

export function sumarIntervalos(a: Intervalo, b: Intervalo): Intervalo {
  return {
    pasos: a.pasos + b.pasos,
    semitonos: a.semitonos + b.semitonos,
    quintas: a.quintas + b.quintas
  };
}

export const UNISONO: Intervalo = { pasos: 0, semitonos: 0, quintas: 0 };

export const SEGUNDA_DISMINUIDA_ASCENDENTE: Intervalo = {
  pasos: 1,
  semitonos: 0,
  quintas: -12
};

export const SEGUNDA_DISMINUIDA_DESCENDENTE: Intervalo = invertirIntervalo(
  SEGUNDA_DISMINUIDA_ASCENDENTE
);
