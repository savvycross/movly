import {
  applyFitted,
  drawRevealLines,
  easeInOutExpo,
  easeOutCubic,
  easeOutExpo,
  fitLines,
  fitStagger,
  fitTimeline,
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
import { drawLogoBadge, outro } from './shared'

export const id = 'slide-stack'
export const name = 'Slide Stack'
export const category: TemplateCategory = 'Titles'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#101820',
  primary: '#ffffff',
  accent: '#2dd4bf',
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, L.W, L.H)
  // Thin vertical guide lines for an editorial grid feel.
  ctx.fillStyle = withAlpha(colors.primary, 0.05)
  for (let i = 1; i < 6; i++) ctx.fillRect((L.W / 6) * i, 0, Math.max(1, L.U * 0.0015), L.H)

  // Headline lines, each on its own highlight box.
  const padX = L.U * 0.03
  const head = fitLines(ctx, headline, L.safeW - padX * 2, L.safeH * (hasSub ? 0.55 : 0.7), {
    family: font,
    weight: 800,
    max: L.U * 0.12,
    min: L.U * 0.04,
    maxLines: L.portrait ? 5 : 3,
    lineHeight: 1.32,
  })
  const sub = hasSub
    ? fitLines(ctx, subline, L.safeW * 0.9, L.safeH * 0.16, {
        family: font,
        weight: 500,
        max: L.U * 0.04,
        min: L.U * 0.022,
        maxLines: 3,
        lineHeight: 1.35,
      })
    : null
  const gap = L.U * 0.05
  const total = head.height + (sub ? gap + sub.height : 0)
  const headY = L.cy - total / 2 + head.height / 2
  const x = L.M
  const boxH = head.size * 1.12
  const textColor = readableOn(colors.accent, colors.bg, colors.primary, '#000000')

  const exitAt = D - 0.8
  ctx.save()
  applyFitted(ctx, head)
  ctx.textBaseline = 'middle'
  head.lines.forEach((line, i) => {
    const y = lineCenterY(head, headY, i)
    const w = ctx.measureText(line).width + padX * 2
    const s = 0.45 + i * 0.14
    const grow = tween(t, s, s + 0.45, easeOutExpo)
    const leave = tween(t, exitAt + i * 0.08, exitAt + 0.45 + i * 0.08, easeInOutExpo)
    if (grow <= 0 || leave >= 1) return
    const left = x + w * leave
    const right = x + w * grow
    ctx.save()
    ctx.fillStyle = colors.accent
    ctx.beginPath()
    ctx.rect(left, y - boxH / 2, right - left, boxH)
    ctx.fill()
    ctx.clip()
    const rise = 1 - tween(t, s + 0.15, s + 0.6, easeOutCubic)
    ctx.fillStyle = textColor
    ctx.fillText(line, x + padX, y + rise * boxH + head.size * 0.04)
    ctx.restore()
  })
  ctx.restore()

  if (sub) {
    const out = outro(t, D, 0.5)
    ctx.save()
    ctx.globalAlpha = 1 - out
    ctx.fillStyle = withAlpha(colors.primary, 0.8)
    drawRevealLines(ctx, sub, x, headY + head.height / 2 + gap + sub.height / 2, t, {
      mode: 'word',
      start: 0.6 + head.lines.length * 0.14,
      stagger: fitStagger(subline, 'word', 0.7, 0.06),
      duration: 0.5,
      align: 'left',
    })
    ctx.restore()
  }

  // Intro: three stacked color bars slide off to the right.
  const bars = [colors.accent, mixColor(colors.accent, colors.bg, 0.5), colors.primary]
  bars.forEach((c, i) => {
    const p = tween(t, i * 0.07, 0.55 + i * 0.07, easeInOutExpo)
    if (p >= 1) return
    ctx.fillStyle = c
    const h = L.H / 3
    ctx.fillRect(L.W * p, h * i, L.W, h + 1)
  })
  // Outro: the bars sweep back in from the left.
  bars.forEach((c, i) => {
    const p = tween(t, D - 0.45 + i * 0.05, D - 0.05 + i * 0.05, easeInOutExpo)
    if (p <= 0) return
    ctx.fillStyle = c
    const h = L.H / 3
    ctx.fillRect(0, h * i, L.W * p, h + 1)
  })

  drawLogoBadge(ctx, logo, L, t, D, 'top-left', 0.6)
}
