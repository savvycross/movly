import type { Template } from './types'

/** Frame rate every Movly composition renders (and exports) at. */
export const FPS = 30

/** Number of frames a template occupies at the given speed. */
export function totalFrames(template: Template, speed: number, fps: number = FPS): number {
  return Math.max(1, Math.round((template.defaultDuration / speed) * fps))
}

/** Converts a playback frame index into speed-adjusted template time (seconds). */
export function frameToTime(frame: number, speed: number, fps: number = FPS): number {
  return (frame / fps) * speed
}

/** Formats a frame index as `SS:FF` (seconds:frames), e.g. frame 74 @ 30fps → `02:14`. */
export function formatTimecode(frame: number, fps: number = FPS): string {
  const safe = Math.max(0, Math.floor(frame))
  const seconds = Math.floor(safe / fps)
  const frames = safe % fps
  return `${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}
