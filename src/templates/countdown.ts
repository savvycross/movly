import {
  drawRevealLines,
  easeInCubic,
  easeInOutCubic,
  easeInOutExpo,
  easeOutCubic,
  easeOutExpo,
  fitLines,
  fitStagger,
  fitTimeline,
  fontString,
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

export const id = 'countdown'
export const name = 'Countdown'
export const category: TemplateCategory = 'Social'
export const defaultDuration = 6
export const defaultColors: TemplateColors = {
  bg: '#0d0d0f',
  primary: '#ffffff',
  accent: '#00e5a0',
}

const START = 0.15
const BEAT = 0.85

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const countEnd = START + BEAT * 3
  const R = L.U * 0.28

  paintBackdrop(ctx, L, colors.bg, colors.accent, { glow: 0.12, radius: L.U * 0.8 })

  // Film-leader crosshair and circle guides.
  ctx.strokeStyle = withAlpha(colors.primary, 0.08)
  ctx.lineWidth = L.U * 0.002
  ctx.beginPath()
  ctx.moveTo(0, L.cy)
  ctx.lineTo(L.W, L.cy)
  ctx.moveTo(L.cx, 0)
  ctx.lineTo(L.cx, L.H)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(L.cx, L.cy, R * 1.35, 0, Math.PI * 2)
  ctx.stroke()

  if (t < countEnd + 0.6) {
    const beatIndex = Math.min(2, Math.max(0, Math.floor((t - START) / BEAT)))
    const beatT = t - START - beatIndex * BEAT
    const n = 3 - beatIndex
    const intro = tween(t, 0, START + 0.1, easeOutCubic)

    // Pulse ring on every beat.
    const pulse = tween(beatT, 0, BEAT, easeOutExpo)
    if (t >= START) {
      ctx.strokeStyle = withAlpha(colors.accent, 0.5 * (1 - pulse))
      ctx.lineWidth = L.U * 0.004
      ctx.beginPath()
      ctx.arc(L.cx, L.cy, R * (1 + pulse * 0.8), 0, Math.PI * 2)
      ctx.stroke()
    }

    // Track and sweeping progress arc.
    ctx.globalAlpha = intro
    ctx.lineWidth = L.U * 0.014
    ctx.lineCap = 'round'
    ctx.strokeStyle = withAlpha(colors.primary, 0.12)
    ctx.beginPath()
    ctx.arc(L.cx, L.cy, R, 0, Math.PI * 2)
    ctx.stroke()
    const sweep = t < START ? 0 : tween(beatT, 0, BEAT, easeInOutCubic)
    if (sweep > 0) {
      ctx.strokeStyle = colors.accent
      ctx.beginPath()
      ctx.arc(L.cx, L.cy, R, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI * 2)
      ctx.stroke()
    }

    // Tick marks rotating slowly.
    ctx.save()
    ctx.translate(L.cx, L.cy)
    ctx.rotate(t * 0.4)
    ctx.fillStyle = withAlpha(colors.primary, 0.35)
    for (let i = 0; i < 24; i++) {
      ctx.rotate((Math.PI * 2) / 24)
      ctx.fillRect(R * 1.14, -L.U * 0.002, L.U * (i % 6 === 0 ? 0.03 : 0.014), L.U * 0.004)
    }
    ctx.restore()

    // The number: punches in, shrinks away at the end of its beat.
    if (t >= START && t < countEnd) {
      const inP = tween(beatT, 0, 0.3, easeOutExpo)
      const outP = tween(beatT, BEAT - 0.2, BEAT, easeInCubic)
      const s = (1.5 - 0.5 * inP) * (1 - 0.4 * outP)
      ctx.save()
      ctx.globalAlpha = inP * (1 - outP)
      ctx.translate(L.cx, L.cy)
      ctx.scale(s, s)
      ctx.fillStyle = colors.primary
      ctx.font = fontString(R * 1.15, font, 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const m = ctx.measureText(String(n))
      ctx.fillText(String(n), 0, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  // After "1": accent disc floods the frame, then the headline lands on it.
  const flood = tween(t, countEnd - 0.05, countEnd + 0.5, easeInOutExpo)
  const out = outro(t, D, 0.6)
  if (flood > 0) {
    ctx.save()
    const maxR = Math.hypot(L.W, L.H) / 2
    ctx.fillStyle = colors.accent
    ctx.beginPath()
    ctx.arc(L.cx, L.cy, R + (maxR - R) * flood, 0, Math.PI * 2)
    ctx.fill()

    const textColor = readableOn(colors.accent, colors.bg, colors.primary)
    const hasSub = subline.trim().length > 0
    const head = fitLines(ctx, headline, L.safeW * 0.9, L.safeH * (hasSub ? 0.5 : 0.65), {
      family: font,
      weight: 800,
      max: L.U * 0.15,
      min: L.U * 0.05,
      maxLines: L.portrait ? 4 : 3,
      lineHeight: 1.05,
    })
    const sub = hasSub
      ? fitLines(ctx, subline, L.safeW * 0.85, L.safeH * 0.18, {
          family: font,
          weight: 500,
          max: L.U * 0.045,
          min: L.U * 0.024,
          maxLines: 3,
          lineHeight: 1.3,
        })
      : null
    const [headY, subY] = stack(L.cy, [head.height, sub?.height ?? 0], sub ? L.U * 0.04 : 0)
    ctx.globalAlpha = 1 - out
    const s = 1 + 0.06 * (1 - tween(t, countEnd + 0.2, countEnd + 1.2, easeOutCubic))
    ctx.translate(L.cx, L.cy)
    ctx.scale(s, s)
    ctx.translate(-L.cx, -L.cy)
    ctx.fillStyle = textColor
    drawRevealLines(ctx, head, L.cx, headY, t, {
      start: countEnd + 0.25,
      stagger: fitStagger(headline, 'letter', 0.6, 0.03),
      duration: 0.55,
      ease: easeOutExpo,
      clip: true,
      align: 'center',
    })
    if (sub) {
      ctx.fillStyle = withAlpha(textColor, 0.8)
      drawRevealLines(ctx, sub, L.cx, subY, t, { mode: 'word', start: countEnd + 0.45, stagger: fitStagger(subline, 'word', 0.45, 0.06), align: 'center' })
    }
    ctx.restore()
  }
  drawLogoBadge(ctx, logo, L, t, D, 'top-left', countEnd + 0.4)
}
