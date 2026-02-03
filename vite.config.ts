
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Using './' ensures assets are loaded relatively, which is required for Electron (file:// protocol)
    // This also works for most static hosting environments.
    base: './', 
    server: {
      host: true, 
      open: false, 
    },
    define: {
      // FIX: Define ONLY the specific key to avoid overwriting the entire process.env object
      // This prevents breaking libraries (like React) that rely on process.env.NODE_ENV
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    }
  }
})
