import {
  countUnits,
  drawRevealLines,
  easeInCubic,
  easeInOutCubic,
  easeInOutExpo,
  easeOutCubic,
  fitFontSize,
  fitLines,
  fitTimeline,
  fontString,
  stageLayout,
  tween,
  withAlpha,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, outro } from './shared'

export const id = 'kinetic-title'
export const name = 'Kinetic Title'
export const category: TemplateCategory = 'Titles'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#111018',
  primary: '#f5f5f7',
  accent: '#ff4d6d',
}

/** Splits the headline into short stacked lines: one word each, or wrapped pairs when long. */
function stackLines(ctx: CanvasRenderingContext2D, text: string, width: number, height: number, font: string, U: number) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean)
  if (words.length <= 4) return words
  return fitLines(ctx, words.join(' '), width, height, { family: font, weight: 800, max: U * 0.2, maxLines: 5 }).lines
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, L.W, L.H)

  // Faint diagonal stripes drifting behind everything.
  ctx.save()
  ctx.strokeStyle = withAlpha(colors.primary, 0.035)
  ctx.lineWidth = L.U * 0.03
  const step = L.U * 0.09
  const drift = (t * L.U * 0.03) % step
  for (let x = -L.H; x < L.W + L.H; x += step) {
    ctx.beginPath()
    ctx.moveTo(x + drift, L.H)
    ctx.lineTo(x + drift + L.H, 0)
    ctx.stroke()
  }
  ctx.restore()

  // Layout: each line scaled to fill the column width (classic kinetic stack).
  const colW = Math.min(L.safeW, L.U * (L.landscape ? 1.1 : 0.95))
  const availH = L.safeH * (hasSub ? 0.72 : 0.86)
  const lines = stackLines(ctx, headline, colW, availH, font, L.U)
  const gap = L.U * 0.018
  let sizes = lines.map((l) => fitFontSize(ctx, l, colW, { family: font, weight: 800, max: L.U * 0.3, min: 8 }))
  const blockH = (s: number[]) => s.reduce((a, b) => a + b * 0.86, 0) + gap * (s.length - 1)
  const k = Math.min(1, availH / Math.max(1, blockH(sizes)))
  sizes = sizes.map((s) => Math.floor(s * k))

  const sub = hasSub
    ? fitLines(ctx, subline.toUpperCase(), colW, L.safeH * 0.14, {
        family: font,
        weight: 600,
        max: L.U * 0.036,
        min: L.U * 0.022,
        maxLines: 2,
        lineHeight: 1.35,
        tracking: 0.18,
      })
    : null
  const subGap = L.U * 0.05
  const totalH = blockH(sizes) + (sub ? subGap + sub.height : 0)
  let y = L.cy - totalH / 2

  // Slow push-in on the whole stack.
  const zoom = 1 + 0.04 * tween(t, 0, D, easeInOutCubic)
  ctx.save()
  ctx.translate(L.cx, L.cy)
  ctx.scale(zoom, zoom)
  ctx.translate(-L.cx, -L.cy)

  const out = outro(t, D, 0.7)
  lines.forEach((line, i) => {
    const size = sizes[i]
    const h = size * 0.86
    const lineCy = y + h / 2
    y += h + gap
    ctx.font = fontString(size, font, 800)
    const w = ctx.measureText(line).width
    const x0 = L.cx - w / 2
    const isAccent = i % 2 === 1
    const dir = i % 2 === 0 ? 1 : -1

    // Block reveal: a solid bar sweeps across, the word appears under it, the bar leaves.
    const s = 0.2 + i * 0.2
    const cover = tween(t, s, s + 0.35, easeInOutExpo)
    const uncover = tween(t, s + 0.35, s + 0.7, easeInOutExpo)
    const exit = tween(t, D - 0.75 + i * 0.06, D - 0.15 + i * 0.06, easeInCubic)

    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 - L.U * 0.02, lineCy - h / 2 - L.U * 0.02, w + L.U * 0.04, h + L.U * 0.04)
    ctx.clip()
    if (cover >= 1) {
      ctx.fillStyle = isAccent ? colors.accent : colors.primary
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(line, L.cx + dir * exit * (w + L.U * 0.1), lineCy + size * 0.04)
    }
    const barColor = isAccent ? colors.primary : colors.accent
    const left = dir > 0 ? x0 + w * uncover : x0 + w * (1 - cover)
    const right = dir > 0 ? x0 + w * cover : x0 + w * (1 - uncover)
    if (right > left) {
      ctx.fillStyle = barColor
      ctx.fillRect(left, lineCy - h / 2, right - left, h)
    }
    ctx.restore()
  })

  if (sub) {
    const start = 0.2 + lines.length * 0.2 + 0.4
    ctx.fillStyle = withAlpha(colors.primary, 0.7)
    ctx.globalAlpha = 1 - out
    drawRevealLines(ctx, sub, L.cx, y - gap + subGap + sub.height / 2, t, {
      mode: 'letter',
      start,
      stagger: Math.min(0.02, 0.8 / Math.max(1, countUnits(subline))),
      duration: 0.4,
      ease: easeOutCubic,
      align: 'center',
    })
  }
  ctx.restore()

  // Intro wipe: an accent panel slides off to reveal the scene.
  const wipe = tween(t, 0, 0.55, easeInOutExpo)
  if (wipe < 1) {
    ctx.fillStyle = colors.accent
    ctx.fillRect(L.W * wipe, 0, L.W, L.H)
  }

  drawLogoBadge(ctx, logo, L, t, D, 'top-left', 0.5)
}
