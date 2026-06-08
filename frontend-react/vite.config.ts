import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_PUBLIC_BASE_PATH || '/',
    plugins: [react()],
    build: {
      outDir: env.VITE_BUILD_OUT_DIR || '../production-build/frontend',
      emptyOutDir: true,
      manifest: true,
      sourcemap: env.VITE_BUILD_SOURCEMAP === 'true',
    },
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
  };
});
