/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages project site is served from https://<user>.github.io/<repo>/
  // so production builds need base '/MockMarket/' while dev/preview stays at '/'
  base: mode === 'production' ? '/MockMarket/' : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
