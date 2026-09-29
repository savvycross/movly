/** Input limits shared by the sidebar controls and saved-settings validation. */
export const HEADLINE_MAX = 60
export const SUBLINE_MAX = 100
export const DURATION_RANGE = { min: 2, max: 15, step: 0.5 }
export const SPEED_RANGE = { min: 0.5, max: 2, step: 0.05 }

/** Shown in previews while the headline is empty, so templates never look broken. */
export const HEADLINE_PLACEHOLDER = 'Your headline here'

/** Params for rendering: substitutes the placeholder when the headline is blank. */
export function withHeadlinePlaceholder<T extends { headline: string }>(params: T): T {
  return params.headline.trim() ? params : { ...params, headline: HEADLINE_PLACEHOLDER }
}
