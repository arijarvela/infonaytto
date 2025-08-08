import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vaihda 'kotinaytto' reposi nimeksi
const basePath = '/kotinaytto/'

export default defineConfig({
  plugins: [react()],
  base: basePath,
})
