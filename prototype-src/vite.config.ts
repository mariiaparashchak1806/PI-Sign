import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from GitHub Pages at /PI-Sign/prototype/ — build lands next to the repo's other pages.
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/PI-Sign/prototype/' : '/',
  build: { outDir: '../prototype', emptyOutDir: true },
  server: { port: 5178 },
})
