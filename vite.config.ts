import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from https://<user>.github.io/movly/ on GitHub Pages,
// so every asset URL must be prefixed with the repo name.
export default defineConfig({
  base: '/movly/',
  plugins: [react()],
  // Export libraries are loaded lazily; pre-bundle them so the dev server
  // doesn't reload the page the first time an export starts.
  // The WASM AAC encoder (~1 MB, lazy, only for browsers without native AAC) is expected to be big.
  build: { chunkSizeWarningLimit: 1100 },
  optimizeDeps: { include: ['mediabunny', 'gifenc', '@mediabunny/aac-encoder'] },
})
