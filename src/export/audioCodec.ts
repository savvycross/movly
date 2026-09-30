/**
 * Picks the audio codec for a container: AAC for MP4, Opus for WebM.
 * Many browsers (Firefox, Chrome on Linux) can't encode AAC natively, so we
 * lazily register Mediabunny's free WASM AAC encoder (FFmpeg, MPL-2.0) when needed.
 */
export type AudioCodecId = 'aac' | 'opus'

let aacRegistered = false

export async function pickAudioCodec(container: 'mp4' | 'webm'): Promise<AudioCodecId | null> {
  const { canEncodeAudio, QUALITY_HIGH } = await import('./mediabunny')
  const opts = { numberOfChannels: 2, sampleRate: 48_000, quality: QUALITY_HIGH }
  if (container === 'webm') return (await canEncodeAudio('opus', opts).catch(() => false)) ? 'opus' : null
  if (await canEncodeAudio('aac', opts).catch(() => false)) return 'aac'
  if (!aacRegistered) {
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder')
    registerAacEncoder()
    aacRegistered = true
  }
  if (await canEncodeAudio('aac', opts).catch(() => false)) return 'aac'
  // Last resort: Opus is also valid inside MP4.
  return (await canEncodeAudio('opus', opts).catch(() => false)) ? 'opus' : null
}
