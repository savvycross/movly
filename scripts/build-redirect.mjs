/**
 * Builds the tiny page GitHub Pages now serves at the old address
 * (https://savvycross.github.io/movly/): it instantly redirects to the live
 * site (VITE_SITE_URL in .env), keeping ?query and #hash, so old links keep
 * working. Also written as 404.html so any old deep link redirects too.
 *
 *   node scripts/build-redirect.mjs [outDir]    (default: redirect-dist)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = process.argv[2] ?? `${root}redirect-dist`
const env = loadEnv('production', root, 'VITE_')
const raw = process.env.VITE_SITE_URL ?? env.VITE_SITE_URL
const target = new URL(raw) // throws on a missing/invalid URL: better than deploying a broken redirect
if (target.protocol !== 'https:') throw new Error(`VITE_SITE_URL must be https, got ${raw}`)
const to = target.toString()
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Movly has moved</title>
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${esc(to)}" />
    <!-- Link previews of old URLs still show the real site. -->
    <meta property="og:title" content="Movly: free motion graphics in your browser" />
    <meta property="og:url" content="${esc(to)}" />
    <meta property="og:image" content="${esc(new URL('og-image.png', to).toString())}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta http-equiv="refresh" content="0; url=${esc(to)}" />
    <script>
      location.replace(${JSON.stringify(to)}.replace(/\\/$/, '') + '/' + location.search + location.hash)
    </script>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b0b10; color: #ececf1;
        font: 16px system-ui, -apple-system, "Segoe UI", sans-serif; }
      a { color: #22d3ee; }
    </style>
  </head>
  <body>
    <p>Movly has moved to <a href="${esc(to)}">${esc(target.host)}</a>. Redirecting…</p>
  </body>
</html>
`
mkdirSync(outDir, { recursive: true })
writeFileSync(`${outDir}/index.html`, html)
writeFileSync(`${outDir}/404.html`, html)
console.log(`redirect page → ${to} (${outDir})`)
