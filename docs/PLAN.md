# Plan de construcción por fases

Reglas: una fase no se empieza hasta cerrar la anterior. Cada fase termina con `@revisor` y con un resumen breve para el usuario. Marca las casillas en este archivo a medida que avances.

---

## Fase 0 — Cimientos
- [x] Monorepo pnpm con `packages/core`, `packages/omr`, `packages/cli`, `apps/web`, `apps/desktop`.
- [x] TypeScript estricto compartido (`tsconfig.base.json`), ESLint, Prettier, Vitest.
- [x] GitHub Actions: lint + test + build en cada push.
- [x] `docs/DECISIONES.md` creado con las decisiones del stack.
- [x] `packages/core/test/fixtures/`: al menos 5 MusicXML de prueba (escala en Sib, melodía en Mi mayor con alteraciones, partitura de cuarteto con violonchelo en clave de Fa, partitura con cifrado americano, fragmento orquestal con trompa y clarinete transportados).

**Aceptación:** `pnpm install && pnpm lint && pnpm test && pnpm build` funcionan en limpio.

## Fase 1 — Motor musical (`packages/core`)
- [x] `pitch.ts`: Nota, quintas, diatónico, midi, `deQuintas`, nombres en español ("Sib4") e inglés ("Bb4").
- [x] `interval.ts`: intervalos, desde/hacia `<transpose>` de MusicXML, inverso, suma.
- [x] `instruments.ts`: catálogo completo de `TRANSPOSICION.md §2` como datos tipados.
- [x] `transpose.ts`: nota (§4.3), armadura (§4.4), enarmonía (§4.5), alteraciones imposibles (§4.6), cifrado.
- [x] `range.ts`: comprobación de registro y propuesta de octava (§7).
- [x] Tests 1–22 de `TRANSPOSICION.md §8` como tabla (`it.each`).
- [x] Tests por propiedades (fast-check): para cualquier nota e instrumento, ida y vuelta = identidad; semitonos siempre coherentes.

**Aceptación:** todos los tests en verde; `@musico` revisa y aprueba. Aprobado el 2026-11-22 tras corregir cifrado con armadura, clave de trompa, rangos de clarinete/piano/voz tenor y enarmonía de ida y vuelta; `@revisor` confirma lint, typecheck, tests y build en verde.

## Fase 2 — MusicXML
- [x] Lector/escritor que **conserva** todo lo que no toca (no reconstruir el documento desde cero: modificar el DOM).
- [x] `.mxl` (zip) de entrada y salida.
- [x] Importar ABC → MusicXML (subconjunto habitual; sin dependencia `abcjs`).
- [x] Transponer partitura completa: notas, armaduras (incluidos cambios a mitad), claves, `<transpose>`, cifrado, nombres de instrumento, recálculo de `<accidental>` (§4.7).
- [x] Detección partitura en Do / transportada por parte (§6).
- [x] Extraer una o varias partes / un pentagrama del piano.
- [x] Identificar el instrumento de cada parte por `<part-name>`/abreviatura con `buscarInstrumento` y por su `<transpose>`; si hay duda, devolver candidatos en `informe.dudas`.
- [x] Partes para instrumentos `sinArmadura` (trompas/trompetas naturales): sin armadura y con alteraciones accidentales (TRANSPOSICION.md §2.5).
- [x] Cambio de tonalidad (`cambioTonalidad`) aplicado a toda la partitura, incluidos cambios de armadura a mitad de obra.
- [x] Tests 23–24 (ida y vuelta) sobre todos los fixtures; golden files generados y prueba manual de MuseScore documentada en `docs/PRUEBAS-MANUALES.md`.

**Aceptación:** golden files en `test/golden/` generados y regenerados tras corregir claves; `@musico` aprobó la Fase 2 el 2026-11-23 tras revisar claves alternativas, ausencia de `<clef>` y `staff-details`; `@revisor` verificó lint, typecheck, tests y build. La apertura en MuseScore no se ejecutó en este entorno porque MuseScore no está instalado; queda registrada como comprobación manual pendiente.

## Fase 3 — CLI (`partitura`)
- [x] `partitura instrumentos` — lista ids y nombres.
- [x] `partitura info archivo` — partes, tonalidad, compás, si está transportada, registro.
- [x] `partitura transponer archivo [--de auto|<id>|concierto] --a <id|concierto> [--parte N] [--octava ±N] [--tonalidad <armadura|nombre>] [--direccion cercana|arriba|abajo] [--preferir sostenidos|bemoles] -o salida.musicxml`.
- [x] `partitura rango archivo --instrumento <id>` — notas fuera de registro y octava sugerida.
- [x] Salida legible y `--json` para que la use el agente `transcriptor`.
- [x] `pnpm partitura` desde la raíz, `--help`/`-h` general y por comando, `--version`, búsqueda y filtros de instrumentos, sugerencias de ids y protección de sobrescritura con `--forzar`.

**Aceptación:** los cuatro comandos funcionan con `.musicxml`, `.mxl` y `.abc` de entrada, y escriben `.musicxml` o `.mxl`; 209 tests, lint, typecheck y build en verde. El bin `partitura` también funciona con `node dist/index.js` tras el build, y las rutas relativas se resuelven desde la raíz del proyecto.

## Fase 4 — Interfaz web (`apps/web`)
Diseño:
- Moderna y limpia, modo claro/oscuro automático, tipografía muy legible (p. ej. Atkinson Hyperlegible o Inter), objetivos táctiles ≥ 44 px, sin animaciones gratuitas.
- Componentes accesibles (Radix/shadcn), tokens de diseño en un único archivo.

Pantallas:
1. **Inicio**: zona grande "Abrir partitura" (arrastrar, elegir archivo, **hacer foto** en móvil, PDF) + recientes.
2. **Revisión** (solo si viene de imagen): editor de corrección de `OMR.md §4`.
3. **Transcribir** (pantalla principal):
   - Barra superior: `De: [Concierto ▾]` ⇄ `A: [Saxo tenor en Sib ▾]` (botón para invertir), `Tonalidad: [Mantener ▾ / cualquiera de las 15]` con dirección (más cercana / arriba / abajo), selector de parte(s), `Octava −/+`.
   - Los selectores de instrumento muestran **todo el catálogo** (`INSTRUMENTOS`), agrupado por **agrupación** (Banda, Orquesta, Brass band, Big band, Cámara, Coro, Histórico) y por **familia**, con buscador (`buscarInstrumento`, sin tildes, acepta abreviaturas y alias) y la afinación visible ("Clarinete — Sib"). Favoritos arriba.
   - "Transcribir para toda la plantilla": elegir una plantilla (`PLANTILLAS`) y generar de una vez las partes de todos sus instrumentos, con avisos de registro por parte.
   - Vista dividida original ↔ resultado (OSMD); en móvil, pestañas.
   - Panel de avisos: notas fuera de registro (clic → salta a la nota), cambios enarmónicos aplicados.
   - Reproducir / parar, tempo.
   - Exportar: MusicXML, PDF, PNG/SVG, MIDI; compartir (Web Share API / hoja de compartir nativa).
4. **Ajustes**: mi instrumento por defecto (se preselecciona en "A:"), **instrumentos personalizados** (nombre + "lee Do, suena…" + clave + registro; `definirInstrumento`), registro personalizado, preferencia sostenidos/bemoles para ±6, proveedor OMR y clave API, idioma, tema, tamaño de partitura.

Técnico:
- [ ] Zustand para el estado; la transposición se ejecuta en un Web Worker para no bloquear.
- [ ] Persistencia local de proyectos (IndexedDB).
- [ ] PWA instalable y funcionando sin conexión.
- [ ] Atajos de teclado documentados en un diálogo `?`.

**Aceptación:** flujo completo con un MusicXML: abrir → elegir saxo tenor → ver → avisos → exportar, en escritorio y móvil (Playwright con viewport móvil), sin errores graves de axe.

## Fase 5 — Reconocimiento de imágenes
- [ ] Preprocesado en Worker (`OMR.md §2`).
- [ ] Proveedor `vision-llm` con validación y reintentos.
- [ ] Proveedor `manual`.
- [ ] Editor de corrección completo.
- [ ] `pnpm omr:eval` con los fixtures.
- [ ] (Opcional) proveedor `audiveris` como sidecar de escritorio.

**Aceptación:** foto de una melodía manuscrita de 8–16 compases → reconocida → dudas marcadas → corregida → transpuesta a saxo tenor → exportada.

## Fase 6 — Multiplataforma (Tauri 2)
- [ ] Escritorio Windows, macOS, Linux.
- [ ] Android e iOS (cámara, compartir, abrir archivos desde otras apps).
- [ ] Asociación de archivos `.musicxml`, `.mxl`.
- [ ] Almacenamiento seguro de la clave API.
- [ ] Builds en CI.

## Fase 7 — Pulido
- [ ] Auditoría de accesibilidad completa (teclado, lector de pantalla NVDA/VoiceOver, contraste, zoom 200 %).
- [ ] i18n (es, en) con todos los textos externalizados.
- [ ] Rendimiento: partitura orquestal de 100 compases y 20 partes se transpone en < 1 s.
  - Medido en la revisión de la Fase 2: 32.000 notas = 4,3 s en Node. En el navegador usar el `DOMParser` nativo (xmldom solo en Node/CLI) y evitar recorridos `getElementsByTagName('*')` repetidos en `filtrarPartes`; ejecutar en Web Worker.
- [ ] Validar en CI cada salida de los tests contra el XSD oficial de MusicXML 4.0 (`xmllint --schema`), como se hizo en la revisión de la Fase 2.
- [ ] Manual de usuario corto en la propia app.

## Ideas para después (no hacer sin pedirlo)
- Reconocer partituras desde audio.
- Biblioteca en la nube y sincronización.
- Modo práctica: seguir la partitura con el micrófono.
