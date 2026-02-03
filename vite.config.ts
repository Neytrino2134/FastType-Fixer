import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Securely expose API_KEY to renderer at build time
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    base: './', // Use relative paths for Electron
  };
});