import {
  INSTRUMENTOS,
  VERSION,
  type DestinoTransposicion,
  type OrigenPartitura
} from '@transcriptor/core';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { MenuDescarga } from './components/MenuDescarga';
import { SelectorInstrumento } from './components/SelectorInstrumento';
import { VisorPartitura, type NotaResaltada } from './components/VisorPartitura';
import {
  TONALIDADES,
  cargarEjemplo,
  descargarPartitura,
  leerPartitura,
  transponerPartituraWeb,
  type ArchivoPartitura,
  type OpcionesTranscripcion,
  type ResultadoTranscripcion
} from './lib/partitura';
import type {
  RespuestaTranscripcion,
  SolicitudTranscripcion
} from './workers/transcripcion.worker';

const FAVORITOS = [
  'saxo-tenor',
  'saxo-alto',
  'clarinete-sib',
  'trompeta-sib',
  'trompa-fa',
  'flauta'
] as const;

type Direccion = 'cercana' | 'arriba' | 'abajo';
type Preferencia = '' | 'sostenidos' | 'bemoles';

interface Aviso {
  id: string;
  texto: string;
  compas?: string;
}

interface OpcionesAvanzadasProps {
  idPrefix: string;
  direccion: Direccion;
  preferir: Preferencia;
  onDireccion: (valor: Direccion) => void;
  onPreferir: (valor: Preferencia) => void;
}

interface ControlOctavaProps {
  valor: number;
  onChange: (valor: number) => void;
}

interface SelectorTonalidadProps {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
}

function nombreInstrumento(id: string): string {
  if (id === 'auto') {
    return 'Concierto';
  }
  if (id === 'concierto') {
    return 'Concierto';
  }

  return INSTRUMENTOS.find((instrumento) => instrumento.id === id)?.nombre ?? id;
}

function afinacionInstrumento(id: string): string {
  return id === 'auto' || id === 'concierto'
    ? ''
    : (INSTRUMENTOS.find((instrumento) => instrumento.id === id)?.afinacion ?? '');
}

function nombreVisible(id: string): string {
  const nombre = nombreInstrumento(id);
  const afinacion = afinacionInstrumento(id);
  const sufijo = ` en ${afinacion}`;

  return afinacion && nombre.endsWith(sufijo) ? nombre.slice(0, -sufijo.length) : nombre;
}

function origenSeguro(id: string): OrigenPartitura {
  if (id === 'auto') {
    return 'auto';
  }

  return (INSTRUMENTOS.find((instrumento) => instrumento.id === id)?.id ??
    'auto') as OrigenPartitura;
}

function destinoSeguro(id: string): DestinoTransposicion {
  if (id === 'concierto') {
    return 'concierto';
  }

  return (INSTRUMENTOS.find((instrumento) => instrumento.id === id)?.id ??
    'concierto') as DestinoTransposicion;
}

function listaNombres(nombres: readonly string[]): string {
  if (nombres.length <= 1) {
    return nombres[0] ?? '';
  }
  if (nombres.length === 2) {
    return `${nombres[0]} o ${nombres[1]}`;
  }

  return `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}`;
}

function textoEstado(): string {
  return 'Transcripción lista';
}

function textoBotonCargar(nombre: string | undefined): string {
  return nombre ? `Cambiar partitura (${nombre})` : 'Abrir partitura';
}

function limitarOctava(valor: number): number {
  return Math.max(-2, Math.min(2, valor));
}

export function bajarOctavaDesde(octavaActual: number): number {
  return limitarOctava(octavaActual - 1);
}

function OpcionesAvanzadas({
  idPrefix,
  direccion,
  preferir,
  onDireccion,
  onPreferir
}: OpcionesAvanzadasProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="etiqueta" htmlFor={`${idPrefix}-direccion`}>
          Dirección
        </label>
        <select
          className="campo"
          id={`${idPrefix}-direccion`}
          onChange={(evento) => onDireccion(evento.target.value as Direccion)}
          value={direccion}
        >
          <option value="cercana">Más cercana</option>
          <option value="arriba">Hacia arriba</option>
          <option value="abajo">Hacia abajo</option>
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor={`${idPrefix}-preferir`}>
          Enarmonía
        </label>
        <select
          className="campo"
          id={`${idPrefix}-preferir`}
          onChange={(evento) => onPreferir(evento.target.value as Preferencia)}
          value={preferir}
        >
          <option value="">Automática</option>
          <option value="sostenidos">Preferir sostenidos</option>
          <option value="bemoles">Preferir bemoles</option>
        </select>
      </div>
    </div>
  );
}

function ControlOctava({ valor, onChange }: ControlOctavaProps) {
  return (
    <div className="control-octava">
      <span className="etiqueta">Octava</span>
      <div className="flex items-center gap-1">
        <button
          aria-label="Bajar una octava"
          className="boton-icono"
          disabled={valor <= -2}
          onClick={() => onChange(limitarOctava(valor - 1))}
          type="button"
        >
          −
        </button>
        <output aria-label={`Octava ${valor}`} className="min-w-8 text-center font-semibold">
          {valor}
        </output>
        <button
          aria-label="Subir una octava"
          className="boton-icono"
          disabled={valor >= 2}
          onClick={() => onChange(limitarOctava(valor + 1))}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SelectorTonalidad({ id, valor, onChange }: SelectorTonalidadProps) {
  return (
    <div className="control-tonalidad">
      <label className="etiqueta" htmlFor={id}>
        Tonalidad
      </label>
      <select
        className="campo control-compacto"
        id={id}
        onChange={(evento) => onChange(evento.target.value)}
        value={valor}
      >
        <option value="">Mantener armadura</option>
        {TONALIDADES.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

export function App() {
  const entrada = useRef<HTMLInputElement | null>(null);
  const hilo = useRef<Worker | null>(null);
  const idSolicitud = useRef(0);
  const hoja = useRef<HTMLDivElement | null>(null);
  const botonOpciones = useRef<HTMLButtonElement | null>(null);
  const [archivo, setArchivo] = useState<ArchivoPartitura | null>(null);
  const [desde, setDesde] = useState('auto');
  const [hasta, setHasta] = useState('saxo-tenor');
  const [tonalidadId, setTonalidadId] = useState('');
  const [direccion, setDireccion] = useState<Direccion>('cercana');
  const [preferir, setPreferir] = useState<Preferencia>('');
  const [octava, setOctava] = useState(0);
  const [partes, setPartes] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoTranscripcion | null>(null);
  const [mensaje, setMensaje] = useState('Carga una partitura para empezar.');
  const [error, setError] = useState('');
  const [vista, setVista] = useState<'original' | 'resultado'>('resultado');
  const [comparar, setComparar] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [esMovil, setEsMovil] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 767px)').matches
  );
  const hojaModal = hojaAbierta && esMovil;
  const [verDetalle, setVerDetalle] = useState(false);
  const [focoCompas, setFocoCompas] = useState<string | null>(null);

  const opciones = useMemo<OpcionesTranscripcion>(
    () => ({
      desde: origenSeguro(desde),
      hasta: destinoSeguro(hasta),
      partes,
      tonalidad: TONALIDADES.find((opcion) => opcion.id === tonalidadId),
      direccion,
      ...(preferir ? { preferir } : {}),
      octava
    }),
    [desde, direccion, hasta, octava, partes, preferir, tonalidadId]
  );

  const nombreOrigen =
    desde === 'auto'
      ? archivo?.instrumentoDetectado
        ? nombreInstrumento(archivo.instrumentoDetectado)
        : 'instrumento sin determinar'
      : nombreInstrumento(desde);
  const nombreHasta = nombreVisible(hasta);
  const afinacionHasta = afinacionInstrumento(hasta);
  const destinoConAfinacion = `${nombreHasta}${afinacionHasta ? ` (${afinacionHasta})` : ''}`;
  const resumenMovil = `→ ${destinoConAfinacion}`;

  const notasResaltadas = useMemo<NotaResaltada[]>(
    () =>
      resultado?.fuera.map((entrada) => ({
        compas: entrada.compas,
        nota: entrada.nota,
        parte: entrada.parte
      })) ?? [],
    [resultado]
  );

  const avisos = useMemo<Aviso[]>(() => {
    if (!resultado) {
      return [];
    }

    const lista: Aviso[] = [];

    for (const duda of archivo?.dudas ?? []) {
      lista.push({
        id: `duda-${duda.id}`,
        texto: `¿'${duda.nombre}' es ${listaNombres(duda.candidatos)}?`
      });
    }
    for (const aviso of resultado.avisos) {
      lista.push({ id: `aviso-${lista.length}`, texto: aviso });
    }
    for (const entrada of resultado.fuera) {
      lista.push({
        id: `fuera-${lista.length}`,
        texto: `${entrada.nota} — ${entrada.estado} (compás ${entrada.compas}).`,
        compas: entrada.compas
      });
    }
    if (resultado.octavaSugerida !== undefined) {
      lista.push({
        id: `octava-${lista.length}`,
        texto: `Prueba la octava ${
          resultado.octavaSugerida > 0 ? '+' : ''
        }${resultado.octavaSugerida} para acercar la música al registro del instrumento.`
      });
    }

    return lista;
  }, [archivo, resultado]);

  const descripcionOriginal = archivo
    ? `Partitura original de ${archivo.titulo ?? 'sin título'}, instrumento ${nombreOrigen}, tonalidad ${
        archivo.tonalidadOriginal ?? 'sin determinar'
      }, ${archivo.partes.length} parte(s), ${resultado?.compases ?? 0} compase(s).`
    : 'Sin partitura cargada.';
  const descripcionResultado = resultado
    ? `Partitura transcrita para ${nombreHasta || 'concierto'}, tonalidad ${resultado.tonalidad}, ${resultado.compases} compase(s).`
    : 'Sin partitura transcrita.';

  const instalarArchivo = useCallback((cargado: ArchivoPartitura) => {
    setArchivo(cargado);
    setPartes(cargado.partes.map((parte) => parte.id));
    setResultado(null);
    setError('');
    setVista('resultado');
    setComparar(false);
    setVerDetalle(false);
    setFocoCompas(null);
  }, []);

  async function cargarArchivo(archivoElegido: File): Promise<void> {
    setProcesando(true);
    setError('');

    try {
      instalarArchivo(await leerPartitura(archivoElegido));
    } catch (errorCarga) {
      setArchivo(null);
      setResultado(null);
      setError(errorCarga instanceof Error ? errorCarga.message : String(errorCarga));
    } finally {
      setProcesando(false);
    }
  }

  async function usarEjemplo(): Promise<void> {
    setProcesando(true);
    setError('');

    try {
      instalarArchivo(await cargarEjemplo());
    } catch (errorEjemplo) {
      setError(errorEjemplo instanceof Error ? errorEjemplo.message : String(errorEjemplo));
    } finally {
      setProcesando(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(max-width: 767px)');
    const actualizar = () => {
      setEsMovil(media.matches);
      if (!media.matches) {
        setHojaAbierta(false);
      }
    };

    actualizar();
    media.addEventListener('change', actualizar);
    return () => media.removeEventListener('change', actualizar);
  }, []);

  useEffect(() => {
    if (!hojaModal) {
      return;
    }

    const marco = requestAnimationFrame(() => hoja.current?.focus());
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setHojaAbierta(false);
        requestAnimationFrame(() => botonOpciones.current?.focus());
      }
    };

    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      cancelAnimationFrame(marco);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [hojaModal]);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return;
    }

    const trabajador = new Worker(new URL('./workers/transcripcion.worker.ts', import.meta.url), {
      type: 'module'
    });
    hilo.current = trabajador;

    trabajador.onmessage = (evento: MessageEvent<RespuestaTranscripcion>) => {
      if (evento.data.id !== idSolicitud.current) {
        return;
      }

      if (evento.data.ok) {
        setResultado(evento.data.resultado);
        setMensaje(textoEstado());
        setError('');
      } else {
        setError(evento.data.error);
      }
      setProcesando(false);
    };

    trabajador.onerror = (evento) => {
      setError(`No se pudo transcribir: ${evento.message}`);
      setProcesando(false);
    };

    return () => {
      trabajador.terminate();
      hilo.current = null;
    };
  }, [archivo?.dudas]);

  useEffect(() => {
    if (!archivo) {
      setResultado(null);
      setMensaje('Carga una partitura para empezar.');
      return;
    }
    if (partes.length === 0) {
      setResultado(null);
      setMensaje('Selecciona al menos una parte para transcribir.');
      return;
    }

    setProcesando(true);
    setMensaje('Transcribiendo…');

    const temporizador = setTimeout(() => {
      const id = ++idSolicitud.current;
      const solicitud: SolicitudTranscripcion = {
        id,
        xml: archivo.xml,
        nombre: archivo.nombre,
        dudas: archivo.dudas,
        opciones
      };

      if (hilo.current) {
        hilo.current.postMessage(solicitud);
        return;
      }

      try {
        const transcripcion = transponerPartituraWeb(archivo, opciones);
        setResultado(transcripcion);
        setMensaje(textoEstado());
        setError('');
      } catch (errorTranscripcion) {
        setError(
          errorTranscripcion instanceof Error
            ? errorTranscripcion.message
            : String(errorTranscripcion)
        );
      } finally {
        setProcesando(false);
      }
    }, 300);

    return () => clearTimeout(temporizador);
  }, [archivo, opciones]);

  function alternarParte(id: string): void {
    setPartes((actuales) =>
      actuales.includes(id) ? actuales.filter((parte) => parte !== id) : [...actuales, id]
    );
  }

  function intercambiarDeA(): void {
    const origen = desde === 'auto' ? (archivo?.instrumentoDetectado ?? 'concierto') : desde;
    const destino = hasta === 'concierto' ? 'auto' : hasta;

    setDesde(destino);
    setHasta(origen === 'auto' ? 'concierto' : origen);
  }

  function bajarOctava(): void {
    setOctava(bajarOctavaDesde);
  }

  function cerrarHoja(): void {
    setHojaAbierta(false);
    requestAnimationFrame(() => botonOpciones.current?.focus());
  }

  function irACompas(compas: string): void {
    setVista('resultado');
    setHojaAbierta(false);
    setFocoCompas(null);
    setTimeout(() => setFocoCompas(compas), 0);
  }

  const consumirFoco = useCallback(() => setFocoCompas(null), []);

  function descargar(formato: 'musicxml' | 'mxl'): void {
    if (resultado && archivo) {
      descargarPartitura(resultado.xml, archivo.nombre, formato);
    }
  }

  function alArrastrar(evento: DragEvent<HTMLElement>): void {
    evento.preventDefault();
    setArrastrando(true);
  }

  function alSoltar(evento: DragEvent<HTMLElement>): void {
    evento.preventDefault();
    setArrastrando(false);
    const soltado = evento.dataTransfer.files[0];
    if (soltado) {
      void cargarArchivo(soltado);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:pb-0">
      <header
        className="sticky top-0 z-30 border-b border-slate-400 bg-white/95 backdrop-blur dark:border-slate-600 dark:bg-slate-950/95"
        inert={hojaModal}
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2">
          <h1 className="sr-only">Transcriptor de Partituras</h1>
          <input
            accept=".musicxml,.xml,.mxl,.abc"
            aria-hidden="true"
            className="sr-only"
            onChange={(evento) => {
              const seleccionado = evento.target.files?.[0];
              if (seleccionado) {
                void cargarArchivo(seleccionado);
              }
              evento.target.value = '';
            }}
            ref={entrada}
            tabIndex={-1}
            type="file"
          />
          <button
            className="boton boton-secundario shrink-0"
            onClick={() => entrada.current?.click()}
            type="button"
          >
            {textoBotonCargar(archivo?.nombre)}
          </button>

          <div className="hidden flex-1 items-center gap-2 md:flex">
            <SelectorInstrumento
              etiqueta="De"
              favoritos={FAVORITOS}
              id="desde"
              onChange={setDesde}
              permitirAuto
              valor={desde}
            />
            <button
              aria-label="Intercambiar De y A"
              className="boton-icono"
              onClick={intercambiarDeA}
              type="button"
            >
              <span aria-hidden="true">⇄</span>
            </button>
            <SelectorInstrumento
              etiqueta="A"
              favoritos={FAVORITOS}
              id="hasta"
              onChange={setHasta}
              permitirConcierto
              valor={hasta}
            />
            <SelectorTonalidad id="tonalidad" onChange={setTonalidadId} valor={tonalidadId} />
            <ControlOctava onChange={setOctava} valor={octava} />
            <details className="mas-opciones">
              <summary className="boton boton-secundario cursor-pointer">Más opciones</summary>
              <div className="panel mas-opciones-panel">
                <OpcionesAvanzadas
                  idPrefix="escritorio"
                  direccion={direccion}
                  onDireccion={setDireccion}
                  onPreferir={setPreferir}
                  preferir={preferir}
                />
              </div>
            </details>
            <MenuDescarga deshabilitado={!resultado} onDescargar={descargar} />
          </div>

          <p className="ml-auto truncate text-sm font-semibold md:hidden">{resumenMovil}</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5" inert={hojaModal}>
        {!archivo ? (
          <section
            className={`panel mx-auto mt-6 max-w-3xl text-center ${
              arrastrando ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : ''
            }`}
            onDragLeave={() => setArrastrando(false)}
            onDragOver={alArrastrar}
            onDrop={alSoltar}
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-dashed border-blue-600 text-4xl font-bold text-blue-800 dark:border-blue-400 dark:text-blue-200">
              ♪
            </div>
            <h2 className="mt-6 text-2xl font-bold">Abre una partitura para empezar</h2>
            <p className="mt-2 texto-fuerte">
              Arrastra aquí un archivo MusicXML, MXL o ABC, o elige una de estas opciones.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                className="boton boton-primario"
                onClick={() => entrada.current?.click()}
                type="button"
              >
                Abrir partitura
              </button>
              <button
                className="boton boton-secundario"
                onClick={() => void usarEjemplo()}
                type="button"
              >
                Probar con un ejemplo
              </button>
            </div>
            {error ? <p className="mt-5 text-sm text-red-800 dark:text-red-200">{error}</p> : null}
          </section>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p
                aria-live="polite"
                className="text-sm font-semibold"
                id="estado-transcripcion"
                role="status"
              >
                {mensaje}
              </p>
              {procesando ? <span className="text-sm texto-fuerte">Procesando…</span> : null}
              <button
                aria-pressed={comparar}
                className="boton boton-secundario ml-auto hidden md:inline-flex"
                onClick={() => setComparar((actual) => !actual)}
                type="button"
              >
                {comparar ? 'Ocultar original' : 'Comparar con original'}
              </button>
            </div>

            {error ? (
              <section className="panel mb-4 border-red-400 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100">
                <h2 className="font-semibold">No se pudo completar la operación</h2>
                <p className="mt-2 text-sm">{error}</p>
              </section>
            ) : null}

            {resultado && resultado.fuera.length > 0 ? (
              <section className="aviso-banner mb-4">
                <p className="font-semibold">
                  {resultado.fuera.length} nota{resultado.fuera.length === 1 ? '' : 's'} fuera del
                  registro del {nombreHasta}
                  {afinacionHasta ? ` (${afinacionHasta})` : ''}
                </p>
                <button
                  aria-label="Aplicar propuesta: bajar una octava"
                  className="boton boton-primario"
                  onClick={bajarOctava}
                  type="button"
                >
                  Bajar una octava
                </button>
                <button
                  aria-expanded={verDetalle}
                  className="boton boton-secundario"
                  onClick={() => setVerDetalle((actual) => !actual)}
                  type="button"
                >
                  Ver detalle
                </button>
              </section>
            ) : null}

            {resultado && verDetalle ? (
              <section className="panel mb-4">
                <h2 className="text-lg font-semibold">Avisos ({avisos.length})</h2>
                {avisos.length === 0 ? (
                  <p className="mt-2 texto-fuerte">No hay avisos.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {avisos.map((aviso) => (
                      <li className="flex flex-wrap items-center gap-2" key={aviso.id}>
                        <span>{aviso.texto}</span>
                        {aviso.compas ? (
                          <button
                            className="enlace-aviso"
                            onClick={() => irACompas(aviso.compas ?? '')}
                            type="button"
                          >
                            Ir al compás {aviso.compas}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            <div aria-label="Vista de partitura" className="mb-3 flex gap-2 md:hidden" role="group">
              <button
                aria-controls="visor-original"
                aria-pressed={vista === 'original'}
                className={`boton ${vista === 'original' ? 'boton-activo' : 'boton-secundario'}`}
                onClick={() => setVista('original')}
                type="button"
              >
                Original
              </button>
              <button
                aria-controls="visor-resultado"
                aria-pressed={vista === 'resultado'}
                className={`boton ${vista === 'resultado' ? 'boton-activo' : 'boton-secundario'}`}
                onClick={() => setVista('resultado')}
                type="button"
              >
                Resultado
              </button>
            </div>

            <div
              className={`grid gap-5 ${
                comparar || vista === 'original'
                  ? 'md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]'
                  : 'xl:grid-cols-[360px_minmax(0,1fr)]'
              }`}
            >
              <div
                className={`${vista === 'original' || comparar ? '' : 'hidden'} xl:block`}
                id="visor-original"
              >
                <VisorPartitura
                  descripcion={descripcionOriginal}
                  etiqueta="Partitura original"
                  onError={setError}
                  xml={archivo.xml}
                />
              </div>
              <div className={vista === 'original' ? 'hidden md:block' : ''} id="visor-resultado">
                <VisorPartitura
                  descripcion={descripcionResultado}
                  etiqueta="Partitura transcrita"
                  focoCompas={focoCompas}
                  notasResaltadas={notasResaltadas}
                  onError={setError}
                  onFocoConsumido={consumirFoco}
                  xml={resultado?.xml ?? archivo.xml}
                />
              </div>
            </div>

            <section className="panel mt-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="mr-auto text-lg font-semibold">Partes a transcribir</h2>
                <button
                  className="enlace-aviso"
                  onClick={() => setPartes(archivo.partes.map((parte) => parte.id))}
                  type="button"
                >
                  Todas
                </button>
                <button className="enlace-aviso" onClick={() => setPartes([])} type="button">
                  Ninguna
                </button>
              </div>
              {archivo.partes.length === 0 ? (
                <p className="mt-3 texto-fuerte">No se han encontrado partes.</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {archivo.partes.map((parte) => (
                    <label className="flex min-h-11 items-center gap-2" key={parte.id}>
                      <input
                        checked={partes.includes(parte.id)}
                        className="h-5 w-5 accent-blue-700"
                        onChange={() => alternarParte(parte.id)}
                        type="checkbox"
                      />
                      <span>{parte.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
              {partes.length === 0 ? (
                <p className="mt-3 text-sm text-amber-900 dark:text-amber-200">
                  Selecciona al menos una parte para transcribir.
                </p>
              ) : null}
            </section>

            {archivo.dudas.length > 0 ? (
              <section className="panel mt-5">
                <h2 className="text-lg font-semibold">Dudas de detección</h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {archivo.dudas.map((duda) => (
                    <li key={duda.id}>
                      <p className="font-semibold">
                        ¿'{duda.nombre}' es {listaNombres(duda.candidatos)}?
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {duda.candidatos.map((candidato) => (
                          <button
                            className="boton boton-secundario"
                            key={candidato}
                            onClick={() => {
                              const encontrado = INSTRUMENTOS.find(
                                (instrumento) =>
                                  instrumento.nombre === candidato ||
                                  instrumento.alias?.includes(candidato)
                              );
                              if (encontrado) {
                                setDesde(encontrado.id);
                              }
                            }}
                            type="button"
                          >
                            {candidato}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </main>

      <footer
        className="border-t border-slate-300 px-4 py-4 text-center text-xs texto-fuerte dark:border-slate-700"
        inert={hojaModal}
      >
        Motor {VERSION}
      </footer>

      {archivo ? (
        <div className="barra-movil md:hidden" inert={hojaModal}>
          <div className="flex items-center gap-2">
            <button
              aria-expanded={hojaModal}
              className="boton boton-secundario min-w-0 flex-1 justify-between"
              onClick={() => setHojaAbierta((actual) => !actual)}
              ref={botonOpciones}
              type="button"
            >
              <span className="truncate">{resumenMovil}</span>
              <span aria-hidden="true">⌃</span>
            </button>
            <button
              aria-label="Bajar una octava"
              className="boton-icono"
              disabled={octava <= -2}
              onClick={() => setOctava(limitarOctava(octava - 1))}
              type="button"
            >
              −
            </button>
            <output aria-label={`Octava ${octava}`} className="min-w-6 text-center font-semibold">
              {octava}
            </output>
            <button
              aria-label="Subir una octava"
              className="boton-icono"
              disabled={octava >= 2}
              onClick={() => setOctava(limitarOctava(octava + 1))}
              type="button"
            >
              +
            </button>
            <MenuDescarga deshabilitado={!resultado} direccion="arriba" onDescargar={descargar} />
          </div>
        </div>
      ) : null}

      {archivo && hojaModal ? (
        <div
          aria-label="Opciones de transcripción"
          aria-modal="true"
          className="hoja-opciones md:hidden"
          ref={hoja}
          role="dialog"
          tabIndex={-1}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-500" />
          <div className="grid gap-3">
            <SelectorInstrumento
              etiqueta="De"
              favoritos={FAVORITOS}
              id="desde-movil"
              onChange={setDesde}
              permitirAuto
              valor={desde}
            />
            <SelectorInstrumento
              etiqueta="A"
              favoritos={FAVORITOS}
              id="hasta-movil"
              onChange={setHasta}
              permitirConcierto
              valor={hasta}
            />
            <SelectorTonalidad id="tonalidad-movil" onChange={setTonalidadId} valor={tonalidadId} />
            <OpcionesAvanzadas
              idPrefix="movil"
              direccion={direccion}
              onDireccion={setDireccion}
              onPreferir={setPreferir}
              preferir={preferir}
            />
          </div>
          <button className="boton boton-primario w-full" onClick={cerrarHoja} type="button">
            Listo
          </button>
        </div>
      ) : null}
    </div>
  );
}
