/// <reference lib="webworker" />
import { GIFEncoder, applyPalette, quantize, type GIFStream, type Palette } from 'gifenc'

/**
 * GIF encoding off the main thread. Protocol:
 *   → { type: 'palette', samples }   build one global palette from sample frames
 *   → { type: 'frame', rgba, width, height, delayMs }
 *   → { type: 'finish' }             ← { type: 'done', bytes }
 * Every message is acknowledged with { type: 'ack' } for backpressure.
 */
let palette: Palette | null = null
let encoder: GIFStream | null = null
let first = true

self.onmessage = (e: MessageEvent) => {
  const msg = e.data
  try {
    if (msg.type === 'palette') {
      palette = quantize(msg.samples, 256, { format: 'rgb565' })
      encoder = GIFEncoder()
      first = true
      self.postMessage({ type: 'ack' })
    } else if (msg.type === 'frame') {
      if (!encoder || !palette) throw new Error('palette must be sent before frames')
      const index = applyPalette(msg.rgba, palette, 'rgb565')
      // Global palette + loop forever on the first frame; later frames reuse it.
      encoder.writeFrame(index, msg.width, msg.height, first ? { palette, delay: msg.delayMs, repeat: 0 } : { delay: msg.delayMs })
      first = false
      self.postMessage({ type: 'ack' })
    } else if (msg.type === 'finish') {
      if (!encoder) throw new Error('nothing to finish')
      encoder.finish()
      const bytes = encoder.bytes()
      self.postMessage({ type: 'done', bytes }, [bytes.buffer])
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
