import { createExportCanvas, drawCompositionFrame, throwIfAborted, type Composition } from './frames'
import { GIF_FPS, gifDelaysCs } from './plan'
import type { EncodedFile } from './video'

export interface GifExportOptions {
  comp: Composition
  width: number
  height: number
  frames: number
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

/** Frames sampled to build the shared palette (one palette keeps colors stable, no flicker). */
const PALETTE_SAMPLES = 8

export async function exportGif({ comp, width, height, frames, signal, onProgress }: GifExportOptions): Promise<EncodedFile> {
  const { ctx } = createExportCanvas(width, height)
  const worker = new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' })
  let pending: { resolve: (v: { type: string; bytes?: Uint8Array }) => void; reject: (e: Error) => void } | null = null
  worker.onmessage = (e) => {
    const p = pending
    pending = null
    if (e.data.type === 'error') p?.reject(new Error(e.data.message))
    else p?.resolve(e.data)
  }
  worker.onerror = (e) => {
    pending?.reject(new Error(e.message || 'GIF worker failed'))
    pending = null
  }
  const send = (msg: object, transfer: Transferable[] = []) =>
    new Promise<{ type: string; bytes?: Uint8Array }>((resolve, reject) => {
      pending = { resolve, reject }
      worker.postMessage(msg, transfer)
    })
  const grab = (i: number) => {
    drawCompositionFrame(ctx, comp, i, GIF_FPS)
    return ctx.getImageData(0, 0, width, height).data
  }

  try {
    // 1. Palette from evenly spaced frames, subsampled (every 4th pixel) to keep it quick.
    const picks = Array.from({ length: Math.min(PALETTE_SAMPLES, frames) }, (_, k) =>
      Math.floor(((k + 0.5) * frames) / Math.min(PALETTE_SAMPLES, frames)),
    )
    const px = width * height
    const samples = new Uint8ClampedArray(Math.ceil(px / 4) * 4 * picks.length)
    let o = 0
    for (const i of picks) {
      throwIfAborted(signal)
      const data = grab(i)
      for (let p = 0; p < px; p += 4) {
        samples[o++] = data[p * 4]
        samples[o++] = data[p * 4 + 1]
        samples[o++] = data[p * 4 + 2]
        samples[o++] = 255
      }
    }
    await send({ type: 'palette', samples: samples.subarray(0, o) })
    onProgress?.(0.05)

    // 2. Frames, one at a time (the worker acks each, so memory stays flat).
    const delays = gifDelaysCs(frames)
    for (let i = 0; i < frames; i++) {
      throwIfAborted(signal)
      const rgba = grab(i)
      await send({ type: 'frame', rgba, width, height, delayMs: delays[i] * 10 }, [rgba.buffer])
      onProgress?.(0.05 + ((i + 1) / frames) * 0.93)
    }
    throwIfAborted(signal)
    const done = await send({ type: 'finish' })
    onProgress?.(1)
    return { blob: new Blob([done.bytes as BlobPart], { type: 'image/gif' }), extension: 'gif' }
  } finally {
    worker.terminate()
  }
}
