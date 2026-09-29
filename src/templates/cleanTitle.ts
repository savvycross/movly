import {
  drawImageContain,
  drawRevealLines,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  fitLines,
  fitStagger,
  fitTimeline,
  interpolate,
  revealEnd,
  stageLayout,
  tween,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { outro, paintBackdrop, stack } from './shared'

export const id = 'clean-title'
export const name = 'Clean Title'
export const category: TemplateCategory = 'Titles'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#0f0f1a',
  primary: '#ffffff',
  accent: '#8b5cf6',
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params

  // Background with a slow-drifting accent glow.
  const glowX = interpolate(
    [
      { time: 0, value: L.W * 0.3 },
      { time: D, value: L.W * 0.7, ease: easeInOutCubic },
    ],
    t,
  )
  paintBackdrop(ctx, L, colors.bg, colors.accent, { glow: 0.22, x: glowX, radius: Math.max(L.W, L.H) * 0.55 })

  // Exit: everything drifts up and fades out together.
  const out = outro(t, D, 0.7)
  ctx.globalAlpha = 1 - out
  ctx.translate(0, -L.U * 0.07 * out)

  const hasSub = subline.trim().length > 0
  const head = fitLines(ctx, headline, L.safeW * 0.92, L.safeH * (hasSub ? 0.5 : 0.65), {
    family: font,
    weight: 800,
    max: L.U * 0.17,
    min: L.U * 0.05,
    maxLines: L.portrait ? 4 : 2,
    lineHeight: 1.08,
  })
  const sub = hasSub
    ? fitLines(ctx, subline, L.safeW * 0.8, L.safeH * 0.2, {
        family: font,
        weight: 500,
        max: Math.min(L.U * 0.045, head.size * 0.4),
        min: L.U * 0.025,
        maxLines: 3,
        lineHeight: 1.3,
      })
    : null

  const logoBox = logo ? L.U * 0.13 : 0
  const barH = L.U * 0.009
  const heights = [logoBox, barH, head.height, sub?.height ?? 0]
  const [logoY, barY, headY, subY] = stack(L.cy, heights, [logo ? L.U * 0.06 : 0, L.U * 0.05, sub ? L.U * 0.045 : 0])

  // Optional logo pops in at the top.
  if (logo) {
    const box = logoBox * tween(t, 0.1, 0.8, easeOutBack)
    drawImageContain(ctx, logo, L.cx - box / 2, logoY - box / 2, box, box)
  }

  // Accent bar grows out from the center.
  const barW = L.U * 0.16 * tween(t, 0.1, 0.8, easeOutExpo)
  ctx.fillStyle = colors.accent
  ctx.fillRect(L.cx - barW / 2, barY - barH / 2, barW, barH)

  // Headline: letters slide up from behind a mask.
  ctx.fillStyle = colors.primary
  const headOpts = { start: 0.35, stagger: fitStagger(headline, 'letter', 1.1, 0.035), duration: 0.7, ease: easeOutExpo, clip: true, align: 'center' } as const
  drawRevealLines(ctx, head, L.cx, headY, t, headOpts)

  // Subline: words fade up once the headline is mostly in.
  if (sub) {
    ctx.globalAlpha = (1 - out) * 0.75
    drawRevealLines(ctx, sub, L.cx, subY, t, {
      mode: 'word',
      start: Math.min(revealEnd(headline, headOpts) - 0.4, 1.6),
      stagger: fitStagger(subline, 'word', 0.9, 0.08),
      duration: 0.6,
      ease: easeOutCubic,
      align: 'center',
    })
  }
}
