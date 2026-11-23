# Pruebas manuales de MusicXML (Fase 2)

Los archivos de `packages/core/test/golden/` son la salida real de los tests 23–24 de `docs/TRANSPOSICION.md §8`.

## Comprobación pendiente en MuseScore

MuseScore no está instalado en el entorno de desarrollo de este repositorio, así que la apertura manual no se ha ejecutado aquí. Para cerrar esta comprobación:

1. Abrir MuseScore 4 (o 3.6).
2. Abrir, de uno en uno, los 12 archivos `.xml` de `packages/core/test/golden/`.
3. Confirmar en cada uno:
   - no aparece aviso de importación ni partitura truncada;
   - los compases y el número de notas coinciden con el fixture original;
   - las armaduras, alteraciones y claves se muestran sin símbolos duplicados;
   - en los archivos `24-*` el oído reconoce la misma melodía que en el fixture original.

| Caso | Archivos | Resultado |
| --- | --- | --- |
| 23 · concierto → saxo tenor → concierto | `23-*.xml` | Pendiente de apertura en MuseScore |
| 24 · concierto → saxo alto → trompeta en Sib → concierto | `24-*.xml` | Pendiente de apertura en MuseScore |

La verificación automática equivalente está en `packages/core/test/golden.test.ts`: compara nota a nota el caso 23 y compara alturas MIDI el caso 24. Los golden se regeneraron el 2026-11-23 tras corregir la escritura de la clave del destino cuando el original no trae `<clef>`.
