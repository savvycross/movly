export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const clamp01 = (v: number) => clamp(v, 0, 1)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Maps `v` from [inMin, inMax] to [outMin, outMax] without clamping. */
export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  inMax === inMin ? outMax : outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin)

/** Deterministic pseudo-random number in [0, 1) for an integer seed (mulberry32 step). */
export function hash(seed: number): number {
  let t = (Math.floor(seed) + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** `hash` for two integer seeds, e.g. (frame, index). */
export const hash2 = (a: number, b: number) => hash(Math.floor(a) * 73856093 + Math.floor(b) * 19349663)
