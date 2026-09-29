import { easeOutCubic, type Easing } from './easing'
import { tween } from './keyframes'

/** Builds a canvas `font` string with sensible fallbacks. */
export function fontString(size: number, family: string, weight: number | string = 700): string {
  return `${weight} ${size}px "${family}", system-ui, -apple-system, "Segoe UI", sans-serif`
}

/** Sets tracking in stage px where supported (ignored on older browsers). */
export function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
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

export interface FitLinesOptions {
  family: string
  weight?: number | string
  /** Largest font size (px). */
  max: number
  /** Preferred smallest size; goes lower only if needed to fit. */
  min?: number
  maxLines?: number
  /** Line height as a multiple of font size. Default 1.1. */
  lineHeight?: number
  /** Tracking in px per em (e.g. 0.1 = 10% of the font size). */
  tracking?: number
}

export interface FittedLines {
  lines: string[]
  size: number
  /** Ready-to-assign canvas font string. */
  font: string
  /** Line advance in px. */
  lineHeight: number
  /** Widest line in px. */
  width: number
  /** lines × lineHeight. */
  height: number
  /** Tracking in px (already applied when measuring). */
  tracking: number
}

/**
 * Picks the largest font size at which `text`, word-wrapped to `maxWidth`,
 * fits in `maxWidth` × `maxHeight` within `maxLines` lines.
 * Guarantees the result fits the box: if it can't at `min`, it shrinks further.
 */
export function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  { family, weight = 700, max, min = 12, maxLines = 3, lineHeight = 1.1, tracking = 0 }: FitLinesOptions,
): FittedLines {
  ctx.save()
  const measure = (size: number) => {
    ctx.font = fontString(size, family, weight)
    setLetterSpacing(ctx, size * tracking)
    const lines = wrapLines(ctx, text, maxWidth)
    const width = Math.max(0, ...lines.map((l) => ctx.measureText(l).width))
    return { lines, width, height: lines.length * size * lineHeight }
  }
  let size = Math.max(1, Math.floor(max))
  let m = measure(size)
  while (size > min && (m.lines.length > maxLines || m.width > maxWidth || m.height > maxHeight)) {
    size = Math.max(min, Math.floor(size * 0.94))
    m = measure(size)
  }
  // Still too big at `min` (very long words / text): scale down to fit exactly.
  if (m.width > maxWidth || m.height > maxHeight) {
    const k = Math.min(maxWidth / Math.max(1, m.width), maxHeight / Math.max(1, m.height))
    size = Math.max(1, Math.floor(size * k))
    m = measure(size)
  }
  ctx.restore()
  return {
    lines: m.lines,
    size,
    font: fontString(size, family, weight),
    lineHeight: size * lineHeight,
    width: m.width,
    height: m.height,
    tracking: size * tracking,
  }
}

/** Applies a fitted block's font and tracking to the context. */
export function applyFitted(ctx: CanvasRenderingContext2D, fitted: FittedLines): void {
  ctx.font = fitted.font
  setLetterSpacing(ctx, fitted.tracking)
}

/** Center y of line `i` for a block vertically centered on `cy`. */
export function lineCenterY(fitted: FittedLines, cy: number, i: number): number {
  return cy - fitted.height / 2 + (i + 0.5) * fitted.lineHeight
}

export type RevealMode = 'letter' | 'word'

export interface TextUnit {
  text: string
  /** Offset from the start of the string, in px (kerning-aware). */
  x: number
  width: number
  /** Index among animated units, or -1 for whitespace. */
  order: number
}

/** Splits `text` into letters or words with their x offsets under the current font. */
export function measureUnits(ctx: CanvasRenderingContext2D, text: string, mode: RevealMode = 'letter'): TextUnit[] {
  const parts = mode === 'word' ? text.split(/(\s+)/).filter(Boolean) : Array.from(text)
  const units: TextUnit[] = []
  let prefix = ''
  let order = 0
  for (const part of parts) {
    // Measuring the whole prefix (not summing parts) keeps kerning intact.
    const x = ctx.measureText(prefix).width
    units.push({ text: part, x, width: ctx.measureText(part).width, order: /^\s+$/.test(part) ? -1 : order++ })
    prefix += part
  }
  return units
}

/** Number of animated units (letters or words, whitespace excluded). */
export function countUnits(text: string, mode: RevealMode = 'letter'): number {
  return mode === 'word' ? text.split(/\s+/).filter(Boolean).length : Array.from(text.replace(/\s/g, '')).length
}

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
  /** Unit index to start counting from (continues a reveal across lines). */
  firstIndex?: number
}

function defaultStagger(mode: RevealMode) {
  return mode === 'word' ? 0.12 : 0.04
}

/** Time (s) at which a reveal of `text` with these options finishes animating. */
export function revealEnd(text: string, opts: RevealOptions = {}): number {
  const mode = opts.mode ?? 'letter'
  const count = countUnits(text, mode) + (opts.firstIndex ?? 0)
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
  const firstIndex = opts.firstIndex ?? 0

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
  for (const unit of measureUnits(ctx, text, mode)) {
    if (unit.order < 0) continue
    const unitStart = start + (firstIndex + unit.order) * stagger
    const p = tween(time, unitStart, unitStart + duration, ease)
    if (p <= 0) continue
    ctx.globalAlpha = baseAlpha * (fade ? Math.min(1, Math.max(0, p)) : 1)
    ctx.fillText(unit.text, left + unit.x, y + (1 - p) * offsetY)
  }
  ctx.restore()
}

/**
 * Draws a fitted multi-line block centered vertically on `cy`, revealing it
 * with one continuous stagger across all lines. Sets font and baseline itself.
 */
export function drawRevealLines(
  ctx: CanvasRenderingContext2D,
  fitted: FittedLines,
  x: number,
  cy: number,
  time: number,
  opts: RevealOptions = {},
): void {
  const mode = opts.mode ?? 'letter'
  ctx.save()
  applyFitted(ctx, fitted)
  ctx.textBaseline = 'middle'
  let index = opts.firstIndex ?? 0
  fitted.lines.forEach((line, i) => {
    drawRevealText(ctx, line, x, lineCenterY(fitted, cy, i), time, { ...opts, firstIndex: index })
    index += countUnits(line, mode)
  })
  ctx.restore()
}

/**
 * Stagger that keeps a reveal of `text` within `budget` seconds (from first to
 * last unit start), never slower than `max`. Long text reveals faster instead
 * of running past the hold.
 */
export function fitStagger(text: string, mode: RevealMode, budget: number, max: number): number {
  return Math.min(max, budget / Math.max(1, countUnits(text, mode) - 1))
}
