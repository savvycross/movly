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
  /** Playback speed multiplier (1 = normal). The engine already applies it to `time`. */
  speed: number
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
  /** Length in seconds at speed 1. */
  defaultDuration: number
  defaultColors: TemplateColors
  /**
   * Draws one frame onto a 1920×1080 logical stage (see `STAGE` in render.ts).
   * Must be a pure function of (time, params): no internal state, no
   * randomness without a fixed seed. That keeps scrubbing and export
   * frame-accurate.
   *
   * @param time Seconds since start, in [0, defaultDuration], already speed-adjusted.
   */
  draw(ctx: CanvasRenderingContext2D, time: number, params: TemplateParams): void
}
