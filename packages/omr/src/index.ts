export interface OmrPagina {
  datos: Uint8Array;
  tipoMime: string;
}

export interface OmrEntrada {
  paginas: OmrPagina[];
  nombre?: string;
}

export interface OmrOpciones {
  permitirRed?: boolean;
  idioma?: string;
}

export interface OmrCompasDudoso {
  parte: string;
  compas: number;
  motivo: string;
}

export interface OmrNotaConAlternativa {
  parte: string;
  compas: number;
  indice: number;
  alternativa: string;
}

export interface OmrInforme {
  confianza: number;
  compasesDudosos: OmrCompasDudoso[];
  notasConAlternativa: OmrNotaConAlternativa[];
  pareceTransportada: boolean | null;
  avisos: string[];
}

export interface OmrResultado {
  musicxml: string;
  informe: OmrInforme;
}

export interface OmrProvider {
  id: string;
  nombre: string;
  soporta: {
    impresa: boolean;
    manuscrita: boolean;
    pdf: boolean;
  };
  requiereRed: boolean;
  reconocer(entrada: OmrEntrada, opciones: OmrOpciones, senal?: AbortSignal): Promise<OmrResultado>;
}
