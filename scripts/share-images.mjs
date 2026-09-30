/**
 * Regenerates static images from our own templates, mark and fonts:
 *
 *   public/  og-image.png (1200×630), apple-touch-icon.png (180), icon-192.png,
 *            icon-512.png, favicon-32.png
 *   brand/   token-logo.png (1000×1000), x-profile.png (400×400),
 *            x-banner.png (1500×500), telegram-group.png (640×640)
 *
 *   npm run share-images
 *
 * Needs a Chromium for Playwright (`npx playwright install chromium` once).
 * Output is committed; nothing here runs on the live site.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
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

  const canvas = (w, h) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return [c, c.getContext('2d')]
  }
  const BRAND = { from: '#8b5cf6', to: '#22d3ee', ink: '#ffffff', bg: '#0f0f1a' }
  const params = (headline, subline, colors = { bg: BRAND.bg, primary: '#ffffff', accent: BRAND.from }) => ({
    headline,
    subline,
    colors,
    font: 'Inter',
    logo: null,
    speed: 1,
  })
  /** A settled frame of a template at any stage size. */
  const frame = (ctx, id, w, h, p) => {
    const tpl = getTemplate(id)
    const stage = { width: w, height: h, duration: tpl.defaultDuration }
    E.renderFrame(ctx, tpl, stage.duration * 0.62, p, stage)
  }

  /**
   * The Movly "M" mark (same geometry as favicon.svg), stroked in a box of `size`.
   * `weight` is the stroke width in the 32-unit grid (favicon = 3).
   */
  const drawM = (ctx, cx, cy, size, weight = 3, color = BRAND.ink) => {
    const s = size / 32
    ctx.save()
    ctx.translate(cx - size / 2, cy - size / 2)
    ctx.strokeStyle = color
    ctx.lineWidth = weight * s
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(8 * s, 23 * s)
    ctx.lineTo(8 * s, 9 * s)
    ctx.lineTo(16 * s, 17 * s)
    ctx.lineTo(24 * s, 9 * s)
    ctx.lineTo(24 * s, 23 * s)
    ctx.stroke()
    ctx.restore()
  }

  /** Full-bleed gradient square with a soft highlight (platforms crop to circles/rounded squares). */
  const gradientSquare = (ctx, size) => {
    const g = ctx.createLinearGradient(0, 0, size, size)
    g.addColorStop(0, BRAND.from)
    g.addColorStop(1, BRAND.to)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const hl = ctx.createRadialGradient(size * 0.3, size * 0.25, 0, size * 0.3, size * 0.25, size * 0.8)
    hl.addColorStop(0, 'rgba(255,255,255,0.18)')
    hl.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hl
    ctx.fillRect(0, 0, size, size)
  }

  /** App/brand icon: the mark sized to stay inside the inscribed circle, bold enough for 16px. */
  const markIcon = (size, { weight = 3, scale = 1 } = {}) => {
    const [c, ctx] = canvas(size, size)
    gradientSquare(ctx, size)
    // Soft drop shadow keeps the white mark crisp on the lighter (cyan) corner.
    ctx.shadowColor = 'rgba(20, 10, 60, 0.35)'
    ctx.shadowBlur = size * 0.04
    ctx.shadowOffsetY = size * 0.012
    drawM(ctx, size / 2, size / 2 + size * 0.01, size * scale, weight)
    return c
  }

  const out = {}
  const png = (c) => c.toDataURL('image/png')

  // ---- public/: site share card + app icons --------------------------------
  {
    const [og, ctx] = canvas(1200, 630)
    frame(ctx, 'kinetic-title', 1200, 630, params('Make it move', 'Free motion graphics in your browser'))
    drawWatermark(ctx, 1200, 630)
    out['public/og-image.png'] = png(og)
  }
  out['public/apple-touch-icon.png'] = png(markIcon(180))
  out['public/icon-192.png'] = png(markIcon(192))
  out['public/icon-512.png'] = png(markIcon(512))
  out['public/favicon-32.png'] = png(markIcon(32))

  // ---- brand/: token + social profile images -------------------------------
  // Token logo: heavier stroke and a slightly smaller mark so it survives a
  // circle crop and still reads at 16–24px in wallets and explorers.
  out['brand/token-logo.png'] = png(markIcon(1000, { weight: 4.2, scale: 0.9 }))
  out['brand/x-profile.png'] = png(markIcon(400, { weight: 4.2, scale: 0.9 }))

  // Telegram group photo (shown as a circle): mark + wordmark inside the circle.
  {
    const S = 640
    const [c, ctx] = canvas(S, S)
    gradientSquare(ctx, S)
    ctx.shadowColor = 'rgba(20, 10, 60, 0.35)'
    ctx.shadowBlur = S * 0.04
    ctx.shadowOffsetY = S * 0.012
    drawM(ctx, S / 2, S * 0.41, S * 0.6, 4.4)
    ctx.font = `800 ${Math.round(S * 0.105)}px "Inter", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = BRAND.ink
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${S * 0.012}px`
    ctx.fillText('MOVLY', S / 2, S * 0.71)
    out['brand/telegram-group.png'] = png(c)
  }

  // X header banner (1500×500): a real template frame. X overlays the profile
  // picture bottom-left and crops the edges on some screens, so the text stays
  // centered and the badge sits bottom-right.
  {
    const [c, ctx] = canvas(1500, 500)
    frame(ctx, 'clean-title', 1500, 500, params('Make it move', 'Free motion graphics in your browser  ·  $MOVLY'))
    drawWatermark(ctx, 1500, 500)
    out['brand/x-banner.png'] = png(c)
  }
  return out
}, new URL(url).pathname)

mkdirSync(`${root}brand`, { recursive: true })
for (const [name, dataUrl] of Object.entries(images)) {
  writeFileSync(`${root}${name}`, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log('wrote ' + name)
}
await browser.close()
await server.close()
