import { describe, expect, it } from 'vitest'
import { ASPECT_RATIOS } from '../engine'
import { chooseVideoPlan, describePlan, exportFileName, exportFrameCount, exportSize, gifDelaysCs } from './plan'

describe('exportSize', () => {
  it('1080p is the full stage', () => {
    expect(exportSize(ASPECT_RATIOS['9:16'], 'video', '1080p')).toEqual({ width: 1080, height: 1920 })
    expect(exportSize(ASPECT_RATIOS['16:9'], 'video', '1080p')).toEqual({ width: 1920, height: 1080 })
  })

  it('720p scales the short side to 720 with even dimensions', () => {
    expect(exportSize(ASPECT_RATIOS['16:9'], 'video', '720p')).toEqual({ width: 1280, height: 720 })
    expect(exportSize(ASPECT_RATIOS['9:16'], 'video', '720p')).toEqual({ width: 720, height: 1280 })
    expect(exportSize(ASPECT_RATIOS['4:5'], 'video', '720p')).toEqual({ width: 720, height: 900 })
    expect(exportSize(ASPECT_RATIOS['1:1'], 'video', '720p')).toEqual({ width: 720, height: 720 })
  })

  it('GIFs are capped at 720px wide', () => {
    for (const r of Object.values(ASPECT_RATIOS)) {
      const s = exportSize(r, 'gif', '1080p')
      expect(s.width).toBeLessThanOrEqual(720)
      expect(s.width / s.height).toBeCloseTo(r.width / r.height, 2)
    }
  })
})

describe('frames and timing', () => {
  it('counts frames at 30fps for video and 15fps for GIF', () => {
    expect(exportFrameCount(5, 'video')).toBe(150)
    expect(exportFrameCount(5, 'gif')).toBe(75)
    expect(exportFrameCount(2.5, 'gif')).toBe(38)
  })

  it('GIF delays add up to the real duration', () => {
    const d = gifDelaysCs(75)
    expect(d.reduce((a, b) => a + b, 0)).toBe(500)
    expect(new Set(d)).toEqual(new Set([6, 7]))
  })
})

describe('file names', () => {
  it('follows movly-<template>-<ratio>.<ext>', () => {
    expect(exportFileName('kinetic-title', '9:16', 'mp4')).toBe('movly-kinetic-title-9x16.mp4')
    expect(exportFileName('neon-glow', '4:5', '.gif')).toBe('movly-neon-glow-4x5.gif')
  })
})

describe('chooseVideoPlan', () => {
  const none = { webcodecs: [], recorderMp4: null, recorderWebm: null }

  it('prefers MP4/H.264 via WebCodecs', () => {
    const plan = chooseVideoPlan({ ...none, webcodecs: ['vp9', 'avc'] })
    expect(plan).toEqual({ method: 'webcodecs', container: 'mp4', codec: 'avc' })
    expect(describePlan(plan!)).toBe('MP4 · H.264')
  })

  it('falls back to WebM via WebCodecs, then MediaRecorder', () => {
    expect(chooseVideoPlan({ ...none, webcodecs: ['vp8', 'vp9'] })).toMatchObject({ container: 'webm', codec: 'vp9' })
    expect(chooseVideoPlan({ ...none, recorderMp4: 'video/mp4', recorderWebm: 'video/webm' })).toMatchObject({
      method: 'mediarecorder',
      container: 'mp4',
    })
    expect(chooseVideoPlan({ ...none, recorderWebm: 'video/webm' })).toMatchObject({ container: 'webm' })
    expect(chooseVideoPlan(none)).toBeNull()
  })
})
