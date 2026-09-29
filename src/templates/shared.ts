import {
  drawImageContain,
  easeInCubic,
  easeOutBack,
  imageSize,
  tween,
  withAlpha,
  type Easing,
  type StageLayout,
} from '../engine'

/** Progress (0→1) of the standard exit animation over the last `len` seconds. */
export function outro(t: number, D: number, len = 0.6, ease: Easing = easeInCubic): number {
  return tween(t, D - len, D, ease)
}

/**
 * Vertically stacks blocks of the given heights (with gaps) centered on `cy`.
 * Returns the center y of each block. Pass gaps as separate entries prefixed
 * with nothing: `stack(cy, [h1, h2], gap)`.
 */
export function stack(cy: number, heights: number[], gap: number | number[]): number[] {
  const gaps = heights.slice(1).map((_, i) => (Array.isArray(gap) ? (gap[i] ?? 0) : gap))
  const total = heights.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0)
  let y = cy - total / 2
  return heights.map((h, i) => {
    const center = y + h / 2
    y += h + (gaps[i] ?? 0)
    return center
  })
}

/** Fills the stage with `bg` plus a soft radial glow and vignette. */
export function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  L: StageLayout,
  bg: string,
  glowColor: string,
  { glow = 0.18, x = L.cx, y = L.cy, radius = Math.max(L.W, L.H) * 0.6, vignette = 0.35 } = {},
): void {
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, L.W, L.H)
  if (glow > 0) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
    g.addColorStop(0, withAlpha(glowColor, glow))
    g.addColorStop(1, withAlpha(glowColor, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L.W, L.H)
  }
  if (vignette > 0) {
    const r = Math.hypot(L.W, L.H) / 2
    const v = ctx.createRadialGradient(L.cx, L.cy, r * 0.45, L.cx, L.cy, r)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, `rgba(0,0,0,${vignette})`)
    ctx.fillStyle = v
    ctx.fillRect(0, 0, L.W, L.H)
  }
}

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** Small logo in a corner: pops in near the start and fades out with the outro. */
export function drawLogoBadge(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource | null | undefined,
  L: StageLayout,
  t: number,
  D: number,
  corner: Corner = 'top-left',
  start = 0.3,
): void {
  if (!logo) return
  const { width, height } = imageSize(logo)
  if (!width || !height) return
  const box = L.U * 0.1
  const aspect = Math.min(2.5, width / height)
  const w = aspect >= 1 ? box * aspect : box
  const h = aspect >= 1 ? box : box * aspect
  const x = corner.endsWith('left') ? L.M : L.W - L.M - w
  const y = corner.startsWith('top') ? L.M : L.H - L.M - h
  const s = tween(t, start, start + 0.6, easeOutBack)
  if (s <= 0) return
  ctx.save()
  ctx.globalAlpha *= Math.min(1, s) * (1 - outro(t, D))
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(s, s)
  drawImageContain(ctx, logo, -w / 2, -h / 2, w, h)
  ctx.restore()
}
