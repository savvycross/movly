import type { StageInfo } from './types'

export interface StageLayout {
  W: number
  H: number
  /** The shorter side. Size things by this so they scale across ratios. */
  U: number
  /** Safe margin from every edge. */
  M: number
  cx: number
  cy: number
  /** Width/height inside the safe margins. */
  safeW: number
  safeH: number
  portrait: boolean
  landscape: boolean
}

/** Common measurements for laying a template out relative to its stage. */
export function stageLayout(stage: Pick<StageInfo, 'width' | 'height'>): StageLayout {
  const W = stage.width
  const H = stage.height
  const U = Math.min(W, H)
  const M = Math.round(U * 0.08)
  return {
    W,
    H,
    U,
    M,
    cx: W / 2,
    cy: H / 2,
    safeW: W - M * 2,
    safeH: H - M * 2,
    portrait: H > W * 1.05,
    landscape: W > H * 1.05,
  }
}
