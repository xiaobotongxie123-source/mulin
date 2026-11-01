import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createApiHandler } from './server/handler.mjs';

export default defineConfig(({ mode }) => {
  // Server-side agent credentials live in process.env only. Vite does not
  // expose non-VITE_* variables to the client bundle.
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);
  const agentApi = createApiHandler();

  return {
    base: process.env.APP_BASE_PATH || '/',
    plugins: [
      vue(),
      {
        name: 'mulin-agent-bridge',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
            if (pathname.startsWith('/api/') || pathname === '/health') {
              void agentApi(req, res);
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5188,
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('node_modules')) return 'vendor';
            return undefined;
          },
        },
      },
    },
  };
});
