/**
 * Pure export planning: output sizes, frame counts, file names and codec
 * choice. No browser APIs here so it can be unit-tested.
 */
import { FPS, totalFrames, type AspectRatio } from '../engine'

export type ExportFormat = 'video' | 'gif'
export type ExportQuality = '720p' | '1080p'

export const VIDEO_FPS = FPS
export const GIF_FPS = 15
export const GIF_MAX_WIDTH = 720

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

/**
 * Pixel size of the exported file. 1080p = the full stage (e.g. 1080×1920),
 * 720p = scaled so the short side is 720. GIFs are capped at 720px wide.
 * Video sizes are even (required by H.264).
 */
export function exportSize(
  stage: { width: number; height: number },
  format: ExportFormat,
  quality: ExportQuality,
): { width: number; height: number } {
  if (format === 'gif') {
    const k = Math.min(1, GIF_MAX_WIDTH / stage.width)
    return { width: Math.round(stage.width * k), height: Math.round(stage.height * k) }
  }
  const k = quality === '1080p' ? 1 : 720 / Math.min(stage.width, stage.height)
  return { width: even(stage.width * k), height: even(stage.height * k) }
}

export function exportFps(format: ExportFormat): number {
  return format === 'gif' ? GIF_FPS : VIDEO_FPS
}

/** Number of frames in the exported file for a clip of `durationSeconds`. */
export function exportFrameCount(durationSeconds: number, format: ExportFormat): number {
  return totalFrames(durationSeconds, exportFps(format))
}

/** e.g. `movly-kinetic-title-9x16.mp4` */
export function exportFileName(templateId: string, aspect: AspectRatio, extension: string): string {
  return `movly-${templateId}-${aspect.replace(':', 'x')}.${extension.replace(/^\./, '')}`
}

/**
 * GIF frame delays are whole centiseconds, so 15fps (6.67cs) can't be exact per
 * frame. Distribute 6s and 7s so the total matches the real duration.
 */
export function gifDelaysCs(frames: number, fps: number = GIF_FPS): number[] {
  return Array.from({ length: frames }, (_, i) => Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps))
}

export type VideoCodecId = 'avc' | 'vp9' | 'vp8' | 'av1'

export interface VideoCaps {
  /** WebCodecs encoders usable at the target size (empty if WebCodecs is missing). */
  webcodecs: VideoCodecId[]
  /** First supported MediaRecorder MIME types, or null. */
  recorderMp4: string | null
  recorderWebm: string | null
}

export type VideoPlan =
  | { method: 'webcodecs'; container: 'mp4' | 'webm'; codec: VideoCodecId }
  | { method: 'mediarecorder'; container: 'mp4' | 'webm'; mimeType: string }

/**
 * Preference: MP4/H.264 via WebCodecs → WebM (VP9/VP8/AV1) via WebCodecs →
 * MediaRecorder MP4 → MediaRecorder WebM. Null if the browser can't encode video.
 */
export function chooseVideoPlan(caps: VideoCaps): VideoPlan | null {
  if (caps.webcodecs.includes('avc')) return { method: 'webcodecs', container: 'mp4', codec: 'avc' }
  const webm = (['vp9', 'vp8', 'av1'] as const).find((c) => caps.webcodecs.includes(c))
  if (webm) return { method: 'webcodecs', container: 'webm', codec: webm }
  if (caps.recorderMp4) return { method: 'mediarecorder', container: 'mp4', mimeType: caps.recorderMp4 }
  if (caps.recorderWebm) return { method: 'mediarecorder', container: 'webm', mimeType: caps.recorderWebm }
  return null
}

const CODEC_LABEL: Record<VideoCodecId, string> = { avc: 'H.264', vp9: 'VP9', vp8: 'VP8', av1: 'AV1' }

/** Short human label, e.g. "MP4 · H.264". */
export function describePlan(plan: VideoPlan): string {
  const container = plan.container.toUpperCase().replace('WEBM', 'WebM')
  if (plan.method === 'webcodecs') return `${container} · ${CODEC_LABEL[plan.codec]}`
  return `${container} · recorded`
}
