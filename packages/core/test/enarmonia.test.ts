import { describe, expect, it } from 'vitest';
import { UNISONO } from '../src/interval';
import { formatearNota, nota } from '../src/pitch';
import { transponerNotaConArmadura } from '../src/transpose';

describe('corrección de alteraciones imposibles', () => {
  it('usa la 2.ª disminuida cuando la alteración supera dos sostenidos', () => {
    const resultado = transponerNotaConArmadura(nota('F', 3, 4), UNISONO, 0);

    expect(formatearNota(resultado.nota)).toBe('Sol#4');
    expect(resultado.avisos).toContain(
      'Se corrigió una alteración imposible con la 2.ª disminuida'
    );
  });
});
