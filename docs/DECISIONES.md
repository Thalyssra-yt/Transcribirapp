# Registro de decisiones

Formato breve: fecha · decisión · motivo · alternativas descartadas.

- **Inicial** · Motor de transposición propio en TypeScript basado en línea de quintas + pasos diatónicos · Enarmonía correcta, sin dependencias, mismo código en web/CLI/escritorio · Descartado: solo semitonos (enarmonía incorrecta); music21 (Python, no corre en el navegador).
- **Inicial** · Render con OpenSheetMusicDisplay · Renderiza MusicXML directamente en el navegador · Descartado: VexFlow a mano (mucho más trabajo), Verovio (válido como alternativa si OSMD se queda corto; anotarlo aquí si se cambia).
- **Inicial** · Tauri 2 para escritorio y móvil + PWA para web · Un solo código de UI, binarios pequeños · Descartado: Electron (pesado), React Native (habría que rehacer el render de partituras).
- **Inicial** · OMR mediante interfaz de proveedores; manuscrito con modelo de visión en la nube + corrección humana · Es lo más preciso hoy para manuscrito · Riesgo: privacidad y coste → consentimiento y clave del usuario.
- **2026-11-22** · pnpm 12 con `allowBuilds: esbuild: true` en `pnpm-workspace.yaml` · pnpm 12 exige aprobar los scripts de instalación de dependencias y esbuild es necesario para Vitest y Vite · Descartado: `dangerouslyAllowAllBuilds` (ejecutaría todos los scripts sin revisar).
- **2026-11-22** · `fast-check@4.11.0` como única dependencia de tests por propiedades, con excepción `minimumReleaseAgeExclude` en `pnpm-workspace.yaml` · Permite cubrir ida/vuelta y coherencia semitónica con 200 ejecuciones por propiedad · Descartado: añadir más librerías de propiedad testing o ejecutar las propiedades sin semilla fija.

<!-- Los agentes añaden aquí nuevas decisiones y dudas musicales pendientes. -->
