import type { TemplateColors } from './engine'

export interface Palette {
  name: string
  colors: TemplateColors
}

/** Ready-made color sets; a mix of dark and light so templates get tested on both. */
export const PALETTES: readonly Palette[] = [
  { name: 'Violet Night', colors: { bg: '#0f0f1a', primary: '#ffffff', accent: '#8b5cf6' } },
  { name: 'Ocean', colors: { bg: '#06141f', primary: '#e6f6ff', accent: '#22d3ee' } },
  { name: 'Sunset', colors: { bg: '#1a0b12', primary: '#fff4e6', accent: '#ff6b35' } },
  { name: 'Forest', colors: { bg: '#0c1a14', primary: '#effaf3', accent: '#34d399' } },
  { name: 'Gold', colors: { bg: '#111111', primary: '#f5e6c8', accent: '#d4af37' } },
  { name: 'Cyber', colors: { bg: '#0a0a0a', primary: '#f0f0f0', accent: '#39ff14' } },
  { name: 'Paper', colors: { bg: '#f4f1ea', primary: '#161616', accent: '#e63946' } },
  { name: 'Candy', colors: { bg: '#ffe3ee', primary: '#2b1638', accent: '#ff3d7f' } },
]

export const sameColors = (a: TemplateColors, b: TemplateColors) =>
  a.bg.toLowerCase() === b.bg.toLowerCase() &&
  a.primary.toLowerCase() === b.primary.toLowerCase() &&
  a.accent.toLowerCase() === b.accent.toLowerCase()
