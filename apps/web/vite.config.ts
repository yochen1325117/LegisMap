import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/LegisMap/' : '/',
  plugins: [
    react(),
    {
      name: 'pages-spa-fallback',
      closeBundle() {
        const index = resolve(import.meta.dirname, 'dist/index.html');
        if (existsSync(index)) copyFileSync(index, resolve(import.meta.dirname, 'dist/404.html'));
      },
    },
  ],
}));
