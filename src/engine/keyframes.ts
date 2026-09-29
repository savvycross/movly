import { linear, type Easing } from './easing'
import { clamp01, lerp } from './math'

/**
 * Eased progress of an animation that runs from `start` to `end` seconds.
 * Returns 0 before start, 1 after end.
 */
export function tween(time: number, start: number, end: number, ease: Easing = linear): number {
  if (end <= start) return time >= end ? 1 : 0
  return ease(clamp01((time - start) / (end - start)))
}

export type KeyframeValue = number | readonly number[]

export interface Keyframe<V extends KeyframeValue = number> {
  /** Time in seconds. */
  time: number
  value: V
  /** Easing for the segment that *arrives* at this keyframe. Defaults to linear. */
  ease?: Easing
}

/**
 * Samples a keyframe track at `time`. Values can be numbers or equal-length
 * number arrays (points, RGB, …). Holds the first/last value outside the range.
 * Keyframes must be sorted by time.
 */
export function interpolate<V extends KeyframeValue>(keyframes: readonly Keyframe<V>[], time: number): V {
  if (keyframes.length === 0) throw new Error('interpolate: no keyframes')
  const first = keyframes[0]
  if (time <= first.time) return first.value
  for (let i = 1; i < keyframes.length; i++) {
    const to = keyframes[i]
    if (time < to.time) {
      const from = keyframes[i - 1]
      const t = (to.ease ?? linear)((time - from.time) / (to.time - from.time))
      return mix(from.value, to.value, t)
    }
  }
  return keyframes[keyframes.length - 1].value
}

function mix<V extends KeyframeValue>(a: V, b: V, t: number): V {
  if (typeof a === 'number') return lerp(a, b as number, t) as V
  const bb = b as readonly number[]
  return a.map((v, i) => lerp(v, bb[i], t)) as unknown as V
}
