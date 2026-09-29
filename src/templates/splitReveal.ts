import {
  applyFitted,
  drawRevealLines,
  easeInOutExpo,
  easeOutExpo,
  fitLines,
  fitStagger,
  fitTimeline,
  lineCenterY,
  stageLayout,
  tween,
  withAlpha,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, outro, paintBackdrop, stack } from './shared'

export const id = 'split-reveal'
export const name = 'Split Reveal'
export const category: TemplateCategory = 'Transitions'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#0e0e10',
  primary: '#ffffff',
  accent: '#ffd400',
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  paintBackdrop(ctx, L, colors.bg, colors.accent, { glow: 0.07, radius: L.U * 0.9 })

  const head = fitLines(ctx, headline.toUpperCase(), L.safeW * 0.94, L.safeH * (hasSub ? 0.5 : 0.62), {
    family: font,
    weight: 800,
    max: L.U * 0.15,
    min: L.U * 0.05,
    maxLines: L.portrait ? 4 : 2,
    lineHeight: 1.04,
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
  const [headY, subY] = stack(L.cy, [head.height, sub?.height ?? 0], sub ? L.U * 0.07 : 0)

  // Each headline line is cut in half; halves slide in from opposite sides.
  const textIn = tween(t, 0.45, 1.25, easeOutExpo)
  const textOut = tween(t, D - 0.95, D - 0.45, easeInOutExpo)
  const offset = (1 - textIn + textOut) * L.W * 0.6
  ctx.save()
  applyFitted(ctx, head)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = colors.primary
  head.lines.forEach((line, i) => {
    const y = lineCenterY(head, headY, i)
    const half = head.lineHeight / 2
    const dir = i % 2 === 0 ? 1 : -1
    for (const [top, sign] of [
      [y - half, -1],
      [y, 1],
    ] as const) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, top, L.W, half)
      ctx.clip()
      ctx.fillText(line, L.cx + sign * dir * offset, y)
      ctx.restore()
    }
  })
  ctx.restore()

  // Accent rule through the middle of the block that stretches then settles under it.
  const rule = tween(t, 0.3, 0.9, easeOutExpo)
  const settle = tween(t, 1.1, 1.7, easeInOutExpo)
  const ruleOut = tween(t, D - 1.1, D - 0.7, easeInOutExpo)
  const ruleW = (L.safeW * (1 - settle) + L.U * 0.12 * settle) * rule * (1 - ruleOut)
  const ruleY = headY + (head.height / 2 + L.U * 0.035) * settle
  ctx.fillStyle = colors.accent
  ctx.fillRect(L.cx - ruleW / 2, ruleY - L.U * 0.004, ruleW, L.U * 0.008)

  if (sub) {
    ctx.save()
    ctx.globalAlpha = 1 - outro(t, D, 1.0)
    ctx.fillStyle = withAlpha(colors.primary, 0.7)
    drawRevealLines(ctx, sub, L.cx, subY + L.U * 0.02, t, {
      mode: 'word',
      start: 1.4,
      stagger: fitStagger(subline, 'word', 0.8, 0.07),
      duration: 0.55,
      align: 'center',
    })
    ctx.restore()
  }

  // Accent panels open like doors at the start and close at the end.
  const open = tween(t, 0.05, 0.75, easeInOutExpo) * (1 - tween(t, D - 0.55, D, easeInOutExpo))
  if (open < 1) {
    const vertical = L.landscape
    ctx.fillStyle = colors.accent
    if (vertical) {
      const w = (L.W / 2) * (1 - open)
      ctx.fillRect(0, 0, w, L.H)
      ctx.fillRect(L.W - w, 0, w, L.H)
    } else {
      const h = (L.H / 2) * (1 - open)
      ctx.fillRect(0, 0, L.W, h)
      ctx.fillRect(0, L.H - h, L.W, h)
    }
    // Seam line where the doors meet.
    ctx.fillStyle = withAlpha(colors.bg, 0.5 * (1 - open))
    if (vertical) ctx.fillRect(L.cx - L.U * 0.002, 0, L.U * 0.004, L.H)
    else ctx.fillRect(0, L.cy - L.U * 0.002, L.W, L.U * 0.004)
  }

  drawLogoBadge(ctx, logo, L, t, D, 'top-left', 0.9)
}
