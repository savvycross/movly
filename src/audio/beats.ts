import type { BeatNote, BeatStyle, Instrument } from './types'

/** MIDI note number → Hz. */
export const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

interface Pattern {
  bpm: number
  /** Per-instrument 16-step patterns (1 = hit, fractional = softer hit). */
  drums: Partial<Record<Instrument, number[]>>
  /** One chord (MIDI notes) per bar, cycling. */
  chords: number[][]
  /** How chords are played. */
  voice: 'pad' | 'pluck-arp' | 'none'
  /** Bass: step positions per bar, and which instrument. Plays the chord root two octaves down. */
  bass: { steps: number[]; instrument: 'bass' | 'sub'; length: number }
  /** Extra blips: [step, midi offset from root] on every other bar. */
  blips?: [number, number][]
}

const P = (s: string) => [...s].map((c) => (c === 'x' ? 1 : c === 'o' ? 0.55 : c === '.' ? 0 : Number(c) / 10))

export const PATTERNS: Record<BeatStyle, Pattern> = {
  chill: {
    bpm: 82,
    drums: {
      kick: P('x.....o...x.....'),
      snare: P('....o.......o...'),
      hat: P('o.3.o.3.o.3.o.3.'),
    },
    // Am7 – Fmaj7 – Cmaj7 – G6
    chords: [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 64]],
    voice: 'pad',
    bass: { steps: [0, 10], instrument: 'bass', length: 5 },
  },
  hype: {
    bpm: 128,
    drums: {
      kick: P('x...x...x...x...'),
      clap: P('....x.......x...'),
      openhat: P('..o...o...o...o.'),
      hat: P('4.4.4.4.4.4.4.4.'.replace(/\./g, '2')),
    },
    // Fm – Db – Ab – Eb
    chords: [[53, 56, 60], [49, 53, 56], [56, 60, 63], [51, 55, 58]],
    voice: 'none',
    bass: { steps: [2, 3, 6, 7, 10, 11, 14, 15], instrument: 'bass', length: 1 },
  },
  corporate: {
    bpm: 108,
    drums: {
      kick: P('x.......x.......'),
      snare: P('....o.......o...'),
      shaker: P('3232323232323232'),
    },
    // C – G – Am – F
    chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
    voice: 'pluck-arp',
    bass: { steps: [0, 8], instrument: 'bass', length: 7 },
  },
  minimal: {
    bpm: 100,
    drums: {
      kick: P('x.....x...x.....'),
      hat: P('..4...4...4...4.'),
    },
    // Dm – F (roots only matter here)
    chords: [[62, 65, 69], [65, 69, 72]],
    voice: 'none',
    bass: { steps: [0, 6, 10], instrument: 'sub', length: 3 },
    blips: [[7, 12], [15, 19]],
  },
}

const DRUM_LENGTH: Partial<Record<Instrument, number>> = {
  kick: 0.4,
  snare: 0.2,
  clap: 0.2,
  hat: 0.05,
  openhat: 0.2,
  shaker: 0.06,
}

/**
 * All notes of a beat loop from 0 to `duration` seconds. Pure and
 * deterministic. The tempo is fixed per style (speed changes the visuals, not
 * the groove); the loop simply runs for the clip's length.
 */
export function planBeat(style: BeatStyle, duration: number): BeatNote[] {
  const p = PATTERNS[style]
  const step = 60 / p.bpm / 4
  const barLen = step * 16
  const notes: BeatNote[] = []
  for (let bar = 0; bar * barLen < duration; bar++) {
    const t0 = bar * barLen
    const chord = p.chords[bar % p.chords.length]
    const root = chord[0]
    for (const [instrument, steps] of Object.entries(p.drums) as [Instrument, number[]][]) {
      steps.forEach((v, i) => {
        if (v > 0) notes.push({ time: t0 + i * step, instrument, duration: DRUM_LENGTH[instrument] ?? 0.1, gain: v })
      })
    }
    for (const s of p.bass.steps) {
      notes.push({ time: t0 + s * step, instrument: p.bass.instrument, freq: midi(root - 24), duration: step * p.bass.length, gain: 0.8 })
    }
    if (p.voice === 'pad') {
      for (const n of chord) notes.push({ time: t0, instrument: 'pad', freq: midi(n), duration: barLen, gain: 0.35 })
    } else if (p.voice === 'pluck-arp') {
      for (let i = 0; i < 8; i++) {
        const n = chord[i % chord.length] + (i >= chord.length * 2 ? 12 : 0)
        notes.push({ time: t0 + i * 2 * step, instrument: 'pluck', freq: midi(n + 12), duration: step * 2, gain: i % 2 ? 0.45 : 0.6 })
      }
    }
    if (p.blips && bar % 2 === 1) {
      for (const [s, offset] of p.blips) {
        notes.push({ time: t0 + s * step, instrument: 'pluck', freq: midi(root + offset), duration: step, gain: 0.35 })
      }
    }
  }
  return notes.filter((n) => n.time < duration).sort((a, b) => a.time - b.time)
}
