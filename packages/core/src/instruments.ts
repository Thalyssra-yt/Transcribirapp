import { diatonico, midi, nota, parseNota, quintas, type Nota } from './pitch';

/**
 * Catálogo de instrumentos de orquesta, banda de música, brass band, big band, cámara y coro.
 *
 * Cada instrumento se define por lo que SUENA cuando lee un Do4 escrito (`suena`).
 * De ahí se calculan automáticamente el `<transpose>` de MusicXML y el desplazamiento
 * en la línea de quintas, así que es imposible que no cuadren entre sí.
 *
 * Ejemplos: saxo tenor lee Do4 y suena Sib2; trompa en Fa lee Do4 y suena Fa3;
 * flautín lee Do4 y suena Do5. Ver docs/TRANSPOSICION.md §2.
 */

export type Clave =
  'sol' | 'fa' | 'do3' | 'do4' | 'sol8' | 'sol+fa' | 'sol-o-fa' | 'fa-o-do4-o-sol' | 'percusion';

export type Familia =
  'madera' | 'metal' | 'cuerda' | 'cuerda-pulsada' | 'percusion-afinada' | 'teclado' | 'voz';

export type Agrupacion =
  'orquesta' | 'banda' | 'brass-band' | 'big-band' | 'camara' | 'coro' | 'moderna' | 'historico';

/** Afinación tal y como la escribe un músico: "Sib", "Mib", "Fa", "Do"… */
export type Afinacion =
  'Do' | 'Reb' | 'Re' | 'Mib' | 'Mi' | 'Fa' | 'Solb' | 'Sol' | 'Lab' | 'La' | 'Sib' | 'Si';

export interface Rango {
  inferior: Nota;
  superior: Nota;
}

export interface Instrumento {
  id: string;
  nombre: string;
  abreviatura: string;
  familia: Familia;
  agrupaciones: readonly Agrupacion[];
  afinacion: Afinacion;
  /** Altura real que suena al leer un Do4 escrito. */
  suena: Nota;
  clave: Clave;
  /** `<transpose>` de MusicXML: sonido = escrito + esto. Calculado a partir de `suena`. */
  transpose: {
    diatonic: number;
    chromatic: number;
    octaveChange: number;
  };
  /** Desplazamiento en la línea de quintas de concierto → escrito (armaduras). */
  deltaQuintas: number;
  /** Tradicionalmente se escribe sin armadura (trompas y trompetas naturales). */
  sinArmadura?: boolean;
  /** Otros nombres con que aparece en partituras (para el reconocimiento y la búsqueda). */
  alias?: readonly string[];
  rangoComodo: Rango;
  rangoAbsoluto: Rango;
}

const DO4 = nota('C', 0, 4);

/** Convierte "lee Do4 y suena X" en el `<transpose>` de MusicXML. */
export function transposeDesdeSonido(suena: Nota): Instrumento['transpose'] {
  const pasos = diatonico(suena) - diatonico(DO4);
  const semitonos = midi(suena) - midi(DO4);
  const octaveChange = Math.trunc(pasos / 7) || 0;

  return {
    diatonic: pasos - 7 * octaveChange,
    chromatic: semitonos - 12 * octaveChange,
    octaveChange
  };
}

const QUINTAS_AFINACION: Record<Afinacion, number> = {
  Solb: -6,
  Reb: -5,
  Lab: -4,
  Mib: -3,
  Sib: -2,
  Fa: -1,
  Do: 0,
  Sol: 1,
  Re: 2,
  La: 3,
  Mi: 4,
  Si: 5
};

export function quintasDeAfinacion(afinacion: Afinacion): number {
  return QUINTAS_AFINACION[afinacion];
}

function afinacionDeSonido(suena: Nota): Afinacion {
  const q = quintas(suena);
  const encontrada = (Object.keys(QUINTAS_AFINACION) as Afinacion[]).find(
    (afinacion) => QUINTAS_AFINACION[afinacion] === q
  );

  if (!encontrada) {
    throw new Error(`Afinación no soportada para un instrumento que suena ${q} quintas`);
  }

  return encontrada;
}

interface Definicion<Id extends string> {
  id: Id;
  nombre: string;
  abreviatura: string;
  familia: Familia;
  agrupaciones: readonly Agrupacion[];
  /** Nota que suena al leer Do4, en notación española o inglesa: "Sib2", "Fa3", "Do5". */
  suena: string;
  clave: Clave;
  /** [cómodo inferior, cómodo superior, absoluto inferior, absoluto superior], escritas. */
  rango: readonly [string, string, string, string];
  sinArmadura?: boolean;
  alias?: readonly string[];
}

/** Crea un instrumento a partir de su definición. Úsalo también para instrumentos personalizados. */
export function definirInstrumento<const Id extends string>(
  definicion: Definicion<Id>
): Instrumento & { id: Id } {
  const suena = parseNota(definicion.suena);
  const transpose = transposeDesdeSonido(suena);
  const [ci, cs, ai, as] = definicion.rango.map(parseNota);

  return {
    id: definicion.id,
    nombre: definicion.nombre,
    abreviatura: definicion.abreviatura,
    familia: definicion.familia,
    agrupaciones: definicion.agrupaciones,
    afinacion: afinacionDeSonido(suena),
    suena,
    clave: definicion.clave,
    transpose,
    deltaQuintas: 0 - quintas(suena),
    ...(definicion.sinArmadura ? { sinArmadura: true } : {}),
    ...(definicion.alias ? { alias: definicion.alias } : {}),
    rangoComodo: { inferior: ci, superior: cs },
    rangoAbsoluto: { inferior: ai, superior: as }
  };
}

const d = definirInstrumento;
const ORQ_BANDA = ['orquesta', 'banda'] as const;

// prettier-ignore
export const INSTRUMENTOS = [
  // ───────────── Viento madera ─────────────
  d({ id: 'flauta', nombre: 'Flauta', abreviatura: 'Fl.', familia: 'madera', agrupaciones: ['orquesta', 'banda', 'big-band', 'camara'], suena: 'Do4', clave: 'sol', rango: ['Re4', 'La6', 'Do4', 'Do7'] }),
  d({ id: 'piccolo', nombre: 'Flautín', abreviatura: 'Picc.', familia: 'madera', agrupaciones: ORQ_BANDA, suena: 'Do5', clave: 'sol', rango: ['Re4', 'La6', 'Re4', 'Do7'], alias: ['Piccolo', 'Ottavino'] }),
  d({ id: 'flauta-alto', nombre: 'Flauta alto en Sol', abreviatura: 'Fl. alto', familia: 'madera', agrupaciones: ['orquesta'], suena: 'Sol3', clave: 'sol', rango: ['Re4', 'Sol6', 'Do4', 'Do7'] }),
  d({ id: 'flauta-baja', nombre: 'Flauta baja en Do', abreviatura: 'Fl. b.', familia: 'madera', agrupaciones: ['orquesta', 'banda'], suena: 'Do3', clave: 'sol', rango: ['Re4', 'Sol6', 'Do4', 'Do7'] }),
  d({ id: 'oboe', nombre: 'Oboe', abreviatura: 'Ob.', familia: 'madera', agrupaciones: ['orquesta', 'banda', 'camara'], suena: 'Do4', clave: 'sol', rango: ['Do4', 'Mi6', 'Sib3', 'La6'] }),
  d({ id: 'oboe-amor', nombre: "Oboe d'amore en La", abreviatura: 'Ob. am.', familia: 'madera', agrupaciones: ['orquesta', 'historico'], suena: 'La3', clave: 'sol', rango: ['Do4', 'Re6', 'Si3', 'Sol6'] }),
  d({ id: 'corno-ingles', nombre: 'Corno inglés en Fa', abreviatura: 'C. ing.', familia: 'madera', agrupaciones: ORQ_BANDA, suena: 'Fa3', clave: 'sol', rango: ['Do4', 'Re6', 'Si3', 'Sol6'], alias: ['Cor anglais', 'English horn'] }),
  d({ id: 'fagot', nombre: 'Fagot', abreviatura: 'Fg.', familia: 'madera', agrupaciones: ['orquesta', 'banda', 'camara'], suena: 'Do4', clave: 'fa-o-do4-o-sol', rango: ['Do2', 'Sol4', 'Sib1', 'Mi5'], alias: ['Bassoon'] }),
  d({ id: 'contrafagot', nombre: 'Contrafagot', abreviatura: 'Cfg.', familia: 'madera', agrupaciones: ORQ_BANDA, suena: 'Do3', clave: 'fa', rango: ['Do2', 'Fa4', 'Sib1', 'Sib4'] }),
  d({ id: 'clarinete-mib', nombre: 'Requinto (clarinete en Mib)', abreviatura: 'Req.', familia: 'madera', agrupaciones: ORQ_BANDA, suena: 'Mib4', clave: 'sol', rango: ['Mi3', 'Re6', 'Mi3', 'Sol6'], alias: ['Requinto', 'Clarinete piccolo'] }),
  d({ id: 'clarinete-do', nombre: 'Clarinete en Do', abreviatura: 'Cl. Do', familia: 'madera', agrupaciones: ['orquesta', 'historico'], suena: 'Do4', clave: 'sol', rango: ['Mi3', 'Sol6', 'Mi3', 'Do7'] }),
  d({ id: 'clarinete-sib', nombre: 'Clarinete en Sib', abreviatura: 'Cl.', familia: 'madera', agrupaciones: ['orquesta', 'banda', 'big-band', 'camara'], suena: 'Sib3', clave: 'sol', rango: ['Mi3', 'Sol6', 'Mi3', 'Do7'] }),
  d({ id: 'clarinete-la', nombre: 'Clarinete en La', abreviatura: 'Cl. La', familia: 'madera', agrupaciones: ['orquesta', 'camara'], suena: 'La3', clave: 'sol', rango: ['Mi3', 'Sol6', 'Mi3', 'Do7'] }),
  d({ id: 'clarinete-alto', nombre: 'Clarinete alto en Mib', abreviatura: 'Cl. alto', familia: 'madera', agrupaciones: ['banda'], suena: 'Mib3', clave: 'sol', rango: ['Mi3', 'Do6', 'Mib3', 'Sol6'] }),
  d({ id: 'clarinete-bajo', nombre: 'Clarinete bajo en Sib', abreviatura: 'Cl. b.', familia: 'madera', agrupaciones: ORQ_BANDA, suena: 'Sib2', clave: 'sol', rango: ['Mi3', 'Do6', 'Mib3', 'Sol6'], alias: ['Clarinete bajo (notación francesa)', 'Bass clarinet'] }),
  d({ id: 'clarinete-contralto', nombre: 'Clarinete contralto en Mib', abreviatura: 'Cl. cA.', familia: 'madera', agrupaciones: ['banda'], suena: 'Mib2', clave: 'sol', rango: ['Mi3', 'La5', 'Mib3', 'Do6'] }),
  d({ id: 'clarinete-contrabajo', nombre: 'Clarinete contrabajo en Sib', abreviatura: 'Cl. cb.', familia: 'madera', agrupaciones: ['banda'], suena: 'Sib1', clave: 'sol', rango: ['Mi3', 'La5', 'Mib3', 'Do6'] }),
  d({ id: 'saxo-sopranino', nombre: 'Saxo sopranino en Mib', abreviatura: 'Sx. sno.', familia: 'madera', agrupaciones: ['banda'], suena: 'Mib4', clave: 'sol', rango: ['Do4', 'Do6', 'Sib3', 'Fa6'] }),
  d({ id: 'saxo-soprano', nombre: 'Saxo soprano en Sib', abreviatura: 'Sx. s.', familia: 'madera', agrupaciones: ['banda', 'big-band', 'moderna'], suena: 'Sib3', clave: 'sol', rango: ['Do4', 'Re6', 'Sib3', 'Fa#6'] }),
  d({ id: 'saxo-alto', nombre: 'Saxo alto en Mib', abreviatura: 'Sx. a.', familia: 'madera', agrupaciones: ['banda', 'big-band', 'moderna', 'orquesta'], suena: 'Mib3', clave: 'sol', rango: ['Do4', 'Re6', 'Sib3', 'Fa#6'] }),
  d({ id: 'saxo-tenor', nombre: 'Saxo tenor en Sib', abreviatura: 'Sx. t.', familia: 'madera', agrupaciones: ['banda', 'big-band', 'moderna', 'orquesta'], suena: 'Sib2', clave: 'sol', rango: ['Do4', 'Re6', 'Sib3', 'Fa#6'] }),
  d({ id: 'saxo-baritono', nombre: 'Saxo barítono en Mib', abreviatura: 'Sx. bar.', familia: 'madera', agrupaciones: ['banda', 'big-band', 'moderna'], suena: 'Mib2', clave: 'sol', rango: ['Do4', 'Re6', 'La3', 'Fa#6'] }),
  d({ id: 'saxo-bajo', nombre: 'Saxo bajo en Sib', abreviatura: 'Sx. b.', familia: 'madera', agrupaciones: ['banda'], suena: 'Sib1', clave: 'sol', rango: ['Do4', 'Do6', 'Sib3', 'Mi6'] }),

  // ───────────── Viento metal ─────────────
  d({ id: 'trompeta-sib', nombre: 'Trompeta en Sib', abreviatura: 'Tpt.', familia: 'metal', agrupaciones: ['orquesta', 'banda', 'big-band', 'brass-band', 'moderna'], suena: 'Sib3', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'] }),
  d({ id: 'trompeta-do', nombre: 'Trompeta en Do', abreviatura: 'Tpt. Do', familia: 'metal', agrupaciones: ['orquesta'], suena: 'Do4', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'] }),
  d({ id: 'trompeta-re', nombre: 'Trompeta en Re', abreviatura: 'Tpt. Re', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Re4', clave: 'sol', rango: ['Do4', 'Fa#5', 'Fa#3', 'La5'] }),
  d({ id: 'trompeta-mib', nombre: 'Trompeta en Mib', abreviatura: 'Tpt. Mib', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Mib4', clave: 'sol', rango: ['Do4', 'Mi5', 'Fa#3', 'Sol5'] }),
  d({ id: 'trompeta-mi', nombre: 'Trompeta en Mi', abreviatura: 'Tpt. Mi', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Mi4', clave: 'sol', rango: ['Do4', 'Mi5', 'Fa#3', 'Sol5'], sinArmadura: true }),
  d({ id: 'trompeta-fa', nombre: 'Trompeta en Fa', abreviatura: 'Tpt. Fa', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Fa4', clave: 'sol', rango: ['Do4', 'Re5', 'Fa#3', 'Fa5'], sinArmadura: true }),
  d({ id: 'trompeta-sol', nombre: 'Trompeta en Sol', abreviatura: 'Tpt. Sol', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Sol4', clave: 'sol', rango: ['Do4', 'Do5', 'Fa#3', 'Mi5'] }),
  d({ id: 'trompeta-la', nombre: 'Trompeta en La', abreviatura: 'Tpt. La', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'La3', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'] }),
  d({ id: 'trompeta-piccolo-sib', nombre: 'Trompeta piccolo en Sib', abreviatura: 'Tpt. picc.', familia: 'metal', agrupaciones: ['orquesta'], suena: 'Sib4', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'] }),
  d({ id: 'trompeta-piccolo-la', nombre: 'Trompeta piccolo en La', abreviatura: 'Tpt. picc. La', familia: 'metal', agrupaciones: ['orquesta'], suena: 'La4', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'] }),
  d({ id: 'cornetin-sib', nombre: 'Cornetín en Sib', abreviatura: 'Ctín.', familia: 'metal', agrupaciones: ['orquesta', 'banda', 'brass-band'], suena: 'Sib3', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'], alias: ['Cornet', 'Corneta'] }),
  d({ id: 'cornetin-mib', nombre: 'Cornetín soprano en Mib', abreviatura: 'Ctín. Mib', familia: 'metal', agrupaciones: ['brass-band'], suena: 'Mib4', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'] }),
  d({ id: 'fliscorno', nombre: 'Fliscorno en Sib', abreviatura: 'Flisc.', familia: 'metal', agrupaciones: ['banda', 'brass-band', 'big-band'], suena: 'Sib3', clave: 'sol', rango: ['Do4', 'Fa5', 'Fa#3', 'Do6'], alias: ['Flugelhorn', 'Fliscorno soprano'] }),
  d({ id: 'trompa-fa', nombre: 'Trompa en Fa', abreviatura: 'Tpa.', familia: 'metal', agrupaciones: ['orquesta', 'banda', 'camara'], suena: 'Fa3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Fa#2', 'Do6'], alias: ['Horn', 'Corno'] }),
  d({ id: 'trompa-mib', nombre: 'Trompa en Mib', abreviatura: 'Tpa. Mib', familia: 'metal', agrupaciones: ['orquesta', 'banda', 'historico'], suena: 'Mib3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Fa#2', 'Do6'] }),
  d({ id: 'trompa-do-alto', nombre: 'Trompa en Do alto', abreviatura: 'Tpa. Do a.', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Do4', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-sib-alto', nombre: 'Trompa en Sib alto', abreviatura: 'Tpa. Sib a.', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Sib3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-la', nombre: 'Trompa en La', abreviatura: 'Tpa. La', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'La3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-lab', nombre: 'Trompa en Lab', abreviatura: 'Tpa. Lab', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Lab3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-sol', nombre: 'Trompa en Sol', abreviatura: 'Tpa. Sol', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Sol3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-mi', nombre: 'Trompa en Mi', abreviatura: 'Tpa. Mi', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Mi3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-re', nombre: 'Trompa en Re', abreviatura: 'Tpa. Re', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Re3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-do-basso', nombre: 'Trompa en Do basso', abreviatura: 'Tpa. Do b.', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Do3', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-sib-basso', nombre: 'Trompa en Sib basso', abreviatura: 'Tpa. Sib b.', familia: 'metal', agrupaciones: ['orquesta', 'historico'], suena: 'Sib2', clave: 'sol-o-fa', rango: ['Do4', 'Sol5', 'Do3', 'Do6'], sinArmadura: true }),
  d({ id: 'trompa-tenor-mib', nombre: 'Trompa tenor en Mib (tenor horn)', abreviatura: 'T. hn.', familia: 'metal', agrupaciones: ['brass-band'], suena: 'Mib3', clave: 'sol', rango: ['Do4', 'Sol5', 'Fa#3', 'Do6'], alias: ['Tenor horn', 'Alto horn', 'Saxhorn alto'] }),
  d({ id: 'trombon', nombre: 'Trombón', abreviatura: 'Tbn.', familia: 'metal', agrupaciones: ['orquesta', 'banda', 'big-band', 'moderna'], suena: 'Do4', clave: 'fa-o-do4-o-sol', rango: ['Fa2', 'Sib4', 'Mi2', 'Fa5'] }),
  d({ id: 'trombon-bajo', nombre: 'Trombón bajo', abreviatura: 'Tbn. b.', familia: 'metal', agrupaciones: ['orquesta', 'banda', 'big-band'], suena: 'Do4', clave: 'fa', rango: ['Re2', 'Fa4', 'Sib1', 'Sib4'] }),
  d({ id: 'trombon-sib-sol', nombre: 'Trombón en Sib (clave de Sol)', abreviatura: 'Tbn. Sib', familia: 'metal', agrupaciones: ['brass-band', 'banda'], suena: 'Sib2', clave: 'sol', rango: ['Sol3', 'La5', 'Fa#3', 'Do6'] }),
  d({ id: 'bombardino', nombre: 'Bombardino (clave de Fa)', abreviatura: 'Bomb.', familia: 'metal', agrupaciones: ['banda'], suena: 'Do4', clave: 'fa', rango: ['Fa2', 'Fa4', 'Sib1', 'Sib4'], alias: ['Eufonio', 'Euphonium', 'Tuba tenor'] }),
  d({ id: 'bombardino-sib-sol', nombre: 'Bombardino en Sib (clave de Sol)', abreviatura: 'Bomb. Sib', familia: 'metal', agrupaciones: ['banda', 'brass-band'], suena: 'Sib2', clave: 'sol', rango: ['Sol3', 'Sol5', 'Fa#3', 'Do6'], alias: ['Euphonium T.C.'] }),
  d({ id: 'baritono-sib-sol', nombre: 'Barítono en Sib (clave de Sol)', abreviatura: 'Bar.', familia: 'metal', agrupaciones: ['brass-band'], suena: 'Sib2', clave: 'sol', rango: ['Sol3', 'Sol5', 'Fa#3', 'Do6'], alias: ['Baritone horn'] }),
  d({ id: 'tuba', nombre: 'Tuba', abreviatura: 'Tba.', familia: 'metal', agrupaciones: ['orquesta', 'banda', 'moderna'], suena: 'Do4', clave: 'fa', rango: ['Fa1', 'Do4', 'Re1', 'Fa4'], alias: ['Bajo', 'Tuba en Fa', 'Helicón', 'Sousafón'] }),
  d({ id: 'tuba-mib-sol', nombre: 'Bajo en Mib (clave de Sol)', abreviatura: 'Bajo Mib', familia: 'metal', agrupaciones: ['brass-band'], suena: 'Mib1', clave: 'sol', rango: ['Sol3', 'Sol5', 'Fa#3', 'Do6'], alias: ['Eb bass', 'Tuba en Mib'] }),
  d({ id: 'tuba-sib-sol', nombre: 'Bajo en Sib (clave de Sol)', abreviatura: 'Bajo Sib', familia: 'metal', agrupaciones: ['brass-band'], suena: 'Sib1', clave: 'sol', rango: ['Sol3', 'Sol5', 'Fa#3', 'Do6'], alias: ['BBb bass', 'Tuba en Sib'] }),

  // ───────────── Cuerda ─────────────
  d({ id: 'violin', nombre: 'Violín', abreviatura: 'Vl.', familia: 'cuerda', agrupaciones: ['orquesta', 'camara', 'moderna'], suena: 'Do4', clave: 'sol', rango: ['Sol3', 'Re6', 'Sol3', 'Mi7'] }),
  d({ id: 'viola', nombre: 'Viola', abreviatura: 'Vla.', familia: 'cuerda', agrupaciones: ['orquesta', 'camara'], suena: 'Do4', clave: 'do3', rango: ['Do3', 'La5', 'Do3', 'Mi6'] }),
  d({ id: 'violonchelo', nombre: 'Violonchelo', abreviatura: 'Vc.', familia: 'cuerda', agrupaciones: ['orquesta', 'banda', 'camara'], suena: 'Do4', clave: 'fa-o-do4-o-sol', rango: ['Do2', 'La4', 'Do2', 'La5'], alias: ['Chelo', 'Cello'] }),
  d({ id: 'contrabajo', nombre: 'Contrabajo', abreviatura: 'Cb.', familia: 'cuerda', agrupaciones: ['orquesta', 'banda', 'big-band', 'camara', 'moderna'], suena: 'Do3', clave: 'fa', rango: ['Mi2', 'Re4', 'Mi2', 'Sol4'] }),
  d({ id: 'arpa', nombre: 'Arpa', abreviatura: 'Arp.', familia: 'cuerda-pulsada', agrupaciones: ['orquesta'], suena: 'Do4', clave: 'sol+fa', rango: ['Do2', 'Do7', 'Dob1', 'Sol#7'] }),
  d({ id: 'guitarra', nombre: 'Guitarra', abreviatura: 'Guit.', familia: 'cuerda-pulsada', agrupaciones: ['moderna', 'big-band', 'camara'], suena: 'Do3', clave: 'sol8', rango: ['Mi3', 'La5', 'Mi3', 'Si5'] }),
  d({ id: 'bajo-electrico', nombre: 'Bajo eléctrico', abreviatura: 'B. el.', familia: 'cuerda-pulsada', agrupaciones: ['moderna', 'big-band'], suena: 'Do3', clave: 'fa', rango: ['Mi2', 'Do4', 'Mi2', 'Sol4'] }),

  // ───────────── Percusión afinada y teclado ─────────────
  d({ id: 'timbales', nombre: 'Timbales', abreviatura: 'Timb.', familia: 'percusion-afinada', agrupaciones: ORQ_BANDA, suena: 'Do4', clave: 'fa', rango: ['Fa2', 'Fa3', 'Re2', 'Do4'] }),
  d({ id: 'glockenspiel', nombre: 'Glockenspiel / lira', abreviatura: 'Glock.', familia: 'percusion-afinada', agrupaciones: ['orquesta', 'banda'], suena: 'Do6', clave: 'sol', rango: ['Sol3', 'Do6', 'Sol3', 'Do6'], alias: ['Lira', 'Campanólogo', 'Láminas'] }),
  d({ id: 'xilofono', nombre: 'Xilófono', abreviatura: 'Xil.', familia: 'percusion-afinada', agrupaciones: ORQ_BANDA, suena: 'Do5', clave: 'sol', rango: ['Do4', 'Do7', 'Fa3', 'Do7'] }),
  d({ id: 'marimba', nombre: 'Marimba', abreviatura: 'Mar.', familia: 'percusion-afinada', agrupaciones: ORQ_BANDA, suena: 'Do4', clave: 'sol+fa', rango: ['Do2', 'Do7', 'La1', 'Do7'] }),
  d({ id: 'vibrafono', nombre: 'Vibráfono', abreviatura: 'Vib.', familia: 'percusion-afinada', agrupaciones: ['orquesta', 'banda', 'big-band'], suena: 'Do4', clave: 'sol', rango: ['Fa3', 'Fa6', 'Fa3', 'Fa6'] }),
  d({ id: 'campanas', nombre: 'Campanas tubulares', abreviatura: 'Camp.', familia: 'percusion-afinada', agrupaciones: ORQ_BANDA, suena: 'Do4', clave: 'sol', rango: ['Do4', 'Fa5', 'Do4', 'Fa5'] }),
  d({ id: 'celesta', nombre: 'Celesta', abreviatura: 'Cel.', familia: 'teclado', agrupaciones: ['orquesta'], suena: 'Do5', clave: 'sol+fa', rango: ['Do3', 'Do7', 'Do3', 'Do7'] }),
  d({ id: 'piano', nombre: 'Piano', abreviatura: 'Pno.', familia: 'teclado', agrupaciones: ['orquesta', 'big-band', 'camara', 'moderna'], suena: 'Do4', clave: 'sol+fa', rango: ['La0', 'Do8', 'La0', 'Do8'] }),

  // ───────────── Voces ─────────────
  d({ id: 'voz-soprano', nombre: 'Voz soprano', abreviatura: 'S.', familia: 'voz', agrupaciones: ['coro'], suena: 'Do4', clave: 'sol', rango: ['Do4', 'La5', 'La3', 'Do6'] }),
  d({ id: 'voz-contralto', nombre: 'Voz contralto', abreviatura: 'A.', familia: 'voz', agrupaciones: ['coro'], suena: 'Do4', clave: 'sol', rango: ['Sol3', 'Re5', 'Mi3', 'Fa5'] }),
  d({ id: 'voz-tenor', nombre: 'Voz tenor', abreviatura: 'T.', familia: 'voz', agrupaciones: ['coro'], suena: 'Do3', clave: 'sol8', rango: ['Do4', 'La5', 'La3', 'Do6'] }),
  d({ id: 'voz-bajo', nombre: 'Voz bajo', abreviatura: 'B.', familia: 'voz', agrupaciones: ['coro'], suena: 'Do4', clave: 'fa', rango: ['Fa2', 'Re4', 'Mi2', 'Mi4'] })
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

export function instrumentoPorTranspose(
  transpose: Instrumento['transpose']
): Instrumento | undefined {
  return [...POR_ID.values()].find(
    (instrumento) =>
      instrumento.transpose.diatonic === transpose.diatonic &&
      instrumento.transpose.chromatic === transpose.chromatic &&
      instrumento.transpose.octaveChange === transpose.octaveChange
  );
}

/**
 * Registra un instrumento personalizado (p. ej. "Trompa en Si basso" de una partitura antigua,
 * o el rango propio de un músico). Devuelve el instrumento registrado.
 */
export function registrarInstrumento(instrumento: Instrumento): Instrumento {
  if (INSTRUMENTOS.some((existente) => existente.id === instrumento.id)) {
    throw new Error(`No se puede sustituir un instrumento del catálogo: ${instrumento.id}`);
  }

  POR_ID.set(instrumento.id, instrumento);

  return instrumento;
}

export function instrumentosDeAgrupacion(agrupacion: Agrupacion): Instrumento[] {
  return [...POR_ID.values()].filter((instrumento) =>
    instrumento.agrupaciones.includes(agrupacion)
  );
}

export function buscarInstrumento(texto: string): Instrumento[] {
  const normalizar = (valor: string) =>
    valor
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[.\s]+/g, ' ')
      .trim();
  const buscado = normalizar(texto);

  if (!buscado) {
    return [];
  }

  return [...POR_ID.values()].filter((instrumento) =>
    [instrumento.nombre, instrumento.abreviatura, instrumento.id, ...(instrumento.alias ?? [])]
      .map(normalizar)
      .some((candidato) => candidato.includes(buscado))
  );
}

// ───────────── Plantillas de agrupación (orden de partitura) ─────────────

export interface Plantilla {
  id: string;
  nombre: string;
  /** Instrumentos en el orden habitual de la partitura general. */
  instrumentos: readonly InstrumentoId[];
}

// prettier-ignore
export const PLANTILLAS = [
  {
    id: 'banda-musica',
    nombre: 'Banda de música',
    instrumentos: [
      'piccolo', 'flauta', 'oboe', 'corno-ingles', 'fagot', 'clarinete-mib', 'clarinete-sib',
      'clarinete-bajo', 'saxo-soprano', 'saxo-alto', 'saxo-tenor', 'saxo-baritono', 'trompa-fa',
      'trompeta-sib', 'fliscorno', 'trombon', 'bombardino', 'tuba', 'contrabajo', 'violonchelo',
      'timbales', 'glockenspiel', 'xilofono'
    ]
  },
  {
    id: 'orquesta-sinfonica',
    nombre: 'Orquesta sinfónica',
    instrumentos: [
      'piccolo', 'flauta', 'oboe', 'corno-ingles', 'clarinete-sib', 'clarinete-la', 'clarinete-bajo',
      'fagot', 'contrafagot', 'trompa-fa', 'trompeta-sib', 'trompeta-do', 'trombon', 'trombon-bajo',
      'tuba', 'timbales', 'glockenspiel', 'xilofono', 'campanas', 'arpa', 'celesta', 'piano',
      'violin', 'viola', 'violonchelo', 'contrabajo'
    ]
  },
  {
    id: 'orquesta-clasica',
    nombre: 'Orquesta clásica (s. XVIII–XIX)',
    instrumentos: [
      'flauta', 'oboe', 'clarinete-do', 'clarinete-sib', 'clarinete-la', 'fagot', 'trompa-re',
      'trompa-mib', 'trompa-fa', 'trompa-sol', 'trompeta-re', 'trompeta-do', 'timbales', 'violin',
      'viola', 'violonchelo', 'contrabajo'
    ]
  },
  {
    id: 'brass-band',
    nombre: 'Brass band',
    instrumentos: [
      'cornetin-mib', 'cornetin-sib', 'fliscorno', 'trompa-tenor-mib', 'baritono-sib-sol',
      'trombon-sib-sol', 'trombon-bajo', 'bombardino-sib-sol', 'tuba-mib-sol', 'tuba-sib-sol'
    ]
  },
  {
    id: 'big-band',
    nombre: 'Big band',
    instrumentos: [
      'saxo-alto', 'saxo-tenor', 'saxo-baritono', 'trompeta-sib', 'trombon', 'trombon-bajo',
      'guitarra', 'piano', 'contrabajo', 'bajo-electrico', 'vibrafono'
    ]
  },
  {
    id: 'quinteto-viento',
    nombre: 'Quinteto de viento',
    instrumentos: ['flauta', 'oboe', 'clarinete-sib', 'trompa-fa', 'fagot']
  },
  {
    id: 'quinteto-metal',
    nombre: 'Quinteto de metales',
    instrumentos: ['trompeta-sib', 'trompeta-do', 'trompa-fa', 'trombon', 'tuba']
  },
  {
    id: 'cuarteto-cuerda',
    nombre: 'Cuarteto de cuerda',
    instrumentos: ['violin', 'violin', 'viola', 'violonchelo']
  },
  {
    id: 'cuarteto-saxofones',
    nombre: 'Cuarteto de saxofones',
    instrumentos: ['saxo-soprano', 'saxo-alto', 'saxo-tenor', 'saxo-baritono']
  },
  {
    id: 'coro',
    nombre: 'Coro mixto',
    instrumentos: ['voz-soprano', 'voz-contralto', 'voz-tenor', 'voz-bajo']
  }
] as const satisfies readonly Plantilla[];

export type PlantillaId = (typeof PLANTILLAS)[number]['id'];
