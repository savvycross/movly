/**
 * Mediabunny writing side. Named imports let the bundler tree-shake the
 * library; callers load this module lazily (`import('./mediabunny')`) so none
 * of it is downloaded until the user exports.
 */
export { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat, canEncodeVideo } from 'mediabunny'
