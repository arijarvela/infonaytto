import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Muuta tämä vastaamaan reposi nimeä (esim. '/kotinaytto/')
const basePath = '/infonaytto/'

export default defineConfig({
  plugins: [react()],
  base: basePath,
})
