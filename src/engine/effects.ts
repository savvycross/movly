/** Current uniform scale of the context's transform (stage → device pixels). */
export function currentScale(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform()
  return Math.hypot(m.a, m.b) || 1
}

/**
 * Sets a shadow/glow in stage units. Canvas shadows ignore the transform, so
 * without this a glow would look 4× bigger in a small preview than in export.
 */
export function setGlow(
  ctx: CanvasRenderingContext2D,
  blur: number,
  color: string,
  offsetX = 0,
  offsetY = 0,
): void {
  const s = currentScale(ctx)
  ctx.shadowBlur = blur * s
  ctx.shadowColor = color
  ctx.shadowOffsetX = offsetX * s
  ctx.shadowOffsetY = offsetY * s
}

export function clearGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}
