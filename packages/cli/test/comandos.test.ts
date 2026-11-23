import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { leerMxl, parseMusicXml } from '@transcriptor/core';
import { ejecutarComando } from '../src/comandos';

const FIXTURES = join(import.meta.dirname, '../../core/test/fixtures');
const ESCALA = join(FIXTURES, 'escala-sib.musicxml');
const ORQUESTA = join(FIXTURES, 'fragmento-orquestal.musicxml');

function temporal(): string {
  return mkdtempSync(join(tmpdir(), 'partitura-cli-'));
}

describe('CLI partitura', () => {
  it('lista instrumentos en texto y en JSON', () => {
    const resultado = ejecutarComando(['instrumentos', '--json']);
    const datos = resultado.json as { instrumentos: { id: string; nombre: string }[] };

    expect(resultado.texto).toHaveLength(1);
    expect(() => JSON.parse(resultado.texto[0])).not.toThrow();
    expect(datos.instrumentos.length).toBeGreaterThan(70);
    expect(datos.instrumentos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'saxo-tenor',
          nombre: 'Saxo tenor en Sib',
          afinacion: 'Sib',
          familia: 'madera'
        })
      ])
    );
  });

  it('muestra partes, tonalidad, compás, transporte y registro', () => {
    const resultado = ejecutarComando(['info', ORQUESTA, '--json']);
    const datos = resultado.json as {
      titulo: string;
      compositor: string;
      partes: {
        id: string;
        nombre: string;
        tonalidad: number;
        tonalidades: number[];
        compases: string[];
        transportada: boolean;
        deteccion: string;
        origen: string;
        registro: { inferior: string; superior: string; notas: number };
      }[];
      dudas: unknown[];
    };

    expect(datos.titulo).toBe('Fragmento orquestal transportado');
    expect(datos.compositor).toBe('Fixture del proyecto');
    expect(datos.partes).toHaveLength(2);
    expect(datos.partes[0]).toMatchObject({
      id: 'P1',
      nombre: 'Trompa en Fa',
      tonalidad: 1,
      tonalidades: [1],
      compases: ['4/4'],
      transportada: true,
      deteccion: 'transpose',
      origen: 'trompa-fa',
      registro: { notas: 4 }
    });
    expect(datos.partes[1].origen).toBe('clarinete-sib');
    expect(datos.dudas).toEqual([]);
  });

  it('mantiene dudas cuando algún candidato transporta', () => {
    const resultado = ejecutarComando(['info', ESCALA, '--json']);
    const datos = resultado.json as { dudas: { nombre: string; candidatos: string[] }[] };

    expect(datos.dudas).toHaveLength(1);
    expect(datos.dudas[0].candidatos).toContain('Flauta alto en Sol');
  });

  it('transpone a MXL, aplica la octava pedida y avisa de las dudas', () => {
    const directorio = temporal();
    const salida = join(directorio, 'clarinete.mxl');

    try {
      const resultado = ejecutarComando([
        'transponer',
        ESCALA,
        '--de',
        'concierto',
        '--a',
        'clarinete-sib',
        '--octava',
        '-1',
        '-o',
        salida,
        '--json'
      ]);
      const datos = resultado.json as {
        salida: string;
        octava: number;
        informe: { partes: { origen: string }[] };
      };
      const documento = parseMusicXml(leerMxl(readFileSync(salida)));
      const pitch = documento.getElementsByTagName('pitch')[0];

      expect(datos.salida).toBe(salida);
      expect(datos.octava).toBe(-1);
      expect(datos.informe.partes[0].origen).toBe('concierto');
      expect(pitch.getElementsByTagName('step')[0].textContent).toBe('C');
      expect(pitch.getElementsByTagName('octave')[0].textContent).toBe('4');
    } finally {
      rmSync(directorio, { recursive: true, force: true });
    }
  });

  it('permite elegir una parte por su número', () => {
    const directorio = temporal();
    const salida = join(directorio, 'clarinete.musicxml');

    try {
      ejecutarComando([
        'transponer',
        ORQUESTA,
        '--de',
        'auto',
        '--a',
        'concierto',
        '--parte',
        '2',
        '-o',
        salida
      ]);

      const documento = parseMusicXml(readFileSync(salida));
      const partes = documento.getElementsByTagName('part');

      expect(partes).toHaveLength(1);
      expect(partes[0].getAttribute('id')).toBe('P2');
    } finally {
      rmSync(directorio, { recursive: true, force: true });
    }
  });

  it('informa de notas fuera de registro y propone octava sin aplicarla', () => {
    const resultado = ejecutarComando(['rango', ESCALA, '--instrumento', 'tuba', '--json']);
    const datos = resultado.json as {
      instrumento: string;
      notasAnalizadas: number;
      octavaSugerida: number;
      fuera: { nota: string; estado: string; compas: string }[];
    };

    expect(datos.instrumento).toBe('tuba');
    expect(datos.notasAnalizadas).toBe(8);
    expect(datos.fuera.length).toBeGreaterThan(0);
    expect(datos.fuera[0].estado).toBe('fuera-absoluto');
    expect(datos.fuera[0].compas).toBe('1');
    expect(datos.octavaSugerida).toBeLessThan(0);
    expect(readFileSync(ESCALA, 'utf8')).toContain('<fifths>-2</fifths>');
  });

  it('comprueba el registro después de llevar cada parte a concierto y al destino', () => {
    const resultado = ejecutarComando(['rango', ORQUESTA, '--instrumento', 'tuba', '--json']);
    const datos = resultado.json as {
      notasAnalizadas: number;
      fuera: { nota: string; estado: string }[];
    };

    expect(datos.notasAnalizadas).toBe(8);
    expect(datos.fuera.some((entrada) => entrada.nota === 'Do4')).toBe(false);
    expect(
      datos.fuera.filter((entrada) => entrada.estado === 'fuera-absoluto').length
    ).toBeLessThan(8);
  });

  it('rechaza extensiones de entrada y salida no soportadas', () => {
    expect(() => ejecutarComando(['info', 'partitura.txt', '--json'])).toThrow(
      /Extensión no soportada para entrada/
    );
    expect(() =>
      ejecutarComando([
        'transponer',
        ESCALA,
        '--de',
        'concierto',
        '--a',
        'tuba',
        '-o',
        'salida.txt'
      ])
    ).toThrow(/Extensión no soportada para salida/);
  });

  it('acepta el separador que añade pnpm con --filter cli start --', () => {
    const resultado = ejecutarComando(['--', 'instrumentos', '--json']);
    const datos = resultado.json as { instrumentos: unknown[] };

    expect(datos.instrumentos.length).toBeGreaterThan(70);
  });

  it('rechaza instrumentos desconocidos con un mensaje claro', () => {
    expect(() =>
      ejecutarComando([
        'transponer',
        ESCALA,
        '--de',
        'concierto',
        '--a',
        'inexistente',
        '-o',
        'salida.musicxml'
      ])
    ).toThrow(/Instrumento desconocido: inexistente/);
  });

  it('sugiere el id más parecido cuando el instrumento está mal escrito', () => {
    expect(() =>
      ejecutarComando([
        'transponer',
        ESCALA,
        '--de',
        'concierto',
        '--a',
        'saxo-tennor',
        '-o',
        'salida.musicxml'
      ])
    ).toThrow(/¿Quisiste decir saxo-tenor\?/);
  });

  it('resuelve rutas relativas desde INIT_CWD', () => {
    const anterior = process.env.INIT_CWD;

    try {
      process.env.INIT_CWD = FIXTURES;
      const resultado = ejecutarComando(['info', 'escala-sib.musicxml', '--json']);
      const datos = resultado.json as { archivo: string };

      expect(datos.archivo).toBe(ESCALA);
    } finally {
      if (anterior === undefined) {
        delete process.env.INIT_CWD;
      } else {
        process.env.INIT_CWD = anterior;
      }
    }
  });

  it('avisa si no existe el archivo indicado', () => {
    expect(() => ejecutarComando(['info', 'no-existe.musicxml'])).toThrow(
      /No existe el archivo .*no-existe\.musicxml/
    );
  });

  it('usa detección automática cuando no se indica --de', () => {
    const directorio = temporal();
    const salida = join(directorio, 'auto.musicxml');

    try {
      const resultado = ejecutarComando([
        'transponer',
        ESCALA,
        '--a',
        'tuba',
        '-o',
        salida,
        '--json'
      ]);
      const datos = resultado.json as { desde: string; informe: { avisos: string[] } };

      expect(datos.desde).toBe('auto');
      expect(datos.informe.avisos).toEqual(expect.any(Array));
    } finally {
      rmSync(directorio, { recursive: true, force: true });
    }
  });

  it('acepta una tonalidad por nombre y la aplica antes del instrumento destino', () => {
    const directorio = temporal();
    const salida = join(directorio, 'sol.musicxml');

    try {
      const resultado = ejecutarComando([
        'transponer',
        ESCALA,
        '--de',
        'concierto',
        '--a',
        'clarinete-sib',
        '--tonalidad',
        'Sol',
        '-o',
        salida,
        '--json'
      ]);
      const datos = resultado.json as { tonalidad: number; direccion: string };
      const documento = parseMusicXml(readFileSync(salida));
      const armadura = documento.getElementsByTagName('fifths')[0];

      expect(datos.tonalidad).toBe(1);
      expect(datos.direccion).toBe('cercana');
      expect(armadura?.textContent).toBe('3');
    } finally {
      rmSync(directorio, { recursive: true, force: true });
    }
  });

  it('aplica el modo de una tonalidad menor y acepta nombres en minúscula', () => {
    const directorio = temporal();
    const menores = join(directorio, 'menor.musicxml');
    const bemoles = join(directorio, 'mib.musicxml');

    try {
      const resultadoMenor = ejecutarComando([
        'transponer',
        ESCALA,
        '--de',
        'concierto',
        '--a',
        'concierto',
        '--tonalidad',
        're menor',
        '-o',
        menores,
        '--json'
      ]);
      const resultadoBemol = ejecutarComando([
        'transponer',
        ESCALA,
        '--de',
        'concierto',
        '--a',
        'concierto',
        '--tonalidad',
        'mib',
        '-o',
        bemoles,
        '--json'
      ]);
      const datosMenor = resultadoMenor.json as { tonalidad: number; modo: string };
      const datosBemol = resultadoBemol.json as { tonalidad: number; modo: string };
      const documentoMenor = parseMusicXml(readFileSync(menores));
      const documentoBemol = parseMusicXml(readFileSync(bemoles));

      expect(datosMenor.tonalidad).toBe(-1);
      expect(datosMenor.modo).toBe('minor');
      expect(documentoMenor.getElementsByTagName('fifths')[0]?.textContent).toBe('-1');
      expect(documentoMenor.getElementsByTagName('mode')[0]?.textContent).toBe('minor');
      expect(datosBemol.tonalidad).toBe(-3);
      expect(datosBemol.modo).toBe('major');
      expect(documentoBemol.getElementsByTagName('fifths')[0]?.textContent).toBe('-3');
      expect(documentoBemol.getElementsByTagName('mode')[0]?.textContent).toBe('major');
    } finally {
      rmSync(directorio, { recursive: true, force: true });
    }
  });

  it('ofrece ayuda general, ayuda por comando y versión', () => {
    expect(ejecutarComando(['--help']).texto.join('\n')).toContain('pnpm partitura');
    expect(ejecutarComando(['transponer', '--help']).texto.join('\n')).toContain('--tonalidad');
    expect(ejecutarComando(['rango', '-h']).texto.join('\n')).toContain('--instrumento');
    expect(ejecutarComando(['--version']).json).toEqual({ version: '0.1.0' });
  });

  it('filtra instrumentos por agrupación y por búsqueda', () => {
    const agrupacion = ejecutarComando(['instrumentos', '--agrupacion', 'big band', '--json'])
      .json as {
      instrumentos: { id: string; agrupaciones: string[] }[];
    };
    const buscados = ejecutarComando(['instrumentos', '--buscar', 'tenor', '--json']).json as {
      instrumentos: { id: string; afinacion: string }[];
    };

    expect(agrupacion.instrumentos.length).toBeGreaterThan(0);
    expect(
      agrupacion.instrumentos.every((instrumento) => instrumento.agrupaciones.includes('big-band'))
    ).toBe(true);
    expect(buscados.instrumentos.map((instrumento) => instrumento.id)).toContain('saxo-tenor');
    expect(buscados.instrumentos[0].afinacion).toBeTruthy();
  });

  it('no sobrescribe la entrada salvo con --forzar', () => {
    const directorio = temporal();
    const copia = join(directorio, 'copia.musicxml');

    try {
      copyFileSync(ESCALA, copia);
      const original = readFileSync(copia, 'utf8');

      expect(() =>
        ejecutarComando(['transponer', copia, '--de', 'concierto', '--a', 'tuba', '-o', copia])
      ).toThrow(/Usa --forzar para sobrescribir/);

      const resultado = ejecutarComando([
        'transponer',
        copia,
        '--de',
        'concierto',
        '--a',
        'tuba',
        '-o',
        copia,
        '--forzar',
        '--json'
      ]);
      const datos = resultado.json as { archivo: string; salida: string };

      expect(datos.archivo).toBe(copia);
      expect(datos.salida).toBe(copia);
      expect(readFileSync(copia, 'utf8')).not.toBe(original);
    } finally {
      rmSync(directorio, { recursive: true, force: true });
    }
  });
});
