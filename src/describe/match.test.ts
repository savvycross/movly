import { describe, expect, it } from 'vitest'
import { FONTS } from '../engine'
import { PALETTES } from '../palettes'
import { TEMPLATES } from '../templates'
import { analyze, normalize, properName, suggest } from './match'

interface Case {
  text: string
  template: string
  palette?: string | null
  font?: string
  speed?: 'slow' | 'normal' | 'fast'
  aspect?: string
  headline?: string
  subline?: string
}

const CASES: Case[] = [
  { text: 'gold logo reveal for my bakery, elegant', template: 'logo-reveal', palette: 'Gold', font: 'Playfair Display', speed: 'slow', headline: 'Fresh from the oven' },
  { text: 'hype countdown for my stream', template: 'countdown', font: 'Bebas Neue', speed: 'fast', aspect: '16:9', headline: 'Stream starting soon' },
  { text: 'neon party promo for tiktok', template: 'neon-glow', palette: 'Violet Night', aspect: '9:16', headline: 'Party tonight' },
  { text: 'Logo reveal for Luna Bakery', template: 'logo-reveal', headline: 'Luna Bakery', subline: 'Handmade every morning' },
  { text: 'Instagram story for Nova Shoes black friday sale', template: 'slide-stack', aspect: '9:16', headline: 'Black Friday Sale', subline: 'Nova Shoes' },
  { text: 'minimal clean title for my YouTube channel', template: 'clean-title', palette: 'Paper', font: 'Inter', aspect: '16:9' },
  { text: 'quote card: "Stay hungry, stay foolish" - Steve Jobs', template: 'quote-card', headline: 'Stay hungry, stay foolish', subline: 'Steve Jobs' },
  { text: 'glitchy cyberpunk intro for my gaming channel', template: 'glitch-text', palette: 'Cyber', speed: 'fast' },
  { text: 'cute pink birthday video for my daughter Mia', template: 'bounce-pop', palette: 'Candy', headline: 'Happy Birthday!', subline: 'Mia' },
  { text: 'podcast lower third with my name and title', template: 'lower-third', headline: 'Your Name' },
  { text: 'Webinar lower third for Dr. Sarah Kim, blue, professional', template: 'lower-third', palette: 'Ocean', aspect: '16:9', headline: 'Dr. Sarah Kim' },
  { text: 'typewriter effect for a coding tutorial', template: 'typewriter', font: 'Space Mono', palette: 'Cyber' },
  { text: 'cinematic trailer title for our film premiere', template: 'split-reveal', font: 'Bebas Neue' },
  { text: 'rotating words showing our services: design, video, web', template: 'word-carousel' },
  { text: 'fast energetic gym promo for reels', template: 'kinetic-title', speed: 'fast', aspect: '9:16', headline: 'No excuses' },
  { text: 'New year countdown 3-2-1 party', template: 'countdown', headline: 'Happy New Year' },
  { text: 'wedding save the date, elegant and classy', template: 'clean-title', palette: 'Gold', font: 'Playfair Display', speed: 'slow', headline: 'Save the Date' },
  { text: 'coffee shop called Bean There, warm and cozy, square post', template: 'logo-reveal', palette: 'Sunset', aspect: '1:1', headline: 'Bean There' },
  { text: 'grand opening of Casa Roma restaurant', template: 'split-reveal', headline: 'Grand Opening', subline: 'Casa Roma' },
  { text: 'announcement: we are launching our app next week, linkedin', template: 'slide-stack', font: 'Montserrat', aspect: '4:5', headline: 'Launching soon' },
  { text: 'a dramatic split screen reveal in 9x16', template: 'split-reveal', aspect: '9:16', headline: undefined },
  { text: 'very fast bouncy fun sale for kids toys', template: 'bounce-pop', palette: 'Candy', headline: 'Big Sale' },
  { text: 'calm green yoga promo, slow and peaceful', template: 'kinetic-title', palette: 'Forest', speed: 'slow', headline: 'Breathe in' },
  { text: 'Neon sign for Club Nova, Instagram post', template: 'neon-glow', aspect: '4:5', headline: 'Party tonight', subline: 'Club Nova' },
  { text: 'YouTube Shorts glitch intro', template: 'glitch-text', aspect: '9:16' },
  { text: 'Café opening — sweet and pastel', template: 'logo-reveal', palette: 'Candy' },
]

const speedBucket = (s?: number) => (s === undefined ? 'normal' : s < 1 ? 'slow' : s > 1 ? 'fast' : 'normal')

describe('describe-it matcher', () => {
  it('has at least 20 example phrases', () => expect(CASES.length).toBeGreaterThanOrEqual(20))

  it.each(CASES)('"$text"', (c) => {
    const [top] = suggest(c.text)
    expect(top.templateId).toBe(c.template)
    if ('palette' in c) expect(top.palette).toBe(c.palette)
    if (c.font) expect(top.font).toBe(c.font)
    if (c.speed) expect(speedBucket(top.speed)).toBe(c.speed)
    if (c.aspect) expect(top.aspect).toBe(c.aspect)
    if ('headline' in c) expect(top.headline).toBe(c.headline)
    if (c.subline) expect(top.subline).toBe(c.subline)
  })

  it('always returns 3 distinct, real templates with valid settings', () => {
    const ids = new Set(TEMPLATES.map((t) => t.id))
    for (const text of [...CASES.map((c) => c.text), '', 'something nice', '!!!', 'asdf qwerty']) {
      const s = suggest(text)
      expect(s).toHaveLength(3)
      expect(new Set(s.map((x) => x.templateId)).size).toBe(3)
      for (const x of s) {
        expect(ids.has(x.templateId)).toBe(true)
        if (x.palette) expect(PALETTES.some((p) => p.name === x.palette)).toBe(true)
        if (x.font) expect(FONTS as readonly string[]).toContain(x.font)
        if (x.headline) expect(x.headline.length).toBeLessThanOrEqual(60)
      }
    }
  })

  it('ranks matches by score', () => {
    const s = suggest('neon glitch countdown')
    expect(s.map((x) => x.templateId).sort()).toEqual(['countdown', 'glitch-text', 'neon-glow'])
    expect(s[0].score).toBeGreaterThanOrEqual(s[1].score)
    expect(s[1].score).toBeGreaterThanOrEqual(s[2].score)
  })

  it('leaves settings alone when the text says nothing about them', () => {
    const a = analyze('something nice')
    expect(a.palette).toBeNull()
    expect(a.font).toBeUndefined()
    expect(a.speed).toBeUndefined()
    expect(a.aspect).toBeUndefined()
    expect(a.headline).toBeUndefined()
  })

  it('maps platforms to aspect ratios', () => {
    expect(analyze('for tiktok').aspect).toBe('9:16')
    expect(analyze('instagram reels').aspect).toBe('9:16')
    expect(analyze('snapchat story').aspect).toBe('9:16')
    expect(analyze('for youtube').aspect).toBe('16:9')
    expect(analyze('square post').aspect).toBe('1:1')
    expect(analyze('linkedin post').aspect).toBe('4:5')
    expect(analyze('in 16x9 please').aspect).toBe('16:9')
  })
})

describe('text helpers', () => {
  it('normalizes accents, punctuation and ratios', () => {
    expect(normalize('Café 3-2-1, 9x16!')).toBe(' cafe 3 2 1 9:16 ')
  })

  it('finds business names but skips platforms and sentence-initial words', () => {
    expect(properName('Promo for Luna Bakery on TikTok')).toBe('Luna Bakery')
    expect(properName('Gold intro for YouTube')).toBeUndefined()
    expect(properName('Intro for Dr. Sarah Kim.')).toBe('Dr. Sarah Kim')
    expect(properName('countdown to the House of Pancakes grand opening')).toBe('House of Pancakes')
  })

  it('prefers quoted text, then "called …"', () => {
    expect(analyze("logo intro with the text 'Hello Summer'").headline).toBe('Hello Summer')
    expect(analyze('a sign that says Open Late, neon').headline).toBe('Open Late')
    expect(analyze('bakery called Sweet Crumbs').headline).toBe('Sweet Crumbs')
  })
})
