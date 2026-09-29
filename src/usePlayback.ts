import { useCallback, useEffect, useRef, useState } from 'react'
import { FPS } from './timing'

/**
 * Frame-accurate playback clock driven by requestAnimationFrame.
 * `totalFrames` is the composition length; playback loops at the end.
 */
export function usePlayback(totalFrames: number, fps: number = FPS) {
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const frameRef = useRef(0)
  // Wall-clock anchor for the current play run; reset on seek so playback resumes from the new frame.
  const anchorRef = useRef<{ time: number; frame: number } | null>(null)

  const commit = useCallback((f: number) => {
    frameRef.current = f
    setFrame(f)
  }, [])

  useEffect(() => {
    anchorRef.current = null
    if (!playing) return
    let raf = 0
    const tick = (now: number) => {
      if (!anchorRef.current) anchorRef.current = { time: now, frame: frameRef.current }
      const elapsed = (now - anchorRef.current.time) / 1000
      const next = Math.floor(anchorRef.current.frame + elapsed * fps) % totalFrames
      if (next !== frameRef.current) commit(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, totalFrames, fps, commit])

  const toggle = useCallback(() => setPlaying((p) => !p), [])

  const seek = useCallback(
    (f: number) => {
      anchorRef.current = null
      commit(Math.min(Math.max(0, Math.round(f)), totalFrames - 1))
    },
    [totalFrames, commit],
  )

  return { frame, playing, toggle, seek }
}
