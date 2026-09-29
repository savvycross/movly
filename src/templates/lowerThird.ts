import {
  applyFitted,
  easeInCubic,
  easeInOutExpo,
  easeOutExpo,
  fitLines,
  fitTimeline,
  hash,
  lineCenterY,
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
import { drawLogoBadge } from './shared'

export const id = 'lower-third'
export const name = 'Lower Third'
export const category: TemplateCategory = 'Lower thirds'
export const defaultDuration = 6
export const defaultColors: TemplateColors = {
  bg: '#1b1f2a',
  primary: '#ffffff',
  accent: '#ffb400',
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  // Soft "footage" backdrop: gradient plus drifting bokeh.
  const g = ctx.createLinearGradient(0, 0, L.W, L.H)
  g.addColorStop(0, mixColor(colors.bg, colors.primary, 0.1))
  g.addColorStop(1, mixColor(colors.bg, '#000000', 0.35))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L.W, L.H)
  for (let i = 0; i < 9; i++) {
    const r = L.U * (0.08 + hash(i) * 0.14)
    const x = (hash(i + 10) * 1.2 - 0.1) * L.W + Math.sin(t * 0.3 + i) * L.U * 0.03
    const y = (hash(i + 20) * 0.9) * L.H + Math.cos(t * 0.25 + i) * L.U * 0.03
    const b = ctx.createRadialGradient(x, y, 0, x, y, r)
    b.addColorStop(0, withAlpha(i % 3 === 0 ? colors.accent : colors.primary, 0.08))
    b.addColorStop(1, withAlpha(colors.primary, 0))
    ctx.fillStyle = b
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // Layout: anchored bottom-left, kept clear of social UI in tall formats.
  const barW = L.U * 0.014
  const padX = L.U * 0.035
  const padY = L.U * 0.02
  const maxW = (L.landscape ? L.W * 0.62 : L.safeW) - barW - padX * 2
  const head = fitLines(ctx, headline, maxW, L.U * 0.2, {
    family: font,
    weight: 800,
    max: L.U * 0.07,
    min: L.U * 0.035,
    maxLines: 2,
    lineHeight: 1.12,
  })
  const sub = hasSub
    ? fitLines(ctx, subline, maxW, L.U * 0.12, {
        family: font,
        weight: 500,
        max: L.U * 0.036,
        min: L.U * 0.022,
        maxLines: 2,
        lineHeight: 1.3,
      })
    : null
  const headH = head.height + padY * 2
  const subH = sub ? sub.height + padY * 1.6 : 0
  const bottom = L.H - (L.portrait ? Math.max(L.M, L.H * 0.2) : L.M * 1.2)
  const top = bottom - headH - subH
  const x0 = L.M
  const px = x0 + barW
  const headW = head.width + padX * 2
  const subW = sub ? sub.width + padX * 2 : 0

  const exitBase = D - 0.9
  const barIn = tween(t, 0.1, 0.5, easeOutExpo) - tween(t, exitBase + 0.5, exitBase + 0.85, easeInCubic)
  const headIn = tween(t, 0.35, 0.85, easeInOutExpo) - tween(t, exitBase + 0.15, exitBase + 0.6, easeInOutExpo)
  const subIn = tween(t, 0.55, 1.05, easeInOutExpo) - tween(t, exitBase, exitBase + 0.45, easeInOutExpo)

  // Drop shadow under each panel.
  const sh = L.U * 0.008
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  if (headIn > 0) ctx.fillRect(px + sh, top + sh, headW * headIn, headH)
  if (sub && subIn > 0) ctx.fillRect(px + sh, top + headH + sh, subW * subIn, subH)

  // Headline panel.
  const headTextColor = readableOn(colors.primary, colors.bg, '#000000', '#ffffff')
  if (headIn > 0) {
    ctx.save()
    ctx.fillStyle = colors.primary
    ctx.beginPath()
    ctx.rect(px, top, headW * headIn, headH)
    ctx.fill()
    ctx.clip()
    applyFitted(ctx, head)
    ctx.fillStyle = headTextColor
    ctx.textBaseline = 'middle'
    const slide = 1 - tween(t, 0.6, 1.1, easeOutExpo)
    head.lines.forEach((line, i) => {
      ctx.fillText(line, px + padX, lineCenterY(head, top + headH / 2, i) + slide * headH)
    })
    ctx.restore()
  }

  // Subline panel.
  if (sub && subIn > 0) {
    const y = top + headH
    ctx.save()
    ctx.fillStyle = colors.accent
    ctx.beginPath()
    ctx.rect(px, y, subW * subIn, subH)
    ctx.fill()
    ctx.clip()
    applyFitted(ctx, sub)
    ctx.fillStyle = readableOn(colors.accent, colors.bg, colors.primary, '#000000')
    ctx.textBaseline = 'middle'
    const slide = 1 - tween(t, 0.8, 1.3, easeOutExpo)
    sub.lines.forEach((line, i) => {
      ctx.fillText(line, px + padX - slide * L.U * 0.05, lineCenterY(sub, y + subH / 2, i))
    })
    ctx.restore()
  }

  // Accent bar grows from the bottom.
  if (barIn > 0) {
    const h = (headH + subH) * barIn
    ctx.fillStyle = colors.accent
    ctx.fillRect(x0, bottom - h, barW, h)
  }

  drawLogoBadge(ctx, logo, L, t, D, 'top-right', 0.4)
}
