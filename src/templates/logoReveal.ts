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
  fontString,
  hash,
  readableOn,
  stageLayout,
  tween,
  withAlpha,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
  cuesToStageTime,
  type SoundEvent,
} from '../engine'
import { outro, paintBackdrop, stack } from './shared'

export const id = 'logo-reveal'
export const name = 'Logo Reveal'
export const category: TemplateCategory = 'Logo reveals'
export const defaultDuration = 5
export const defaultColors: TemplateColors = {
  bg: '#0b0d17',
  primary: '#ffffff',
  accent: '#4f7cff',
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  const S = L.U * (L.landscape ? 0.26 : 0.3)
  const head = fitLines(ctx, headline, L.safeW * 0.9, L.safeH * 0.22, {
    family: font,
    weight: 800,
    max: L.U * 0.085,
    min: L.U * 0.035,
    maxLines: 2,
    tracking: 0.04,
  })
  const sub = hasSub
    ? fitLines(ctx, subline, L.safeW * 0.85, L.safeH * 0.14, {
        family: font,
        weight: 500,
        max: L.U * 0.036,
        min: L.U * 0.022,
        maxLines: 2,
        lineHeight: 1.35,
      })
    : null
  const markBox = S * 1.5 // mark + rings
  const [markY, headY, subY] = stack(L.cy, [markBox, head.height, sub?.height ?? 0], [L.U * 0.03, sub ? L.U * 0.025 : 0])

  const bloom = tween(t, 0.5, 1.4, easeOutCubic)
  paintBackdrop(ctx, L, colors.bg, colors.accent, { glow: 0.1 + 0.2 * bloom, y: markY, radius: L.U * (0.5 + 0.3 * bloom) })

  const out = outro(t, D, 0.7)
  ctx.globalAlpha = 1 - out
  ctx.translate(L.cx, L.cy)
  const shrink = 1 - 0.08 * out
  ctx.scale(shrink, shrink)
  ctx.translate(-L.cx, -L.cy)

  // Rings draw on around the mark.
  const r1 = S * 0.62
  const r2 = S * 0.74
  const ring1 = tween(t, 0.05, 0.95, easeInOutCubic)
  const ring2 = tween(t, 0.25, 1.15, easeInOutCubic)
  ctx.lineCap = 'round'
  if (ring1 > 0) {
    ctx.strokeStyle = colors.accent
    ctx.lineWidth = L.U * 0.007
    ctx.beginPath()
    ctx.arc(L.cx, markY, r1, -Math.PI / 2, -Math.PI / 2 + ring1 * Math.PI * 2)
    ctx.stroke()
  }
  if (ring2 > 0) {
    ctx.strokeStyle = withAlpha(colors.primary, 0.25)
    ctx.lineWidth = L.U * 0.003
    ctx.beginPath()
    ctx.arc(L.cx, markY, r2, Math.PI / 2, Math.PI / 2 - ring2 * Math.PI * 2, true)
    ctx.stroke()
  }

  // Particle burst as the mark lands.
  const burst = tween(t, 0.7, 1.7, easeOutExpo)
  if (burst > 0 && burst < 1) {
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + hash(i) * 0.4
      const d = r1 + burst * S * (0.35 + hash(i + 50) * 0.5)
      ctx.fillStyle = withAlpha(i % 2 ? colors.primary : colors.accent, 1 - burst)
      ctx.beginPath()
      ctx.arc(L.cx + Math.cos(a) * d, markY + Math.sin(a) * d, L.U * (0.004 + hash(i + 99) * 0.005), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // The mark: uploaded logo, or a monogram disc built from the headline.
  const pop = tween(t, 0.55, 1.25, easeOutBack)
  if (pop > 0) {
    ctx.save()
    ctx.translate(L.cx, markY)
    ctx.scale(pop, pop)
    const inner = S * 0.5
    ctx.beginPath()
    ctx.arc(0, 0, inner, 0, Math.PI * 2)
    ctx.save()
    ctx.clip()
    if (logo) {
      ctx.fillStyle = withAlpha(colors.primary, 0.06)
      ctx.fillRect(-inner, -inner, inner * 2, inner * 2)
      drawImageContain(ctx, logo, -inner * 0.72, -inner * 0.72, inner * 1.44, inner * 1.44)
    } else {
      const g = ctx.createLinearGradient(-inner, -inner, inner, inner)
      g.addColorStop(0, colors.accent)
      g.addColorStop(1, withAlpha(colors.accent, 0.7))
      ctx.fillStyle = g
      ctx.fillRect(-inner, -inner, inner * 2, inner * 2)
      const letter = (headline.trim()[0] ?? 'M').toUpperCase()
      ctx.fillStyle = readableOn(colors.accent, colors.primary, colors.bg)
      ctx.font = fontString(inner * 1.05, font, 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const m = ctx.measureText(letter)
      ctx.fillText(letter, 0, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2)
    }
    // Light sweep across the mark.
    const sweep = tween(t, 1.35, 2.1, easeInOutCubic)
    if (sweep > 0 && sweep < 1) {
      const sx = -inner * 2 + sweep * inner * 4
      const g = ctx.createLinearGradient(sx - inner * 0.4, 0, sx + inner * 0.4, 0)
      g.addColorStop(0, 'rgba(255,255,255,0)')
      g.addColorStop(0.5, 'rgba(255,255,255,0.45)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.rotate(-0.35)
      ctx.fillRect(-inner * 2, -inner * 2, inner * 4, inner * 4)
    }
    ctx.restore()
    ctx.restore()
  }

  ctx.fillStyle = colors.primary
  drawRevealLines(ctx, head, L.cx, headY, t, {
    start: 1.1,
    stagger: fitStagger(headline, 'letter', 0.8, 0.03),
    duration: 0.6,
    ease: easeOutExpo,
    clip: true,
    align: 'center',
  })
  if (sub) {
    ctx.fillStyle = withAlpha(colors.primary, 0.65)
    drawRevealLines(ctx, sub, L.cx, subY, t, { mode: 'word', start: 1.6, stagger: fitStagger(subline, 'word', 0.7, 0.07), duration: 0.6, align: 'center' })
  }
}

/** Riser while the rings draw, impact + pop as the mark lands, soft shine, whoosh out. */
export function sound(_ctx: CanvasRenderingContext2D, params: TemplateParams, stage: StageInfo): SoundEvent[] {
  const { D } = fitTimeline(0, stage.duration, defaultDuration)
  const cues: SoundEvent[] = [
    { time: 0.05, kind: 'riser', duration: 0.55, gain: 0.7 },
    { time: 0.6, kind: 'impact', gain: 1 },
    { time: 0.62, kind: 'pop', gain: 0.6, pitch: 1.2 },
    { time: 1.1, kind: 'whoosh', gain: 0.35, pitch: 1.5 },
    { time: 1.35, kind: 'whoosh', gain: 0.25, pitch: 2 },
  ]
  if (params.subline.trim()) cues.push({ time: 1.6, kind: 'click', gain: 0.4 })
  cues.push({ time: D - 0.7, kind: 'whoosh', gain: 0.6 })
  return cuesToStageTime(cues, stage.duration, defaultDuration)
}
