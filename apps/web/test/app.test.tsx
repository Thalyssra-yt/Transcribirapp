// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App, bajarOctavaDesde } from '../src/App';

describe('interfaz web', () => {
  it('renderiza sin lanzar con la opción automática inicial', () => {
    render(<App />);

    expect(screen.getAllByRole('button', { name: /Abrir partitura/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Probar con un ejemplo/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Intercambiar De y A' })).toBeDefined();
  });

  it('baja una sola octava aunque la sugerencia sea distinta', () => {
    expect(bajarOctavaDesde(0)).toBe(-1);
    expect(bajarOctavaDesde(-2)).toBe(-2);
  });
});
