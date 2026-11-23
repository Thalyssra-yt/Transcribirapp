import { useEffect, useRef } from 'react';
import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayType } from 'opensheetmusicdisplay';

export interface NotaResaltada {
  compas: string;
  parte: string;
  nota: string;
}

interface VisorPartituraProps {
  xml: string | null;
  etiqueta: string;
  descripcion: string;
  onError: (mensaje: string) => void;
  notasResaltadas?: readonly NotaResaltada[];
  focoCompas?: string | null;
  onFocoConsumido?: () => void;
}

const NOMBRES_PASO: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si'
};

const COLOR_ALERTA = '#c62828';
const ZOOM_MINIMO = 0.25;
const ZOOM_MAXIMO = 1;
const OPCIONES_COLOR = {
  applyToNoteheads: true,
  applyToStem: true,
  applyToBeams: true,
  applyToFlag: true,
  applyToLedgerLines: true
};

function indiceDeCompas(osmd: OpenSheetMusicDisplayType, compas: string): number {
  const numero = Number.parseInt(compas, 10);
  const measureList = osmd.GraphicSheet.MeasureList;

  if (Number.isNaN(numero)) {
    return -1;
  }

  const encontrado = measureList.findIndex((grupo) =>
    grupo.some(
      (medida) =>
        medida.parentSourceMeasure?.MeasureNumberXML === numero ||
        medida.parentSourceMeasure?.getPrintedMeasureNumber() === numero
    )
  );

  return encontrado >= 0 ? encontrado : Math.min(Math.max(numero - 1, 0), measureList.length - 1);
}

export function notaLegible(graphicalNote: { sourceNote: unknown }, octaveOffset = 0): string {
  const sourceNote = graphicalNote.sourceNote as {
    isRest: () => boolean;
    Pitch: {
      FundamentalNote: number;
      AccidentalHalfTones: number;
      Octave: number;
    };
  };

  if (sourceNote.isRest()) {
    return '';
  }

  const letras: Record<number, string> = {
    0: 'C',
    2: 'D',
    4: 'E',
    5: 'F',
    7: 'G',
    9: 'A',
    11: 'B'
  };
  const letra = letras[sourceNote.Pitch.FundamentalNote] ?? 'C';
  const alter = Math.max(-2, Math.min(2, Math.round(sourceNote.Pitch.AccidentalHalfTones)));
  const sufijo = alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : '';

  return `${NOMBRES_PASO[letra]}${sufijo}${sourceNote.Pitch.Octave + octaveOffset}`;
}

function aplicarResaltos(
  osmd: OpenSheetMusicDisplayType,
  notasResaltadas: readonly NotaResaltada[],
  octaveOffset: number
): void {
  if (notasResaltadas.length === 0) {
    return;
  }

  const measureList = osmd.GraphicSheet.MeasureList;

  for (const resalto of notasResaltadas) {
    const indice = indiceDeCompas(osmd, resalto.compas);
    if (indice < 0) {
      continue;
    }

    for (const medida of measureList[indice] ?? []) {
      if (
        resalto.parte &&
        medida.ParentStaff?.ParentInstrument?.IdString &&
        medida.ParentStaff.ParentInstrument.IdString !== resalto.parte
      ) {
        continue;
      }

      for (const entrada of medida.staffEntries) {
        for (const voz of entrada.graphicalVoiceEntries) {
          for (const notaGrafica of voz.notes) {
            if (notaLegible(notaGrafica, octaveOffset) === resalto.nota) {
              notaGrafica.setColor(COLOR_ALERTA, OPCIONES_COLOR);
            }
          }
        }
      }
    }
  }
}

function anchoUtil(elemento: HTMLElement): number {
  const estilos = getComputedStyle(elemento);
  const relleno =
    (Number.parseFloat(estilos.paddingLeft) || 0) + (Number.parseFloat(estilos.paddingRight) || 0);

  return Math.max(1, elemento.clientWidth - relleno);
}

function ajustarZoom(osmd: OpenSheetMusicDisplayType, elemento: HTMLElement): void {
  if (elemento.clientWidth === 0) {
    return;
  }

  const disponible = anchoUtil(elemento);
  osmd.Zoom = ZOOM_MAXIMO;
  osmd.render();

  const svg = elemento.querySelector('svg');
  const anchoNatural = svg?.getBoundingClientRect().width ?? 0;
  if (anchoNatural === 0) {
    return;
  }

  const zoom = Math.max(ZOOM_MINIMO, Math.min(ZOOM_MAXIMO, disponible / anchoNatural));
  if (Math.abs(zoom - ZOOM_MAXIMO) < 0.01) {
    return;
  }

  osmd.Zoom = zoom;
  osmd.render();
}

export function VisorPartitura({
  xml,
  etiqueta,
  descripcion,
  onError,
  notasResaltadas = [],
  focoCompas,
  onFocoConsumido
}: VisorPartituraProps) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplayType | null>(null);
  const enfocado = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) {
      return;
    }

    osmdRef.current = null;
    elemento.replaceChildren();
    elemento.textContent = xml ? 'Preparando partitura…' : 'Carga una partitura para verla aquí.';

    if (!xml) {
      return;
    }

    let activo = true;
    let limpiezaRedimension: (() => void) | undefined;

    void import('opensheetmusicdisplay')
      .then(({ OpenSheetMusicDisplay, Pitch }) => {
        if (!activo) {
          return;
        }

        const osmd = new OpenSheetMusicDisplay(elemento, {
          autoResize: true,
          backend: 'svg',
          coloringEnabled: false,
          darkMode: false,
          defaultColorMusic: '#111827',
          drawComposer: true,
          drawPartNames: true,
          drawSubtitle: true,
          drawTitle: true,
          followCursor: false
        });

        osmdRef.current = osmd;
        return osmd.load(xml).then(() => {
          if (!activo) {
            return;
          }

          elemento.replaceChildren();
          ajustarZoom(osmd, elemento);
          aplicarResaltos(osmd, notasResaltadas, Pitch?.OctaveXmlDifference ?? 3);

          const octaveOffset = Pitch?.OctaveXmlDifference ?? 3;
          let ultimoAncho = elemento.clientWidth;
          let cuadro: number | undefined;
          const redibujar = () => {
            if (!activo) {
              return;
            }

            const ancho = elemento.clientWidth;
            if (ancho === ultimoAncho) {
              return;
            }

            ultimoAncho = ancho;
            if (cuadro !== undefined) {
              cancelAnimationFrame(cuadro);
            }

            cuadro = requestAnimationFrame(() => {
              cuadro = undefined;
              if (!activo) {
                return;
              }

              ajustarZoom(osmd, elemento);
              aplicarResaltos(osmd, notasResaltadas, octaveOffset);
            });
          };

          if (typeof ResizeObserver !== 'undefined') {
            const observador = new ResizeObserver(redibujar);
            observador.observe(elemento);
            limpiezaRedimension = () => {
              if (cuadro !== undefined) {
                cancelAnimationFrame(cuadro);
              }
              observador.disconnect();
            };
          } else {
            window.addEventListener('resize', redibujar);
            limpiezaRedimension = () => {
              if (cuadro !== undefined) {
                cancelAnimationFrame(cuadro);
              }
              window.removeEventListener('resize', redibujar);
            };
          }
        });
      })
      .catch((error: unknown) => {
        if (activo) {
          onError(
            `No se pudo mostrar la partitura: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      });

    return () => {
      activo = false;
      limpiezaRedimension?.();
      osmdRef.current?.destroy();
      osmdRef.current = null;
      elemento.replaceChildren();
    };
  }, [xml, onError, notasResaltadas]);

  useEffect(() => {
    if (!focoCompas || !osmdRef.current) {
      return;
    }

    const osmd = osmdRef.current;
    const indice = indiceDeCompas(osmd, focoCompas);
    const medida = osmd.GraphicSheet.MeasureList[indice]?.[0];
    const elemento = medida?.getSVGGElement();

    if (elemento) {
      enfocado.current?.classList.remove('compas-focado');
      elemento.classList.add('compas-focado');
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      enfocado.current = elemento;
      const temporizador = setTimeout(() => {
        elemento.classList.remove('compas-focado');
        if (enfocado.current === elemento) {
          enfocado.current = null;
        }
      }, 2500);

      onFocoConsumido?.();
      return () => clearTimeout(temporizador);
    }

    onFocoConsumido?.();
  }, [focoCompas, onFocoConsumido, xml]);

  return (
    <section className="visor" aria-labelledby={`${etiqueta.replace(/\s+/g, '-')}-titulo`}>
      <h2 className="visor-titulo" id={`${etiqueta.replace(/\s+/g, '-')}-titulo`}>
        {etiqueta}
      </h2>
      <div
        aria-label={descripcion}
        className="visor-papel"
        data-compas={focoCompas ?? undefined}
        ref={contenedor}
        role="img"
      />
    </section>
  );
}
