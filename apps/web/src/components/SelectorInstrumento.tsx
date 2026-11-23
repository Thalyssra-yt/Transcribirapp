import {
  INSTRUMENTOS,
  buscarInstrumento,
  type Agrupacion,
  type Instrumento
} from '@transcriptor/core';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

interface SelectorInstrumentoProps {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  permitirAuto?: boolean;
  permitirConcierto?: boolean;
  favoritos: readonly string[];
}

interface OpcionInstrumento {
  id: string;
  nombre: string;
  afinacion: string;
}

interface GrupoOpciones {
  nombre: string;
  opciones: OpcionInstrumento[];
}

const AGRUPACIONES: readonly Agrupacion[] = [
  'orquesta',
  'banda',
  'brass-band',
  'big-band',
  'camara',
  'coro',
  'moderna',
  'historico'
];

const ETIQUETAS_AGRUPACION: Record<Agrupacion, string> = {
  orquesta: 'Orquesta',
  banda: 'Banda',
  'brass-band': 'Brass band',
  'big-band': 'Big band',
  camara: 'Cámara',
  coro: 'Coro',
  moderna: 'Moderna',
  historico: 'Histórico'
};

const OPCION_AUTO: OpcionInstrumento = {
  id: 'auto',
  nombre: 'Detección automática',
  afinacion: ''
};

const OPCION_CONCIERTO: OpcionInstrumento = {
  id: 'concierto',
  nombre: 'Concierto (en Do)',
  afinacion: ''
};

function comoOpcion(instrumento: Instrumento): OpcionInstrumento {
  return {
    id: instrumento.id,
    nombre: instrumento.nombre,
    afinacion: instrumento.afinacion
  };
}

function describeValor(valor: string): OpcionInstrumento {
  if (valor === 'auto') {
    return OPCION_AUTO;
  }
  if (valor === 'concierto') {
    return OPCION_CONCIERTO;
  }

  const instrumento = INSTRUMENTOS.find((candidato) => candidato.id === valor);
  return instrumento ? comoOpcion(instrumento) : { id: valor, nombre: valor, afinacion: '' };
}

function textoOpcion(opcion: OpcionInstrumento): string {
  return opcion.afinacion ? `${opcion.nombre} ${opcion.afinacion}` : opcion.nombre;
}

export function SelectorInstrumento({
  id,
  etiqueta,
  valor,
  onChange,
  permitirAuto = false,
  permitirConcierto = false,
  favoritos
}: SelectorInstrumentoProps) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [activo, setActivo] = useState(0);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const boton = useRef<HTMLButtonElement | null>(null);
  const entrada = useRef<HTMLInputElement | null>(null);
  const listado = useRef<HTMLDivElement | null>(null);
  const seleccion = describeValor(valor);
  const idLista = `${id}-lista`;

  const grupos = useMemo<GrupoOpciones[]>(() => {
    const consultaMinuscula = consulta.trim().toLocaleLowerCase('es');
    const idsEncontrados = consultaMinuscula
      ? new Set(buscarInstrumento(consultaMinuscula).map((instrumento) => instrumento.id))
      : undefined;
    const coincide = (opcion: OpcionInstrumento) =>
      !consultaMinuscula || textoOpcion(opcion).toLocaleLowerCase('es').includes(consultaMinuscula);
    const permitido = (instrumento: Instrumento) =>
      !idsEncontrados || idsEncontrados.has(instrumento.id);

    const generales = [
      ...(permitirAuto ? [OPCION_AUTO] : []),
      ...(permitirConcierto ? [OPCION_CONCIERTO] : [])
    ].filter(coincide);

    const favoritosVisibles = INSTRUMENTOS.filter(
      (instrumento) => favoritos.includes(instrumento.id) && permitido(instrumento)
    ).map(comoOpcion);

    const agrupaciones = AGRUPACIONES.map((agrupacion) => ({
      nombre: ETIQUETAS_AGRUPACION[agrupacion],
      opciones: INSTRUMENTOS.filter(
        (instrumento) =>
          !favoritos.includes(instrumento.id) &&
          instrumento.agrupaciones.includes(agrupacion) &&
          permitido(instrumento)
      ).map(comoOpcion)
    })).filter((grupo) => grupo.opciones.length > 0);

    return [
      ...(generales.length > 0 ? [{ nombre: 'Generales', opciones: generales }] : []),
      ...(favoritosVisibles.length > 0
        ? [{ nombre: 'Favoritos', opciones: favoritosVisibles }]
        : []),
      ...agrupaciones
    ];
  }, [consulta, favoritos, permitirAuto, permitirConcierto]);

  const opcionesPlanas = useMemo(() => grupos.flatMap((grupo) => grupo.opciones), [grupos]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const indice = opcionesPlanas.findIndex((opcion) => opcion.id === valor);
    setActivo(indice < 0 ? 0 : indice);
  }, [abierto, consulta, opcionesPlanas, valor]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const marco = requestAnimationFrame(() => entrada.current?.focus());
    const cerrarAlFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };

    document.addEventListener('mousedown', cerrarAlFuera);
    return () => {
      cancelAnimationFrame(marco);
      document.removeEventListener('mousedown', cerrarAlFuera);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    listado.current
      ?.querySelector<HTMLElement>(`[id="${id}-opcion-${activo}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [abierto, activo, id]);

  function elegir(opcion: OpcionInstrumento): void {
    onChange(opcion.id);
    setAbierto(false);
    boton.current?.focus();
  }

  function alPulsar(evento: KeyboardEvent<HTMLInputElement>): void {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setActivo((actual) => Math.min(actual + 1, opcionesPlanas.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setActivo((actual) => Math.max(actual - 1, 0));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const opcion = opcionesPlanas[activo];
      if (opcion) {
        elegir(opcion);
      }
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      setAbierto(false);
      boton.current?.focus();
    }
  }

  let indicePlano = -1;

  return (
    <div className="selector-instrumento" ref={contenedor}>
      <span className="etiqueta" id={`${id}-etiqueta`}>
        {etiqueta}
      </span>
      <button
        aria-controls={abierto ? idLista : undefined}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-etiqueta ${id}-seleccion`}
        className="campo selector-boton"
        id={id}
        onClick={() => {
          setConsulta('');
          setAbierto((actual) => !actual);
        }}
        ref={boton}
        type="button"
      >
        <span className="min-w-0 flex-1 text-left" id={`${id}-seleccion`}>
          <span className="block font-semibold">{seleccion.nombre}</span>
          {seleccion.afinacion ? (
            <span className="texto-fuerte text-xs">{seleccion.afinacion}</span>
          ) : null}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>

      {abierto ? (
        <div className="selector-panel">
          <input
            aria-activedescendant={opcionesPlanas[activo] ? `${id}-opcion-${activo}` : undefined}
            aria-autocomplete="list"
            aria-controls={idLista}
            aria-expanded="true"
            aria-label={`Buscar instrumento para ${etiqueta}`}
            className="campo"
            onChange={(evento) => setConsulta(evento.target.value)}
            onKeyDown={alPulsar}
            placeholder="Buscar instrumento…"
            ref={entrada}
            role="combobox"
            type="search"
            value={consulta}
          />
          <div className="selector-listado" id={idLista} ref={listado} role="listbox">
            {opcionesPlanas.length === 0 ? (
              <p className="p-3 text-sm texto-fuerte">No hay instrumentos con ese nombre.</p>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.nombre} role="group" aria-label={grupo.nombre}>
                  <p className="selector-grupo">{grupo.nombre}</p>
                  {grupo.opciones.map((opcion) => {
                    indicePlano += 1;
                    const indice = indicePlano;
                    return (
                      <button
                        aria-selected={opcion.id === valor}
                        className={`selector-opcion ${indice === activo ? 'selector-opcion-activa' : ''}`}
                        id={`${id}-opcion-${indice}`}
                        key={opcion.id}
                        onClick={() => elegir(opcion)}
                        role="option"
                        type="button"
                      >
                        <span className="min-w-0 flex-1 whitespace-normal break-words text-left">
                          {opcion.nombre}
                        </span>
                        {opcion.afinacion ? (
                          <span className="selector-afinacion">{opcion.afinacion}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
