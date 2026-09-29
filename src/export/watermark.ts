export const WATERMARK_TEXT = 'Made with Movly'

/**
 * Small "Made with Movly" badge in the bottom-right corner, drawn in canvas
 * pixels (after the template), so it's the same relative size at every
 * export resolution. A dark translucent pill keeps it readable on any colors.
 */
export function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const short = Math.min(width, height)
  const size = Math.max(10, Math.round(short * 0.026))
  const margin = Math.round(short * 0.03)
  const padX = size * 0.7
  const padY = size * 0.45
  const icon = size * 1.05
  const gap = size * 0.45

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.shadowColor = 'transparent'
  ctx.font = `600 ${size}px "Inter", system-ui, -apple-system, "Segoe UI", sans-serif`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const textW = ctx.measureText(WATERMARK_TEXT).width
  const w = padX * 2 + icon + gap + textW
  const h = Math.max(icon, size) + padY * 2
  const x = width - margin - w
  const y = height - margin - h

  ctx.fillStyle = 'rgba(10, 10, 16, 0.55)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()

  // Mini Movly mark: gradient rounded square with an "M" stroke.
  const ix = x + padX
  const iy = y + (h - icon) / 2
  const g = ctx.createLinearGradient(ix, iy, ix + icon, iy + icon)
  g.addColorStop(0, '#8b5cf6')
  g.addColorStop(1, '#22d3ee')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(ix, iy, icon, icon, icon * 0.25)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = icon * 0.1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(ix + icon * 0.25, iy + icon * 0.72)
  ctx.lineTo(ix + icon * 0.25, iy + icon * 0.28)
  ctx.lineTo(ix + icon * 0.5, iy + icon * 0.53)
  ctx.lineTo(ix + icon * 0.75, iy + icon * 0.28)
  ctx.lineTo(ix + icon * 0.75, iy + icon * 0.72)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.fillText(WATERMARK_TEXT, ix + icon + gap, y + h / 2)
  ctx.restore()
}
