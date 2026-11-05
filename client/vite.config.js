import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The browser calls relative /api URLs; Vite forwards them to the backend.
// Inside Docker Compose the backend host is "api"; locally it is localhost.
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,          // CORS on the backend expects http://localhost:3000
    watch: { usePolling: true }, // file changes reach the container on Windows
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,             // lets Testing Library clean up between tests
    setupFiles: './src/test/setup.js',
  },
});
