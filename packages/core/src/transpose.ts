import {
  SEGUNDA_DISMINUIDA_ASCENDENTE,
  SEGUNDA_DISMINUIDA_DESCENDENTE,
  invertirIntervalo,
  intervaloDesdeTranspose,
  sumarIntervalos,
  UNISONO,
  type Intervalo
} from './interval';
import { instrumentoPorId, type Instrumento, type InstrumentoId } from './instruments';
import {
  deQuintas,
  diatonico,
  indicePaso,
  midi,
  mod,
  nota,
  quintasDePaso,
  type Nota,
  type Paso
} from './pitch';

export type DestinoTransposicion = InstrumentoId | 'concierto';
export type PreferenciaEnarmonia = 'sostenidos' | 'bemoles';

export interface OpcionesTransposicion {
  desde: DestinoTransposicion;
  hasta: DestinoTransposicion;
  armaduraOrigen?: number;
  preferir?: PreferenciaEnarmonia;
}

export interface ResultadoTransposicion {
  nota: Nota;
  armadura: number;
  avisos: string[];
}

export type EventoMusical =
  { tipo: 'nota'; nota: Nota } | { tipo: 'silencio' } | { tipo: 'percusion' };

export type ResultadoEvento =
  | { tipo: 'nota'; nota: Nota; armadura: number; avisos: string[] }
  | { tipo: 'silencio' }
  | { tipo: 'percusion' };

function aplicarIntervalo(notaBase: Nota, intervalo: Intervalo): Nota {
  const nuevaQuinta = quintasDePaso(notaBase.paso) + 7 * notaBase.alter + intervalo.quintas;
  const nuevoDiatonico = diatonico(notaBase) + intervalo.pasos;
  const { paso, alter } = deQuintas(nuevaQuinta);
  const resultado = nota(paso, alter, Math.floor(nuevoDiatonico / 7));

  if (indicePaso(paso) !== mod(nuevoDiatonico, 7)) {
    throw new Error(
      `Intervalo inconsistente: el paso ${paso} no coincide con el diatónico ${nuevoDiatonico}`
    );
  }

  if (midi(resultado) !== midi(notaBase) + intervalo.semitonos) {
    throw new Error(
      `Intervalo inconsistente: midi ${midi(resultado)} no coincide con ${midi(notaBase) + intervalo.semitonos}`
    );
  }

  return resultado;
}

export function transponerNota(notaBase: Nota, intervalo: Intervalo): Nota {
  return aplicarIntervalo(notaBase, intervalo);
}

export function intervaloSonido(instrumento: Instrumento): Intervalo {
  const { diatonic, chromatic, octaveChange } = instrumento.transpose;

  return intervaloDesdeTranspose(diatonic, chromatic, octaveChange);
}

export function intervaloEscritura(instrumento: Instrumento): Intervalo {
  return invertirIntervalo(intervaloSonido(instrumento));
}

export function intervaloEntreInstrumentos(
  desde: DestinoTransposicion,
  hasta: DestinoTransposicion
): Intervalo {
  const origen = desde === 'concierto' ? UNISONO : intervaloSonido(instrumentoPorId(desde));
  const destino = hasta === 'concierto' ? UNISONO : intervaloEscritura(instrumentoPorId(hasta));

  return sumarIntervalos(origen, destino);
}

export function armaduraConciertoDesdeEscrita(id: InstrumentoId, armaduraEscrita: number): number {
  return armaduraEscrita + intervaloSonido(instrumentoPorId(id)).quintas;
}

export function armaduraEscritaDesdeConcierto(
  id: InstrumentoId,
  armaduraConcierto: number
): number {
  return armaduraConcierto + intervaloEscritura(instrumentoPorId(id)).quintas;
}

interface NormalizacionArmadura {
  armadura: number;
  intervalo?: Intervalo;
  reescrita: boolean;
}

export function normalizarArmadura(
  armadura: number,
  preferir?: PreferenciaEnarmonia
): NormalizacionArmadura {
  if (armadura > 6 || (preferir === 'bemoles' && armadura === 6)) {
    return {
      armadura: armadura - 12,
      intervalo: SEGUNDA_DISMINUIDA_ASCENDENTE,
      reescrita: true
    };
  }

  if (armadura < -6 || (preferir === 'sostenidos' && armadura === -6)) {
    return {
      armadura: armadura + 12,
      intervalo: SEGUNDA_DISMINUIDA_DESCENDENTE,
      reescrita: true
    };
  }

  return { armadura, reescrita: false };
}

function corregirAlteraciones(notaBase: Nota): { nota: Nota; corregida: boolean } {
  let resultado = notaBase;
  let corregida = false;

  while (Math.abs(resultado.alter) > 2) {
    const intervalo =
      resultado.alter > 2 ? SEGUNDA_DISMINUIDA_ASCENDENTE : SEGUNDA_DISMINUIDA_DESCENDENTE;
    resultado = aplicarIntervalo(resultado, intervalo);
    corregida = true;
  }

  return { nota: resultado, corregida };
}

export function transponerNotaConArmadura(
  notaBase: Nota,
  intervalo: Intervalo,
  armaduraDestino: number,
  preferir?: PreferenciaEnarmonia
): ResultadoTransposicion {
  const avisos: string[] = [];
  let resultado = aplicarIntervalo(notaBase, intervalo);
  const normalizacion = normalizarArmadura(armaduraDestino, preferir);

  if (normalizacion.intervalo) {
    resultado = aplicarIntervalo(resultado, normalizacion.intervalo);
    avisos.push(`Armadura ${armaduraDestino} reescrita como ${normalizacion.armadura}`);
  }

  const correccion = corregirAlteraciones(resultado);
  if (correccion.corregida) {
    avisos.push('Se corrigió una alteración imposible con la 2.ª disminuida');
  }

  return { nota: correccion.nota, armadura: normalizacion.armadura, avisos };
}

function calcularArmaduraDestino(opciones: OpcionesTransposicion): number {
  const armaduraOrigen = opciones.armaduraOrigen ?? 0;
  const armaduraConcierto =
    opciones.desde === 'concierto'
      ? armaduraOrigen
      : armaduraConciertoDesdeEscrita(opciones.desde, armaduraOrigen);

  return opciones.hasta === 'concierto'
    ? armaduraConcierto
    : armaduraEscritaDesdeConcierto(opciones.hasta, armaduraConcierto);
}

export function transponer(
  notaBase: Nota,
  opciones: OpcionesTransposicion
): ResultadoTransposicion {
  return transponerNotaConArmadura(
    notaBase,
    intervaloEntreInstrumentos(opciones.desde, opciones.hasta),
    calcularArmaduraDestino(opciones),
    opciones.preferir
  );
}

function alterarDesdeTexto(texto: string): number {
  if (texto.startsWith('#')) {
    return texto.length;
  }

  if (texto.startsWith('b')) {
    return -texto.length;
  }

  return 0;
}

function formatearRaiz(paso: Paso, alter: number): string {
  const sufijo = alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : '';

  return `${paso}${sufijo}`;
}

function transponerRaiz(
  texto: string,
  intervalo: Intervalo,
  armaduraDestino?: number,
  preferir?: PreferenciaEnarmonia
): string {
  const coincidencia = /^([A-Ga-g])(#{1,2}|b{1,2})?$/.exec(texto.trim());

  if (!coincidencia) {
    throw new Error(`No se puede interpretar la raíz "${texto}"`);
  }

  const paso = coincidencia[1].toUpperCase() as Paso;
  const alter = alterarDesdeTexto(coincidencia[2] ?? '');
  let quinta = quintasDePaso(paso) + 7 * alter + intervalo.quintas;

  if (armaduraDestino !== undefined) {
    const normalizacion = normalizarArmadura(armaduraDestino, preferir);

    if (normalizacion.intervalo) {
      quinta += normalizacion.intervalo.quintas;
    }
  }

  let resultado = deQuintas(quinta);

  while (Math.abs(resultado.alter) > 2) {
    quinta += resultado.alter > 2 ? -12 : 12;
    resultado = deQuintas(quinta);
  }

  return formatearRaiz(resultado.paso, resultado.alter);
}

export function transponerCifrado(
  cifrado: string,
  intervalo: Intervalo,
  armaduraDestino?: number,
  preferir?: PreferenciaEnarmonia
): string {
  const [acorde, ...bajo] = cifrado.split('/');
  const coincidencia = /^([A-Ga-g])(#{1,2}|b{1,2})?(.*)$/.exec(acorde.trim());

  if (!coincidencia) {
    throw new Error(`No se puede interpretar el cifrado "${cifrado}"`);
  }

  const raiz = `${coincidencia[1]}${coincidencia[2] ?? ''}`;
  const calidad = coincidencia[3];
  const nuevaRaiz = transponerRaiz(raiz, intervalo, armaduraDestino, preferir);
  const nuevasBajos = bajo.map((parte) =>
    transponerRaiz(parte, intervalo, armaduraDestino, preferir)
  );

  return `${nuevaRaiz}${calidad}${nuevasBajos.length > 0 ? `/${nuevasBajos.join('/')}` : ''}`;
}

export function transponerCifradoConOpciones(
  cifrado: string,
  opciones: OpcionesTransposicion
): string {
  return transponerCifrado(
    cifrado,
    intervaloEntreInstrumentos(opciones.desde, opciones.hasta),
    calcularArmaduraDestino(opciones),
    opciones.preferir
  );
}

export function transponerEvento(
  evento: EventoMusical,
  opciones: OpcionesTransposicion
): ResultadoEvento {
  if (evento.tipo !== 'nota') {
    return evento;
  }

  const resultado = transponer(evento.nota, opciones);

  return { tipo: 'nota', ...resultado };
}
