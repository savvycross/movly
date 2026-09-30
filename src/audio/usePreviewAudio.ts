import { useCallback, useEffect, useRef, useState } from 'react'
import { schedulePlan, type ScheduledMix } from './synth'
import type { AudioPlan } from './types'

interface PreviewAudioOptions {
  plan: AudioPlan | null
  upload: AudioBuffer | null
  playing: boolean
  /** Changes whenever the playhead jumps (play, seek, loop). */
  epoch: number
  /** Current playhead in video seconds. */
  getTime: () => number
}

/**
 * Plays the soundtrack in sync with the preview. Browsers only allow audio
 * after a user gesture, so nothing sounds until `unlock()` is called from a
 * click/keypress (the play button, Space, or "tap for sound").
 */
export function usePreviewAudio({ plan, upload, playing, epoch, getTime }: PreviewAudioOptions) {
  const ctxRef = useRef<AudioContext | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const getTimeRef = useRef(getTime)
  getTimeRef.current = getTime

  /** Must be called synchronously inside a user gesture handler. */
  const unlock = useCallback(() => {
    if (typeof AudioContext === 'undefined') return
    if (!ctxRef.current) ctxRef.current = new AudioContext({ latencyHint: 'interactive' })
    void ctxRef.current.resume()
    setUnlocked(true)
  }, [])

  useEffect(() => {
    const ctx = ctxRef.current
    if (!playing || !unlocked || !ctx || !plan) return
    let mix: ScheduledMix | null = null
    // Small lead so the first cue isn't clipped; the audio clock then drives itself.
    mix = schedulePlan(ctx, ctx.destination, plan, { from: getTimeRef.current(), at: ctx.currentTime + 0.03, upload })
    return () => mix?.stop()
  }, [playing, epoch, plan, upload, unlocked])

  useEffect(() => () => void ctxRef.current?.close(), [])

  return { unlock, unlocked }
}
