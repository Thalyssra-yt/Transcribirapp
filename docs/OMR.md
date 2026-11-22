# Reconocimiento de partituras (OMR)

Objetivo: convertir fotos, escaneos o PDF (impresos o **manuscritos**) en MusicXML fiable, con un paso de revisión humana.

> Realidad técnica que la app debe respetar: el reconocimiento de partituras manuscritas **no es 100 % fiable** con ninguna tecnología actual. Por eso el flujo es *reconocer → marcar dudas → el usuario corrige → transponer*. La calidad percibida depende tanto del editor de corrección como del motor.

## 1. Interfaz común (`packages/omr`)

```ts
export interface OmrProvider {
  id: string;                         // 'vision-llm' | 'audiveris' | 'manual' | ...
  nombre: string;                     // visible en Ajustes
  soporta: { impresa: boolean; manuscrita: boolean; pdf: boolean };
  requiereRed: boolean;
  reconocer(entrada: OmrEntrada, opciones: OmrOpciones, señal?: AbortSignal): Promise<OmrResultado>;
}

export interface OmrResultado {
  musicxml: string;                   // MusicXML 4.0 score-partwise
  informe: {
    confianza: number;                // 0..1
    compasesDudosos: { parte: string; compas: number; motivo: string }[];
    notasConAlternativa: { parte: string; compas: number; indice: number; alternativa: string }[];
    pareceTransportada: boolean | null;
    avisos: string[];
  };
}
```

Toda la app habla con esta interfaz; ningún componente de UI conoce un proveedor concreto.

## 2. Preprocesado (Web Worker, sin red)

1. PDF → imágenes con `pdfjs-dist` (300 ppp).
2. Foto de móvil: detección de los bordes de la hoja y corrección de perspectiva (OpenCV.js), con ajuste manual de las esquinas si falla.
3. Escala de grises, binarización adaptativa, enderezado (deskew).
4. Detección de pentagramas (proyección horizontal) y división en **sistemas**. Reconocer sistema a sistema mejora mucho la precisión y permite reintentar solo un trozo.
5. Guardar las coordenadas de cada compás para poder resaltarlo luego sobre la imagen original.

## 3. Proveedores

| Proveedor | Para qué | Dónde corre | Notas |
|---|---|---|---|
| `vision-llm` | **Manuscritas** e impresas | Nube (API del usuario: Anthropic, OpenAI o Google) | Mejor opción hoy para manuscrito. Se le envía cada sistema recortado + contexto (clave, armadura, compás del primer sistema) con las reglas de `TRANSPOSICION.md §9`. Respuesta en MusicXML + JSON de informe. |
| `audiveris` | Impresas de buena calidad | Escritorio (sidecar de Tauri, Java) o servidor propio | Muy bueno con partituras editadas. Licencia AGPL: mantenerlo como componente externo opcional y documentarlo en `DECISIONES.md`. |
| `python-omr` (oemer / homr) | Impresas y algo de manuscrito | Servidor local opcional (FastAPI) | Comprobar licencia y calidad antes de integrarlo. Fase posterior. |
| `manual` | Sin reconocimiento | Local | Importar MusicXML/ABC o escribir con el editor. Siempre disponible. |

### 3.1 Reglas del proveedor `vision-llm`

- Prompt de sistema = `TRANSPOSICION.md §9` + formato de salida estricto.
- Validación automática de la respuesta:
  1. XML bien formado y `score-partwise`.
  2. Cada compás suma la duración del compás (salvo anacrusa/final).
  3. Notas dentro de un rango plausible para la clave.
- Si falla, reintentar **ese sistema** con el error concreto (máx. 2 reintentos). Si sigue fallando, marcar los compases como dudosos y seguir.
- Temperatura baja. Nunca pedir al modelo que "complete" lo que no se ve.
- Antes de enviar nada a la nube: aviso de privacidad y consentimiento la primera vez.
- La clave API la introduce el usuario en Ajustes y se guarda en el almacén seguro del sistema (Tauri) o, en web, en `localStorage` con aviso.

## 4. Editor de corrección (parte clave de la experiencia)

- Vista dividida: imagen original ↔ partitura reconocida (en móvil: pestañas o deslizar).
- Compases dudosos resaltados en ambas vistas; lista navegable "Siguiente duda" (atajo `N`).
- Al seleccionar una nota: `↑/↓` sube/baja un grado, `Shift+↑/↓` semitono, `1–7` duración (redonda…semifusa), `.` puntillo, `0` silencio, `Supr` borrar, `Ctrl+Z` deshacer. Todo también con botones táctiles grandes.
- "Reconocer de nuevo este sistema" con otro proveedor.
- Comprobación en vivo de la suma de duraciones del compás.

## 5. Evaluación de calidad

- `packages/omr/test/fixtures/`: pares imagen + MusicXML correcto (empezar con 10 impresas y 10 manuscritas propias; ampliar con conjuntos públicos de partituras manuscritas, comprobando su licencia).
- Métricas: % notas correctas (altura + duración), % compases perfectos, tiempo de corrección.
- Script `pnpm omr:eval` que imprime una tabla comparando proveedores. Ejecutarlo antes de cambiar prompts o proveedores.
