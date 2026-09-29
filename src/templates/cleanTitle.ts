import {
  STAGE,
  drawImageContain,
  drawRevealText,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  fitText,
  fontString,
  interpolate,
  revealEnd,
  tween,
  withAlpha,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'

export const id = 'clean-title'
export const name = 'Clean Title'
export const category: TemplateCategory = 'Titles'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#0f0f1a',
  primary: '#ffffff',
  accent: '#8b5cf6',
}

const OUT_START = defaultDuration - 0.7

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams) {
  const { width: W, height: H } = STAGE
  const { colors, font, headline, subline, logo } = params
  const cx = W / 2
  const cy = H / 2

  // Background with a slow-drifting accent glow.
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, W, H)
  const glowX = interpolate([{ time: 0, value: W * 0.35 }, { time: defaultDuration, value: W * 0.65, ease: easeInOutCubic }], time)
  const glow = ctx.createRadialGradient(glowX, cy, 0, glowX, cy, W * 0.55)
  glow.addColorStop(0, withAlpha(colors.accent, 0.22))
  glow.addColorStop(1, withAlpha(colors.accent, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Exit: everything drifts up and fades out together.
  const out = tween(time, OUT_START, defaultDuration, easeInCubic)
  ctx.globalAlpha = 1 - out
  ctx.translate(0, -80 * out)

  const hasSub = subline.trim().length > 0
  const headlineY = hasSub ? cy + 20 : cy + 60

  // Headline: letters slide up from behind a mask.
  ctx.fillStyle = colors.primary
  ctx.textBaseline = 'alphabetic'
  const headSize = fitText(ctx, headline, W * 0.8, { family: font, weight: 800, max: 190, min: 40 })
  const headOpts = { start: 0.35, stagger: 0.035, duration: 0.7, ease: easeOutExpo, clip: true, align: 'center' } as const
  drawRevealText(ctx, headline, cx, headlineY, time, headOpts)

  // Accent bar above the headline grows out from the center.
  const barW = 180 * tween(time, 0.1, 0.8, easeOutExpo)
  ctx.fillStyle = colors.accent
  ctx.fillRect(cx - barW / 2, headlineY - headSize - 50, barW, 10)

  // Subline: words fade up once the headline is mostly in.
  if (hasSub) {
    ctx.font = fontString(Math.round(Math.min(56, headSize * 0.36)), font, 500)
    ctx.fillStyle = withAlpha(colors.primary, 0.75)
    drawRevealText(ctx, subline, cx, headlineY + headSize * 0.55 + 40, time, {
      mode: 'word',
      start: Math.min(revealEnd(headline, headOpts) - 0.4, 1.6),
      stagger: 0.08,
      duration: 0.6,
      ease: easeOutCubic,
      align: 'center',
    })
  }

  // Optional logo pops in at the top.
  if (logo) {
    const box = 140 * tween(time, 0.1, 0.8, easeOutBack)
    drawImageContain(ctx, logo, cx - box / 2, 110 + (140 - box) / 2, box, box)
  }
}
