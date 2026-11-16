import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        tunnel: fileURLToPath(new URL('./tunnel/index.html', import.meta.url)),
      },
    },
  },
});
