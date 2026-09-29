import {
  applyFitted,
  countUnits,
  easeInBack,
  easeOutBack,
  easeOutBounce,
  easeOutElastic,
  fitLines,
  fitTimeline,
  hash,
  lineCenterY,
  measureUnits,
  mixColor,
  readableOn,
  stageLayout,
  tween,
  withAlpha,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, stack } from './shared'

export const id = 'bounce-pop'
export const name = 'Bounce Pop'
export const category: TemplateCategory = 'Social'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#ffd23f',
  primary: '#1a1a2e',
  accent: '#ff3864',
}

// Decorative shapes in normalized stage coordinates, kept to the edges.
const SHAPES = [
  { x: 0.1, y: 0.12, kind: 'circle', size: 0.1 },
  { x: 0.9, y: 0.1, kind: 'ring', size: 0.12 },
  { x: 0.92, y: 0.86, kind: 'square', size: 0.1 },
  { x: 0.08, y: 0.9, kind: 'plus', size: 0.09 },
  { x: 0.5, y: 0.06, kind: 'dot', size: 0.04 },
  { x: 0.55, y: 0.95, kind: 'ring', size: 0.06 },
] as const

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, L.W, L.H)
  // Halftone dots in one corner for texture.
  ctx.fillStyle = withAlpha(colors.primary, 0.07)
  const dot = L.U * 0.035
  for (let y = 0; y < L.H * 0.45; y += dot) {
    for (let x = L.W * 0.55; x < L.W; x += dot) {
      const r = dot * 0.28 * Math.min(1, ((x - L.W * 0.55) / (L.W * 0.45)) * (1 - y / (L.H * 0.45)) * 1.6)
      if (r > 0.5) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  const exitAt = D - 0.7
  // Background shapes pop in with elastic overshoot and float.
  SHAPES.forEach((sh, i) => {
    const s = tween(t, 0.05 + i * 0.08, 0.95 + i * 0.08, easeOutElastic) * (1 - tween(t, exitAt, exitAt + 0.4, easeInBack))
    if (s <= 0) return
    const size = L.U * sh.size * s
    const color = i % 3 === 0 ? colors.accent : i % 3 === 1 ? colors.primary : mixColor(colors.bg, '#ffffff', 0.55)
    ctx.save()
    ctx.translate(sh.x * L.W, sh.y * L.H + Math.sin(t * 2 + i) * L.U * 0.01)
    ctx.rotate(t * 0.5 * (i % 2 ? 1 : -1))
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = size * 0.22
    ctx.beginPath()
    if (sh.kind === 'circle' || sh.kind === 'dot') ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
    if (sh.kind === 'ring') ctx.arc(0, 0, size / 2 - ctx.lineWidth / 2, 0, Math.PI * 2)
    if (sh.kind === 'square') ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.2)
    if (sh.kind === 'plus') {
      ctx.rect(-size / 2, -size * 0.14, size, size * 0.28)
      ctx.rect(-size * 0.14, -size / 2, size * 0.28, size)
    }
    if (sh.kind === 'ring') ctx.stroke()
    else ctx.fill()
    ctx.restore()
  })

  const head = fitLines(ctx, headline, L.safeW * 0.86, L.safeH * (hasSub ? 0.5 : 0.62), {
    family: font,
    weight: 800,
    max: L.U * 0.16,
    min: L.U * 0.05,
    maxLines: L.portrait ? 4 : 3,
    lineHeight: 1.08,
  })
  const pillPadX = L.U * 0.035
  const pillPadY = L.U * 0.018
  const sub = hasSub
    ? fitLines(ctx, subline, L.safeW * 0.8 - pillPadX * 2, L.safeH * 0.16, {
        family: font,
        weight: 700,
        max: L.U * 0.04,
        min: L.U * 0.022,
        maxLines: 2,
        lineHeight: 1.25,
      })
    : null
  const pillH = sub ? sub.height + pillPadY * 2 : 0
  const [headY, pillY] = stack(L.cy, [head.height, pillH], sub ? L.U * 0.06 : 0)

  // Letters drop in and bounce, with a hard pop-art shadow.
  ctx.save()
  applyFitted(ctx, head)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const shadow = L.U * 0.009
  const n = countUnits(headline)
  const stagger = Math.min(0.05, 1.1 / Math.max(1, n))
  let index = 0
  head.lines.forEach((line, li) => {
    const lineW = ctx.measureText(line).width
    const x0 = L.cx - lineW / 2
    const y = lineCenterY(head, headY, li)
    for (const u of measureUnits(ctx, line)) {
      if (u.order < 0) continue
      const i = index + u.order
      const s0 = 0.25 + i * stagger
      const drop = tween(t, s0, s0 + 0.8, easeOutBounce)
      const exit = tween(t, exitAt + i * 0.015, exitAt + 0.35 + i * 0.015, easeInBack)
      if (drop <= 0 || exit >= 1) continue
      const scale = 1 - exit
      const rot = (1 - drop) * (hash(i) - 0.5) * 0.8
      ctx.save()
      ctx.translate(x0 + u.x + u.width / 2, y - (1 - drop) * L.H * 0.6)
      ctx.rotate(rot)
      ctx.scale(scale, scale)
      ctx.fillStyle = colors.accent
      ctx.fillText(u.text, -u.width / 2 + shadow, shadow)
      ctx.fillStyle = colors.primary
      ctx.fillText(u.text, -u.width / 2, 0)
      ctx.restore()
    }
    index += countUnits(line)
  })
  ctx.restore()

  // Subline pill pops in once the letters land.
  if (sub) {
    const s0 = Math.min(0.25 + n * stagger + 0.3, 1.8)
    const s = tween(t, s0, s0 + 0.6, easeOutBack) * (1 - tween(t, exitAt - 0.1, exitAt + 0.3, easeInBack))
    if (s > 0) {
      const w = sub.width + pillPadX * 2
      ctx.save()
      ctx.translate(L.cx, pillY)
      ctx.scale(s, s)
      ctx.fillStyle = colors.primary
      ctx.beginPath()
      ctx.roundRect(-w / 2 + shadow, -pillH / 2 + shadow, w, pillH, pillH / 2)
      ctx.fill()
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.roundRect(-w / 2, -pillH / 2, w, pillH, pillH / 2)
      ctx.fill()
      applyFitted(ctx, sub)
      ctx.fillStyle = readableOn(colors.accent, colors.bg, colors.primary, '#ffffff')
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      sub.lines.forEach((line, i) => ctx.fillText(line, 0, lineCenterY(sub, 0, i)))
      ctx.restore()
    }
  }

  drawLogoBadge(ctx, logo, L, t, D, 'top-left', 0.6)
}
