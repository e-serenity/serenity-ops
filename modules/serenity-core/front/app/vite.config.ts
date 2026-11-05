import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Chemins relatifs pour être hébergé sur n'importe quel sous-dossier ou URL
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
