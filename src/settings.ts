import { ASPECT_RATIO_IDS, FONTS, clamp, type AspectRatio, type TemplateColors } from './engine'
import { DURATION_RANGE, HEADLINE_MAX, SPEED_RANGE, SUBLINE_MAX } from './limits'

/** What we remember between visits. The logo is deliberately NOT stored. */
export interface SavedSettings {
  templateId: string
  headline: string
  subline: string
  /** Custom colors, or null to use each template's defaults. */
  colors: TemplateColors | null
  font: string
  aspect: AspectRatio
  speed: number
  duration: number
}

export const SETTINGS_KEY = 'movly:settings:v1'

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const snap = (v: number, { min, max, step }: { min: number; max: number; step: number }) =>
  clamp(Math.round((v - min) / step) * step + min, min, max)

/**
 * Validates stored data field by field: anything missing, stale (e.g. a removed
 * template) or tampered with is dropped, and the app falls back to its default.
 */
export function parseSettings(raw: unknown, templateIds: readonly string[]): Partial<SavedSettings> {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  const out: Partial<SavedSettings> = {}
  if (typeof r.templateId === 'string' && templateIds.includes(r.templateId)) out.templateId = r.templateId
  if (typeof r.headline === 'string') out.headline = r.headline.slice(0, HEADLINE_MAX)
  if (typeof r.subline === 'string') out.subline = r.subline.slice(0, SUBLINE_MAX)
  if (r.colors === null) out.colors = null
  else if (r.colors && typeof r.colors === 'object') {
    const c = r.colors as Record<string, unknown>
    if (isHex(c.bg) && isHex(c.primary) && isHex(c.accent)) out.colors = { bg: c.bg, primary: c.primary, accent: c.accent }
  }
  if (typeof r.font === 'string' && (FONTS as readonly string[]).includes(r.font)) out.font = r.font
  if (typeof r.aspect === 'string' && (ASPECT_RATIO_IDS as string[]).includes(r.aspect)) out.aspect = r.aspect as AspectRatio
  if (isNum(r.speed)) out.speed = snap(r.speed, SPEED_RANGE)
  if (isNum(r.duration)) out.duration = snap(r.duration, DURATION_RANGE)
  return out
}

/** Storage can be missing or throw (private mode, blocked site data); never let that break the app. */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadSettings(templateIds: readonly string[], store: Storage | null = storage()): Partial<SavedSettings> {
  try {
    const text = store?.getItem(SETTINGS_KEY)
    return text ? parseSettings(JSON.parse(text), templateIds) : {}
  } catch {
    return {}
  }
}

export function saveSettings(settings: SavedSettings, store: Storage | null = storage()): void {
  try {
    // Build the object explicitly so nothing else (like a logo) can sneak in.
    const { templateId, headline, subline, colors, font, aspect, speed, duration } = settings
    store?.setItem(SETTINGS_KEY, JSON.stringify({ templateId, headline, subline, colors, font, aspect, speed, duration }))
  } catch {
    // Quota exceeded or storage disabled: settings just won't persist.
  }
}
