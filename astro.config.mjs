import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://studio.meltlight.art', // ← 独自ドメイン
  base: '/',                     // ← ルート配信なら '/'（もしくは項目ごと削除でもOK）
  output: 'static',
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
});