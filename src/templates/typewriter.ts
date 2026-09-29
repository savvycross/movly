import {
  applyFitted,
  easeOutCubic,
  fitLines,
  fitTimeline,
  hash,
  lineCenterY,
  mixColor,
  setGlow,
  clearGlow,
  stageLayout,
  tween,
  withAlpha,
  type FittedLines,
  type StageInfo,
  type TemplateCategory,
  type TemplateColors,
  type TemplateParams,
} from '../engine'
import { drawLogoBadge, outro } from './shared'

export const id = 'typewriter'
export const name = 'Typewriter'
export const category: TemplateCategory = 'Titles'
export const defaultDuration = 6
export const defaultColors: TemplateColors = {
  bg: '#1e1e2e',
  primary: '#cdd6f4',
  accent: '#f38ba8',
}

/** Time at which each character (across all lines) gets typed, with human-ish jitter. */
function typeTimes(count: number, start: number, cps: number, seed: number): number[] {
  const times: number[] = []
  let at = start
  for (let i = 0; i < count; i++) {
    times.push(at)
    at += (0.55 + hash(seed + i) * 0.9) / cps
  }
  times.push(at)
  return times
}

/** Draws the typed portion of a block; returns the cursor position after the last typed char. */
function drawTyped(
  ctx: CanvasRenderingContext2D,
  block: FittedLines,
  x: number,
  cy: number,
  typed: number,
): { x: number; y: number } {
  let remaining = typed
  let cursor = { x, y: lineCenterY(block, cy, 0) }
  for (let i = 0; i < block.lines.length; i++) {
    const chars = Array.from(block.lines[i])
    const y = lineCenterY(block, cy, i)
    const shown = chars.slice(0, Math.max(0, remaining)).join('')
    if (remaining > 0 || i === 0) {
      ctx.fillText(shown, x, y)
      cursor = { x: x + ctx.measureText(shown).width, y }
    }
    remaining -= chars.length + 1 // +1 for the wrapped space
    if (remaining < 0) break
  }
  return cursor
}

export function draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo) {
  const { t, D } = fitTimeline(time, stage.duration, defaultDuration)
  const L = stageLayout(stage)
  const { colors, font, headline, subline, logo } = params
  const hasSub = subline.trim().length > 0

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, L.W, L.H)
  // Dot grid.
  ctx.fillStyle = withAlpha(colors.primary, 0.07)
  const step = L.U * 0.045
  const dotR = L.U * 0.003
  for (let y = step / 2; y < L.H; y += step) for (let x = step / 2; x < L.W; x += step) ctx.fillRect(x - dotR, y - dotR, dotR * 2, dotR * 2)

  // Terminal window.
  const winW = L.landscape ? Math.min(L.W * 0.66, L.U * 1.3) : L.safeW
  const pad = L.U * 0.045
  const barH = L.U * 0.06
  const innerW = winW - pad * 2
  const head = fitLines(ctx, headline, innerW, L.safeH * 0.45, {
    family: font,
    weight: 700,
    max: L.U * 0.085,
    min: L.U * 0.035,
    maxLines: L.portrait ? 5 : 3,
    lineHeight: 1.2,
  })
  const sub = hasSub
    ? fitLines(ctx, subline, innerW, L.safeH * 0.2, {
        family: font,
        weight: 400,
        max: L.U * 0.038,
        min: L.U * 0.022,
        maxLines: 3,
        lineHeight: 1.35,
      })
    : null
  const promptH = L.U * 0.035
  const gap = L.U * 0.035
  const winH = barH + pad + promptH + gap * 0.6 + head.height + (sub ? gap + sub.height : 0) + pad
  const wx = L.cx - winW / 2
  const wy = L.cy - winH / 2

  const appear = tween(t, 0, 0.5, easeOutCubic)
  const out = outro(t, D, 0.6)
  const scale = (0.94 + 0.06 * appear) * (1 - 0.04 * out)
  ctx.save()
  ctx.globalAlpha = appear * (1 - out)
  ctx.translate(L.cx, L.cy)
  ctx.scale(scale, scale)
  ctx.translate(-L.cx, -L.cy + (1 - appear) * L.U * 0.03)

  const radius = L.U * 0.022
  setGlow(ctx, L.U * 0.06, 'rgba(0,0,0,0.45)', 0, L.U * 0.02)
  ctx.fillStyle = mixColor(colors.bg, colors.primary, 0.07)
  ctx.beginPath()
  ctx.roundRect(wx, wy, winW, winH, radius)
  ctx.fill()
  clearGlow(ctx)
  ctx.strokeStyle = withAlpha(colors.primary, 0.12)
  ctx.lineWidth = Math.max(1, L.U * 0.0015)
  ctx.stroke()
  // Title bar with window controls.
  ctx.fillStyle = withAlpha(colors.primary, 0.05)
  ctx.beginPath()
  ctx.roundRect(wx, wy, winW, barH, [radius, radius, 0, 0])
  ctx.fill()
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(wx + pad * 0.7 + i * L.U * 0.03, wy + barH / 2, L.U * 0.009, 0, Math.PI * 2)
    ctx.fill()
  })

  // Typing schedule: speed up for long text so it always finishes with time to spare.
  const headChars = Array.from(head.lines.join(' ')).length
  const subChars = sub ? Array.from(sub.lines.join(' ')).length : 0
  const typeStart = 0.6
  const cps = Math.max(16, (headChars + subChars * 0.7) / Math.max(0.5, D * 0.5))
  const headTimes = typeTimes(headChars, typeStart, cps, 1)
  const subStart = headTimes[headChars] + 0.35
  const subTimes = typeTimes(subChars, subStart, cps * 1.4, 500)
  const typedCount = (times: number[]) => times.filter((x, i) => i < times.length - 1 && t >= x).length

  const textX = wx + pad
  let y = wy + barH + pad
  // Prompt line.
  ctx.font = `600 ${promptH * 0.9}px "Space Mono", ui-monospace, monospace`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = colors.accent
  ctx.fillText('~/movly $', textX, y + promptH / 2)
  y += promptH + gap * 0.6

  applyFitted(ctx, head)
  ctx.fillStyle = colors.primary
  const headTyped = typedCount(headTimes)
  let cursor = drawTyped(ctx, head, textX, y + head.height / 2, headTyped)
  let cursorSize = head.size
  y += head.height

  if (sub) {
    y += gap
    applyFitted(ctx, sub)
    ctx.fillStyle = withAlpha(colors.primary, 0.6)
    const subTyped = typedCount(subTimes)
    if (subTyped > 0) {
      cursor = drawTyped(ctx, sub, textX, y + sub.height / 2, subTyped)
      cursorSize = sub.size
    }
  }

  // Block cursor: solid while typing, blinking when idle.
  const typing = t < (sub ? subTimes[subChars] : headTimes[headChars]) && t >= typeStart
  if (typing || Math.floor(t * 2.2) % 2 === 0) {
    ctx.fillStyle = colors.accent
    ctx.fillRect(cursor.x + cursorSize * 0.08, cursor.y - cursorSize * 0.45, cursorSize * 0.5, cursorSize * 0.9)
  }
  ctx.restore()

  drawLogoBadge(ctx, logo, L, t, D, 'top-right', 0.4)
}
