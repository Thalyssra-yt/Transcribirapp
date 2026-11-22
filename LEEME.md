# Kit para que OpenCode construya el Transcriptor de Partituras

Este kit no es la app: es todo lo que OpenCode necesita para construirla bien.

```
AGENTS.md                    → instrucciones del proyecto (OpenCode lo lee solo)
docs/TRANSPOSICION.md        → el "saber musical": instrumentos, algoritmo y 24 casos de prueba
docs/PLAN.md                 → fases con criterios de aceptación
docs/OMR.md                  → cómo reconocer partituras impresas y manuscritas
docs/DECISIONES.md           → registro de decisiones
.opencode/agents/
  partituras.md              → agente principal: construye la app
  musico.md                  → subagente experto en teoría musical (revisa)
  revisor.md                 → subagente de calidad (no toca código)
  transcriptor.md            → agente para transcribir partituras reales con la app/CLI
```

## Cómo usarlo

1. Crea una carpeta vacía para el proyecto y copia dentro todo el contenido de este kit (incluida la carpeta oculta `.opencode`).
2. Abre una terminal en esa carpeta y ejecuta `git init` (para que OpenCode pueda deshacer cambios).
3. Arranca `opencode`.
4. Pulsa **Tab** hasta que el agente activo sea **partituras**.
5. Pega el **prompt inicial** de abajo.
6. Cuando termine cada fase, revisa el resumen y pega el **prompt de continuar**.

> Si tu versión de OpenCode no detecta los agentes, prueba a renombrar `.opencode/agents` a `.opencode/agent` (versiones antiguas usaban el singular).

## Prompt inicial

```
Vamos a construir la aplicación descrita en AGENTS.md.
Lee AGENTS.md, docs/PLAN.md, docs/TRANSPOSICION.md y docs/OMR.md completos.
Después:
1. Resúmeme en 10 líneas lo que has entendido (qué hace la app, stack y fases).
2. Dime qué dudas tienes antes de empezar.
3. Si no hay dudas bloqueantes, empieza la Fase 0 y continúa con la Fase 1.
En la Fase 1 implementa primero los 22 casos de prueba de TRANSPOSICION.md §8 como tests,
y no des la fase por terminada hasta que pasen todos y el subagente musico lo apruebe.
Mi instrumento es el saxofón tenor en Sib: úsalo como instrumento por defecto.
```

## Prompt de continuar

```
Revisa docs/PLAN.md, dime en qué fase estamos y qué falta, y continúa con la siguiente fase.
Antes de cerrarla, pásale el revisor y el musico, y enséñame el resultado.
```

## Prompts útiles

- Comprobar la teoría: `@musico revisa packages/core y calcula a mano los casos 8, 9, 18 y 22`
- Control de calidad: `@revisor revisa la fase actual`
- Transcribir una partitura real (cambia al agente **transcriptor** con Tab y adjunta la foto):
  `Transcribe esta partitura para saxo tenor. Está escrita en Do.`

## Consejos

- Usa en OpenCode un modelo potente y con visión (para leer partituras manuscritas hace falta que el modelo vea imágenes).
- Ve fase a fase. Si le pides todo de golpe, la calidad baja.
- Prueba cada fase tú mismo con una partitura que conozcas bien: es la mejor comprobación de que transpone bien.
- Lo manuscrito siempre necesitará una revisión tuya; la app está pensada para que corregir sea rápido.
