import { describe, expect, it } from 'vitest'
import { createMockContext } from '../templates/mockCanvas'
import { getTemplate } from '../templates'
import { drawCompositionFrame, type Composition } from './frames'
import { WATERMARK_TEXT } from './watermark'

const comp = (watermark: boolean): Composition => ({
  template: getTemplate('kinetic-title'),
  params: {
    headline: 'Make it move',
    subline: 'Hello',
    colors: { bg: '#000000', primary: '#ffffff', accent: '#ff0066' },
    font: 'Inter',
    logo: null,
    speed: 1,
  },
  aspect: '9:16',
  duration: 5,
  watermark,
})

describe('watermark', () => {
  it('is not drawn unless enabled', () => {
    const { ctx, texts } = createMockContext(1080, 1920)
    drawCompositionFrame(ctx, comp(false), 60, 30)
    expect(texts.some((t) => t.text === WATERMARK_TEXT)).toBe(false)
  })

  it.each([
    [1080, 1920],
    [1280, 720],
    [720, 900],
  ])('sits small in the bottom-right corner at %ix%i', (w, h) => {
    const { ctx, texts } = createMockContext(w, h)
    drawCompositionFrame(ctx, comp(true), 60, 30)
    const box = texts.find((t) => t.text === WATERMARK_TEXT)
    expect(box).toBeDefined()
    expect(box!.right).toBeLessThanOrEqual(w)
    expect(box!.bottom).toBeLessThanOrEqual(h)
    expect(box!.left).toBeGreaterThan(w / 2)
    expect(box!.top).toBeGreaterThan(h * 0.85)
    expect(box!.bottom - box!.top).toBeLessThan(Math.min(w, h) * 0.05)
  })
})
