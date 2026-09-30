import { describe, expect, it } from 'vitest'
import { ASPECT_RATIO_IDS, type TemplateParams } from '../engine'
import { createMockContext } from '../templates/mockCanvas'
import { TEMPLATES, getTemplate } from '../templates'
import { PATTERNS, planBeat } from './beats'
import { planAudio } from './plan'
import { BEAT_STYLES, DEFAULT_AUDIO, type AudioSettings } from './types'

const params = (over: Partial<TemplateParams> = {}): TemplateParams => ({
  headline: 'Make it move',
  subline: 'Motion graphics, right in your browser',
  colors: { bg: '#000000', primary: '#ffffff', accent: '#ff0066' },
  font: 'Inter',
  logo: null,
  speed: 1,
  ...over,
})
const measure = () => createMockContext(1920, 1080).ctx
const fx: AudioSettings = { ...DEFAULT_AUDIO, music: 'none' }
const plan = (id: string, p = params(), duration = getTemplate(id).defaultDuration, aspect: '16:9' | '9:16' = '16:9') =>
  planAudio({ template: getTemplate(id), params: p, aspect, duration }, fx, measure())!

describe('template sound designs', () => {
  it.each(TEMPLATES.map((t) => [t.name, t] as const))('%s has cues inside the clip at every duration, speed and ratio', (_, t) => {
    expect(t.sound).toBeTypeOf('function')
    for (const aspect of ASPECT_RATIO_IDS)
      for (const duration of [2, t.defaultDuration, 12])
        for (const speed of [0.5, 1, 2]) {
          const p = planAudio({ template: t, params: params({ speed }), aspect, duration }, fx, measure())!
          expect(p.sfx.length).toBeGreaterThan(0)
          for (const s of p.sfx) {
            expect(s.time).toBeGreaterThanOrEqual(0)
            expect(s.time).toBeLessThan(duration)
            expect(Number.isFinite(s.gain) && Number.isFinite(s.pitch)).toBe(true)
          }
        }
  })

  it('is deterministic', () => {
    for (const t of TEMPLATES) expect(plan(t.id)).toEqual(plan(t.id))
  })

  it('follows speed: cues happen twice as early at 2× (until the clip ends)', () => {
    const at1 = plan('countdown', params({ speed: 1 }), 12)
    const at2 = plan('countdown', params({ speed: 2 }), 12)
    const hits1 = at1.sfx.filter((s) => s.kind === 'impact').map((s) => s.time)
    const hits2 = at2.sfx.filter((s) => s.kind === 'impact').map((s) => s.time)
    hits1.slice(0, 4).forEach((t, i) => expect(hits2[i]).toBeCloseTo(t / 2, 6))
  })

  it('follows duration: short clips compress the timeline like the animation does', () => {
    const full = plan('countdown', params(), 6).sfx.filter((s) => s.kind === 'impact').map((s) => s.time)
    const half = plan('countdown', params(), 3).sfx.filter((s) => s.kind === 'impact').map((s) => s.time)
    half.forEach((t, i) => expect(t).toBeCloseTo(full[i] / 2, 6))
  })

  it('Countdown hits on each number', () => {
    const hits = plan('countdown').sfx.filter((s) => s.kind === 'impact').map((s) => s.time)
    // Numbers appear at START + i * BEAT (0.15, 1.0, 1.85), then the title slam at 2.7.
    expect(hits.slice(0, 4).map((t) => +t.toFixed(3))).toEqual([0.15, 1, 1.85, 2.7])
  })

  it('Typewriter ticks once per typed character', () => {
    const p = params({ headline: 'Hello   world', subline: 'Hi there' })
    const ticks = plan('typewriter', p).sfx.filter((s) => s.kind === 'tick')
    expect(ticks).toHaveLength('Hello world'.length + 'Hi there'.length)
    // strictly increasing
    ticks.slice(1).forEach((s, i) => expect(s.time).toBeGreaterThan(ticks[i].time))
  })

  it('Bounce Pop pops per letter as it lands (thinned for long text)', () => {
    const letters = (text: string) => plan('bounce-pop', params({ headline: text, subline: '' })).sfx.filter((s) => s.kind === 'pop').length - 6
    expect(letters('Pop')).toBe(3)
    expect(letters('Make it move')).toBe(10)
    expect(letters('The quick brown fox jumps over the lazy dog again and again')).toBeLessThanOrEqual(28)
  })

  it('Kinetic Title hits once per stacked line', () => {
    const hits = (h: string) => plan('kinetic-title', params({ headline: h })).sfx.filter((s) => s.kind === 'pop' || s.kind === 'impact').length
    expect(hits('Make it move')).toBe(3)
    expect(hits('Go')).toBe(1)
  })
})

describe('beats', () => {
  it.each(BEAT_STYLES)('%s loops for exactly the clip length', (style) => {
    const notes = planBeat(style, 7.3)
    expect(notes.length).toBeGreaterThan(10)
    expect(Math.max(...notes.map((n) => n.time))).toBeLessThan(7.3)
    expect(notes[0].time).toBe(0)
    expect(planBeat(style, 7.3)).toEqual(notes)
    // Kick on the downbeat of every bar.
    const bar = (60 / PATTERNS[style].bpm) * 4
    for (let b = 0; b * bar < 7.3; b++) expect(notes.some((n) => n.instrument === 'kick' && Math.abs(n.time - b * bar) < 1e-9)).toBe(true)
  })
})

describe('planAudio', () => {
  const comp = { template: getTemplate('kinetic-title'), params: params(), aspect: '16:9' as const, duration: 5 }

  it('is null when sound is off', () => {
    expect(planAudio(comp, { ...DEFAULT_AUDIO, enabled: false }, measure())).toBeNull()
  })

  it('includes beat notes, volumes and a 0.5s fade', () => {
    const p = planAudio(comp, { enabled: true, sfxVolume: 0.3, music: 'hype', musicVolume: 0.7 }, measure())!
    expect(p.notes.length).toBeGreaterThan(0)
    expect(p.sfxGain).toBe(0.3)
    expect(p.musicGain).toBe(0.7)
    expect(p.fadeOut).toBe(0.5)
    expect(p.upload).toBeNull()
  })

  it('uses the uploaded track only when chosen and provided', () => {
    const up = { ...DEFAULT_AUDIO, music: 'upload' as const }
    expect(planAudio(comp, up, measure(), 12.5)!.upload).toEqual({ offset: 12.5 })
    expect(planAudio(comp, up, measure(), null)!.upload).toBeNull()
    expect(planAudio(comp, up, measure(), 3)!.notes).toEqual([])
  })

  it('muted effects produce no cues', () => {
    expect(planAudio(comp, { ...DEFAULT_AUDIO, sfxVolume: 0 }, measure())!.sfx).toEqual([])
  })
})
