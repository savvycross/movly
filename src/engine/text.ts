import { easeOutCubic, type Easing } from './easing'
import { tween } from './keyframes'

/** Builds a canvas `font` string with sensible fallbacks. */
export function fontString(size: number, family: string, weight: number | string = 700): string {
  return `${weight} ${size}px "${family}", system-ui, -apple-system, "Segoe UI", sans-serif`
}

export interface FitOptions {
  family: string
  weight?: number | string
  /** Largest size to return (px). */
  max?: number
  /** Smallest size to return (px); text may overflow below this. */
  min?: number
}

/** Largest font size (px) at which `text` fits in `maxWidth` on one line, clamped to [min, max]. */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  { family, weight = 700, max = 200, min = 12 }: FitOptions,
): number {
  const ref = 100
  ctx.save()
  ctx.font = fontString(ref, family, weight)
  const width = ctx.measureText(text).width
  ctx.restore()
  if (width <= 0) return max
  return Math.min(max, Math.max(min, Math.floor((ref * maxWidth) / width)))
}

/** Sets `ctx.font` to the fitted size for `text` and returns that size. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, opts: FitOptions): number {
  const size = fitFontSize(ctx, text, maxWidth, opts)
  ctx.font = fontString(size, opts.family, opts.weight)
  return size
}

/** Greedy word-wrap using the current `ctx.font`. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export type RevealMode = 'letter' | 'word'

export interface RevealOptions {
  /** Animate per letter or per word. Default `'letter'`. */
  mode?: RevealMode
  /** Time (s) the first unit starts animating. Default 0. */
  start?: number
  /** Delay (s) between consecutive units. Default 0.04 (letter) / 0.12 (word). */
  stagger?: number
  /** Animation length (s) of each unit. Default 0.5. */
  duration?: number
  ease?: Easing
  /** Distance (px) each unit rises from. Default: a line height with `clip`, else 40% of it. */
  offsetY?: number
  /** Fade units in. Default true. */
  fade?: boolean
  /** Mask the line box so units slide up from behind an invisible edge. Default false. */
  clip?: boolean
  align?: 'left' | 'center' | 'right'
}

interface Unit {
  text: string
  x: number
  /** Index among animated units, or -1 for whitespace. */
  order: number
}

function splitUnits(ctx: CanvasRenderingContext2D, text: string, mode: RevealMode): Unit[] {
  const parts = mode === 'word' ? text.split(/(\s+)/).filter(Boolean) : Array.from(text)
  const units: Unit[] = []
  let prefix = ''
  let order = 0
  for (const part of parts) {
    // Measuring the whole prefix (not summing parts) keeps kerning intact.
    units.push({ text: part, x: ctx.measureText(prefix).width, order: /^\s+$/.test(part) ? -1 : order++ })
    prefix += part
  }
  return units
}

function defaultStagger(mode: RevealMode) {
  return mode === 'word' ? 0.12 : 0.04
}

/** Time (s) at which `drawRevealText` with these options finishes animating. */
export function revealEnd(text: string, opts: RevealOptions = {}): number {
  const mode = opts.mode ?? 'letter'
  const count = mode === 'word' ? text.split(/\s+/).filter(Boolean).length : Array.from(text.replace(/\s/g, '')).length
  const stagger = opts.stagger ?? defaultStagger(mode)
  return (opts.start ?? 0) + Math.max(0, count - 1) * stagger + (opts.duration ?? 0.5)
}

/**
 * Draws `text` at (x, y) using the current font, fill and textBaseline, revealing
 * it letter-by-letter or word-by-word as `time` advances.
 */
export function drawRevealText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  time: number,
  opts: RevealOptions = {},
): void {
  const mode = opts.mode ?? 'letter'
  const start = opts.start ?? 0
  const stagger = opts.stagger ?? defaultStagger(mode)
  const duration = opts.duration ?? 0.5
  const ease = opts.ease ?? easeOutCubic
  const fade = opts.fade ?? true
  const clip = opts.clip ?? false
  const align = opts.align ?? 'left'

  ctx.save()
  ctx.textAlign = 'left'
  const metrics = ctx.measureText(text)
  const width = metrics.width
  const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent
  const descent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent
  const lineHeight = ascent + descent
  const offsetY = opts.offsetY ?? (clip ? lineHeight : lineHeight * 0.4)
  const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x

  if (clip) {
    const pad = lineHeight * 0.1
    ctx.beginPath()
    ctx.rect(left - pad * 4, y - ascent - pad, width + pad * 8, lineHeight + pad * 2)
    ctx.clip()
  }

  const baseAlpha = ctx.globalAlpha
  for (const unit of splitUnits(ctx, text, mode)) {
    if (unit.order < 0) continue
    const unitStart = start + unit.order * stagger
    const p = tween(time, unitStart, unitStart + duration, ease)
    if (p <= 0) continue
    ctx.globalAlpha = baseAlpha * (fade ? Math.min(1, Math.max(0, p)) : 1)
    ctx.fillText(unit.text, left + unit.x, y + (1 - p) * offsetY)
  }
  ctx.restore()
}
