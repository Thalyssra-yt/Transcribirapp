export type ValorOpcion = string | true | string[];

export interface DefinicionOpcion {
  nombre: string;
  alias?: string;
  booleana?: boolean;
  multiple?: boolean;
}

export interface Argumentos {
  posicionales: string[];
  opciones: Record<string, ValorOpcion>;
}

function esBanderaConocida(token: string, definiciones: Map<string, DefinicionOpcion>): boolean {
  const prefijo = token.startsWith('--') ? '--' : token.startsWith('-') ? '-' : '';
  if (!prefijo) {
    return false;
  }

  const clave = token.slice(prefijo.length).split('=', 1)[0];

  return definiciones.has(clave);
}

export function parseArgumentos(
  argv: readonly string[],
  definiciones: readonly DefinicionOpcion[]
): Argumentos {
  const porClave = new Map<string, DefinicionOpcion>();

  for (const definicion of definiciones) {
    porClave.set(definicion.nombre, definicion);
    if (definicion.alias) {
      porClave.set(definicion.alias, definicion);
    }
  }

  const posicionales: string[] = [];
  const opciones: Record<string, ValorOpcion> = {};

  for (let indice = 0; indice < argv.length; indice += 1) {
    const token = argv[indice];

    if (token === '--') {
      posicionales.push(...argv.slice(indice + 1));
      break;
    }

    if (!token.startsWith('-') || /^-\d+$/.test(token)) {
      posicionales.push(token);
      continue;
    }

    const igual = token.indexOf('=');
    const forma = igual === -1 ? token : token.slice(0, igual);
    const prefijo = forma.startsWith('--') ? 2 : 1;
    const clave = forma.slice(prefijo);
    const definicion = porClave.get(clave);

    if (!definicion) {
      throw new Error(`Opción desconocida: ${forma}`);
    }

    const nombre = definicion.nombre;
    const enLinea = igual === -1 ? undefined : token.slice(igual + 1);

    if (definicion.booleana) {
      if (enLinea !== undefined) {
        throw new Error(`La opción ${forma} no admite valor`);
      }
      opciones[nombre] = true;
      continue;
    }

    let valor = enLinea;

    if (valor === undefined) {
      indice += 1;
      const siguiente = argv[indice];

      if (
        siguiente === undefined ||
        (siguiente.startsWith('-') && esBanderaConocida(siguiente, porClave))
      ) {
        throw new Error(`La opción ${forma} necesita un valor`);
      }

      valor = siguiente;
    }

    if (definicion.multiple) {
      const anteriores = opciones[nombre];
      opciones[nombre] = Array.isArray(anteriores) ? [...anteriores, valor] : [valor];
    } else {
      opciones[nombre] = valor;
    }
  }

  return { posicionales, opciones };
}

export function textoOpcion(args: Argumentos, nombre: string): string | undefined {
  const valor = args.opciones[nombre];

  return typeof valor === 'string' ? valor : undefined;
}

export function textoSOpciones(args: Argumentos, nombre: string): string[] {
  const valor = args.opciones[nombre];

  if (Array.isArray(valor)) {
    return valor;
  }

  return typeof valor === 'string' ? [valor] : [];
}

export function esBooleana(args: Argumentos, nombre: string): boolean {
  return args.opciones[nombre] === true;
}
