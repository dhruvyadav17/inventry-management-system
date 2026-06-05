import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': '/src/app',
      '@auth': '/src/features/auth',
      '@common': '/src/common',
      '@admin': '/src/panels/admin',
      '@shopkeeper': '/src/panels/shopkeeper',
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
