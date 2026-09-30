import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** "/", "/movly", "movly/" → "/", "/movly/", "/movly/" */
export function normalizeBase(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

export default defineConfig(({ mode }) => {
  // Where the site is served from. Vercel serves it at the domain root ("/").
  // Set VITE_BASE_PATH (in .env or the build environment) if it ever moves to
  // a sub-path again, e.g. "/movly/" for https://<user>.github.io/movly/.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    base: normalizeBase(process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH),
    plugins: [react()],
    // The WASM AAC encoder (~1 MB, lazy, only for browsers without native AAC) is expected to be big.
    build: { chunkSizeWarningLimit: 1100 },
    // Export libraries are loaded lazily; pre-bundle them so the dev server
    // doesn't reload the page the first time an export starts.
    optimizeDeps: { include: ['mediabunny', 'gifenc', '@mediabunny/aac-encoder'] },
  }
})
