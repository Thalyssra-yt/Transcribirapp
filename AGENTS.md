# AGENTS.md — Transcriptor de Partituras

Este archivo es la fuente de verdad del proyecto para cualquier agente de OpenCode.
Léelo entero antes de escribir código. Si algo aquí contradice una suposición tuya, gana este archivo.

## 1. Qué estamos construyendo

Una aplicación **multiplataforma** (web/PWA, Windows, macOS, Linux, Android, iOS) que:

1. **Importa partituras**: MusicXML (`.musicxml`, `.xml`), MusicXML comprimido (`.mxl`), ABC (`.abc`), y **imágenes/PDF** de partituras impresas o **manuscritas a mano**.
2. **Reconoce** las imágenes (OMR = Optical Music Recognition) y las convierte a MusicXML.
3. **Extrae partes** de una partitura de orquesta/banda (elegir una voz o pentagrama).
4. **Transpone** a cualquier tonalidad y entre cualquier instrumento de orquesta, banda de música, brass band, big band, cámara o coro (catálogo completo en `packages/core/src/instruments.ts`; el saxo tenor es solo el instrumento por defecto), siempre respetando la teoría musical: de sonido real (concierto, en Do) a instrumento transpositor, de transpositor a Do, o entre transpositores (p. ej. trompeta en Sib → saxo alto en Mib).
5. **Avisa** cuando una nota queda fuera del registro del instrumento destino y **propone** cambio de octava.
6. **Muestra** la partitura resultante, permite **corregir** notas mal reconocidas, **reproducirla** y **exportarla** (MusicXML, PDF, PNG/SVG, MIDI).

Usuario principal: músico aficionado/semiprofesional (p. ej. saxofonista tenor en Sib) que quiere tocar música escrita para otro instrumento. Idioma de la interfaz: **español** por defecto, preparada para i18n.

## 2. Principios no negociables

1. **Corrección musical por encima de todo.** Una app bonita que transpone mal no sirve. Toda la lógica de transposición sigue `docs/TRANSPOSICION.md` y está cubierta por tests.
2. **Nunca inventar notas.** Si el reconocimiento (OMR) duda, se marca el compás como dudoso y se pide revisión al usuario. Nunca se rellena "a ojo".
3. **El motor es puro y está separado de la UI.** `packages/core` no importa nada de React, DOM, Tauri ni red. Se puede usar desde la app, la CLI y los tests.
4. **Accesible desde el día uno** (WCAG 2.2 AA): teclado completo, foco visible, contraste, `aria-live` para estados de proceso, textos alternativos, respeto a `prefers-reduced-motion` y tamaño de fuente del sistema.
5. **Escalable**: arquitectura por paquetes, interfaces (puertos/adaptadores) para OMR, render y exportación, de modo que se puedan cambiar proveedores sin tocar el resto.
6. **Funciona sin conexión** para todo lo que no sea OMR en la nube (importar MusicXML, transponer, ver, exportar).

## 3. Stack técnico (decidido — no cambiar sin justificarlo en `docs/DECISIONES.md`)

| Área | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript estricto (`strict: true`) | Un solo lenguaje en core, UI y CLI |
| Monorepo | pnpm workspaces | Paquetes separados, builds rápidos |
| UI | React 19 + Vite | Ecosistema, PWA sencilla |
| Estilos | Tailwind CSS 4 + componentes accesibles (Radix UI / shadcn/ui) | Moderno y accesible por defecto |
| Estado | Zustand | Simple, sin boilerplate |
| Render de partitura | OpenSheetMusicDisplay (OSMD) | Renderiza MusicXML en el navegador |
| ABC | abcjs (para importar ABC y convertir a MusicXML o al modelo interno) | Estándar de facto |
| MXL | fflate (descomprimir zip) | Ligero |
| XML | DOMParser en navegador / `@xmldom/xmldom` en Node | Mismo código en ambos lados |
| Reproducción | Tone.js + soundfonts (o osmd-audio-player) | Escuchar el resultado |
| Escritorio y móvil | Tauri 2 (Windows, macOS, Linux, Android, iOS) | Binarios pequeños, reutiliza la web |
| Instalable web | PWA (vite-plugin-pwa) | Funciona en cualquier navegador |
| Tests | Vitest (unidad), Playwright (e2e), axe-core (accesibilidad) | |
| Calidad | ESLint + Prettier, CI en GitHub Actions | |

## 4. Estructura del repositorio

```
/
├─ AGENTS.md                  ← este archivo
├─ docs/
│  ├─ TRANSPOSICION.md        ← conocimiento musical (OBLIGATORIO leer)
│  ├─ PLAN.md                 ← fases, tareas y criterios de aceptación
│  ├─ OMR.md                  ← cómo se reconocen las imágenes
│  └─ DECISIONES.md           ← registro de decisiones (ADR cortos)
├─ packages/
│  ├─ core/                   ← motor puro: modelo, instrumentos, transposición, rangos
│  │  ├─ src/instruments.ts   ← catálogo de instrumentos (datos de TRANSPOSICION.md)
│  │  ├─ src/pitch.ts         ← altura, intervalos, línea de quintas
│  │  ├─ src/transpose.ts     ← transposición de notas y armaduras
│  │  ├─ src/musicxml/        ← leer/escribir/transponer MusicXML
│  │  ├─ src/range.ts         ← comprobación de registro y sugerencia de octava
│  │  └─ test/                ← tests + fixtures (golden files)
│  ├─ omr/                    ← adaptadores de reconocimiento (interfaz OmrProvider)
│  └─ cli/                    ← `partitura` en línea de comandos (usa core)
├─ apps/
│  ├─ web/                    ← React + Vite + PWA
│  └─ desktop/                ← Tauri 2 (envuelve apps/web; también Android/iOS)
└─ .opencode/agents/          ← agentes de OpenCode
```

## 5. Comandos

```bash
pnpm install
pnpm dev            # app web en desarrollo
pnpm test           # todos los tests (Vitest)
pnpm test:e2e       # Playwright
pnpm lint
pnpm build
pnpm --filter cli start -- transponer entrada.musicxml --de concierto --a saxo-tenor -o salida.musicxml
pnpm tauri dev      # escritorio
```

Si un comando todavía no existe, créalo en la fase correspondiente de `docs/PLAN.md`.

## 6. Reglas de trabajo para los agentes

- Trabaja **por fases** siguiendo `docs/PLAN.md`. No empieces una fase sin cerrar la anterior (tests verdes + criterios de aceptación cumplidos).
- **Test primero** en `packages/core`: antes de implementar una transposición, escribe el caso en la tabla de tests con el resultado esperado según `docs/TRANSPOSICION.md`.
- Cualquier cambio en la lógica musical debe pasar por el subagente `@musico` para revisión.
- Antes de dar una fase por terminada, invoca `@revisor` (ejecuta tests, lint, build y comprobación de accesibilidad).
- Commits pequeños con mensajes en español: `core: transponer armaduras con enarmonía`.
- No añadas dependencias pesadas sin anotarlo en `docs/DECISIONES.md`.
- No guardes claves de API en el código. Las claves del usuario (OMR en la nube) se guardan en el almacenamiento seguro del sistema (Tauri) o en `localStorage` solo en la versión web y con aviso.
- Al terminar cada tarea, resume en 3–5 líneas qué hiciste y qué queda.

## 7. Definición de "terminado" (para toda la app)

- [ ] Todos los casos de `docs/TRANSPOSICION.md §8` pasan como tests.
- [ ] Un MusicXML de prueba en Do se transpone a saxo tenor, saxo alto, clarinete Sib, trompeta Sib y trompa en Fa y OSMD lo muestra con la armadura y la clave correctas.
- [ ] Ida y vuelta: Do → saxo tenor → Do devuelve exactamente las mismas alturas y grafías.
- [ ] Una foto de una partitura manuscrita sencilla (melodía de 8–16 compases) se reconoce, se muestran los compases dudosos y el usuario puede corregirlos antes de transponer.
- [ ] Navegable al 100 % con teclado; axe sin errores graves; contraste AA en modo claro y oscuro.
- [ ] Funciona como PWA instalada sin conexión (salvo OMR en la nube).
- [ ] `pnpm build` y `pnpm tauri build` funcionan.
