# Base de conocimiento: transcripción y transposición

Documento de referencia para los agentes. Toda la lógica de `packages/core` debe salir de aquí.
Si encuentras un caso que este documento no cubre, **no improvises**: añade la duda a `docs/DECISIONES.md` y consúltala con `@musico`.

---

## 1. Conceptos

- **Sonido real / concierto / en Do**: la nota que suena de verdad (la que tocaría un piano).
- **Instrumento transpositor**: el que lee una nota y suena otra. Un saxo tenor lee **Re** y suena **Do** una novena mayor más grave.
- **Nombre del instrumento = nota que suena cuando lee Do.** Saxo en Sib: lee Do, suena Sib. Trompa en Fa: lee Do, suena Fa.
- **Escrito → sonido**: lo que hay en el papel del músico → lo que suena.
- **Concierto → escrito**: lo que tiene que hacer la app para darle su parte al músico. Es el intervalo inverso: si el instrumento suena una 9.ª mayor más grave, su parte se escribe una 9.ª mayor más aguda.

> Regla de oro: **todo pasa por el sonido real.**
> Origen (escrito del instrumento A) → sonido real → escrito del instrumento B.
> Nunca transpongas "directamente" sin pasar por el sonido real: así se evitan errores de octava.

---

## 2. Catálogo de instrumentos

Columnas:
- **Concierto → escrito**: intervalo que se SUMA al sonido real para obtener la parte.
- **MusicXML `<transpose>`**: valores que el estándar define como "sonido = escrito + esto" (`diatonic`, `chromatic`, `octave-change`).
- **Δquintas**: desplazamiento en la línea de quintas (sirve para notas y armaduras; ver §4).
- **Registro escrito**: rango práctico para avisos (nota escrita, no sonido). Formato científico: Do4 = Do central.

### 2.1 Viento madera

| id | Instrumento | Clave | Concierto → escrito | `<transpose>` (dia/cro/oct) | Δquintas | Registro escrito |
|---|---|---|---|---|---|---|
| `flauta` | Flauta | Sol | igual | 0 / 0 / 0 | 0 | Do4 – Do7 |
| `piccolo` | Flautín | Sol | 8.ª abajo | 0 / 0 / +1 | 0 | Re4 – Do7 (suena 8.ª alta) |
| `flauta-alto` | Flauta alto en Sol | Sol | 4.ª justa arriba | −3 / −5 / 0 | −1 | Do4 – Do7 |
| `oboe` | Oboe | Sol | igual | 0 / 0 / 0 | 0 | Sib3 – La6 |
| `corno-ingles` | Corno inglés en Fa | Sol | 5.ª justa arriba | −4 / −7 / 0 | +1 | Si3 – Sol6 |
| `fagot` | Fagot | Fa (Do 4.ª en agudo) | igual | 0 / 0 / 0 | 0 | Sib1 – Mi5 |
| `clarinete-sib` | Clarinete en Sib | Sol | 2.ª mayor arriba | −1 / −2 / 0 | +2 | Mi3 – Do7 (cómodo hasta Sol6) |
| `clarinete-la` | Clarinete en La | Sol | 3.ª menor arriba | −2 / −3 / 0 | −3 | Mi3 – Do7 |
| `clarinete-mib` | Requinto (clarinete en Mib) | Sol | 3.ª menor abajo | +2 / +3 / 0 | +3 | Mi3 – Sol6 |
| `clarinete-bajo` | Clarinete bajo en Sib (notación francesa) | Sol | 9.ª mayor arriba | −1 / −2 / −1 | +2 | Mib3 – Sol6 |
| `saxo-soprano` | Saxo soprano en Sib | Sol | 2.ª mayor arriba | −1 / −2 / 0 | +2 | Sib3 – Fa#6 |
| `saxo-alto` | Saxo alto en Mib | Sol | 6.ª mayor arriba | −5 / −9 / 0 | +3 | Sib3 – Fa#6 |
| `saxo-tenor` | **Saxo tenor en Sib** | Sol | **9.ª mayor arriba** (8.ª + 2.ª M) | **−1 / −2 / −1** | **+2** | **Sib3 – Fa#6** |
| `saxo-baritono` | Saxo barítono en Mib | Sol | 13.ª mayor arriba (8.ª + 6.ª M) | −5 / −9 / −1 | +3 | La3 – Fa#6 |

### 2.2 Viento metal

| id | Instrumento | Clave | Concierto → escrito | `<transpose>` | Δquintas | Registro escrito |
|---|---|---|---|---|---|---|
| `trompeta-sib` | Trompeta en Sib | Sol | 2.ª mayor arriba | −1 / −2 / 0 | +2 | Fa#3 – Do6 |
| `trompeta-do` | Trompeta en Do | Sol | igual | 0 / 0 / 0 | 0 | Fa#3 – Do6 |
| `trompeta-mib` | Trompeta en Mib | Sol | 3.ª menor abajo | +2 / +3 / 0 | +3 | Fa#3 – Sol5 |
| `trompeta-re` | Trompeta en Re | Sol | 2.ª mayor abajo | +1 / +2 / 0 | −2 | Fa#3 – La5 |
| `fliscorno` | Fliscorno en Sib | Sol | 2.ª mayor arriba | −1 / −2 / 0 | +2 | Fa#3 – Do6 |
| `trompa-fa` | Trompa en Fa | Sol (Fa en grave) | 5.ª justa arriba | −4 / −7 / 0 | +1 | Fa#2 – Do6 |
| `trombon` | Trombón | Fa (Do 4.ª en agudo) | igual | 0 / 0 / 0 | 0 | Mi2 – Fa5 |
| `trombon-sib-sol` | Trombón en clave de Sol (banda británica) | Sol | 9.ª mayor arriba | −1 / −2 / −1 | +2 | Fa#3 – Do6 |
| `bombardino` | Bombardino/Eufonio | Fa | igual | 0 / 0 / 0 | 0 | Sib1 – Sib4 |
| `bombardino-sib-sol` | Bombardino en clave de Sol | Sol | 9.ª mayor arriba | −1 / −2 / −1 | +2 | Fa#3 – Do6 |
| `tuba` | Tuba | Fa | igual | 0 / 0 / 0 | 0 | Re1 – Fa4 |

### 2.3 Cuerda, teclado y otros

| id | Instrumento | Clave | Concierto → escrito | `<transpose>` | Δquintas | Registro escrito |
|---|---|---|---|---|---|---|
| `violin` | Violín | Sol | igual | 0 / 0 / 0 | 0 | Sol3 – Mi7 |
| `viola` | Viola | Do en 3.ª (Sol en agudo) | igual | 0 / 0 / 0 | 0 | Do3 – Mi6 |
| `violonchelo` | Violonchelo | Fa (Do 4.ª / Sol en agudo) | igual | 0 / 0 / 0 | 0 | Do2 – La5 |
| `contrabajo` | Contrabajo | Fa | 8.ª arriba | 0 / 0 / −1 | 0 | Mi2 – Sol4 (suena 8.ª baja) |
| `guitarra` | Guitarra | Sol (con 8 abajo) | 8.ª arriba | 0 / 0 / −1 | 0 | Mi3 – Si5 (suena 8.ª baja) |
| `bajo-electrico` | Bajo eléctrico | Fa | 8.ª arriba | 0 / 0 / −1 | 0 | Mi2 – Sol4 |
| `piano` | Piano | Sol + Fa | igual | 0 / 0 / 0 | 0 | La0 – Do8 |
| `voz-soprano` | Voz soprano | Sol | igual | 0 / 0 / 0 | 0 | Do4 – La5 |
| `voz-tenor` | Voz tenor | Sol con 8 abajo | 8.ª arriba | 0 / 0 / −1 | 0 | Do3 – La4 sonando |
| `glockenspiel` | Glockenspiel / lira | Sol | 2 octavas abajo | 0 / 0 / +2 | 0 | Sol3 – Do6 |

Los registros son **prácticos y orientativos** (aficionado–intermedio). Guárdalos en `packages/core/src/instruments.ts` con dos niveles: `rangoCómodo` y `rangoAbsoluto`. El usuario podrá ajustarlos en Ajustes (p. ej. un saxofonista con altísimo).

El catálogo debe ser **datos, no código**: un array tipado al que se pueda añadir un instrumento sin tocar la lógica.

---

## 3. Atajos que todo músico conoce (sirven de comprobación)

- Instrumentos en **Sib** (clarinete, trompeta, saxo soprano y tenor): la parte va **un tono más aguda** (el tenor, además, una octava más). Armadura: **+2 sostenidos** (o −2 bemoles).
- Instrumentos en **Mib** (saxo alto y barítono, requinto): la parte va **una 6.ª mayor más aguda** (equivale a una 3.ª menor más grave + 8.ª). Armadura: **+3 sostenidos**.
- Instrumentos en **Fa** (trompa, corno inglés): **una 5.ª justa más aguda**. Armadura: **+1 sostenido**.
- Instrumentos en **La** (clarinete en La): **una 3.ª menor más aguda**. Armadura: **+3 bemoles**.

Ejemplo: tema en Sib mayor (concierto) → saxo tenor lo lee en **Do mayor**; saxo alto en **Sol mayor**; trompa en **Fa mayor**.

---

## 4. Algoritmo correcto (con enarmonía bien escrita)

Trabajar solo con semitonos (MIDI) **es un error**: daría Do# donde debe ir Reb. Hay que mover **letra y alteración** a la vez. Método recomendado: **línea de quintas + pasos diatónicos**.

### 4.1 Representación de una nota

```
Nota = { paso: 'C'|'D'|'E'|'F'|'G'|'A'|'B', alter: -2..+2, octava: entero }
```
(MusicXML usa `<step>`, `<alter>`, `<octave>`; nombres en inglés internamente, en español en la UI.)

Derivados:
- `quintas(nota)`: posición en la línea de quintas. `F=-1, C=0, G=1, D=2, A=3, E=4, B=5`; cada sostenido +7, cada bemol −7.
  Ej.: Sib = 5 − 7 = −2; Fa# = −1 + 7 = 6.
- `diatonico(nota) = octava * 7 + índice(paso)` con `C=0, D=1, E=2, F=3, G=4, A=5, B=6`.
- `midi(nota) = 12 * (octava + 1) + clasePaso(paso) + alter` con `C=0, D=2, E=4, F=5, G=7, A=9, B=11`.

De quintas a nota (letra y alteración):
```
k = quintas + 1
paso  = "FCGDAEB"[ mod(k, 7) ]
alter = floor(k / 7)
```

### 4.2 Intervalo

```
Intervalo = { pasos: entero (diatónicos), semitonos: entero, quintas: entero }
```

| Intervalo | pasos | semitonos | quintas |
|---|---|---|---|
| Unísono | 0 | 0 | 0 |
| 2.ª mayor | 1 | 2 | +2 |
| 3.ª menor | 2 | 3 | −3 |
| 4.ª justa | 3 | 5 | −1 |
| 5.ª justa | 4 | 7 | +1 |
| 6.ª mayor | 5 | 9 | +3 |
| 7.ª menor | 6 | 10 | −2 |
| 8.ª | 7 | 12 | 0 |
| 9.ª mayor | 8 | 14 | +2 |
| 13.ª mayor | 12 | 21 | +3 |
| 2.ª disminuida (enarmonía) | 1 | 0 | −12 |

Un intervalo hacia abajo es el mismo con los tres valores en negativo.
Desde `<transpose>` de MusicXML: `pasos = diatonic + 7*octave-change`, `semitonos = chromatic + 12*octave-change`, `quintas` se deduce de (pasos mod 7, semitonos mod 12).

### 4.3 Transponer una nota

```
nuevaQuintas   = quintas(nota) + intervalo.quintas
nuevoDiatonico = diatonico(nota) + intervalo.pasos
(paso, alter)  = deQuintas(nuevaQuintas)
octava         = floor(nuevoDiatonico / 7)
ASSERT índice(paso) == mod(nuevoDiatonico, 7)
ASSERT midi(resultado) == midi(nota) + intervalo.semitonos
```
Los dos `ASSERT` deben existir en el código (en desarrollo lanzan error). Atrapan casi todos los bugs.

### 4.4 Transponer la armadura

`<key><fifths>` ya es una posición en la línea de quintas:
```
nuevaArmadura = armadura + intervalo.quintas
```

### 4.5 Enarmonía de la tonalidad (obligatorio)

Una armadura con más de 6 alteraciones no se usa en la práctica.
```
si nuevaArmadura > 6:  nuevaArmadura -= 12 ; aplicar a TODAS las notas de ese tramo la 2.ª disminuida ascendente (quintas −12, pasos +1)
si nuevaArmadura < -6: nuevaArmadura += 12 ; aplicar 2.ª disminuida descendente (quintas +12, pasos −1)
```
Ej.: Do# mayor (+7) → Reb mayor (−5); Do#5 → Reb5; Si#3 → Do4 (ojo: cambia la octava, por eso se usan pasos diatónicos).
±6 (Fa#/Solb) se dejan como salgan. Opción en Ajustes: "preferir bemoles / preferir sostenidos" para el caso ±6.

### 4.6 Alteraciones imposibles

Si tras transponer `|alter| > 2` (triple sostenido/bemol), reescribir la nota con la 2.ª disminuida hacia la armadura actual hasta que `|alter| <= 2`. Debe ser rarísimo; regístralo como aviso.

### 4.7 Alteraciones accidentales visibles (`<accidental>`)

Tras transponer, **recalcula** los `<accidental>` de cada compás:
- Una alteración vale para esa nota (letra + octava) hasta la barra de compás, en ese pentagrama.
- Si la nota coincide con la armadura y no hay alteración previa en el compás → sin accidente.
- Si difiere → accidente (`sharp`, `flat`, `natural`, `double-sharp`, `flat-flat`).
- Notas ligadas que cruzan la barra: no repetir accidente en la nota de llegada.
- Conserva los accidentes de precaución que ya existían (`cautionary="yes"`), recalculando su signo.

---

## 5. Qué más hay que transponer en un MusicXML

| Elemento | Qué hacer |
|---|---|
| `<note><pitch>` | §4.3 (+ §4.5 si la tonalidad se reescribe) |
| `<note><rest>` | nada |
| `<note><unpitched>` (percusión) | nada; las partes de percusión no se transponen |
| `<attributes><key>` | §4.4 + §4.5. Respetar `<mode>`. Si hay varias armaduras (por pentagrama o cambios a mitad), cada una por separado |
| `<attributes><transpose>` | sustituir por el del instrumento destino (o eliminar si destino es en Do) |
| `<attributes><clef>` | clave del instrumento destino (p. ej. violonchelo en Fa → saxo tenor en Sol) |
| `<harmony>` (cifrado: `root-step/root-alter`, `bass-step/bass-alter`) | transponer como notas (solo letra y alteración). "Sib7" → saxo tenor "Do7" |
| `<octave-shift>` (8va/8vb) | mantener; la nota escrita ya lo tiene en cuenta según el estándar. Revisar el rango con la altura real |
| `<part-name>`, `<instrument-name>`, `<part-abbreviation>` | nombre del instrumento destino, p. ej. "Saxo tenor en Sib" |
| `<score-instrument>`, `<midi-instrument>` | programa MIDI adecuado para la reproducción |
| `<figured-bass>`, digitaciones, tablaturas | no transponer; avisar si la parte tenía tablatura |
| `<chord/>`, voces, ligaduras, grupos de valoración irregular, adornos | se transponen nota a nota sin cambiar ritmo |

---

## 6. Partitura de orquesta → parte individual

1. Detectar si la partitura está **en Do** (concierto) o **transportada**: por cada parte, si tiene `<transpose>`, sus notas están escritas → primero pasar a sonido real.
2. Si viene de una imagen, el usuario indica (o la app pregunta) si la partitura está en Do o transportada y para qué instrumento está escrita cada línea.
3. Dejar elegir una o varias partes (o un pentagrama de piano: mano derecha/melodía).
4. Pasar a sonido real → transponer al instrumento destino → comprobar registro (§7).
5. Generar un MusicXML nuevo con una sola parte (o varias si el usuario las pide), conservando título, compositor, tempo, dinámicas, articulaciones, ensayo (letras de ensayo), repeticiones y casillas.

---

## 7. Registro y cambio de octava

- Comprobar cada nota **escrita** contra `rangoAbsoluto` (error) y `rangoCómodo` (aviso) del instrumento destino.
- Si hay notas fuera, proponer un desplazamiento de octava para **toda la parte** (o para un fragmento seleccionado): probar −2…+2 octavas y elegir el que deje menos notas fuera; en empate, el que más notas deje en el rango cómodo; en empate, el más cercano a 0.
- La app **muestra** las notas conflictivas (resaltadas) y **propone**, no aplica sin permiso.
- Ejemplo: melodía de flauta con Do6 de concierto → saxo tenor escrito Re7 → fuera de registro → propuesta: bajar 8.ª (Re6), o bajar dos octavas si casi todo queda alto.

---

## 8. Casos de prueba obligatorios (golden tests)

Formato: origen → destino. Notación: Sib3 = Si bemol de la octava 3 (Do4 = Do central). Armadura en número de quintas (negativo = bemoles).

| # | Origen | Destino | Nota origen | Nota esperada | Armadura origen → esperada |
|---|---|---|---|---|---|
| 1 | concierto | saxo-tenor | Sib3 | Do5 | −2 (Sib M) → 0 (Do M) |
| 2 | concierto | saxo-alto | Fa4 | Re5 | −3 (Mib M) → 0 (Do M) |
| 3 | concierto | clarinete-sib | Do4 | Re4 | 0 → +2 (Re M) |
| 4 | concierto | trompa-fa | Do4 | Sol4 | 0 → +1 (Sol M) |
| 5 | concierto | clarinete-mib | Do5 | La4 | 0 → +3 (La M) |
| 6 | concierto | clarinete-la | Do4 | Mib4 | 0 → −3 (Mib M) |
| 7 | concierto | saxo-baritono | Mib3 | Do5 | −3 → 0 |
| 8 | concierto | saxo-tenor | Si3 | **Reb5** (no Do#5) | +5 (Si M) → +7 → **−5 (Reb M)** |
| 9 | concierto | saxo-alto | Sol#4 | **Fa5** (no Mi#5) | +4 (Mi M) → +7 → **−5 (Reb M)** |
| 10 | concierto | saxo-tenor | Fa#4 | Sol#5 | +2 (Re M) → +4 (Mi M) |
| 11 | saxo-tenor | concierto | Re5 | Do4 | 0 → −2 |
| 12 | trompeta-sib | saxo-alto | Re5 | La5 | +2 (Re M) → +3 (La M) |
| 13 | flauta | saxo-tenor | Do6 | Re7 → **aviso fuera de registro**, propuesta −1 8.ª → Re6 | 0 → +2 |
| 14 | violonchelo (clave Fa) | saxo-tenor | Do3 | Re4, **clave de Sol** | 0 → +2 |
| 15 | concierto | piccolo | Do6 | Do5 | 0 → 0 |
| 16 | concierto | guitarra | Mi2 | Mi3 | 0 → 0 |
| 17 | concierto | saxo-tenor | Solb4 | Lab5 | −6 (Solb M) → −4 (Lab M) |
| 18 | concierto | trompeta-sib | Fa#4 | Sol#4 → **Lab4** | +6 (Fa# M) → +8 → **−4 (Lab M)** |
| 19 | cifrado concierto "Bb7" | saxo-tenor | — | "C7" | — |
| 20 | cifrado concierto "F#m7" | saxo-alto | — | "D#m7" | — |
| 21 | concierto | saxo-tenor | silencio / percusión | sin cambios | — |
| 22 | concierto Si#3 en tonalidad Do# M (+7)* | concierto (normalizar) | Si#3 | Do4 | +7 → −5 |
| 23 | **ida y vuelta** concierto → saxo-tenor → concierto | | cualquier partitura de `fixtures/` | idéntica nota a nota (paso, alter, octava) | idéntica |
| 24 | **ida y vuelta** concierto → saxo-alto → trompeta-sib → concierto | | cualquiera | idéntica salvo enarmonías justificadas por §4.5 | |

\* El caso 22 comprueba que la reescritura enarmónica cambia la octava correctamente (Si#3 y Do4 suenan igual).

Para cada caso, comprueba además que `midi(esperada) − midi(origen)` es igual a los semitonos del intervalo total.

---

## 9. Lectura de partituras (OMR), especialmente manuscritas

Lo que debe saber cualquier agente que "lea" una partitura:

1. **Orden de lectura**: sistema a sistema, de izquierda a derecha; en orquesta, cada sistema contiene todas las partes (una por pentagrama, unidas por la llave/corchete inicial).
2. **Primero lo global**: clave, armadura, compás (4/4, 3/4, 6/8, C, ¢), tempo/indicaciones, nombres de instrumentos al inicio del primer sistema (en sistemas siguientes, abreviaturas).
3. **Altura**: posición en el pentagrama relativa a la clave (Sol en 2.ª línea, Fa en 4.ª, Do en 3.ª o 4.ª), líneas adicionales, alteraciones accidentales (valen hasta la barra), 8va/8vb.
4. **Ritmo**: cabeza (blanca/negra), plica, corchetes/barras, puntillos, ligaduras de unión vs. de expresión, tresillos. **Comprobación obligatoria: la suma de duraciones de cada compás debe igualar el compás** (salvo anacrusa en el primero y compás final incompleto). Si no cuadra, el compás se marca como dudoso.
5. **Manuscrito**: las cabezas pueden quedar entre línea y espacio. Ante la duda entre dos alturas, elegir la más coherente con la armadura y la línea melódica, **pero marcarla como dudosa** con su alternativa.
6. **Nunca inventar**: si un fragmento es ilegible, se deja un compás de silencio marcado `ilegible` y se avisa. Es mejor que el usuario corrija 2 notas que tocar 20 inventadas.
7. **Salida**: siempre MusicXML 4.0 válido (`score-partwise`), más un informe JSON con: compases dudosos, notas con alternativa, confianza global, y si la partitura parece en Do o transportada.

Ver `docs/OMR.md` para la arquitectura de reconocimiento.
