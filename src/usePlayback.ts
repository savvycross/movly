import { useCallback, useEffect, useRef, useState } from 'react'
import { FPS } from './engine'

/**
 * Frame-accurate playback clock driven by requestAnimationFrame.
 * `totalFrames` is the composition length. With `loop` it wraps to 0 at the
 * end, otherwise it stops on the last frame.
 */
export function usePlayback(
  totalFrames: number,
  loop: boolean,
  { autoplay = false, initialFrame = 0, fps = FPS }: { autoplay?: boolean; initialFrame?: number; fps?: number } = {},
) {
  const [frame, setFrame] = useState(initialFrame)
  const [playing, setPlaying] = useState(autoplay)
  const frameRef = useRef(initialFrame)
  /**
   * Bumps whenever the timeline jumps (play starts, seek, loop wrap), so
   * anything following playback, like audio, knows to reschedule.
   */
  const [epoch, setEpoch] = useState(0)
  const bump = useCallback(() => setEpoch((e) => e + 1), [])
  // Wall-clock anchor for the current play run; reset on seek so playback resumes from the new frame.
  const anchorRef = useRef<{ time: number; frame: number } | null>(null)
  const lastFrame = totalFrames - 1

  const commit = useCallback((f: number) => {
    frameRef.current = f
    setFrame(f)
  }, [])

  // Keep the playhead in range when the composition gets shorter (e.g. speed change).
  useEffect(() => {
    if (frameRef.current > lastFrame) commit(lastFrame)
    anchorRef.current = null
  }, [lastFrame, commit])

  useEffect(() => {
    anchorRef.current = null
    if (!playing) return
    let raf = 0
    const tick = (now: number) => {
      if (!anchorRef.current) anchorRef.current = { time: now, frame: frameRef.current }
      const elapsed = (now - anchorRef.current.time) / 1000
      let next = Math.floor(anchorRef.current.frame + elapsed * fps)
      if (next > lastFrame) {
        if (!loop) {
          commit(lastFrame)
          setPlaying(false)
          return
        }
        next %= totalFrames
        bump()
      }
      if (next !== frameRef.current) commit(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, totalFrames, lastFrame, loop, fps, commit, bump])

  const toggle = useCallback(() => {
    // Pressing play on the final frame restarts from the top.
    if (!playing && frameRef.current >= lastFrame) commit(0)
    if (!playing) bump()
    setPlaying(!playing)
  }, [playing, lastFrame, commit, bump])

  const seek = useCallback(
    (f: number) => {
      anchorRef.current = null
      commit(Math.min(Math.max(0, Math.round(f)), lastFrame))
      bump()
    },
    [lastFrame, commit, bump],
  )

  const pause = useCallback(() => setPlaying(false), [])
  const play = useCallback(() => {
    bump()
    setPlaying(true)
  }, [bump])

  /** Current playhead in frames, readable without re-rendering. */
  const getFrame = useCallback(() => frameRef.current, [])

  return { frame, playing, toggle, seek, pause, play, epoch, getFrame }
}
