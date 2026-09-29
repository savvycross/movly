import { createExportCanvas, drawCompositionFrame, nextTask, throwIfAborted, type Composition } from './frames'
import { VIDEO_FPS, type ExportQuality, type VideoCodecId, type VideoPlan } from './plan'

export interface VideoExportOptions {
  comp: Composition
  plan: VideoPlan
  width: number
  height: number
  quality: ExportQuality
  frames: number
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

export interface EncodedFile {
  blob: Blob
  extension: string
}

const MIME = { mp4: 'video/mp4', webm: 'video/webm' } as const

export function exportVideo(opts: VideoExportOptions): Promise<EncodedFile> {
  return opts.plan.method === 'webcodecs'
    ? exportWithWebCodecs({ ...opts, plan: opts.plan })
    : exportWithMediaRecorder({ ...opts, plan: opts.plan })
}

/**
 * Frame-exact path: each frame is rendered with the deterministic draw(),
 * encoded with WebCodecs and muxed with Mediabunny. Timing never depends on
 * how fast the device is.
 */
async function exportWithWebCodecs({
  comp,
  plan,
  width,
  height,
  frames,
  signal,
  onProgress,
}: VideoExportOptions & { plan: Extract<VideoPlan, { method: 'webcodecs' }> }): Promise<EncodedFile> {
  const mb = await import('./mediabunny')
  const { canvas, ctx } = createExportCanvas(width, height)
  const format = plan.container === 'mp4' ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' }) : new mb.WebMOutputFormat()
  const output = new mb.Output({ format, target: new mb.BufferTarget() })
  const source = new mb.CanvasSource(canvas, {
    codec: plan.codec as VideoCodecId,
    quality: mb.QUALITY_HIGH,
    keyFrameInterval: 1,
  })
  output.addVideoTrack(source, { frameRate: VIDEO_FPS })

  try {
    await output.start()
    for (let i = 0; i < frames; i++) {
      throwIfAborted(signal)
      drawCompositionFrame(ctx, comp, i, VIDEO_FPS)
      // Resolves when the encoder is ready for more (backpressure).
      await source.add(i / VIDEO_FPS, 1 / VIDEO_FPS)
      onProgress?.(((i + 1) / frames) * 0.97)
      if (i % 3 === 0) await nextTask()
    }
    throwIfAborted(signal)
    await output.finalize()
  } catch (err) {
    if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel().catch(() => {})
    throw err
  }
  onProgress?.(1)
  const buffer = output.target.buffer
  if (!buffer) throw new Error('Encoder produced no data.')
  return { blob: new Blob([buffer], { type: MIME[plan.container] }), extension: plan.container }
}

const sleepUntil = (at: number) => new Promise((r) => setTimeout(r, Math.max(0, at - performance.now())))

/**
 * Fallback for browsers without WebCodecs: records an offscreen canvas with
 * MediaRecorder. Frames are still rendered deterministically, but MediaRecorder
 * timestamps them by wall clock, so we have to render in real time. On a slow
 * or backgrounded device frames can be duplicated or dropped.
 */
async function exportWithMediaRecorder({
  comp,
  plan,
  width,
  height,
  quality,
  frames,
  signal,
  onProgress,
}: VideoExportOptions & { plan: Extract<VideoPlan, { method: 'mediarecorder' }> }): Promise<EncodedFile> {
  const { canvas, ctx } = createExportCanvas(width, height)
  const stream = canvas.captureStream(0)
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
  const recorder = new MediaRecorder(stream, {
    mimeType: plan.mimeType,
    videoBitsPerSecond: quality === '1080p' ? 8_000_000 : 5_000_000,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve()
    recorder.onerror = (e) => reject((e as unknown as { error?: Error }).error ?? new Error('Recording failed.'))
  })

  const frameMs = 1000 / VIDEO_FPS
  try {
    drawCompositionFrame(ctx, comp, 0, VIDEO_FPS)
    recorder.start(250)
    const t0 = performance.now()
    for (let i = 0; i < frames; i++) {
      throwIfAborted(signal)
      await sleepUntil(t0 + i * frameMs)
      drawCompositionFrame(ctx, comp, i, VIDEO_FPS)
      track.requestFrame()
      onProgress?.(((i + 1) / frames) * 0.95)
    }
    await sleepUntil(t0 + frames * frameMs)
  } finally {
    if (recorder.state !== 'inactive') recorder.stop()
    await stopped.catch(() => {})
    track.stop()
  }
  throwIfAborted(signal)
  const recorded = new Blob(chunks, { type: plan.mimeType.split(';')[0] })
  // Recorded files often lack a duration/seek index; remuxing (no re-encode) fixes that.
  const blob = await remux(recorded, plan.container).catch(() => recorded)
  onProgress?.(1)
  return { blob, extension: plan.container }
}

async function remux(blob: Blob, container: 'mp4' | 'webm'): Promise<Blob> {
  const mb = await import('./mediabunnyRemux')
  const input = new mb.Input({ source: new mb.BlobSource(blob), formats: [mb.WEBM, mb.MP4] })
  const output = new mb.Output({
    format: container === 'mp4' ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' }) : new mb.WebMOutputFormat(),
    target: new mb.BufferTarget(),
  })
  const conversion = await mb.Conversion.init({ input, output })
  if (!conversion.isValid) throw new Error('Cannot remux recording')
  await conversion.execute()
  const buffer = output.target.buffer
  if (!buffer) throw new Error('Remux produced no data')
  return new Blob([buffer], { type: MIME[container] })
}
