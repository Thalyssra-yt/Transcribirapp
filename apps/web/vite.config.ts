import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@transcriptor/core': fileURLToPath(
        new URL('../../packages/core/src/index.ts', import.meta.url)
      ),
      '@transcriptor/omr': fileURLToPath(
        new URL('../../packages/omr/src/index.ts', import.meta.url)
      )
    }
  }
});
