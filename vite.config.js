// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',               // เปิดที่ https://storage.googleapis.com/<bucket>/index.html
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist' } // ใช้ค่า default: assets จะอยู่ dist/assets
})
