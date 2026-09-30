/** Frame rate every Movly composition renders (and exports) at. */
export const FPS = 30

/** Number of frames in a composition of `durationSeconds`. */
export function totalFrames(durationSeconds: number, fps: number = FPS): number {
  return Math.max(1, Math.round(durationSeconds * fps))
}

/** Converts a playback frame index into speed-adjusted template time (seconds). */
export function frameToTime(frame: number, speed: number, fps: number = FPS): number {
  return (frame / fps) * speed
}

/**
 * Lets a template author its intro/outro against a fixed design length.
 * If the stage is shorter than `designDuration`, time is compressed so every
 * animation still completes; if it's longer, the extra time is hold.
 * Returns local time `t` and local duration `D` (always ≥ designDuration).
 */
export function fitTimeline(time: number, duration: number, designDuration: number): { t: number; D: number } {
  const k = duration > 0 ? Math.min(1, duration / designDuration) : 1
  return { t: time / k, D: duration / k }
}

/**
 * Maps cues authored in a template's local (fitTimeline) time back to stage
 * time, dropping any that fall outside the clip. Durations scale too.
 */
export function cuesToStageTime<T extends { time: number; duration?: number }>(
  cues: T[],
  duration: number,
  designDuration: number,
): T[] {
  const k = duration > 0 ? Math.min(1, duration / designDuration) : 1
  return cues
    .map((c) => ({ ...c, time: c.time * k, ...(c.duration !== undefined ? { duration: c.duration * k } : {}) }))
    .filter((c) => c.time >= 0 && c.time <= duration)
    .sort((a, b) => a.time - b.time)
}

/** Formats a frame index as `SS:FF` (seconds:frames), e.g. frame 74 @ 30fps → `02:14`. */
export function formatTimecode(frame: number, fps: number = FPS): string {
  const safe = Math.max(0, Math.floor(frame))
  const seconds = Math.floor(safe / fps)
  const frames = safe % fps
  return `${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}
