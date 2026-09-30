import { getStage, type AspectRatio, type Template, type TemplateParams } from '../engine'
import { planBeat } from './beats'
import type { AudioPlan, AudioSettings } from './types'

export interface AudioComposition {
  template: Template
  params: TemplateParams
  aspect: AspectRatio
  /** Clip length in seconds. */
  duration: number
}

export const MUSIC_FADE_OUT = 0.5

/**
 * The full soundtrack as data, on the video's real-time clock. Template cues
 * come in template time, so they're divided by speed exactly like frames are
 * (frameToTime multiplies by speed). Returns null when sound is off.
 *
 * @param measure a 2D context used only for text measurement by template cues
 * @param uploadOffset where the uploaded track starts (only used when music = 'upload')
 */
export function planAudio(
  comp: AudioComposition,
  settings: AudioSettings,
  measure: CanvasRenderingContext2D,
  uploadOffset: number | null = null,
): AudioPlan | null {
  if (!settings.enabled) return null
  const { template, params, aspect, duration } = comp
  const stage = getStage(aspect, duration, params.speed)
  const cues = settings.sfxVolume > 0 ? (template.sound?.(measure, params, stage) ?? []) : []
  const sfx = cues
    .map((c, i) => ({
      time: c.time / params.speed,
      kind: c.kind,
      gain: c.gain ?? 1,
      pitch: c.pitch ?? 1,
      duration: c.duration !== undefined ? c.duration / params.speed : undefined,
      seed: i + 1,
    }))
    .filter((c) => c.time >= 0 && c.time < duration)

  const music = settings.musicVolume > 0 ? settings.music : 'none'
  return {
    duration,
    sfx,
    notes: music !== 'none' && music !== 'upload' ? planBeat(music, duration) : [],
    upload: music === 'upload' && uploadOffset !== null ? { offset: uploadOffset } : null,
    sfxGain: settings.sfxVolume,
    musicGain: settings.musicVolume,
    fadeOut: Math.min(MUSIC_FADE_OUT, duration / 4),
  }
}
