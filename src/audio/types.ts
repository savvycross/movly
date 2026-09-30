import type { SfxKind } from '../engine'

export const BEAT_STYLES = ['chill', 'hype', 'corporate', 'minimal'] as const
export type BeatStyle = (typeof BEAT_STYLES)[number]

/** Background music: nothing, one of the generated beats, or the user's own file. */
export type MusicChoice = 'none' | BeatStyle | 'upload'

export interface AudioSettings {
  /** Master switch for everything (preview and export). */
  enabled: boolean
  /** 0–1 */
  sfxVolume: number
  music: MusicChoice
  /** 0–1 */
  musicVolume: number
}

export const DEFAULT_AUDIO: AudioSettings = { enabled: true, sfxVolume: 0.8, music: 'none', musicVolume: 0.6 }

/** An uploaded track, decoded in memory only (never stored). */
export interface UploadedMusic {
  buffer: AudioBuffer
  name: string
  /** Where in the track the video starts, seconds. */
  offset: number
}

/** A sound effect placed on the video's real-time clock. */
export interface PlannedSfx {
  time: number
  kind: SfxKind
  gain: number
  pitch: number
  duration?: number
  /** Stable per-cue seed for any randomness in the synth. */
  seed: number
}

export type Instrument = 'kick' | 'snare' | 'clap' | 'hat' | 'openhat' | 'shaker' | 'bass' | 'sub' | 'pad' | 'pluck'

export interface BeatNote {
  time: number
  instrument: Instrument
  /** Hz for pitched instruments. */
  freq?: number
  duration: number
  gain: number
}

/** Everything needed to render the soundtrack, in real (video) seconds. */
export interface AudioPlan {
  duration: number
  sfx: PlannedSfx[]
  notes: BeatNote[]
  /** Uploaded-music window; the buffer itself is passed separately. */
  upload: { offset: number } | null
  sfxGain: number
  musicGain: number
  /** Music fade-out length at the end, seconds. */
  fadeOut: number
}
