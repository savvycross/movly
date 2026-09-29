import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from https://<user>.github.io/movly/ on GitHub Pages,
// so every asset URL must be prefixed with the repo name.
export default defineConfig({
  base: '/movly/',
  plugins: [react()],
  // Export libraries are loaded lazily; pre-bundle them so the dev server
  // doesn't reload the page the first time an export starts.
  optimizeDeps: { include: ['mediabunny', 'gifenc'] },
})
