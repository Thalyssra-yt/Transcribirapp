import { useEffect, useRef, useState } from 'react';

interface MenuDescargaProps {
  deshabilitado: boolean;
  direccion?: 'abajo' | 'arriba';
  onDescargar: (formato: 'musicxml' | 'mxl') => void;
}

export function MenuDescarga({
  deshabilitado,
  direccion = 'abajo',
  onDescargar
}: MenuDescargaProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const boton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const cerrarAlFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };

    document.addEventListener('mousedown', cerrarAlFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarAlFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div className="menu-descarga" ref={contenedor}>
      <button
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="boton boton-primario"
        disabled={deshabilitado}
        onClick={() => setAbierto((actual) => !actual)}
        ref={boton}
        type="button"
      >
        Descargar <span aria-hidden="true">▾</span>
      </button>
      {abierto ? (
        <div
          aria-label="Formatos de descarga"
          className={`menu-descarga-panel ${direccion === 'arriba' ? 'menu-descarga-panel-arriba' : ''}`}
          role="menu"
        >
          <button
            className="menu-descarga-opcion"
            onClick={() => {
              onDescargar('musicxml');
              setAbierto(false);
            }}
            role="menuitem"
            type="button"
          >
            MusicXML
          </button>
          <button
            className="menu-descarga-opcion"
            onClick={() => {
              onDescargar('mxl');
              setAbierto(false);
            }}
            role="menuitem"
            type="button"
          >
            MXL
          </button>
        </div>
      ) : null}
    </div>
  );
}
