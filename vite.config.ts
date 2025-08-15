import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    rollupOptions: {
      external: ['buffer'],
      plugins: [
        // @ts-ignore
        // This plugin is specifically for handling Node.js built-ins in browser environments
        // and it might need to be installed if not already present.
        // For 'buffer', it often means a polyfill is needed.
        // A common approach is to use 'rollup-plugin-node-polyfills' or similar,
        // but for 'buffer' specifically, Vite's direct 'define' and 'resolve.alias' with 'buffer' polyfill can work.
        // If this doesn't work, consider adding `rollup-plugin-node-polyfills` and configuring it.
      ],
    },
  },
  optimizeDeps: {
    include: [
      "@solana/wallet-adapter-wallets",
      "@solana/wallet-adapter-phantom",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui"
    ]
  }
}));
