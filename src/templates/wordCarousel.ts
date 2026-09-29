import {
  applyFitted,
  drawRevealLines,
  easeInOutCubic,
  easeInOutExpo,
  easeOutBack,
  easeOutExpo,
  fitFontSize,
  fitLines,
  fitStagger,
  fitTimeline,
  fontString,
  lerp,
  readableOn,
  stageLayout,
  tween,
  withAlpha,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, outro, paintBackdrop, stack } from './shared'

export const id = 'word-carousel'
export const name = 'Word Carousel'
export const category: TemplateCategory = 'Social'
export const defaultDuration = 6
export const defaultColors: TemplateColors = {
  bg: '#0f172a',
  primary: '#f8fafc',
  accent: '#38bdf8',
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0
  // Long headlines: roll through the first few words, then show the whole thing.
  const words = headline.split(/\s+/).filter(Boolean).slice(0, 6)
  if (words.length === 0) words.push(' ')

  paintBackdrop(ctx, L, colors.bg, colors.accent, { glow: 0.14, radius: L.U * 0.8 })

  // Phase 1: words roll through a slot one at a time.
  const start = 0.3
  const carouselEnd = Math.min(start + words.length * 0.6, D * 0.4)
  const beat = Math.max(0.3, (carouselEnd - start) / words.length)
  const roll = Math.min(0.32, beat * 0.55)
  const padX = L.U * 0.045
  const slotSize = Math.min(
    ...words.map((w) => fitFontSize(ctx, w, L.safeW * 0.86 - padX * 2, { family: font, weight: 800, max: L.U * 0.15, min: 8 })),
  )
  const slotH = slotSize * 1.3
  ctx.font = fontString(slotSize, font, 800)
  const widths = words.map((w) => ctx.measureText(w).width + padX * 2)

  // Phase 2 layout (final headline) — needed to morph the slot into an underline.
  const head = fitLines(ctx, headline, L.safeW * 0.92, L.safeH * (hasSub ? 0.5 : 0.62), {
    family: font,
    weight: 800,
    max: L.U * 0.13,
    min: L.U * 0.045,
    maxLines: L.portrait ? 4 : 3,
    lineHeight: 1.08,
  })
  const sub = hasSub
    ? fitLines(ctx, subline, L.safeW * 0.85, L.safeH * 0.16, {
        family: font,
        weight: 500,
        max: L.U * 0.04,
        min: L.U * 0.022,
        maxLines: 3,
        lineHeight: 1.35,
      })
    : null
  const underline = L.U * 0.012
  const [headY, lineY, subY] = stack(L.cy, [head.height, underline, sub?.height ?? 0], [L.U * 0.035, sub ? L.U * 0.05 : 0])

  const morph = tween(t, carouselEnd, carouselEnd + 0.6, easeInOutExpo)
  const out = outro(t, D, 0.6)
  ctx.globalAlpha = 1 - out

  // The accent slot: tracks the current word's width, then collapses into an underline.
  const idx = Math.min(words.length - 1, Math.max(0, Math.floor((t - start) / beat)))
  const local = t - start - idx * beat
  const toNext = idx < words.length - 1 ? tween(local, beat - roll, beat, easeInOutCubic) : 0
  const slotW = lerp(widths[idx], widths[Math.min(idx + 1, words.length - 1)], toNext)
  const appear = tween(t, 0, start + 0.2, easeOutBack)
  const boxW = lerp(slotW * appear, Math.min(head.width, L.U * 0.3), morph)
  const boxH = lerp(slotH * appear, underline, morph)
  const boxY = lerp(L.cy, lineY, morph)
  ctx.fillStyle = colors.accent
  ctx.beginPath()
  ctx.roundRect(L.cx - boxW / 2, boxY - boxH / 2, boxW, boxH, Math.min(boxH / 2, L.U * 0.02))
  ctx.fill()

  if (morph < 1 && t >= start) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, L.cy - slotH / 2, L.W, slotH)
    ctx.clip()
    ctx.font = fontString(slotSize, font, 800)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = readableOn(colors.accent, colors.bg, colors.primary)
    ctx.globalAlpha = (1 - morph) * (1 - out)
    const shift = toNext * slotH
    ctx.fillText(words[idx], L.cx, L.cy - shift + slotSize * 0.04)
    if (toNext > 0) ctx.fillText(words[idx + 1], L.cx, L.cy + slotH - shift + slotSize * 0.04)
    ctx.restore()
  }

  // Progress dots under the slot during phase 1.
  if (morph < 1 && words.length > 1) {
    const r = L.U * 0.007
    const spacing = r * 4
    const y = L.cy + slotH / 2 + L.U * 0.06
    words.forEach((_, i) => {
      ctx.fillStyle = i === idx ? colors.accent : withAlpha(colors.primary, 0.25)
      ctx.globalAlpha = appear * (1 - morph) * (1 - out)
      ctx.beginPath()
      ctx.arc(L.cx + (i - (words.length - 1) / 2) * spacing, y, r, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Phase 2: full headline assembles above the underline, subline beneath.
  ctx.globalAlpha = 1 - out
  ctx.fillStyle = colors.primary
  applyFitted(ctx, head)
  drawRevealLines(ctx, head, L.cx, headY, t, {
    mode: 'word',
    start: carouselEnd + 0.25,
    stagger: fitStagger(headline, 'word', 0.7, 0.08),
    duration: 0.6,
    ease: easeOutExpo,
    clip: true,
    align: 'center',
  })
  if (sub) {
    ctx.fillStyle = withAlpha(colors.primary, 0.7)
    drawRevealLines(ctx, sub, L.cx, subY, t, { mode: 'word', start: carouselEnd + 0.5, stagger: fitStagger(subline, 'word', 0.5, 0.06), align: 'center' })
  }

  drawLogoBadge(ctx, logo, L, t, D, 'top-left', 0.4)
}
