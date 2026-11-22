import {
  SEGUNDA_DISMINUIDA_ASCENDENTE,
  SEGUNDA_DISMINUIDA_DESCENDENTE,
  intervaloEntreNotas,
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

/** Un instrumento del catálogo, uno personalizado (objeto) o el sonido real. */
export type DestinoTransposicion = InstrumentoId | 'concierto' | Instrumento;
export type DireccionCambio = 'arriba' | 'abajo' | 'cercana';

export interface CambioTonalidad {
  /** Armadura de concierto a la que se quiere llevar la obra (−7…+7). */
  armadura: number;
  /** Hacia dónde mover la música. Por defecto, la tonalidad más cercana. */
  direccion?: DireccionCambio;
}
export type PreferenciaEnarmonia = 'sostenidos' | 'bemoles';

export interface OpcionesTransposicion {
  desde: DestinoTransposicion;
  hasta: DestinoTransposicion;
  armaduraOrigen?: number;
  preferir?: PreferenciaEnarmonia;
  /** Cambiar además de tonalidad (p. ej. de Fa mayor a Sol mayor de concierto). */
  cambioTonalidad?: CambioTonalidad;
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

const CACHE_SONIDO = new WeakMap<Instrumento, Intervalo>();

export function intervaloSonido(instrumento: Instrumento): Intervalo {
  const enCache = CACHE_SONIDO.get(instrumento);
  if (enCache) {
    return enCache;
  }

  const { diatonic, chromatic, octaveChange } = instrumento.transpose;
  const intervalo = intervaloDesdeTranspose(diatonic, chromatic, octaveChange);
  CACHE_SONIDO.set(instrumento, intervalo);

  return intervalo;
}

export function intervaloEscritura(instrumento: Instrumento): Intervalo {
  return invertirIntervalo(intervaloSonido(instrumento));
}

function resolver(destino: Exclude<DestinoTransposicion, 'concierto'>): Instrumento {
  return typeof destino === 'string' ? instrumentoPorId(destino) : destino;
}

export function intervaloEntreInstrumentos(
  desde: DestinoTransposicion,
  hasta: DestinoTransposicion
): Intervalo {
  const origen = desde === 'concierto' ? UNISONO : intervaloSonido(resolver(desde));
  const destino = hasta === 'concierto' ? UNISONO : intervaloEscritura(resolver(hasta));

  return sumarIntervalos(origen, destino);
}

export function armaduraConciertoDesdeEscrita(
  instrumento: Exclude<DestinoTransposicion, 'concierto'>,
  armaduraEscrita: number
): number {
  return armaduraEscrita + intervaloSonido(resolver(instrumento)).quintas;
}

export function armaduraEscritaDesdeConcierto(
  instrumento: Exclude<DestinoTransposicion, 'concierto'>,
  armaduraConcierto: number
): number {
  return armaduraConcierto + intervaloEscritura(resolver(instrumento)).quintas;
}

/**
 * Intervalo para pasar de una tonalidad a otra (vale igual para mayor y menor,
 * porque la armadura relativa se mueve lo mismo). "cercana" elige el camino más corto;
 * en caso de tritono, sube.
 */
export function intervaloEntreTonalidades(
  armaduraOrigen: number,
  armaduraDestino: number,
  direccion: DireccionCambio = 'cercana'
): Intervalo {
  const tonicaOrigen = { ...deQuintas(armaduraOrigen), octava: 4 };
  const tonicaDestino = { ...deQuintas(armaduraDestino), octava: 4 };
  const subiendo = { ...tonicaDestino };
  const bajando = { ...tonicaDestino };

  const esMasGrave = (a: Nota, b: Nota) =>
    diatonico(a) < diatonico(b) || (diatonico(a) === diatonico(b) && midi(a) < midi(b));

  while (esMasGrave(subiendo, tonicaOrigen)) {
    subiendo.octava += 1;
  }
  while (esMasGrave(tonicaOrigen, bajando)) {
    bajando.octava -= 1;
  }

  const arriba = intervaloEntreNotas(tonicaOrigen, subiendo);
  const abajo = intervaloEntreNotas(tonicaOrigen, bajando);

  if (direccion === 'arriba') return arriba;
  if (direccion === 'abajo') return abajo;

  return Math.abs(abajo.semitonos) < Math.abs(arriba.semitonos) ? abajo : arriba;
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

interface Plan {
  intervalo: Intervalo;
  armaduraDestino: number;
}

/** Calcula el intervalo total y la armadura escrita de destino: origen → concierto (→ nueva tonalidad) → destino. */
export function planificarTransposicion(opciones: OpcionesTransposicion): Plan {
  const armaduraOrigen = opciones.armaduraOrigen ?? 0;
  const armaduraConcierto =
    opciones.desde === 'concierto'
      ? armaduraOrigen
      : armaduraConciertoDesdeEscrita(opciones.desde, armaduraOrigen);

  const cambio = opciones.cambioTonalidad
    ? intervaloEntreTonalidades(
        armaduraConcierto,
        opciones.cambioTonalidad.armadura,
        opciones.cambioTonalidad.direccion
      )
    : UNISONO;
  const armaduraConciertoFinal = armaduraConcierto + cambio.quintas;

  const desdeConcierto: DestinoTransposicion = 'concierto';
  const intervalo = sumarIntervalos(
    sumarIntervalos(intervaloEntreInstrumentos(opciones.desde, desdeConcierto), cambio),
    intervaloEntreInstrumentos(desdeConcierto, opciones.hasta)
  );

  return {
    intervalo,
    armaduraDestino:
      opciones.hasta === 'concierto'
        ? armaduraConciertoFinal
        : armaduraEscritaDesdeConcierto(opciones.hasta, armaduraConciertoFinal)
  };
}

export function transponer(
  notaBase: Nota,
  opciones: OpcionesTransposicion
): ResultadoTransposicion {
  const plan = planificarTransposicion(opciones);

  return transponerNotaConArmadura(
    notaBase,
    plan.intervalo,
    plan.armaduraDestino,
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

const SIN_ACORDE = /^(N\.?C\.?|%|-)$/i;
const RAIZ_CIFRADO = /^([A-Ga-g])(#{1,2}|b{1,2})?$/;

function normalizarSimbolos(texto: string): string {
  return texto.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/𝄪/g, '##').replace(/𝄫/g, 'bb');
}

/**
 * Transpone un cifrado americano ("Bb7", "F#m7b5/E", "C6/9", "N.C.").
 * Solo se considera bajo lo que va tras "/" si es una nota: "C6/9" no tiene bajo.
 */
export function transponerCifrado(
  cifrado: string,
  intervalo: Intervalo,
  armaduraDestino?: number,
  preferir?: PreferenciaEnarmonia
): string {
  const limpio = normalizarSimbolos(cifrado.trim());

  if (SIN_ACORDE.test(limpio)) {
    return cifrado.trim();
  }

  const partes = limpio.split('/');
  const bajos: string[] = [];
  while (partes.length > 1 && RAIZ_CIFRADO.test(partes[partes.length - 1].trim())) {
    bajos.unshift(partes.pop()!.trim());
  }

  const acorde = partes.join('/');
  const coincidencia = /^([A-Ga-g])(#{1,2}|b{1,2})?(.*)$/.exec(acorde);

  if (!coincidencia) {
    throw new Error(`No se puede interpretar el cifrado "${cifrado}"`);
  }

  const raiz = `${coincidencia[1]}${coincidencia[2] ?? ''}`;
  const calidad = coincidencia[3];
  const nuevaRaiz = transponerRaiz(raiz, intervalo, armaduraDestino, preferir);
  const nuevosBajos = bajos.map((parte) =>
    transponerRaiz(parte, intervalo, armaduraDestino, preferir)
  );

  return `${nuevaRaiz}${calidad}${nuevosBajos.length > 0 ? `/${nuevosBajos.join('/')}` : ''}`;
}

export function transponerCifradoConOpciones(
  cifrado: string,
  opciones: OpcionesTransposicion
): string {
  const plan = planificarTransposicion(opciones);

  return transponerCifrado(cifrado, plan.intervalo, plan.armaduraDestino, opciones.preferir);
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
