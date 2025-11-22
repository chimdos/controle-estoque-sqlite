import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Força o Vite a usar caminhos absolutos que funcionam no AssetLoader
  base: './',
  plugins: [react()],
  build: {
    target: 'esnext', // Garante suporte a recursos modernos
    outDir: 'dist'
  }
})