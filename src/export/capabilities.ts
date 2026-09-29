import type { VideoCaps, VideoCodecId } from './plan'

const RECORDER_MP4 = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']
const RECORDER_WEBM = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

/** Probes what this browser can encode at the given size (30fps). */
export async function detectVideoCaps(width: number, height: number): Promise<VideoCaps> {
  const webcodecs: VideoCodecId[] = []
  if (typeof VideoEncoder !== 'undefined') {
    const { canEncodeVideo, QUALITY_HIGH } = await import('./mediabunny')
    for (const codec of ['avc', 'vp9', 'vp8', 'av1'] as const) {
      try {
        if (await canEncodeVideo(codec, { width, height, frameRate: 30, quality: QUALITY_HIGH })) webcodecs.push(codec)
      } catch {
        // Treat probe failures as unsupported.
      }
    }
  }
  const canRecord =
    typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
  const pick = (types: string[]) => (canRecord ? (types.find((t) => MediaRecorder.isTypeSupported(t)) ?? null) : null)
  return { webcodecs, recorderMp4: pick(RECORDER_MP4), recorderWebm: pick(RECORDER_WEBM) }
}
