/**
 * Mediabunny writing side. Named imports let the bundler tree-shake the
 * library; callers load this module lazily (`import('./mediabunny')`) so none
 * of it is downloaded until the user exports.
 */
export {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny'
