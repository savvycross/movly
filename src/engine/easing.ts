/** An easing maps linear progress t ∈ [0, 1] to eased progress (may overshoot for back/elastic). */
export type Easing = (t: number) => number

// Formulas follow https://easings.net.
const c1 = 1.70158
const c2 = c1 * 1.525
const c3 = c1 + 1
const c4 = (2 * Math.PI) / 3
const c5 = (2 * Math.PI) / 4.5

export const linear: Easing = (t) => t

export const easeInQuad: Easing = (t) => t * t
export const easeOutQuad: Easing = (t) => 1 - (1 - t) * (1 - t)
export const easeInOutQuad: Easing = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

export const easeInCubic: Easing = (t) => t * t * t
export const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3
export const easeInOutCubic: Easing = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export const easeInExpo: Easing = (t) => (t === 0 ? 0 : 2 ** (10 * t - 10))
export const easeOutExpo: Easing = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t))
export const easeInOutExpo: Easing = (t) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2

export const easeInBack: Easing = (t) => c3 * t * t * t - c1 * t * t
export const easeOutBack: Easing = (t) => 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
export const easeInOutBack: Easing = (t) =>
  t < 0.5
    ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2
    : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2

export const easeInElastic: Easing = (t) =>
  t === 0 ? 0 : t === 1 ? 1 : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * c4)
export const easeOutElastic: Easing = (t) =>
  t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
export const easeInOutElastic: Easing = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1

export const easeOutBounce: Easing = (t) => {
  const n1 = 7.5625
  const d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}
export const easeInBounce: Easing = (t) => 1 - easeOutBounce(1 - t)
export const easeInOutBounce: Easing = (t) =>
  t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2

/** All easings by name, handy for data-driven keyframes or UI pickers. */
export const easings = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
} satisfies Record<string, Easing>

export type EasingName = keyof typeof easings
