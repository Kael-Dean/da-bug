// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/da-bug/',          // สำคัญ: path prefix ของบัคเก็ต
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist' }
})
