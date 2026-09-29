import {
  drawRevealLines,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  fitLines,
  fitStagger,
  fitTimeline,
  mixColor,
  revealEnd,
  stageLayout,
  tween,
  withAlpha,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, outro } from './shared'

export const id = 'quote-card'
export const name = 'Quote Card'
export const category: TemplateCategory = 'Social'
export const defaultDuration = 7
export const defaultColors: TemplateColors = {
  bg: '#f3efe7',
  primary: '#1d1b19',
  accent: '#c2410c',
}

/** A filled "66"-style quotation mark drawn as vector shapes (font-independent). */
function drawQuoteMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = size * 0.22
  for (const dx of [0, size * 0.56]) {
    const cx = x + dx + r
    const cy = y + size - r
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.moveTo(cx - r, cy)
    ctx.quadraticCurveTo(cx - r, y + size * 0.1, cx + r * 0.9, y)
    ctx.lineTo(cx + r * 1.05, y + size * 0.12)
    ctx.quadraticCurveTo(cx - r * 0.2, y + size * 0.3, cx - r * 0.2, cy - r * 0.6)
    ctx.closePath()
    ctx.fill()
  }
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  // Paper background with a subtle corner tint.
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, L.W, L.H)
  const tint = ctx.createLinearGradient(0, 0, L.W, L.H)
  tint.addColorStop(0, withAlpha(colors.accent, 0.07))
  tint.addColorStop(0.6, withAlpha(colors.accent, 0))
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, L.W, L.H)

  // Frame border draws around the card.
  const inset = L.M * 0.45
  const frame = tween(t, 0, 1.2, easeInOutCubic)
  const perim = 2 * (L.W + L.H - inset * 4)
  ctx.strokeStyle = withAlpha(colors.primary, 0.18)
  ctx.lineWidth = L.U * 0.003
  ctx.setLineDash([perim * frame, perim])
  ctx.strokeRect(inset, inset, L.W - inset * 2, L.H - inset * 2)
  ctx.setLineDash([])

  const out = outro(t, D, 0.7)
  ctx.globalAlpha = 1 - out

  const textW = L.landscape ? Math.min(L.safeW * 0.82, L.U * 1.35) : L.safeW * 0.92
  const markSize = L.U * 0.12
  const quote = fitLines(ctx, headline, textW, L.safeH * (hasSub ? 0.55 : 0.65), {
    family: font,
    weight: 700,
    max: L.U * 0.11,
    min: L.U * 0.035,
    maxLines: L.landscape ? 4 : 6,
    lineHeight: 1.22,
  })
  const attrib = hasSub
    ? fitLines(ctx, subline, textW - L.U * 0.1, L.safeH * 0.12, {
        family: font,
        weight: 600,
        max: L.U * 0.035,
        min: L.U * 0.022,
        maxLines: 2,
        lineHeight: 1.3,
        tracking: 0.04,
      })
    : null
  const gap1 = L.U * 0.04
  const gap2 = L.U * 0.05
  const totalH = markSize + gap1 + quote.height + (attrib ? gap2 + attrib.height : 0)
  const x = L.cx - textW / 2
  let y = L.cy - totalH / 2

  // Quote mark pops in.
  const pop = tween(t, 0.25, 0.85, easeOutBack)
  if (pop > 0) {
    ctx.save()
    ctx.fillStyle = colors.accent
    ctx.translate(x + markSize * 0.5, y + markSize * 0.5)
    ctx.scale(pop, pop)
    drawQuoteMark(ctx, -markSize * 0.5, -markSize * 0.5, markSize)
    ctx.restore()
  }
  y += markSize + gap1

  // Quote reveals word by word.
  ctx.fillStyle = colors.primary
  const qOpts = { mode: 'word', start: 0.6, stagger: fitStagger(headline, 'word', 1.5, 0.07), duration: 0.6, ease: easeOutCubic, align: 'left' } as const
  drawRevealLines(ctx, quote, x, y + quote.height / 2, t, qOpts)
  y += quote.height

  // Attribution: rule grows, then the name slides in.
  if (attrib) {
    y += gap2
    const s = Math.min(revealEnd(headline, qOpts) + 0.1, 3.2)
    const rule = tween(t, s, s + 0.5, easeOutExpo)
    const ruleW = L.U * 0.06
    ctx.fillStyle = colors.accent
    ctx.fillRect(x, y + attrib.height / 2 - L.U * 0.002, ruleW * rule, L.U * 0.004)
    ctx.fillStyle = mixColor(colors.primary, colors.bg, 0.25)
    drawRevealLines(ctx, attrib, x + ruleW + L.U * 0.03, y + attrib.height / 2, t, {
      mode: 'word',
      start: s + 0.2,
      stagger: fitStagger(subline, 'word', 0.5, 0.06),
      align: 'left',
    })
  }

  drawLogoBadge(ctx, logo, L, t, D, L.portrait ? 'bottom-left' : 'bottom-right', 0.8)
}
