import { describe, expect, it } from 'vitest'
import { easings } from './easing'
import { interpolate, tween } from './keyframes'
import { fitTimeline, formatTimecode, frameToTime, totalFrames } from './timing'
import { contrastRatio, hexToRgb, mixColor, readableOn, rotateHue, withAlpha } from './color'
import { hash } from './math'
import { getStage } from './render'
import { revealEnd } from './text'
import { TEMPLATES } from '../templates'

describe('easings', () => {
  it.each(Object.entries(easings))('%s starts at 0 and ends at 1', (_, ease) => {
    expect(ease(0)).toBeCloseTo(0, 6)
    expect(ease(1)).toBeCloseTo(1, 6)
  })

  it('InOut variants hit the midpoint at t=0.5', () => {
    for (const [name, ease] of Object.entries(easings)) {
      if (name.startsWith('easeInOut')) expect(ease(0.5), name).toBeCloseTo(0.5, 6)
    }
  })

  it('back overshoots, cubic does not', () => {
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(easings.easeOutBack))).toBeGreaterThan(1)
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(easings.easeOutCubic))).toBeLessThanOrEqual(1)
  })
})

describe('tween', () => {
  it('clamps outside the range and eases inside', () => {
    expect(tween(-1, 0, 2)).toBe(0)
    expect(tween(5, 0, 2)).toBe(1)
    expect(tween(1, 0, 2)).toBe(0.5)
    expect(tween(1, 0, 2, easings.easeInQuad)).toBe(0.25)
  })
})

describe('interpolate', () => {
  const track = [
    { time: 0, value: 0 },
    { time: 1, value: 100 },
    { time: 2, value: 50, ease: easings.easeInQuad },
  ]

  it('holds the ends', () => {
    expect(interpolate(track, -5)).toBe(0)
    expect(interpolate(track, 9)).toBe(50)
  })

  it('lerps between keyframes using the arriving keyframe ease', () => {
    expect(interpolate(track, 0.5)).toBe(50)
    expect(interpolate(track, 1.5)).toBe(100 - 50 * 0.25)
  })

  it('interpolates arrays component-wise', () => {
    const pts = [
      { time: 0, value: [0, 10] },
      { time: 1, value: [10, 30] },
    ]
    expect(interpolate(pts, 0.5)).toEqual([5, 20])
  })
})

describe('timing', () => {
  it('formats SS:FF at 30fps', () => {
    expect(formatTimecode(0)).toBe('00:00')
    expect(formatTimecode(74)).toBe('02:14')
    expect(formatTimecode(150)).toBe('05:00')
  })

  it('frame count follows duration; speed scales template time', () => {
    expect(totalFrames(5)).toBe(150)
    expect(totalFrames(2.5)).toBe(75)
    expect(frameToTime(30, 2)).toBe(2)
    expect(getStage('9:16', 5, 2)).toEqual({ width: 1080, height: 1920, duration: 10 })
  })

  it('fitTimeline compresses short durations and keeps long ones', () => {
    expect(fitTimeline(1, 2.5, 5)).toEqual({ t: 2, D: 5 })
    expect(fitTimeline(1, 8, 5)).toEqual({ t: 1, D: 8 })
  })
})

describe('color', () => {
  it('parses and mixes hex colors', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
    expect(hexToRgb('#8b5cf6')).toEqual([139, 92, 246])
    expect(withAlpha('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)')
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('picks the most readable color and rotates hue', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(readableOn('#ffffff', '#eeeeee', '#111111')).toBe('#111111')
    expect(rotateHue('#ff0000', 120)).toBe('#00ff00')
  })

  it('hash is deterministic and in [0, 1)', () => {
    expect(hash(42)).toBe(hash(42))
    for (let i = 0; i < 100; i++) expect(hash(i)).toBeGreaterThanOrEqual(0), expect(hash(i)).toBeLessThan(1)
  })
})

describe('revealEnd', () => {
  it('counts non-space units', () => {
    expect(revealEnd('ab c', { stagger: 0.1, duration: 0.5 })).toBeCloseTo(0.2 + 0.5)
    expect(revealEnd('one two three', { mode: 'word', start: 1, stagger: 0.2, duration: 0.5 })).toBeCloseTo(1.9)
  })
})

describe('template registry', () => {
  it('has unique ids and valid metadata', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of TEMPLATES) {
      expect(t.defaultDuration).toBeGreaterThan(0)
      expect(typeof t.draw).toBe('function')
      for (const c of Object.values(t.defaultColors)) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
