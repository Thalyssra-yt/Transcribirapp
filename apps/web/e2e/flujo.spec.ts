import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const fixture = fileURLToPath(
  new URL('../../../packages/core/test/fixtures/escala-sib.musicxml', import.meta.url)
);

async function abrirYTranscribir(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(fixture);
  await expect(page.locator('#estado-transcripcion')).toContainText('Transcripción lista', {
    timeout: 20_000
  });
}

test('abre, transcribe, avisa y exporta un MusicXML', async ({ page }, testInfo) => {
  await abrirYTranscribir(page);
  await expect(page.getByText(/fuera del registro del Saxo tenor/)).toBeVisible();
  if (testInfo.project.name === 'escritorio') {
    await expect(
      page.getByRole('img', { name: /instrumento Flauta, tonalidad Sib mayor/ })
    ).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: 'Aplicar propuesta: bajar una octava' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Ver detalle' }).click();
  await expect(page.getByRole('heading', { name: /Avisos/ })).toBeVisible();

  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: /Descargar/ }).click();
  await page.getByRole('menuitem', { name: 'MusicXML' }).click();
  expect((await descarga).suggestedFilename()).toBe('escala-sib-transcrito.musicxml');
});

test('el visor ajusta la partitura al ancho disponible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'escritorio');

  await abrirYTranscribir(page);
  await expect(page.locator('#visor-original .visor-papel svg')).toHaveCount(1);

  const medida = await page.evaluate(() => {
    const papel = document.querySelector('#visor-original .visor-papel') as HTMLElement | null;
    const svg = papel?.querySelector('svg') as SVGSVGElement | null;
    if (!papel || !svg) {
      return null;
    }

    const estilos = getComputedStyle(papel);
    const disponible =
      papel.clientWidth -
      (Number.parseFloat(estilos.paddingLeft) || 0) -
      (Number.parseFloat(estilos.paddingRight) || 0);

    return { ancho: svg.getBoundingClientRect().width, disponible };
  });

  expect(medida).not.toBeNull();
  expect(medida?.ancho).toBeLessThanOrEqual((medida?.disponible ?? 0) + 2);
});

test('sirve el icono y el manifest sin 404', async ({ page, request }) => {
  await page.goto('/');

  const icono = await request.get('/favicon.svg');
  expect(icono.ok()).toBeTruthy();

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).name).toBe('Transcriptor de partituras');
});

test('el primer foco de teclado está en Abrir partitura', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Abrir partitura' })
  ).toBeFocused();
});

test('en móvil las pestañas cambian la partitura visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'movil');

  await abrirYTranscribir(page);
  await page.getByRole('button', { name: 'Original' }).click();
  await expect(page.locator('#visor-original')).toBeVisible();
  await expect(page.locator('#visor-resultado')).toBeHidden();

  await page.getByRole('button', { name: 'Resultado' }).click();
  await expect(page.locator('#visor-resultado')).toBeVisible();
  await expect(page.locator('#visor-original')).toBeHidden();
});

test('en móvil la hoja de opciones es un diálogo accesible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'movil');

  await abrirYTranscribir(page);
  const resumen = page.getByRole('button', { name: '→ Saxo tenor (Sib)' });
  await resumen.click();

  const dialogo = page.getByRole('dialog', { name: 'Opciones de transcripción' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toBeFocused();

  const resultados = await new AxeBuilder({ page }).analyze();
  expect(
    resultados.violations.map(
      (violacion) => `${violacion.id}: ${violacion.nodes.map((nodo) => nodo.target).join(', ')}`
    )
  ).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();
  await expect(resumen).toBeFocused();

  await resumen.click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(dialogo).toBeHidden();
  await expect(page.locator('header')).not.toHaveAttribute('inert', '');
});

test('no tiene violaciones de accesibilidad en claro y oscuro', async ({ page }) => {
  for (const esquema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: esquema });
    await abrirYTranscribir(page);

    const resultados = await new AxeBuilder({ page }).analyze();
    expect(
      resultados.violations.map(
        (violacion) => `${violacion.id}: ${violacion.nodes.map((nodo) => nodo.target).join(', ')}`
      )
    ).toEqual([]);
  }
});
