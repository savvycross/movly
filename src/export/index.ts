import { getStage, loadFont } from '../engine'
import { detectVideoCaps } from './capabilities'
import type { Composition } from './frames'
import { exportGif } from './gif'
import {
  chooseVideoPlan,
  exportFileName,
  exportFrameCount,
  exportFps,
  exportSize,
  type ExportFormat,
  type ExportQuality,
  type VideoPlan,
} from './plan'
import { exportVideo } from './video'

export * from './plan'
export { ExportCanceled } from './frames'
export type { Composition } from './frames'

export interface ExportRequest {
  comp: Composition
  format: ExportFormat
  quality: ExportQuality
  /** Video plan from `detectVideoPlan` (ignored for GIF). */
  plan?: VideoPlan | null
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

export interface ExportResult {
  blob: Blob
  fileName: string
  width: number
  height: number
  frames: number
  fps: number
}

/** Best video plan for this browser at the given export size. */
export async function detectVideoPlan(width: number, height: number): Promise<VideoPlan | null> {
  return chooseVideoPlan(await detectVideoCaps(width, height))
}

export async function runExport({ comp, format, quality, plan, signal, onProgress }: ExportRequest): Promise<ExportResult> {
  const stage = getStage(comp.aspect, comp.duration, comp.params.speed)
  const { width, height } = exportSize(stage, format, quality)
  const frames = exportFrameCount(comp.duration, format)
  await loadFont(comp.params.font)

  let file
  if (format === 'gif') {
    file = await exportGif({ comp, width, height, frames, signal, onProgress })
  } else {
    const videoPlan = plan ?? (await detectVideoPlan(width, height))
    if (!videoPlan) throw new Error('This browser cannot encode video. Try GIF, or a recent Chrome, Edge, Safari or Firefox.')
    file = await exportVideo({ comp, plan: videoPlan, width, height, quality, frames, signal, onProgress })
  }
  return {
    blob: file.blob,
    fileName: exportFileName(comp.template.id, comp.aspect, file.extension),
    width,
    height,
    frames,
    fps: exportFps(format),
  }
}
