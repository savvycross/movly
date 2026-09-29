/**
 * Regenerates the static share images in public/ from our own templates:
 *   og-image.png (1200×630), apple-touch-icon.png (180), icon-192.png, icon-512.png, favicon-32.png
 *
 *   npm run share-images
 *
 * Needs a Chromium for Playwright (`npx playwright install chromium` once).
 * Output is committed; the deployed site just serves the PNGs.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({ root, logLevel: 'error', server: { port: 0 } })
await server.listen()
const url = server.resolvedUrls.local[0]

const browser = await chromium.launch()
// Only for sandboxes that intercept TLS; never needed on a normal machine.
const context = await browser.newContext({ ignoreHTTPSErrors: process.env.SHARE_IMAGES_IGNORE_HTTPS === '1' })
const page = await context.newPage()
await page.goto(url, { waitUntil: 'networkidle' })

const images = await page.evaluate(async (base) => {
  const E = await import(`${base}src/engine/index.ts`)
  const { getTemplate } = await import(`${base}src/templates/index.ts`)
  const { drawWatermark } = await import(`${base}src/export/watermark.ts`)
  await E.loadFont('Inter')
  const interLoaded = [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Inter' && f.status === 'loaded')
  if (!interLoaded) throw new Error('Inter did not load from Google Fonts; refusing to render with a fallback font.')

  // Open Graph card: a real frame from the Kinetic Title template, plus the Movly badge.
  const og = document.createElement('canvas')
  og.width = 1200
  og.height = 630
  const ctx = og.getContext('2d')
  const tpl = getTemplate('kinetic-title')
  const stage = { width: 1200, height: 630, duration: tpl.defaultDuration }
  E.renderFrame(
    ctx,
    tpl,
    stage.duration * 0.62,
    {
      headline: 'Make it move',
      subline: 'Free motion graphics in your browser',
      colors: { bg: '#0f0f1a', primary: '#ffffff', accent: '#8b5cf6' },
      font: 'Inter',
      logo: null,
      speed: 1,
    },
    stage,
  )
  drawWatermark(ctx, 1200, 630)

  // App icons: full-bleed gradient square with the Movly "M" (platforms round the corners).
  const icon = (size) => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, size, size)
    g.addColorStop(0, '#8b5cf6')
    g.addColorStop(1, '#22d3ee')
    x.fillStyle = g
    x.fillRect(0, 0, size, size)
    const s = size / 32
    x.strokeStyle = '#fff'
    x.lineWidth = 3 * s
    x.lineCap = 'round'
    x.lineJoin = 'round'
    x.beginPath()
    x.moveTo(8 * s, 23 * s)
    x.lineTo(8 * s, 9 * s)
    x.lineTo(16 * s, 17 * s)
    x.lineTo(24 * s, 9 * s)
    x.lineTo(24 * s, 23 * s)
    x.stroke()
    return c.toDataURL('image/png')
  }
  return {
    'og-image.png': og.toDataURL('image/png'),
    'apple-touch-icon.png': icon(180),
    'icon-192.png': icon(192),
    'icon-512.png': icon(512),
    'favicon-32.png': icon(32),
  }
}, new URL(url).pathname)

for (const [name, dataUrl] of Object.entries(images)) {
  writeFileSync(`${root}public/${name}`, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log('wrote public/' + name)
}
await browser.close()
await server.close()
