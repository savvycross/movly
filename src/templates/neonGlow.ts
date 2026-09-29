import {
  applyFitted,
  clearGlow,
  easeInOutCubic,
  fitLines,
  fitTimeline,
  hash,
  lineCenterY,
  mixColor,
  setGlow,
  stageLayout,
  tween,
  withAlpha,
  type FittedLines,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, stack } from './shared'

export const id = 'neon-glow'
export const name = 'Neon Glow'
export const category: TemplateCategory = 'Titles'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#0a0612',
  primary: '#fff0fb',
  accent: '#ff2bd6',
}

/**
 * Neon tube flicker: 0 = off, 1 = on. Sputters on between `start` and
 * `start + 0.9`, stays on (with a faint hum), and sputters off at the end.
 */
function flicker(t: number, D: number, start: number, seed: number): number {
  const f = Math.floor(t * 30)
  if (t < start) return 0
  if (t < start + 0.9) {
    const p = (t - start) / 0.9
    return hash(f * 3 + seed) < 0.25 + p * 0.75 ? 1 : 0.15
  }
  if (t > D - 0.5) {
    const p = (t - (D - 0.5)) / 0.5
    return hash(f * 5 + seed) < 1 - p ? 1 : 0
  }
  return 0.93 + 0.07 * Math.sin(t * 9 + seed)
}

function neonText(
  ctx: CanvasRenderingContext2D,
  block: FittedLines,
  x: number,
  cy: number,
  tube: string,
  glow: string,
  on: number,
) {
  applyFitted(ctx, block)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = block.lines.map((l, i) => [l, lineCenterY(block, cy, i)] as const)
  if (on > 0.5) {
    // Wide, soft bloom, then a tighter halo.
    ctx.globalAlpha = on
    setGlow(ctx, block.size * 0.6, glow)
    ctx.fillStyle = glow
    for (const [l, y] of lines) ctx.fillText(l, x, y)
    setGlow(ctx, block.size * 0.15, glow)
    ctx.fillStyle = tube
    for (const [l, y] of lines) ctx.fillText(l, x, y)
    clearGlow(ctx)
  }
  // Unlit tube stays faintly visible when off.
  ctx.globalAlpha = on > 0.5 ? 1 : 0.18
  ctx.fillStyle = on > 0.5 ? tube : mixColor(glow, '#000000', 0.4)
  for (const [l, y] of lines) ctx.fillText(l, x, y)
  ctx.globalAlpha = 1
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0
  const headOn = flicker(t, D, 0.5, 1)
  const subOn = flicker(t, D, 1.3, 7)

  // Dark wall with a glow that follows the sign's brightness.
  ctx.fillStyle = mixColor(colors.bg, '#000000', 0.2)
  ctx.fillRect(0, 0, L.W, L.H)
  const wall = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, Math.max(L.W, L.H) * 0.6)
  wall.addColorStop(0, withAlpha(colors.accent, 0.05 + 0.18 * (headOn > 0.5 ? headOn : 0)))
  wall.addColorStop(1, withAlpha(colors.accent, 0))
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, L.W, L.H)
  // Brick-ish mortar lines.
  ctx.strokeStyle = withAlpha(colors.primary, 0.035)
  ctx.lineWidth = Math.max(1, L.U * 0.002)
  const bh = L.U * 0.05
  for (let r = 0, y = 0; y < L.H; r++, y += bh) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(L.W, y)
    for (let x = (r % 2) * bh; x < L.W; x += bh * 2) {
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + bh)
    }
    ctx.stroke()
  }

  const frameW = L.safeW * (L.landscape ? 0.8 : 0.94)
  const pad = L.U * 0.07
  const head = fitLines(ctx, headline, frameW - pad * 2, L.safeH * (hasSub ? 0.45 : 0.6), {
    family: font,
    weight: 700,
    max: L.U * 0.14,
    min: L.U * 0.045,
    maxLines: L.portrait ? 4 : 2,
    lineHeight: 1.12,
  })
  const sub = hasSub
    ? fitLines(ctx, subline, frameW - pad * 2, L.safeH * 0.14, {
        family: font,
        weight: 500,
        max: L.U * 0.04,
        min: L.U * 0.022,
        maxLines: 2,
        lineHeight: 1.35,
        tracking: 0.12,
      })
    : null
  const [headY, subY] = stack(L.cy, [head.height, sub?.height ?? 0], sub ? L.U * 0.05 : 0)
  const innerH = head.height + (sub ? L.U * 0.05 + sub.height : 0)
  const fw = Math.max(head.width, sub?.width ?? 0) + pad * 2
  const fh = innerH + pad * 1.6

  // Neon frame traces itself around the text.
  const trace = tween(t, 0.1, 1.2, easeInOutCubic)
  const frameOn = t > D - 0.5 ? flicker(t, D, 0, 3) : 1
  if (trace > 0) {
    const perim = 2 * (fw + fh)
    const r = L.U * 0.03
    ctx.save()
    ctx.lineWidth = L.U * 0.008
    ctx.strokeStyle = colors.accent
    if (trace < 1) ctx.setLineDash([perim * trace, perim])
    ctx.globalAlpha = frameOn > 0.5 ? 1 : 0.2
    if (frameOn > 0.5) setGlow(ctx, L.U * 0.03, colors.accent)
    ctx.beginPath()
    ctx.roundRect(L.cx - fw / 2, L.cy - fh / 2, fw, fh, r)
    ctx.stroke()
    ctx.restore()
  }

  neonText(ctx, head, L.cx, headY, colors.primary, colors.accent, headOn)
  if (sub) neonText(ctx, sub, L.cx, subY, mixColor(colors.accent, '#ffffff', 0.6), colors.accent, subOn)

  drawLogoBadge(ctx, logo, L, t, D, 'bottom-right', 1.2)
}
