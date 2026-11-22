# Plan de construcción por fases

Reglas: una fase no se empieza hasta cerrar la anterior. Cada fase termina con `@revisor` y con un resumen breve para el usuario. Marca las casillas en este archivo a medida que avances.

---

## Fase 0 — Cimientos
- [ ] Monorepo pnpm con `packages/core`, `packages/omr`, `packages/cli`, `apps/web`, `apps/desktop`.
- [ ] TypeScript estricto compartido (`tsconfig.base.json`), ESLint, Prettier, Vitest.
- [ ] GitHub Actions: lint + test + build en cada push.
- [ ] `docs/DECISIONES.md` creado con las decisiones del stack.
- [ ] `packages/core/test/fixtures/`: al menos 5 MusicXML de prueba (escala en Sib, melodía en Mi mayor con alteraciones, partitura de cuarteto con violonchelo en clave de Fa, partitura con cifrado americano, fragmento orquestal con trompa y clarinete transportados).

**Aceptación:** `pnpm install && pnpm lint && pnpm test && pnpm build` funcionan en limpio.

## Fase 1 — Motor musical (`packages/core`)
- [ ] `pitch.ts`: Nota, quintas, diatónico, midi, `deQuintas`, nombres en español ("Sib4") e inglés ("Bb4").
- [ ] `interval.ts`: intervalos, desde/hacia `<transpose>` de MusicXML, inverso, suma.
- [ ] `instruments.ts`: catálogo completo de `TRANSPOSICION.md §2` como datos tipados.
- [ ] `transpose.ts`: nota (§4.3), armadura (§4.4), enarmonía (§4.5), alteraciones imposibles (§4.6), cifrado.
- [ ] `range.ts`: comprobación de registro y propuesta de octava (§7).
- [ ] Tests 1–22 de `TRANSPOSICION.md §8` como tabla (`it.each`).
- [ ] Tests por propiedades (fast-check): para cualquier nota e instrumento, ida y vuelta = identidad; semitonos siempre coherentes.

**Aceptación:** todos los tests en verde; `@musico` revisa y aprueba.

## Fase 2 — MusicXML
- [ ] Lector/escritor que **conserva** todo lo que no toca (no reconstruir el documento desde cero: modificar el DOM).
- [ ] `.mxl` (zip) de entrada y salida.
- [ ] Importar ABC (abcjs) → MusicXML.
- [ ] Transponer partitura completa: notas, armaduras (incluidos cambios a mitad), claves, `<transpose>`, cifrado, nombres de instrumento, recálculo de `<accidental>` (§4.7).
- [ ] Detección partitura en Do / transportada por parte (§6).
- [ ] Extraer una o varias partes / un pentagrama del piano.
- [ ] Tests 23–24 (ida y vuelta) sobre todos los fixtures; los MusicXML resultantes se abren sin errores en MuseScore (prueba manual documentada).

**Aceptación:** golden files en `test/golden/` revisados por `@musico`.

## Fase 3 — CLI (`partitura`)
- [ ] `partitura instrumentos` — lista ids y nombres.
- [ ] `partitura info archivo` — partes, tonalidad, compás, si está transportada, registro.
- [ ] `partitura transponer archivo --de <id|concierto> --a <id> [--parte N] [--octava ±N] -o salida.musicxml`.
- [ ] `partitura rango archivo --instrumento <id>` — notas fuera de registro y octava sugerida.
- [ ] Salida legible y `--json` para que la use el agente `transcriptor`.

## Fase 4 — Interfaz web (`apps/web`)
Diseño:
- Moderna y limpia, modo claro/oscuro automático, tipografía muy legible (p. ej. Atkinson Hyperlegible o Inter), objetivos táctiles ≥ 44 px, sin animaciones gratuitas.
- Componentes accesibles (Radix/shadcn), tokens de diseño en un único archivo.

Pantallas:
1. **Inicio**: zona grande "Abrir partitura" (arrastrar, elegir archivo, **hacer foto** en móvil, PDF) + recientes.
2. **Revisión** (solo si viene de imagen): editor de corrección de `OMR.md §4`.
3. **Transcribir** (pantalla principal):
   - Barra superior: `De: [Concierto ▾]` ⇄ `A: [Saxo tenor en Sib ▾]` (botón para invertir), selector de parte(s), `Octava −/+`.
   - Vista dividida original ↔ resultado (OSMD); en móvil, pestañas.
   - Panel de avisos: notas fuera de registro (clic → salta a la nota), cambios enarmónicos aplicados.
   - Reproducir / parar, tempo.
   - Exportar: MusicXML, PDF, PNG/SVG, MIDI; compartir (Web Share API / hoja de compartir nativa).
4. **Ajustes**: mi instrumento por defecto (se preselecciona en "A:"), registro personalizado, preferencia sostenidos/bemoles para ±6, proveedor OMR y clave API, idioma, tema, tamaño de partitura.

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
- [ ] Manual de usuario corto en la propia app.

## Ideas para después (no hacer sin pedirlo)
- Reconocer partituras desde audio.
- Biblioteca en la nube y sincronización.
- Transponer a otra tonalidad (no solo a otro instrumento) — *fácil de añadir porque usa el mismo motor*.
- Modo práctica: seguir la partitura con el micrófono.
