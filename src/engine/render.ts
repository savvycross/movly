import { clamp } from './math'
import type { StageInfo, Template, TemplateParams } from './types'

/** Supported output formats and their stage size in px. */
export const ASPECT_RATIOS = {
  '16:9': { width: 1920, height: 1080, label: 'Landscape' },
  '1:1': { width: 1080, height: 1080, label: 'Square' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait' },
  '9:16': { width: 1080, height: 1920, label: 'Story' },
} as const

export type AspectRatio = keyof typeof ASPECT_RATIOS

export const ASPECT_RATIO_IDS = Object.keys(ASPECT_RATIOS) as AspectRatio[]

/** Builds the StageInfo for an aspect ratio, user duration (s) and speed. */
export function getStage(aspect: AspectRatio, durationSeconds: number, speed: number): StageInfo {
  const { width, height } = ASPECT_RATIOS[aspect]
  return { width, height, duration: durationSeconds * speed }
}

/**
 * Renders one frame of `template` at template time `time` onto `ctx`,
 * scaling the logical stage to whatever pixel size the canvas has.
 * The canvas should have the stage's aspect ratio.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  template: Template,
  time: number,
  params: TemplateParams,
  stage: StageInfo,
): void {
  const { width, height } = ctx.canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.setTransform(width / stage.width, 0, 0, height / stage.height, 0, 0)
  ctx.save()
  template.draw(ctx, clamp(time, 0, stage.duration), params, stage)
  ctx.restore()
}
