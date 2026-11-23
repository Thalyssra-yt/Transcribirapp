import { defineConfig, devices } from '@playwright/test';

const librerias = process.env.PLAYWRIGHT_LIBS;
if (librerias) {
  process.env.LD_LIBRARY_PATH = [librerias, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}

const canal = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: './apps/web/e2e',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...(canal ? { channel: canal } : {}),
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'pnpm --filter @transcriptor/web dev --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
