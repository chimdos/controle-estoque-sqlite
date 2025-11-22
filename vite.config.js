import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // URL base para o AssetLoader do Android
  base: 'https://appassets.androidplatform.net/assets/',
  plugins: [react()],
  build: {
    target: 'es2020', // Necessário para suporte a BigInt e WASM
    minify: false,    // Ajuda no debug
    rollupOptions: {
        output: {
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name].[ext]'
        }
    }
  },
  optimizeDeps: {
    exclude: ['sql.js'] // Impede o Vite de tentar otimizar essa lib
  }
})