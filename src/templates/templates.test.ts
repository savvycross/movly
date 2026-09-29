import { describe, expect, it } from 'vitest'
import { ASPECT_RATIO_IDS, getStage, renderFrame, type TemplateParams } from '../engine'
import { createMockContext } from './mockCanvas'
import { TEMPLATES } from '.'

const TEXTS = [
  { headline: 'Make it move', subline: 'Motion graphics, right in your browser' },
  { headline: 'Hi', subline: '' },
  {
    headline: 'The quick brown fox jumps over the lazy dog again and again!',
    subline:
      'A much longer subline that goes on for quite a while to make sure wrapping and fitting work properly ok',
  },
  { headline: 'Supercalifragilisticexpialidocious', subline: 'Pneumonoultramicroscopicsilicovolcanoconiosis' },
]

/** Blank text must never crash a template (the app substitutes a placeholder, but be robust anyway). */
const EMPTY = { headline: '', subline: '' }

const params = (text: (typeof TEXTS)[number]): TemplateParams => ({
  ...text,
  colors: { bg: '#101010', primary: '#ffffff', accent: '#ff3366' },
  font: 'Inter',
  logo: null,
  speed: 1,
})

describe.each(TEMPLATES.map((t) => [t.name, t] as const))('%s', (_, template) => {
  it.each(ASPECT_RATIO_IDS)('renders every frame without errors at %s', (aspect) => {
    for (const duration of [2, template.defaultDuration, 12]) {
      const stage = getStage(aspect, duration, 1)
      for (const text of [...TEXTS, EMPTY]) {
        const { ctx, problems } = createMockContext(stage.width, stage.height)
        for (let f = 0; f <= duration * 30; f += 3) renderFrame(ctx, template, f / 30, params(text), stage)
        expect(problems).toEqual([])
      }
    }
  })

  it.each(ASPECT_RATIO_IDS)('keeps all text inside the stage once revealed at %s', (aspect) => {
    const stage = getStage(aspect, template.defaultDuration, 1)
    for (const text of TEXTS) {
      // Sample the "hold" section: after intros finish, before the outro starts.
      for (const time of [stage.duration * 0.62, stage.duration * 0.72]) {
        const { ctx, texts } = createMockContext(stage.width, stage.height)
        renderFrame(ctx, template, time, params(text), stage)
        const tol = 2
        for (const box of texts) {
          const inside =
            box.left >= -tol && box.top >= -tol && box.right <= stage.width + tol && box.bottom <= stage.height + tol
          expect(inside, `"${box.text}" at t=${time.toFixed(2)} → ${JSON.stringify(box)}`).toBe(true)
        }
        expect(texts.length, `no text drawn at t=${time.toFixed(2)}`).toBeGreaterThan(0)
      }
    }
  })
})
