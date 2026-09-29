import { clamp } from './math'
import type { Template, TemplateParams } from './types'

/** Logical stage every template draws on. The renderer scales it to the canvas. */
export const STAGE = { width: 1920, height: 1080 } as const

/**
 * Renders one frame of `template` at template time `time` (seconds, speed-adjusted)
 * onto `ctx`, scaling the 1920×1080 stage to whatever size the canvas is.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  template: Template,
  time: number,
  params: TemplateParams,
): void {
  const { width, height } = ctx.canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.setTransform(width / STAGE.width, 0, 0, height / STAGE.height, 0, 0)
  ctx.save()
  template.draw(ctx, clamp(time, 0, template.defaultDuration), params)
  ctx.restore()
}
