export interface TemplateColors {
  bg: string
  primary: string
  accent: string
}

/** User-controlled inputs every template receives. */
export interface TemplateParams {
  headline: string
  subline: string
  colors: TemplateColors
  /** CSS font-family name, e.g. "Inter". See `src/engine/fonts.ts`. */
  font: string
  logo?: CanvasImageSource | null
  /** Animation speed multiplier (1 = normal). The engine already applies it to `time`. */
  speed: number
}

/**
 * The surface a frame is drawn on. Templates must lay out relative to
 * `width`/`height` (never hard-coded coordinates) so they work at every aspect ratio.
 */
export interface StageInfo {
  /** Logical stage width in px (e.g. 1920 for 16:9, 1080 for 9:16). */
  width: number
  /** Logical stage height in px. */
  height: number
  /** Composition length in template seconds (user duration × speed). `time` runs 0 → duration. */
  duration: number
}

export type TemplateCategory = 'Titles' | 'Lower thirds' | 'Logo reveals' | 'Social' | 'Transitions'

/**
 * Shape of a template module. Each file in `src/templates/` exports these
 * names directly (`export const id = ...`, `export function draw(...)`).
 */
export interface Template {
  id: string
  name: string
  category: TemplateCategory
  /** Suggested length in seconds; the user can change it with the duration slider. */
  defaultDuration: number
  defaultColors: TemplateColors
  /**
   * Draws one frame. Must be a pure function of its arguments: no internal
   * state, no unseeded randomness. That keeps scrubbing and export frame-accurate.
   *
   * @param time Template seconds in [0, stage.duration], already speed-adjusted.
   * @param stage Stage size and duration; lay everything out relative to it.
   */
  draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams, stage: StageInfo): void
}
