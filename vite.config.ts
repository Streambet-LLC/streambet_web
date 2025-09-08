import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(), 
    mode === 'development' && componentTagger(),
    nodePolyfills({
      // Whether to polyfill `global`
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill specific globals
      protocolImports: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.browser': true,
  },
  build: {
    rollupOptions: {
      plugins: [],
    },
  },
  optimizeDeps: {
    include: [
      "@solana/wallet-adapter-wallets",
      "@solana/wallet-adapter-phantom",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
      "buffer",
      "process",
    ],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      }
    }
  }
}));
