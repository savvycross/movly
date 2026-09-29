/** Frame rate every Movly composition renders at. */
export const FPS = 30

/** Default composition length in seconds (templates will override this later). */
export const DEFAULT_DURATION_SECONDS = 5

/** Formats a frame index as `SS:FF` (seconds:frames), e.g. frame 74 @ 30fps → `02:14`. */
export function formatTimecode(frame: number, fps: number = FPS): string {
  const safe = Math.max(0, Math.floor(frame))
  const seconds = Math.floor(safe / fps)
  const frames = safe % fps
  return `${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}
