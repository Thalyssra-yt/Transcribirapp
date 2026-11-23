import { intervaloDesdeTranspose } from '../interval';
import {
  buscarInstrumento,
  definirInstrumento,
  instrumentoPorId,
  instrumentoPorTranspose,
  type Clave,
  type Instrumento
} from '../instruments';
import { formatearNota, nota, parseNota, type Nota, type Paso } from '../pitch';
import {
  fijarAtributo,
  fijarTexto,
  hijos,
  numeroDe,
  primerHijo,
  quitarHijos,
  textoDe,
  type MusicXmlDocument,
  type MusicXmlElement
} from './dom';
import {
  normalizarArmadura,
  planificarTransposicion,
  transponerNota,
  transponerNotaConArmadura,
  type CambioTonalidad,
  type DestinoTransposicion,
  type PreferenciaEnarmonia
} from '../transpose';

const PASOS: readonly Paso[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SOSTENIDOS = 'FCGDAEB';
const BEMOLES = 'BEADGCF';

export type OrigenPartitura = DestinoTransposicion | 'auto';

export interface OpcionesTransponerPartitura {
  desde?: OrigenPartitura;
  hasta: DestinoTransposicion;
  cambioTonalidad?: CambioTonalidad;
  preferir?: PreferenciaEnarmonia;
  partes?: readonly string[];
  pentagrama?: number;
  actualizarNombres?: boolean;
  actualizarClaves?: boolean;
  transponerCifrado?: boolean;
}

export interface ParteTranspuesta {
  id: string;
  nombre: string;
  origen: DestinoTransposicion;
  deteccion: 'transpose' | 'nombre' | 'concierto';
}

export interface DudaInstrumento {
  id: string;
  nombre: string;
  candidatos: string[];
}

export interface InformeTransposicionPartitura {
  avisos: string[];
  partes: ParteTranspuesta[];
  dudas: DudaInstrumento[];
}

function esInstrumento(destino: DestinoTransposicion): destino is Instrumento {
  return typeof destino !== 'string';
}

function resolverInstrumento(destino: DestinoTransposicion): Instrumento | undefined {
  return esInstrumento(destino)
    ? destino
    : destino === 'concierto'
      ? undefined
      : instrumentoPorId(destino);
}

function leerPaso(valor: string | undefined): Paso | undefined {
  const paso = valor?.trim().toUpperCase() as Paso | undefined;

  return paso && PASOS.includes(paso) ? paso : undefined;
}

function leerTranspose(atributos: MusicXmlElement[]): Instrumento | undefined {
  for (const elemento of atributos) {
    const transpose = primerHijo(elemento, 'transpose');
    if (!transpose) {
      continue;
    }

    const diatonic = numeroDe(transpose, 'diatonic');
    const chromatic = numeroDe(transpose, 'chromatic');
    const octaveChange = numeroDe(transpose, 'octave-change') ?? 0;

    if (diatonic === undefined || chromatic === undefined) {
      continue;
    }

    const conocido = instrumentoPorTranspose({ diatonic, chromatic, octaveChange });
    if (conocido) {
      return conocido;
    }

    const suena = formatearNota(
      transponerNota(parseNota('Do4'), intervaloDesdeTranspose(diatonic, chromatic, octaveChange)),
      'es'
    );

    return definirInstrumento({
      id: `detectado-${diatonic}-${chromatic}-${octaveChange}`,
      nombre: `Instrumento transportado (${suena})`,
      abreviatura: '',
      familia: 'metal',
      agrupaciones: ['moderna'],
      suena,
      clave: 'sol',
      rango: ['Do4', 'Do6', 'Do3', 'Do7']
    });
  }

  return undefined;
}

function detectarOrigen(
  opciones: OpcionesTransponerPartitura,
  parte: MusicXmlElement,
  nombres: string[]
): {
  origen: DestinoTransposicion;
  deteccion: ParteTranspuesta['deteccion'];
  candidatos: string[];
} {
  if (opciones.desde && opciones.desde !== 'auto') {
    return { origen: opciones.desde, deteccion: 'nombre', candidatos: [] };
  }

  const porTranspose = leerTranspose(Array.from(parte.getElementsByTagName('attributes')));
  const candidatos = Array.from(
    new Map(
      nombres
        .flatMap((valor) => buscarInstrumento(valor))
        .map((instrumento) => [instrumento.id, instrumento])
    ).values()
  );
  const coincide = (candidato: Instrumento) =>
    !porTranspose ||
    (candidato.transpose.diatonic === porTranspose.transpose.diatonic &&
      candidato.transpose.chromatic === porTranspose.transpose.chromatic &&
      candidato.transpose.octaveChange === porTranspose.transpose.octaveChange);
  const porTransposeYNombre = candidatos.find(coincide);

  if (porTransposeYNombre) {
    return {
      origen: porTransposeYNombre,
      deteccion: porTranspose ? 'transpose' : 'nombre',
      candidatos: porTranspose ? [] : candidatos.map((candidato) => candidato.nombre)
    };
  }

  if (porTranspose) {
    return { origen: porTranspose, deteccion: 'transpose', candidatos: [] };
  }

  if (candidatos[0]) {
    return {
      origen: candidatos[0],
      deteccion: 'nombre',
      candidatos: candidatos.map((candidato) => candidato.nombre)
    };
  }

  return { origen: 'concierto', deteccion: 'concierto', candidatos: [] };
}

function armaduraInicial(parte: MusicXmlElement): number {
  for (const atributos of Array.from(parte.getElementsByTagName('attributes'))) {
    const fifths = atributos.getElementsByTagName('fifths')[0];
    const armadura = Number(fifths?.textContent);
    if (Number.isFinite(armadura)) {
      return armadura;
    }
  }

  return 0;
}

function alterDeArmadura(armadura: number, paso: Paso): number {
  if (armadura > 0) {
    return SOSTENIDOS.slice(0, armadura).includes(paso) ? 1 : 0;
  }
  if (armadura < 0) {
    return BEMOLES.slice(0, -armadura).includes(paso) ? -1 : 0;
  }

  return 0;
}

function simboloBase(alter: number): string | undefined {
  if (alter === 0) return 'natural';
  if (alter === 1) return 'sharp';
  if (alter === -1) return 'flat';
  if (alter === 2) return 'double-sharp';
  if (alter === -2) return 'flat-flat';
  return undefined;
}

function simboloAccidental(
  alter: number,
  enArmadura: number,
  anterior: number | undefined
): string | undefined {
  if (anterior === alter) {
    return undefined;
  }

  if (alter === enArmadura && anterior === undefined) {
    return undefined;
  }

  if (alter === 0) return 'natural';
  if (alter === 1) return 'sharp';
  if (alter === -1) return 'flat';
  if (alter === 2) return 'double-sharp';
  if (alter === -2) return 'flat-flat';

  return undefined;
}

function actualizarAccidental(
  notaElemento: MusicXmlElement,
  resultado: Nota,
  armadura: number,
  clave: string,
  accidentales: Map<string, number>
): void {
  const anterior = accidentales.get(clave);
  const simbolo = simboloAccidental(
    resultado.alter,
    alterDeArmadura(armadura, resultado.paso),
    anterior
  );
  accidentales.set(clave, resultado.alter);

  const actual = primerHijo(notaElemento, 'accidental');

  if (!simbolo) {
    if (actual?.getAttribute('cautionary') === 'yes') {
      const simboloAdvertido = simboloBase(resultado.alter);
      if (simboloAdvertido) {
        actual.textContent = simboloAdvertido;
      } else {
        notaElemento.removeChild(actual);
      }
    } else if (actual) {
      notaElemento.removeChild(actual);
    }
    return;
  }

  if (actual) {
    actual.textContent = simbolo;
    return;
  }

  fijarTexto(notaElemento, 'accidental', simbolo);
}

function transponerRaizArmonia(
  contenedor: MusicXmlElement,
  pasoNombre: string,
  alterNombre: string,
  intervalo: ReturnType<typeof intervaloDesdeTranspose>,
  armadura: number,
  preferir: PreferenciaEnarmonia | undefined,
  avisos: string[]
): void {
  const paso = leerPaso(textoDe(contenedor, pasoNombre));

  if (!paso) {
    return;
  }

  const resultado = transponerNotaConArmadura(
    nota(paso, numeroDe(contenedor, alterNombre) ?? 0, 4),
    intervalo,
    armadura,
    preferir
  );
  avisos.push(...resultado.avisos);

  fijarTexto(contenedor, pasoNombre, resultado.nota.paso);
  fijarTexto(contenedor, alterNombre, resultado.nota.alter);
}

function estaLigada(elemento: MusicXmlElement, tipo: 'start' | 'stop' | 'continue'): boolean {
  return [...elemento.getElementsByTagName('tie'), ...elemento.getElementsByTagName('tied')].some(
    (ligadura) => ligadura.getAttribute('type') === tipo
  );
}

function transponerNotaElemento(
  elemento: MusicXmlElement,
  intervalo: ReturnType<typeof intervaloDesdeTranspose>,
  armaduraCalculo: number,
  armaduraEscrita: number,
  preferir: PreferenciaEnarmonia | undefined,
  accidentales: Map<string, number>,
  ligadasEntrantes: Map<string, number>,
  ligadasSalientes: Map<string, number>,
  avisos: string[]
): void {
  const pitch = primerHijo(elemento, 'pitch');

  if (!pitch) {
    return;
  }

  const paso = leerPaso(textoDe(pitch, 'step'));
  const octava = numeroDe(pitch, 'octave');

  if (!paso || octava === undefined) {
    return;
  }

  const resultado = transponerNotaConArmadura(
    nota(paso, numeroDe(pitch, 'alter') ?? 0, octava),
    intervalo,
    armaduraCalculo,
    preferir
  );
  avisos.push(...resultado.avisos);

  fijarTexto(pitch, 'step', resultado.nota.paso);
  fijarTexto(pitch, 'alter', resultado.nota.alter);
  fijarTexto(pitch, 'octave', resultado.nota.octava);

  const clave = [
    textoDe(elemento, 'staff') ?? '1',
    `${resultado.nota.paso}${resultado.nota.octava}`
  ].join(':');

  const empiezaLigadura = estaLigada(elemento, 'start') || estaLigada(elemento, 'continue');
  const terminaLigadura = estaLigada(elemento, 'stop');

  if (terminaLigadura && ligadasEntrantes.get(clave) === resultado.nota.alter) {
    // Nota ligada desde el compás anterior: no lleva alteración y NO cambia el estado del
    // compás (las demás notas iguales de este compás necesitan su alteración otra vez).
    actualizarAccidental(
      elemento,
      resultado.nota,
      armaduraEscrita,
      clave,
      new Map([[clave, resultado.nota.alter]])
    );
    ligadasEntrantes.delete(clave);
  } else {
    actualizarAccidental(elemento, resultado.nota, armaduraEscrita, clave, accidentales);
  }

  if (empiezaLigadura) {
    ligadasSalientes.set(clave, resultado.nota.alter);
  } else if (terminaLigadura) {
    // La ligadura acaba dentro de este mismo compás: no pasa al siguiente.
    ligadasSalientes.delete(clave);
  }
}

function definicionesClave(clave: Clave): Array<{ sign: string; line: number; octave?: number }> {
  switch (clave) {
    case 'fa':
      return [{ sign: 'F', line: 4 }];
    case 'do3':
      return [{ sign: 'C', line: 3 }];
    case 'do4':
      return [{ sign: 'C', line: 4 }];
    case 'sol8':
      return [{ sign: 'G', line: 2, octave: -1 }];
    case 'sol+fa':
      return [
        { sign: 'G', line: 2 },
        { sign: 'F', line: 4 }
      ];
    case 'sol-o-fa':
      return [{ sign: 'G', line: 2 }];
    case 'fa-o-do4-o-sol':
      return [{ sign: 'F', line: 4 }];
    case 'percusion':
      return [{ sign: 'percussion', line: 1 }];
    case 'sol':
      return [{ sign: 'G', line: 2 }];
  }
}

function escribirClaves(atributos: MusicXmlElement, clave: Clave): void {
  const actuales = hijos(atributos, 'clef');
  const documento = atributos.ownerDocument;
  if (!documento) {
    return;
  }

  const definiciones = definicionesClave(clave);
  const numeros = actuales.map((actual) => actual.getAttribute('number') ?? undefined);
  const referencia =
    primerHijo(atributos, 'staff-details') ?? primerHijo(atributos, 'transpose') ?? null;

  if (definiciones.length > 1) {
    fijarTexto(atributos, 'staves', definiciones.length);
  }

  for (const actual of actuales) {
    atributos.removeChild(actual);
  }

  definiciones.forEach((definicion, indice) => {
    const elemento = documento.createElement('clef');
    const numero = definiciones.length > 1 ? indice + 1 : numeros[0];
    if (numero !== undefined) {
      fijarAtributo(elemento, 'number', numero);
    }
    fijarTexto(elemento, 'sign', definicion.sign);
    fijarTexto(elemento, 'line', definicion.line);
    if (definicion.octave !== undefined) {
      fijarTexto(elemento, 'clef-octave-change', definicion.octave);
    }
    atributos.insertBefore(elemento, referencia);
  });
}

function escribirArmaduras(
  atributos: MusicXmlElement,
  delta: number,
  armaduraOrigen: number,
  preferir: PreferenciaEnarmonia | undefined,
  forzarCero: boolean
): number {
  const keys = hijos(atributos, 'key');

  if (keys.length === 0) {
    const key = atributos.ownerDocument?.createElement('key');
    if (!key) {
      return 0;
    }
    const bruta = forzarCero ? 0 : armaduraOrigen + delta;
    const armadura = normalizarArmadura(bruta, preferir).armadura;
    fijarTexto(key, 'fifths', armadura);
    const referencia =
      primerHijo(atributos, 'time') ??
      primerHijo(atributos, 'clef') ??
      primerHijo(atributos, 'transpose') ??
      null;
    atributos.insertBefore(key, referencia);
    return bruta;
  }

  let primera = 0;

  keys.forEach((key, indice) => {
    const fifths = primerHijo(key, 'fifths');
    const origen = Number(fifths?.textContent ?? 0);
    const bruta = forzarCero ? 0 : origen + delta;
    const escrita = forzarCero ? 0 : normalizarArmadura(bruta, preferir).armadura;

    fijarTexto(key, 'fifths', escrita);

    // <cancel> indica qué armadura anterior se anula con becuadros: se transpone igual.
    const cancel = primerHijo(key, 'cancel');
    if (cancel) {
      const anulada = forzarCero
        ? 0
        : normalizarArmadura(Number(cancel.textContent ?? 0) + delta, preferir).armadura;
      if (anulada === 0 || anulada === escrita) {
        key.removeChild(cancel);
      } else {
        cancel.textContent = String(anulada);
      }
    }

    if (indice === 0) {
      primera = bruta;
    }
  });

  return primera;
}

function escribirTranspose(atributos: MusicXmlElement, hasta: DestinoTransposicion): void {
  const actuales = hijos(atributos, 'transpose');
  const instrumento = resolverInstrumento(hasta);

  for (const actual of actuales.slice(1)) {
    atributos.removeChild(actual);
  }

  const sinTransposicion =
    instrumento?.transpose.diatonic === 0 &&
    instrumento.transpose.chromatic === 0 &&
    instrumento.transpose.octaveChange === 0;

  if (!instrumento || sinTransposicion) {
    for (const actual of actuales) {
      atributos.removeChild(actual);
    }
    return;
  }

  const elemento = actuales[0] ?? atributos.ownerDocument?.createElement('transpose');
  if (!elemento) {
    return;
  }
  if (actuales.length === 0) {
    atributos.appendChild(elemento);
  }

  quitarHijos(elemento, 'diatonic');
  quitarHijos(elemento, 'chromatic');
  quitarHijos(elemento, 'octave-change');
  fijarTexto(elemento, 'diatonic', instrumento.transpose.diatonic);
  fijarTexto(elemento, 'chromatic', instrumento.transpose.chromatic);
  if (instrumento.transpose.octaveChange !== 0) {
    fijarTexto(elemento, 'octave-change', instrumento.transpose.octaveChange);
  }
}

function transponerArmonia(
  elemento: MusicXmlElement,
  intervalo: ReturnType<typeof intervaloDesdeTranspose>,
  armadura: number,
  preferir: PreferenciaEnarmonia | undefined,
  avisos: string[]
): void {
  for (const nombre of ['root', 'bass'] as const) {
    for (const contenedor of hijos(elemento, nombre)) {
      transponerRaizArmonia(
        contenedor,
        nombre === 'root' ? 'root-step' : 'bass-step',
        nombre === 'root' ? 'root-alter' : 'bass-alter',
        intervalo,
        armadura,
        preferir,
        avisos
      );
    }
  }
}

export function filtrarPartes(
  documento: MusicXmlDocument,
  opciones: Pick<OpcionesTransponerPartitura, 'partes' | 'pentagrama'>
): void {
  if (opciones.partes) {
    const permitidas = new Set(opciones.partes);

    for (const scorePart of Array.from(documento.getElementsByTagName('score-part'))) {
      if (!permitidas.has(scorePart.getAttribute('id') ?? '')) {
        scorePart.parentNode?.removeChild(scorePart);
      }
    }
    for (const parte of Array.from(documento.getElementsByTagName('part'))) {
      if (!permitidas.has(parte.getAttribute('id') ?? '')) {
        parte.parentNode?.removeChild(parte);
      }
    }
  }

  if (opciones.pentagrama === undefined) {
    return;
  }

  const deseado = opciones.pentagrama;
  const totalPentagramas = Number(documento.getElementsByTagName('staves')[0]?.textContent ?? 1);
  const conPentagramaPorDefecto = ['note', 'direction', 'harmony'];

  for (const elemento of Array.from(documento.getElementsByTagName('*'))) {
    if (
      !['note', 'direction', 'harmony', 'attributes', 'clef', 'staff-details'].includes(
        elemento.nodeName
      )
    ) {
      continue;
    }

    const textoNumero =
      elemento.getAttribute('number') ??
      Array.from(elemento.getElementsByTagName('staff'))[0]?.textContent ??
      undefined;
    let numero = textoNumero === undefined ? undefined : Number(textoNumero);

    if (numero === undefined && conPentagramaPorDefecto.includes(elemento.nodeName)) {
      numero = 1;
    }
    if (numero === undefined && elemento.nodeName === 'clef' && totalPentagramas > 1) {
      numero = 1;
    }

    if (numero !== undefined && numero !== deseado) {
      elemento.parentNode?.removeChild(elemento);
      continue;
    }

    if (elemento.nodeName === 'clef' || elemento.nodeName === 'staff-details') {
      elemento.removeAttribute('number');
    }
    if (conPentagramaPorDefecto.includes(elemento.nodeName)) {
      const staff = Array.from(elemento.getElementsByTagName('staff'))[0];
      if (staff) {
        staff.textContent = '1';
      }
    }
  }

  for (const staves of documento.getElementsByTagName('staves')) {
    staves.textContent = '1';
  }
}

function quitarBackupsFinales(documento: MusicXmlDocument): void {
  for (const measure of Array.from(documento.getElementsByTagName('measure'))) {
    let ultimo = measure.lastChild;
    while (ultimo && (ultimo.nodeType !== 1 || ultimo.nodeName === 'backup')) {
      const anterior = ultimo.previousSibling;
      if (ultimo.nodeType === 1) {
        measure.removeChild(ultimo);
      }
      ultimo = anterior;
    }
  }
}

export function transponerPartitura(
  documento: MusicXmlDocument,
  opciones: OpcionesTransponerPartitura
): InformeTransposicionPartitura {
  const avisos: string[] = [];
  filtrarPartes(documento, opciones);
  const destinoUnico = resolverInstrumento(opciones.hasta);
  if (
    destinoUnico &&
    definicionesClave(destinoUnico.clave).length === 1 &&
    opciones.pentagrama === undefined
  ) {
    const partesNombre = new Map(
      Array.from(documento.getElementsByTagName('score-part')).map((sp) => [
        sp.getAttribute('id') ?? '',
        textoDe(sp, 'part-name') ?? sp.getAttribute('id') ?? ''
      ])
    );
    for (const parte of Array.from(documento.getElementsByTagName('part'))) {
      const staves = Number(parte.getElementsByTagName('staves')[0]?.textContent ?? 1);
      if (staves > 1) {
        avisos.push(
          `"${partesNombre.get(parte.getAttribute('id') ?? '') ?? ''}" tiene ${staves} pentagramas; ` +
            `${destinoUnico.nombre} solo lee uno, así que se ha transcrito el superior (mano derecha). ` +
            'Elige otro pentagrama si lo necesitas.'
        );
      }
    }
    filtrarPartes(documento, { pentagrama: 1 });
  }
  if (opciones.pentagrama !== undefined || destinoUnico) {
    quitarBackupsFinales(documento);
  }

  const partes: ParteTranspuesta[] = [];
  const dudas: DudaInstrumento[] = [];
  const nombres = new Map<string, MusicXmlElement>(
    Array.from(documento.getElementsByTagName('score-part')).map((elemento) => [
      elemento.getAttribute('id') ?? '',
      elemento
    ])
  );

  for (const parte of Array.from(documento.getElementsByTagName('part'))) {
    const id = parte.getAttribute('id') ?? '';
    const scorePart = nombres.get(id) ?? parte;
    const nombre = textoDe(scorePart, 'part-name') ?? id;
    const nombresBusqueda = [
      nombre,
      textoDe(scorePart, 'part-abbreviation'),
      scorePart.getElementsByTagName('instrument-name')[0]?.textContent ?? undefined,
      parte.getElementsByTagName('instrument-name')[0]?.textContent ?? undefined
    ].filter((valor): valor is string => Boolean(valor?.trim()));
    const { origen, deteccion, candidatos } = detectarOrigen(opciones, parte, nombresBusqueda);

    if (candidatos.length > 1) {
      dudas.push({ id, nombre, candidatos });
    }
    const conArmadura = resolverInstrumento(origen);
    const armaduraBase = conArmadura?.sinArmadura ? 0 : armaduraInicial(parte);
    const plan = planificarTransposicion({
      desde: origen,
      hasta: opciones.hasta,
      armaduraOrigen: armaduraBase,
      cambioTonalidad: opciones.cambioTonalidad,
      preferir: opciones.preferir
    });
    const delta = plan.armaduraDestino - armaduraBase;
    const destino = resolverInstrumento(opciones.hasta);
    const destinoSinArmadura = Boolean(destino?.sinArmadura);
    let armaduraOrigenActual = armaduraBase;
    let ligadasEntrantes = new Map<string, number>();

    if (deteccion === 'concierto') {
      avisos.push(`No se pudo identificar "${nombre}"; se trató como parte en concierto.`);
    }

    if (opciones.actualizarNombres !== false && destino) {
      const scorePart = nombres.get(id);
      if (scorePart) {
        fijarTexto(scorePart, 'part-name', destino.nombre);
        fijarTexto(scorePart, 'part-abbreviation', destino.abreviatura);
      }
      for (const instrumento of parte.getElementsByTagName('instrument-name')) {
        instrumento.textContent = destino.nombre;
      }
    }

    if (parte.getElementsByTagName('attributes').length === 0) {
      const primeraMedida = hijos(parte, 'measure')[0];
      const atributos = primeraMedida?.ownerDocument?.createElement('attributes');
      if (primeraMedida && atributos) {
        fijarTexto(atributos, 'divisions', 1);
        primeraMedida.insertBefore(atributos, primeraMedida.firstChild);
      }
    }

    for (const measure of hijos(parte, 'measure')) {
      const accidentales = new Map<string, number>();
      const ligadasSalientes = new Map<string, number>();

      for (const nodo of Array.from(measure.childNodes)) {
        if (nodo.nodeType !== 1) {
          continue;
        }

        const elemento = nodo as MusicXmlElement;

        if (elemento.nodeName === 'attributes') {
          const fifths = elemento.getElementsByTagName('fifths')[0]?.textContent ?? undefined;
          let cambioArmadura = false;
          if (fifths !== undefined && !conArmadura?.sinArmadura) {
            const leido = Number(fifths);
            if (Number.isFinite(leido) && leido !== armaduraOrigenActual) {
              armaduraOrigenActual = leido;
              cambioArmadura = true;
            }
          }
          if (cambioArmadura) {
            accidentales.clear();
          }

          escribirArmaduras(
            elemento,
            delta,
            armaduraOrigenActual,
            opciones.preferir,
            destinoSinArmadura || Boolean(conArmadura?.sinArmadura)
          );
          escribirTranspose(elemento, opciones.hasta);
          if (opciones.actualizarClaves !== false && destino) {
            escribirClaves(elemento, destino.clave);
          }
          continue;
        }

        const armaduraBruta = armaduraOrigenActual + delta;
        const armaduraCalculo = destinoSinArmadura ? 0 : armaduraBruta;
        const armaduraEscrita = destinoSinArmadura
          ? 0
          : normalizarArmadura(armaduraBruta, opciones.preferir).armadura;

        if (elemento.nodeName === 'note') {
          transponerNotaElemento(
            elemento,
            plan.intervalo,
            armaduraCalculo,
            armaduraEscrita,
            opciones.preferir,
            accidentales,
            ligadasEntrantes,
            ligadasSalientes,
            avisos
          );
          continue;
        }

        if (elemento.nodeName === 'harmony' && opciones.transponerCifrado !== false) {
          transponerArmonia(elemento, plan.intervalo, armaduraCalculo, opciones.preferir, avisos);
        }
      }

      ligadasEntrantes = ligadasSalientes;
    }

    partes.push({ id, nombre, origen, deteccion });
  }

  return { avisos: [...new Set(avisos)], partes, dudas };
}
