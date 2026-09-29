export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const clamp01 = (v: number) => clamp(v, 0, 1)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Maps `v` from [inMin, inMax] to [outMin, outMax] without clamping. */
export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  inMax === inMin ? outMax : outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin)
