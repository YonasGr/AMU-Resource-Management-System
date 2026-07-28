import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Inside Docker Compose, other containers are reached by service name ("backend"),
// not "localhost" — "localhost" inside this container means the frontend container
// itself. When running the frontend directly on your host machine (outside Docker),
// override this via VITE_API_PROXY_TARGET=http://localhost:3000 in a .env file.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://backend:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        // Backend routes are unprefixed (e.g. /health, not /api/health) —
        // strip /api here so dev-server proxying matches what Nginx does in prod.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
