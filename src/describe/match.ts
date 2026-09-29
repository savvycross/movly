/**
 * "Describe it": turns a free-text description into ranked template
 * suggestions using keyword/synonym tables only. No network, no AI API,
 * so it costs nothing and works offline. Pure module (unit-tested).
 */
import type { AspectRatio, TemplateColors } from '../engine'
import { HEADLINE_MAX, SUBLINE_MAX } from '../limits'
import { PALETTES } from '../palettes'

type Weighted<T> = { value: T; terms: Record<number, string[]> }

// ---------------------------------------------------------------------------
// Keyword tables. Weights: 3 = names the thing directly, 2 = strong intent,
// 1 = mood/context. Terms are lowercase; multi-word phrases are fine.
// Plurals ("-s", "-es") are matched automatically.
// ---------------------------------------------------------------------------

const TEMPLATE_RULES: Weighted<string>[] = [
  {
    value: 'kinetic-title',
    terms: {
      3: ['kinetic', 'kinetic typography', 'kinetic type'],
      2: ['hype', 'hyped', 'energetic', 'energy', 'bold', 'loud', 'sport', 'gym', 'fitness', 'workout', 'game day', 'match day', 'motivation'],
      1: ['powerful', 'epic', 'intro', 'trailer', 'promo', 'big', 'impact', 'esport', 'streamer'],
    },
  },
  {
    value: 'logo-reveal',
    terms: {
      3: ['logo reveal', 'logo', 'logo intro', 'brand reveal', 'logo animation'],
      2: ['brand', 'branding', 'company', 'bakery', 'shop', 'store', 'restaurant', 'cafe', 'studio', 'agency', 'startup', 'intro', 'outro'],
      1: ['elegant', 'luxury', 'premium', 'corporate', 'business', 'channel'],
    },
  },
  {
    value: 'lower-third',
    terms: {
      3: ['lower third', 'lower thirds', 'name tag', 'nametag', 'name title', 'name and title'],
      2: ['interview', 'speaker', 'podcast', 'host', 'guest', 'presenter', 'reporter', 'webinar', 'panel', 'my name', 'caption'],
      1: ['news', 'conference', 'vlog', 'episode', 'talk'],
    },
  },
  {
    value: 'countdown',
    terms: {
      3: ['countdown', 'count down', '3 2 1', 'timer', 'counting down'],
      2: ['starting soon', 'going live', 'new year', 'kickoff', 'kick off', 'doors open', 't minus', 'ends in', 'coming soon'],
      1: ['stream', 'live', 'event', 'release', 'drop', 'premiere', 'launch', 'launching'],
    },
  },
  {
    value: 'quote-card',
    terms: {
      3: ['quote', 'quotation', 'testimonial'],
      2: ['saying', 'review', 'motivational', 'inspirational', 'inspiration', 'wisdom', 'proverb', 'poem', 'poetry', 'affirmation', 'thought of the day', 'customer said'],
      1: ['book', 'author', 'reflection', 'mindful'],
    },
  },
  {
    value: 'glitch-text',
    terms: {
      3: ['glitch', 'glitchy', 'glitched'],
      2: ['cyber', 'cyberpunk', 'hacker', 'hacking', 'matrix', 'error', 'corrupted', 'distorted', 'vhs', 'techno', 'dubstep', 'edm'],
      1: ['gaming', 'gamer', 'tech', 'digital', 'futuristic', 'horror', 'esport', 'dark'],
    },
  },
  {
    value: 'neon-glow',
    terms: {
      3: ['neon', 'neon sign', 'glow', 'glowing'],
      2: ['nightclub', 'club', 'nightlife', 'bar', 'pub', 'synthwave', 'retrowave', '80s', 'vegas', 'dj', 'rave', 'cocktail', 'karaoke', 'night'],
      1: ['party', 'music', 'concert', 'lounge', 'arcade', 'weekend', 'tonight'],
    },
  },
  {
    value: 'bounce-pop',
    terms: {
      3: ['bounce', 'bouncy', 'bouncing', 'pop art'],
      2: ['fun', 'playful', 'kid', 'children', 'birthday', 'cute', 'toy', 'cartoon', 'celebration', 'celebrate', 'cheerful', 'silly'],
      1: ['happy', 'party', 'candy', 'sweet', 'colorful', 'colourful', 'ice cream', 'summer', 'pop'],
    },
  },
  {
    value: 'slide-stack',
    terms: {
      3: ['slide stack', 'stacked', 'sliding', 'slides in'],
      2: ['sale', 'discount', 'offer', 'deal', 'black friday', 'cyber monday', 'announcement', 'announcing', 'update', 'schedule', 'agenda', 'price', 'off'],
      1: ['promo', 'promotion', 'news', 'event', 'new', 'menu', 'list'],
    },
  },
  {
    value: 'typewriter',
    terms: {
      3: ['typewriter', 'typing', 'typed', 'type out', 'terminal'],
      2: ['code', 'coding', 'developer', 'programmer', 'programming', 'command line', 'storytelling', 'writer', 'writing', 'blog', 'newsletter', 'journal', 'letter', 'tip', 'tutorial', 'how to', 'fun fact', 'did you know'],
      1: ['tech', 'software', 'app', 'story', 'note', 'hacker'],
    },
  },
  {
    value: 'split-reveal',
    terms: {
      3: ['split', 'split screen', 'split reveal'],
      2: ['cinematic', 'dramatic', 'drama', 'movie', 'film', 'trailer', 'fashion', 'premiere', 'unveil', 'unveiling', 'transition', 'grand opening'],
      1: ['reveal', 'epic', 'style', 'collection', 'opening', 'bold'],
    },
  },
  {
    value: 'word-carousel',
    terms: {
      3: ['carousel', 'rotating words', 'word carousel', 'cycling words', 'word by word'],
      2: ['services', 'we do', 'feature', 'benefit', 'list of', 'keyword', 'skill', 'rotating', 'offerings', 'what we do'],
      1: ['portfolio', 'agency', 'menu', 'option', 'words'],
    },
  },
  {
    value: 'clean-title',
    terms: {
      3: ['clean title', 'title card', 'simple title'],
      2: ['minimal', 'minimalist', 'clean', 'simple', 'subtle', 'professional', 'presentation', 'slideshow', 'keynote', 'documentary', 'chapter', 'section'],
      1: ['elegant', 'wedding', 'modern', 'calm', 'corporate', 'title'],
    },
  },
]

const PALETTE_RULES: Weighted<string>[] = [
  {
    value: 'Violet Night',
    terms: {
      3: ['purple', 'violet', 'lavender', 'lilac'],
      2: ['galaxy', 'space', 'cosmic', 'dreamy', 'mystic', 'magic', 'neon', 'synthwave', 'nightclub'],
      1: ['night', 'music', 'podcast', 'stream', 'twitch'],
    },
  },
  {
    value: 'Ocean',
    terms: {
      3: ['blue', 'ocean', 'teal', 'cyan', 'navy', 'aqua'],
      2: ['sea', 'water', 'travel', 'sky', 'surf', 'swim', 'ice', 'winter', 'cool', 'fresh', 'clinic', 'dental'],
      1: ['calm', 'tech', 'corporate', 'trust', 'finance', 'webinar'],
    },
  },
  {
    value: 'Sunset',
    terms: {
      3: ['orange', 'sunset', 'warm', 'red'],
      2: ['summer', 'coffee', 'cafe', 'food', 'restaurant', 'pizza', 'burger', 'bbq', 'autumn', 'fall', 'fire', 'spicy', 'cozy', 'halloween', 'taco'],
      1: ['energetic', 'hype', 'sport', 'beach', 'sale'],
    },
  },
  {
    value: 'Forest',
    terms: {
      3: ['green', 'forest', 'nature', 'eco', 'emerald'],
      2: ['plant', 'garden', 'organic', 'health', 'healthy', 'yoga', 'wellness', 'earth', 'sustainable', 'vegan', 'spring', 'money', 'fitness'],
      1: ['calm', 'fresh', 'natural', 'outdoor', 'hiking'],
    },
  },
  {
    value: 'Gold',
    terms: {
      3: ['gold', 'golden', 'black and gold'],
      2: ['luxury', 'luxurious', 'premium', 'elegant', 'classy', 'wedding', 'jewelry', 'jewellery', 'royal', 'vip', 'gala', 'award', 'champagne', 'sophisticated'],
      1: ['anniversary', 'exclusive', 'real estate', 'hotel', 'wine', 'bakery'],
    },
  },
  {
    value: 'Cyber',
    terms: {
      3: ['lime', 'neon green', 'matrix', 'cyber'],
      2: ['hacker', 'gaming', 'gamer', 'esport', 'techno', 'code', 'coding', 'terminal', 'toxic', 'rave', 'developer'],
      1: ['tech', 'digital', 'futuristic', 'glitch', 'hype'],
    },
  },
  {
    value: 'Paper',
    terms: {
      3: ['paper', 'white', 'cream', 'beige', 'light mode', 'light background'],
      2: ['editorial', 'newspaper', 'book', 'classic', 'vintage', 'print', 'journal', 'blog', 'newsletter', 'quote', 'minimal'],
      1: ['news', 'clean', 'simple', 'writer', 'author', 'poem', 'documentary'],
    },
  },
  {
    value: 'Candy',
    terms: {
      3: ['pink', 'candy', 'pastel', 'rose'],
      2: ['sweet', 'cute', 'kid', 'birthday', 'bakery', 'dessert', 'cake', 'cupcake', 'valentine', 'love', 'baby', 'ice cream', 'beauty', 'makeup', 'cosmetics', 'nail salon'],
      1: ['fun', 'playful', 'party', 'girly', 'donut'],
    },
  },
]

const FONT_RULES: Weighted<string>[] = [
  {
    value: 'Playfair Display',
    terms: {
      3: ['serif', 'playfair'],
      2: ['elegant', 'luxury', 'luxurious', 'classy', 'wedding', 'fashion', 'editorial', 'sophisticated', 'vintage', 'classic'],
      1: ['quote', 'bakery', 'restaurant', 'wine', 'book', 'poem', 'jewelry', 'hotel', 'real estate', 'gold'],
    },
  },
  {
    value: 'Bebas Neue',
    terms: {
      3: ['condensed', 'bebas', 'poster'],
      2: ['hype', 'bold', 'sport', 'gym', 'fitness', 'workout', 'loud', 'impact', 'action', 'trailer'],
      1: ['gaming', 'stream', 'movie', 'film', 'esport', 'countdown', 'sale', 'energetic', 'powerful'],
    },
  },
  {
    value: 'Space Mono',
    terms: {
      3: ['monospace', 'mono', 'space mono', 'typewriter', 'terminal'],
      2: ['code', 'coding', 'developer', 'programmer', 'hacker', 'command line', 'retro computer', 'pixel'],
      1: ['tech', 'glitch', 'retro', 'software', 'cyber', 'cyberpunk'],
    },
  },
  {
    value: 'Montserrat',
    terms: {
      3: ['montserrat', 'geometric'],
      2: ['modern', 'startup', 'agency', 'brand', 'branding'],
      1: ['corporate', 'business', 'company', 'fashion', 'promo', 'announcement', 'real estate'],
    },
  },
  {
    value: 'Inter',
    terms: {
      3: ['inter', 'sans serif'],
      2: ['minimal', 'minimalist', 'clean', 'simple'],
      1: ['professional', 'presentation', 'webinar'],
    },
  },
]

const SPEED_RULES: Weighted<number>[] = [
  { value: 0.75, terms: { 3: ['slow', 'slowly', 'slow motion'], 2: ['calm', 'gentle', 'relaxed', 'relaxing', 'peaceful', 'soothing', 'chill', 'meditation'], 1: ['elegant', 'smooth', 'soft', 'subtle', 'luxury', 'wedding', 'yoga'] } },
  { value: 1.4, terms: { 3: ['fast', 'quick', 'rapid'], 2: ['hype', 'hyped', 'energetic', 'punchy', 'intense', 'snappy', 'action', 'dynamic', 'exciting'], 1: ['sport', 'gym', 'gaming', 'esport', 'party', 'rave'] } },
  { value: 1.8, terms: { 3: ['very fast', 'super fast', 'hyper', 'insane', 'crazy fast'] } },
]

const ASPECT_RULES: Weighted<AspectRatio>[] = [
  {
    value: '9:16',
    terms: {
      3: ['tiktok', 'tik tok', 'reel', 'story', 'stories', 'shorts', 'youtube shorts', 'snapchat', 'vertical', '9:16', 'whatsapp status', 'instagram story', 'instagram reel'],
      1: ['phone', 'mobile'],
    },
  },
  {
    value: '16:9',
    terms: {
      3: ['youtube', 'landscape', 'widescreen', 'horizontal', '16:9', 'twitch', 'youtube video', 'youtube intro'],
      2: ['presentation', 'slideshow', 'keynote', 'webinar', 'tv', 'desktop', 'website', 'stream'],
    },
  },
  { value: '1:1', terms: { 3: ['square', '1:1'], 2: ['avatar', 'profile picture'] } },
  {
    value: '4:5',
    terms: {
      3: ['4:5', 'instagram post', 'feed post', 'portrait'],
      2: ['instagram', 'insta', 'ig', 'facebook', 'linkedin', 'feed'],
    },
  },
]

/** Topic → headline/subline when the user didn't give us text. `event` topics make the topic the headline. */
const TOPICS: { terms: string[]; headline: string; subline: string; event?: boolean }[] = [
  { terms: ['black friday'], headline: 'Black Friday Sale', subline: 'Our biggest deals of the year', event: true },
  { terms: ['cyber monday'], headline: 'Cyber Monday', subline: 'Deals end at midnight', event: true },
  { terms: ['new year', 'nye'], headline: 'Happy New Year', subline: "Here's to a fresh start", event: true },
  { terms: ['birthday', 'bday'], headline: 'Happy Birthday!', subline: "Here's to another amazing year", event: true },
  { terms: ['wedding', 'save the date'], headline: 'Save the Date', subline: "We're getting married", event: true },
  { terms: ['grand opening', 'opening day'], headline: 'Grand Opening', subline: 'Come celebrate with us', event: true },
  { terms: ['stream', 'streaming', 'twitch', 'going live', 'starting soon'], headline: 'Stream starting soon', subline: 'Grab a snack and get comfy', event: true },
  { terms: ['sale', 'discount', 'deal', 'off'], headline: 'Big Sale', subline: 'Up to 50% off, this week only', event: true },
  { terms: ['launch', 'launching', 'release', 'drop', 'coming soon'], headline: 'Launching soon', subline: 'Something new is coming', event: true },
  { terms: ['party', 'nightclub', 'club', 'rave'], headline: 'Party tonight', subline: 'Doors open at 9pm', event: true },
  { terms: ['webinar', 'conference', 'workshop'], headline: 'Join us live', subline: 'Save your seat today', event: true },
  { terms: ['podcast', 'episode'], headline: 'New episode out now', subline: 'Listen wherever you get your podcasts' },
  { terms: ['bakery', 'bakes', 'cake', 'pastry', 'bread'], headline: 'Fresh from the oven', subline: 'Handmade every morning' },
  { terms: ['coffee', 'cafe', 'espresso'], headline: 'Coffee time', subline: 'Brewed fresh, every day' },
  { terms: ['restaurant', 'food', 'pizza', 'burger', 'taco', 'bbq', 'kitchen'], headline: 'Now serving', subline: 'Come hungry, leave happy' },
  { terms: ['gym', 'fitness', 'workout', 'training'], headline: 'No excuses', subline: 'Train hard. Stay strong.' },
  { terms: ['gaming', 'gamer', 'esport', 'game'], headline: 'Game on', subline: 'Level up with us' },
  { terms: ['fashion', 'boutique', 'clothing', 'collection'], headline: 'New collection', subline: 'Style that speaks for itself' },
  { terms: ['real estate', 'listing', 'realtor'], headline: 'Just listed', subline: 'Your dream home awaits' },
  { terms: ['tutorial', 'tip', 'how to', 'did you know', 'fun fact'], headline: 'Quick tip', subline: 'Save this for later' },
  { terms: ['travel', 'trip', 'vacation', 'holiday'], headline: 'Adventure awaits', subline: 'Pack your bags' },
  { terms: ['concert', 'gig', 'live music', 'dj'], headline: 'Live tonight', subline: "Don't miss it" },
  { terms: ['yoga', 'meditation', 'wellness'], headline: 'Breathe in', subline: 'Find your calm' },
  { terms: ['code', 'coding', 'developer', 'programming', 'software'], headline: 'Hello, world', subline: 'Shipping something new' },
  { terms: ['quote', 'motivational', 'inspirational', 'affirmation'], headline: 'Stay hungry, stay foolish', subline: 'Words to live by' },
  { terms: ['logo', 'brand', 'company', 'business', 'startup', 'agency', 'studio'], headline: 'Your Brand', subline: 'Made to move' },
]

/** Proper nouns that are platforms, not the user's business. */
const PLATFORM_NAMES = new Set(
  'tiktok youtube instagram insta ig twitch facebook linkedin snapchat whatsapp reel reels shorts story stories x twitter telegram discord movly gif mp4'.split(' '),
)

// ---------------------------------------------------------------------------

export interface Suggestion {
  templateId: string
  /** Template match score (higher = better). */
  score: number
  /** Palette name, or null to keep each template's own colors. */
  palette: string | null
  colors: TemplateColors | null
  font?: string
  speed?: number
  aspect?: AspectRatio
  headline?: string
  subline?: string
  /** Short human-readable labels explaining the pick, e.g. ["Gold", "Playfair Display", "9:16"]. */
  tags: string[]
}

export interface Analysis extends ExtractedText {
  templateScores: Map<string, number>
  palette: string | null
  font?: string
  speed?: number
  aspect?: AspectRatio
}

/** Lowercase, accents stripped, punctuation → spaces (ratios like 9:16 kept), padded for phrase matching. */
export function normalize(text: string): string {
  const plain = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d)\s*[x×]\s*(\d)/g, '$1:$2') // "9x16" → "9:16"
    .replace(/[^a-z0-9:%]+/g, ' ')
    .replace(/(^|\s):|:(\s|$)/g, ' ')
  return ` ${plain.trim().replace(/\s+/g, ' ')} `
}

/** Does the normalized text contain `term` as whole word(s)? Also accepts simple plurals. */
function has(norm: string, term: string): boolean {
  if (norm.includes(` ${term} `)) return true
  if (/[a-z]$/.test(term)) return norm.includes(` ${term}s `) || norm.includes(` ${term}es `)
  return false
}

function scoreRules<T>(norm: string, rules: Weighted<T>[]): Map<T, number> {
  const scores = new Map<T, number>()
  for (const rule of rules) {
    let s = 0
    for (const [weight, terms] of Object.entries(rule.terms)) {
      for (const term of terms) if (has(norm, term)) s += Number(weight)
    }
    if (s > 0) scores.set(rule.value, s)
  }
  return scores
}

/** Highest-scoring value (earliest rule wins ties), or undefined if nothing matched. */
function best<T>(scores: Map<T, number>): T | undefined {
  let top: T | undefined
  let topScore = 0
  for (const [value, s] of scores) {
    if (s > topScore) {
      top = value
      topScore = s
    }
  }
  return top
}

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max).trimEnd() : s)

/** A phrase in quotes: "Luna's Grand Opening", “…”, «…» or '…'. */
function quotedPhrase(text: string): string | undefined {
  const m =
    /["“”«»„]([^"“”«»„]{1,80})["“”«»„]/.exec(text) ?? /(?:^|[\s(])'([^']{2,60})'(?=[\s.,!?;:)]|$)/.exec(text)
  return m?.[1].trim() || undefined
}

/** Text after "called", "named", "titled" or "that says", up to punctuation or a joining word. */
function namedPhrase(text: string): string | undefined {
  const m = /\b(?:called|named|titled|that says|saying)\s+(.+?)(?=[,.;!?]|\s+(?:for|with|in|on|and|that|to|at)\s|$)/i.exec(text)
  const name = m?.[1].trim()
  return name && name.length >= 2 ? name : undefined
}

/**
 * The user's business/brand name: a run of Capitalized words that isn't a
 * platform (TikTok, YouTube…) and isn't just the first word of the sentence.
 * Runs right after "for", "at", "by" or "from" are preferred.
 */
export function properName(text: string): string | undefined {
  const word = String.raw`(?:(?:Dr|Mr|Mrs|Ms|St|Jr)\.|[A-Z][\w'’&-]*|[0-9]+[A-Za-z][\w'’-]*)`
  const re = new RegExp(`${word}(?:\\s+(?:(?:of|the|and|&|de|la|du)\\s+)?(?:${word}|[0-9]+))*`, 'g')
  const candidates: { name: string; score: number }[] = []
  for (const m of text.matchAll(re)) {
    const words = m[0]
      .split(/\s+/)
      .filter((w) => !PLATFORM_NAMES.has(w.toLowerCase().replace(/['’]s$/, '')) && !/^\d+[x×:]\d+$/i.test(w))
    if (words.length === 0) continue
    const name = words
      .join(' ')
      .replace(/['’]s$/, '')
      .replace(/(?<!\b(?:Dr|Mr|Mrs|Ms|St|Jr))\.$/, '')
    const start = m.index ?? 0
    const atSentenceStart = start === 0 || /[.!?]\s*$/.test(text.slice(0, start))
    if (atSentenceStart && words.length < 2) continue
    const before = text.slice(0, start).toLowerCase()
    const afterPreposition = /\b(?:for|at|by|from|with|called|named)\s+(?:my\s+|our\s+|the\s+)?(?:[a-z]+\s+)?$/.test(before)
    candidates.push({ name, score: words.length + (afterPreposition ? 3 : 0) - (atSentenceStart ? 2 : 0) })
  }
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]?.name
}

interface ExtractedText {
  headline?: string
  subline?: string
  /** A person/business name found in the text. */
  name?: string
  /** Text the user explicitly quoted or introduced with "called"/"saying". */
  quoted?: string
}

/** Picks headline/subline: quoted text > event topic > business name > topic. */
function extractText(text: string, norm: string): ExtractedText {
  const topic = TOPICS.map((t, i) => ({ t, i, hits: t.terms.filter((term) => has(norm, term)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => Number(b.t.event ?? false) - Number(a.t.event ?? false) || b.hits - a.hits || a.i - b.i)[0]?.t
  const quoted = quotedPhrase(text) ?? namedPhrase(text)
  const name = properName(text.replace(/["“”«»„][^"“”«»„]*["“”«»„]/g, ' '))

  let headline: string | undefined
  let subline: string | undefined
  if (quoted) {
    headline = quoted
    subline = name && name !== quoted ? name : topic?.subline
  } else if (topic?.event) {
    headline = topic.headline
    subline = name ?? topic.subline
  } else if (name) {
    headline = name
    subline = topic?.subline
  } else if (topic) {
    headline = topic.headline
    subline = topic.subline
  }
  return {
    headline: headline ? clip(headline, HEADLINE_MAX) : undefined,
    subline: subline ? clip(subline, SUBLINE_MAX) : undefined,
    name,
    quoted,
  }
}

export function analyze(description: string): Analysis {
  const norm = normalize(description)
  const speeds = scoreRules(norm, SPEED_RULES)
  // "very fast" also matches "fast"; the stronger phrase should win.
  if (speeds.has(1.8)) speeds.set(1.8, (speeds.get(1.8) ?? 0) + (speeds.get(1.4) ?? 0))
  return {
    templateScores: scoreRules(norm, TEMPLATE_RULES),
    palette: best(scoreRules(norm, PALETTE_RULES)) ?? null,
    font: best(scoreRules(norm, FONT_RULES)),
    speed: best(speeds),
    aspect: best(scoreRules(norm, ASPECT_RULES)),
    ...extractText(description, norm),
  }
}

/** Fill order when fewer than `count` templates match: broadly useful picks first. */
const FALLBACK_ORDER = ['kinetic-title', 'logo-reveal', 'clean-title', 'split-reveal', 'slide-stack', 'neon-glow', 'bounce-pop']

/** Lower thirds introduce a person, so they get a name/title rather than a tagline. */
function textFor(templateId: string, a: Analysis): { headline?: string; subline?: string } {
  if (templateId === 'lower-third' && !a.quoted) {
    return { headline: clip(a.name ?? 'Your Name', HEADLINE_MAX), subline: 'Your title · Your company' }
  }
  return { headline: a.headline, subline: a.subline }
}

const SPEED_LABEL: Record<string, string> = { '0.75': 'Slow', '1.4': 'Fast', '1.8': 'Very fast' }

/** Top `count` suggestions for a description (distinct templates, best first). */
export function suggest(description: string, count = 3): Suggestion[] {
  const a = analyze(description)
  const ranked = [...a.templateScores.entries()]
    .sort((x, y) => y[1] - x[1] || TEMPLATE_RULES.findIndex((r) => r.value === x[0]) - TEMPLATE_RULES.findIndex((r) => r.value === y[0]))
    .map(([id, score]) => ({ id, score }))
  for (const id of FALLBACK_ORDER) {
    if (ranked.length >= count) break
    if (!ranked.some((r) => r.id === id)) ranked.push({ id, score: 0 })
  }
  const palette = a.palette ? PALETTES.find((p) => p.name === a.palette) : undefined
  const tags = [
    palette?.name,
    a.font,
    a.aspect,
    a.speed !== undefined ? SPEED_LABEL[String(a.speed)] : undefined,
  ].filter((t): t is string => Boolean(t))

  return ranked.slice(0, count).map(({ id, score }) => ({
    templateId: id,
    score,
    palette: palette?.name ?? null,
    colors: palette ? { ...palette.colors } : null,
    font: a.font,
    speed: a.speed,
    aspect: a.aspect,
    ...textFor(id, a),
    tags,
  }))
}
