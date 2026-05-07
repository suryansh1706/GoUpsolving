import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // For local Vercel development, run: vercel dev
        // This proxies API calls from Vite dev server to the Vercel dev server
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path,
        // Optional: log proxy requests for debugging
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('Proxy error:', err);
            console.log('⚠️  Make sure to run "vercel dev" in another terminal to start the API server');
          });
        },
      },
    },
  },
})
