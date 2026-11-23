import { parseMusicXml, type DudaInstrumento } from '@transcriptor/core';
import {
  partesDelDocumento,
  transponerPartituraWeb,
  type ArchivoPartitura,
  type OpcionesTranscripcion,
  type ResultadoTranscripcion
} from '../lib/partitura';

export interface SolicitudTranscripcion {
  id: number;
  xml: string;
  nombre: string;
  dudas: DudaInstrumento[];
  opciones: OpcionesTranscripcion;
}

export type RespuestaTranscripcion =
  | { id: number; ok: true; resultado: ResultadoTranscripcion }
  | { id: number; ok: false; error: string };

type ContextoWorker = {
  onmessage: ((evento: MessageEvent<SolicitudTranscripcion>) => void) | null;
  postMessage: (mensaje: RespuestaTranscripcion) => void;
};

const contexto = self as unknown as ContextoWorker;

contexto.onmessage = (evento) => {
  const { id, xml, nombre, dudas, opciones } = evento.data;

  try {
    const documento = parseMusicXml(xml);
    const archivo: ArchivoPartitura = {
      nombre,
      formato: 'musicxml',
      documento,
      xml,
      partes: partesDelDocumento(documento),
      dudas
    };
    const resultado = transponerPartituraWeb(archivo, opciones);
    contexto.postMessage({ id, ok: true, resultado });
  } catch (error) {
    contexto.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
