import { type Instrumento } from './instruments.js';
import { midi, type Nota } from './pitch.js';

export type EstadoRango = 'comodo' | 'fuera-comodo' | 'fuera-absoluto';

export interface InformeRango {
  nota: Nota;
  estado: EstadoRango;
}

export function desplazarOctava(nota: Nota, octavas: number): Nota {
  return { ...nota, octava: nota.octava + octavas };
}

export function comprobarRango(nota: Nota, instrumento: Instrumento): InformeRango {
  const altura = midi(nota);
  const { rangoComodo, rangoAbsoluto } = instrumento;

  if (altura >= midi(rangoComodo.inferior) && altura <= midi(rangoComodo.superior)) {
    return { nota, estado: 'comodo' };
  }

  if (altura >= midi(rangoAbsoluto.inferior) && altura <= midi(rangoAbsoluto.superior)) {
    return { nota, estado: 'fuera-comodo' };
  }

  return { nota, estado: 'fuera-absoluto' };
}

function esMenor(a: number[], b: number[]): boolean {
  for (let indice = 0; indice < a.length; indice += 1) {
    if (a[indice] < b[indice]) {
      return true;
    }

    if (a[indice] > b[indice]) {
      return false;
    }
  }

  return false;
}

export function proponerOctava(notas: Nota[], instrumento: Instrumento): number {
  if (notas.length === 0) {
    return 0;
  }

  let mejorDesplazamiento = 0;
  let mejorPuntuacion: number[] | null = null;

  for (let desplazamiento = -2; desplazamiento <= 2; desplazamiento += 1) {
    const informes = notas.map((nota) =>
      comprobarRango(desplazarOctava(nota, desplazamiento), instrumento)
    );
    const fueraAbsoluto = informes.filter((informe) => informe.estado === 'fuera-absoluto').length;
    const fueraComodo = informes.filter((informe) => informe.estado !== 'comodo').length;
    // Prioridad: 1) menos notas imposibles, 2) moverse lo menos posible del original,
    // 3) menos notas incómodas, 4) en empate, preferir bajar. Ver TRANSPOSICION.md §7.
    const puntuacion = [fueraAbsoluto, Math.abs(desplazamiento), fueraComodo, desplazamiento];

    if (mejorPuntuacion === null || esMenor(puntuacion, mejorPuntuacion)) {
      mejorPuntuacion = puntuacion;
      mejorDesplazamiento = desplazamiento;
    }
  }

  return mejorDesplazamiento;
}
