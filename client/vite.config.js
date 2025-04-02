import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  
  return {
    plugins: [react()],
    server: {
      port: 5000,
      // Important: Ensure HMR works
      hmr: {
        overlay: true,
      },
      // Proxy API requests to the Express server
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/meetup_qa': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/session': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        // CHANGE THIS PART - Only proxy specific register API endpoints
        '/register/login': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/register/signup': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/register/password-reset': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/register/password-reset/': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Always generate sourcemaps in development
      sourcemap: true,
      // Only minify in production
      minify: !isDev,
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom']
          }
        }
      }
    }
  };
});