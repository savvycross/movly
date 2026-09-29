import {
  applyFitted,
  easeOutExpo,
  fitLines,
  fitTimeline,
  hash,
  hash2,
  lineCenterY,
  rotateHue,
  stageLayout,
  tween,
  withAlpha,
  type FittedLines,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, outro, paintBackdrop } from './shared'

export const id = 'glitch-text'
export const name = 'Glitch Text'
export const category: TemplateCategory = 'Titles'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#07070b',
  primary: '#f2f2f2',
  accent: '#ff2a6d',
}

const GLYPHS = '!<>-_\\/[]{}=+*^?#%&$@01'

/** Glitch intensity: heavy on entry, occasional bursts, heavy again on exit. */
function intensity(t: number, D: number): number {
  const intro = 1 - tween(t, 0.15, 0.9, easeOutExpo)
  const exit = tween(t, D - 0.6, D - 0.05)
  const slot = Math.floor(t * 5)
  const burst = t > 1.2 && t < D - 0.8 && hash(slot + 7) > 0.78 ? 0.35 + hash(slot) * 0.3 : 0
  return Math.max(t < 0.15 ? 1 : intro, exit, burst)
}

/** Draws every line once, offset by (dx, dy). */
function drawBlock(ctx: CanvasRenderingContext2D, block: FittedLines, cx: number, cy: number, dx: number, dy = 0) {
  block.lines.forEach((line, i) => ctx.fillText(line, cx + dx, lineCenterY(block, cy, i) + dy))
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0
  const frame = Math.floor(t * 24)
  const g = intensity(t, D)
  const second = rotateHue(colors.accent, 180)

  paintBackdrop(ctx, L, colors.bg, colors.accent, { glow: 0.08 + g * 0.1, radius: L.U * 0.9, vignette: 0.5 })

  const head = fitLines(ctx, headline.toUpperCase(), L.safeW * 0.94, L.safeH * (hasSub ? 0.5 : 0.62), {
    family: font,
    weight: 800,
    max: L.U * 0.16,
    min: L.U * 0.05,
    maxLines: L.portrait ? 4 : 2,
    lineHeight: 1.02,
  })
  const sub = hasSub
    ? fitLines(ctx, subline.toUpperCase(), L.safeW * 0.9, L.safeH * 0.14, {
        family: font,
        weight: 500,
        max: L.U * 0.034,
        min: L.U * 0.02,
        maxLines: 2,
        lineHeight: 1.4,
        tracking: 0.2,
      })
    : null
  const gap = L.U * 0.06
  const total = head.height + (sub ? gap + sub.height : 0)
  const headY = L.cy - total / 2 + head.height / 2
  const subY = headY + head.height / 2 + gap + (sub?.height ?? 0) / 2

  const out = outro(t, D, 0.25)
  // Flicker on at the start.
  const visible = t > 0.5 || hash(frame + 3) > 0.45
  if (visible && out < 1) {
    ctx.save()
    applyFitted(ctx, head)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const split = L.U * 0.012 * (0.12 + g * 2.5)
    ctx.globalAlpha = 1 - out

    // Chromatic split copies.
    ctx.fillStyle = withAlpha(colors.accent, 0.85)
    drawBlock(ctx, head, L.cx, headY, -split, g * L.U * 0.004)
    ctx.fillStyle = withAlpha(second, 0.85)
    drawBlock(ctx, head, L.cx, headY, split, -g * L.U * 0.004)

    // Main text in horizontal slices, each nudged sideways during glitches.
    const slices = 9
    const top = headY - head.height / 2 - head.size * 0.1
    const sliceH = (head.height + head.size * 0.2) / slices
    ctx.fillStyle = colors.primary
    for (let i = 0; i < slices; i++) {
      const shift = hash2(frame, i) > 0.55 ? (hash2(frame + 99, i) - 0.5) * g * L.U * 0.16 : 0
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, top + i * sliceH, L.W, sliceH + 0.5)
      ctx.clip()
      drawBlock(ctx, head, L.cx, headY, shift)
      ctx.restore()
    }

    // Corrupted blocks.
    if (g > 0.25) {
      for (let i = 0; i < 6; i++) {
        if (hash2(frame, i + 40) < 0.5) continue
        const w = L.U * (0.04 + hash2(frame, i + 50) * 0.25)
        const h = L.U * (0.008 + hash2(frame, i + 60) * 0.03)
        const x = L.cx - head.width / 2 + hash2(frame, i + 70) * head.width - w / 2
        const y = top + hash2(frame, i + 80) * head.height
        ctx.fillStyle = withAlpha(i % 2 ? colors.accent : second, 0.7)
        ctx.fillRect(x, y, w, h)
      }
    }
    ctx.restore()
  }

  // Subline "decodes" from random glyphs, left to right.
  if (sub) {
    ctx.save()
    applyFitted(ctx, sub)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = withAlpha(colors.primary, 0.7 * (1 - out))
    const start = 0.9
    const step = Math.min(0.025, 1.2 / Math.max(1, Array.from(subline).length))
    let index = 0
    sub.lines.forEach((line, li) => {
      const chars = Array.from(line)
      const settled = chars.map((ch, ci) => {
        const at = start + (index + ci) * step
        if (t < at - 0.35 || ch === ' ') return t < at - 0.35 ? ' ' : ch
        return t >= at ? ch : GLYPHS[Math.floor(hash2(frame, index + ci) * GLYPHS.length)]
      })
      index += chars.length
      const text = settled.join('')
      // Lay out using the final text width so decoding doesn't jitter.
      const x = L.cx - ctx.measureText(line).width / 2
      ctx.fillText(text, x, lineCenterY(sub, subY, li))
    })
    ctx.restore()
  }

  // Scanlines over everything.
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  const gapY = L.U * 0.006
  for (let y = 0; y < L.H; y += gapY) ctx.fillRect(0, y, L.W, gapY * 0.4)

  drawLogoBadge(ctx, logo, L, t, D, 'bottom-right', 0.9)
}
