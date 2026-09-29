import { clamp01, lerp } from './math'

/** Parses `#rgb` / `#rrggbb` into [r, g, b] (0–255). */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `hex` with the given alpha as an `rgba()` string. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`
}

/** Linear blend between two hex colors, returned as `rgb()`. */
export function mixColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const [r, g, bl] = ca.map((v, i) => Math.round(lerp(v, cb[i], clamp01(t))))
  return `rgb(${r}, ${g}, ${bl})`
}
