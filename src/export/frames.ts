import { frameToTime, getStage, renderFrame, type AspectRatio, type Template, type TemplateParams } from '../engine'
import { drawWatermark } from './watermark'

/** Everything needed to render any frame of the composition, independent of the live preview. */
export interface Composition {
  template: Template
  params: TemplateParams
  aspect: AspectRatio
  /** Clip length in seconds. */
  duration: number
  /** Add the small "Made with Movly" badge (off unless the user opts in). */
  watermark?: boolean
}

/** Draws frame `index` of a `fps` timeline onto `ctx` (canvas sized to the export resolution). */
export function drawCompositionFrame(ctx: CanvasRenderingContext2D, comp: Composition, index: number, fps: number) {
  const stage = getStage(comp.aspect, comp.duration, comp.params.speed)
  renderFrame(ctx, comp.template, frameToTime(index, comp.params.speed, fps), comp.params, stage)
  if (comp.watermark) drawWatermark(ctx, ctx.canvas.width, ctx.canvas.height)
}

export function createExportCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // Opaque canvas: encoders don't need alpha and it avoids premultiplication work.
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false })
  if (!ctx) throw new Error('Could not create a 2D canvas for export.')
  return { canvas, ctx }
}

export class ExportCanceled extends Error {
  constructor() {
    super('Export canceled')
    this.name = 'AbortError'
  }
}

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ExportCanceled()
}

/**
 * Yields to the event loop so React can paint progress. Uses MessageChannel
 * rather than setTimeout, which background tabs throttle to 1/s.
 */
export function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel()
    ch.port1.onmessage = () => resolve()
    ch.port2.postMessage(null)
  })
}
