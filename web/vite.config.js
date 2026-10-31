import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (command === 'build' && env.VITE_AUTH_MODE === 'dev') {
    throw new Error('VITE_AUTH_MODE=dev est interdit pour un build de production.');
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target: `http://localhost:${env.PORT || 3000}`, changeOrigin: false } }
    },
    build: { outDir: 'dist', sourcemap: false },
    test: { include: ['tests/**/*.test.js'], environment: 'node' }
  };
});
