/**
 * Sound synthesis with the Web Audio API: no audio files, so no licensing.
 * Works with a live AudioContext (preview) and an OfflineAudioContext
 * (export). All randomness is seeded, so renders are deterministic.
 */
import { hash, hash2 } from '../engine'
import type { AudioPlan, BeatNote, PlannedSfx } from './types'

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>()

/** 2s of seeded white noise per context (same samples every time). */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseCache.get(ctx)
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = hash(i) * 2 - 1
    noiseCache.set(ctx, buf)
  }
  return buf
}

interface Voice {
  sources: AudioScheduledSourceNode[]
}

/** Gain envelope: 0 → peak over `attack`, exponential decay to silence by `end`. */
function env(ctx: BaseAudioContext, t: number, peak: number, attack: number, end: number): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(Math.max(peak, 1e-4), t + attack)
  g.gain.exponentialRampToValueAtTime(1e-4, Math.max(t + attack + 1e-3, end))
  g.gain.setValueAtTime(0, end + 0.01)
  return g
}

function noise(ctx: BaseAudioContext, v: Voice, t: number, dur: number, offsetSeed: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  src.loop = true
  src.start(t, hash(offsetSeed) * 1.5, dur + 0.05)
  v.sources.push(src)
  return src
}

function osc(ctx: BaseAudioContext, v: Voice, type: OscillatorType, freq: number, t: number, dur: number): OscillatorNode {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.start(t)
  o.stop(t + dur + 0.05)
  v.sources.push(o)
  return o
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

/** Schedules one effect at context time `t` into `out`. */
export function playSfx(ctx: BaseAudioContext, out: AudioNode, s: PlannedSfx, t: number, v: Voice): void {
  const p = s.pitch
  const g = s.gain
  switch (s.kind) {
    case 'whoosh': {
      const dur = 0.5 / Math.sqrt(p)
      const bp = filter(ctx, 'bandpass', 300 * p, 1.4)
      bp.frequency.exponentialRampToValueAtTime(3500 * p, t + dur * 0.6)
      bp.frequency.exponentialRampToValueAtTime(900 * p, t + dur)
      const e = env(ctx, t, 0.9 * g, dur * 0.45, t + dur)
      noise(ctx, v, t, dur, s.seed).connect(bp).connect(e).connect(out)
      break
    }
    case 'pop': {
      const o = osc(ctx, v, 'sine', 700 * p, t, 0.14)
      o.frequency.exponentialRampToValueAtTime(160 * p, t + 0.09)
      o.connect(env(ctx, t, 0.7 * g, 0.004, t + 0.13)).connect(out)
      break
    }
    case 'click': {
      const hp = filter(ctx, 'highpass', 2500 * p)
      noise(ctx, v, t, 0.03, s.seed).connect(hp).connect(env(ctx, t, 0.6 * g, 0.001, t + 0.025)).connect(out)
      osc(ctx, v, 'sine', 1900 * p, t, 0.03).connect(env(ctx, t, 0.3 * g, 0.001, t + 0.03)).connect(out)
      break
    }
    case 'tick': {
      const bp = filter(ctx, 'bandpass', 3200 * p, 2.5)
      noise(ctx, v, t, 0.02, s.seed).connect(bp).connect(env(ctx, t, 1.2 * g, 0.001, t + 0.018)).connect(out)
      osc(ctx, v, 'square', 900 * p, t, 0.012).connect(env(ctx, t, 0.08 * g, 0.001, t + 0.01)).connect(out)
      break
    }
    case 'glitch': {
      // Stepped square-wave blips at seeded pitches plus crunchy noise.
      const steps = 7
      const len = 0.028
      for (let i = 0; i < steps; i++) {
        const st = t + i * len
        const f = (180 + hash2(s.seed, i) * 1800) * p
        osc(ctx, v, 'square', f, st, len).connect(env(ctx, st, 0.22 * g, 0.001, st + len)).connect(out)
      }
      const bp = filter(ctx, 'bandpass', 2400 * p, 0.8)
      noise(ctx, v, t, steps * len, s.seed + 9).connect(bp).connect(env(ctx, t, 0.35 * g, 0.002, t + steps * len)).connect(out)
      break
    }
    case 'riser': {
      const dur = Math.max(0.2, s.duration ?? 1)
      const lp = filter(ctx, 'lowpass', 400, 4)
      lp.frequency.exponentialRampToValueAtTime(9000, t + dur)
      const gn = ctx.createGain()
      gn.gain.setValueAtTime(1e-4, t)
      gn.gain.exponentialRampToValueAtTime(0.5 * g, t + dur)
      gn.gain.linearRampToValueAtTime(0, t + dur + 0.04)
      noise(ctx, v, t, dur, s.seed).connect(lp).connect(gn).connect(out)
      const saw = osc(ctx, v, 'sawtooth', 110 * p, t, dur)
      saw.frequency.exponentialRampToValueAtTime(880 * p, t + dur)
      const sg = ctx.createGain()
      sg.gain.setValueAtTime(1e-4, t)
      sg.gain.exponentialRampToValueAtTime(0.12 * g, t + dur)
      sg.gain.linearRampToValueAtTime(0, t + dur + 0.04)
      saw.connect(filter(ctx, 'lowpass', 2500)).connect(sg).connect(out)
      break
    }
    case 'impact': {
      const o = osc(ctx, v, 'sine', 95 * p, t, 0.8)
      o.frequency.exponentialRampToValueAtTime(34 * p, t + 0.5)
      o.connect(env(ctx, t, 1.0 * g, 0.003, t + 0.75)).connect(out)
      const lp = filter(ctx, 'lowpass', 1400 * p)
      noise(ctx, v, t, 0.25, s.seed).connect(lp).connect(env(ctx, t, 0.55 * g, 0.002, t + 0.22)).connect(out)
      break
    }
  }
}

/** Schedules one beat note at context time `t`. */
export function playNote(ctx: BaseAudioContext, out: AudioNode, n: BeatNote, t: number, v: Voice, seed: number): void {
  const g = n.gain
  switch (n.instrument) {
    case 'kick': {
      const o = osc(ctx, v, 'sine', 150, t, 0.45)
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
      o.connect(env(ctx, t, 0.95 * g, 0.002, t + 0.4)).connect(out)
      break
    }
    case 'snare': {
      noise(ctx, v, t, 0.2, seed).connect(filter(ctx, 'bandpass', 1800, 0.9)).connect(env(ctx, t, 0.45 * g, 0.001, t + 0.18)).connect(out)
      osc(ctx, v, 'triangle', 190, t, 0.12).connect(env(ctx, t, 0.3 * g, 0.001, t + 0.1)).connect(out)
      break
    }
    case 'clap': {
      const bp = filter(ctx, 'bandpass', 1500, 1.2)
      bp.connect(out)
      for (let i = 0; i < 3; i++) {
        const st = t + i * 0.011
        noise(ctx, v, st, i === 2 ? 0.18 : 0.02, seed + i).connect(env(ctx, st, 0.5 * g, 0.001, st + (i === 2 ? 0.16 : 0.012))).connect(bp)
      }
      break
    }
    case 'hat':
    case 'openhat':
    case 'shaker': {
      const len = n.instrument === 'openhat' ? 0.2 : n.instrument === 'shaker' ? 0.06 : 0.045
      const f = n.instrument === 'shaker' ? 5000 : 7500
      noise(ctx, v, t, len, seed).connect(filter(ctx, 'highpass', f)).connect(env(ctx, t, 0.28 * g, n.instrument === 'shaker' ? 0.02 : 0.001, t + len)).connect(out)
      break
    }
    case 'bass':
    case 'sub': {
      const f = n.freq ?? 55
      const o = osc(ctx, v, n.instrument === 'sub' ? 'sine' : 'sawtooth', f, t, n.duration)
      const chain = n.instrument === 'sub' ? o : o.connect(filter(ctx, 'lowpass', 520, 2))
      chain.connect(env(ctx, t, (n.instrument === 'sub' ? 0.6 : 0.3) * g, 0.006, t + n.duration)).connect(out)
      break
    }
    case 'pad': {
      const f = n.freq ?? 220
      const lp = filter(ctx, 'lowpass', 1400)
      const gn = ctx.createGain()
      gn.gain.setValueAtTime(0, t)
      gn.gain.linearRampToValueAtTime(0.09 * g, t + 0.4)
      gn.gain.setValueAtTime(0.09 * g, t + n.duration - 0.3)
      gn.gain.linearRampToValueAtTime(0, t + n.duration)
      for (const detune of [-6, 6]) {
        const o = osc(ctx, v, 'triangle', f, t, n.duration)
        o.detune.value = detune
        o.connect(lp)
      }
      lp.connect(gn).connect(out)
      break
    }
    case 'pluck': {
      const f = n.freq ?? 440
      osc(ctx, v, 'triangle', f, t, 0.35).connect(filter(ctx, 'lowpass', 3000)).connect(env(ctx, t, 0.3 * g, 0.003, t + 0.32)).connect(out)
      break
    }
  }
}

export interface ScheduleOptions {
  /** Video time (s) to start from; cues before it are skipped. */
  from: number
  /** Context time at which video time `from` plays. */
  at: number
  /** Decoded uploaded track, when the plan uses one. */
  upload?: AudioBuffer | null
}

export interface ScheduledMix {
  stop(): void
  /** Master output (fades/limiter already applied). */
  output: AudioNode
}

/**
 * Schedules a whole AudioPlan into `ctx`, routing to `destination`.
 * Effects and music go to separate buses (their volumes), music fades out
 * over the last `plan.fadeOut` seconds, and a gentle limiter prevents clipping.
 */
export function schedulePlan(
  ctx: BaseAudioContext,
  destination: AudioNode,
  plan: AudioPlan,
  { from, at, upload }: ScheduleOptions,
): ScheduledMix {
  const toCtx = (videoTime: number) => at + (videoTime - from)
  const voice: Voice = { sources: [] }

  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 6
  limiter.ratio.value = 12
  limiter.attack.value = 0.003
  limiter.release.value = 0.15
  limiter.connect(destination)

  const sfxBus = ctx.createGain()
  sfxBus.gain.value = plan.sfxGain
  sfxBus.connect(limiter)

  const musicBus = ctx.createGain()
  const fadeStart = plan.duration - plan.fadeOut
  if (from < fadeStart) {
    musicBus.gain.setValueAtTime(plan.musicGain, Math.max(at, toCtx(from)))
    musicBus.gain.setValueAtTime(plan.musicGain, toCtx(fadeStart))
  } else {
    musicBus.gain.setValueAtTime(plan.musicGain * Math.max(0, (plan.duration - from) / plan.fadeOut), at)
  }
  musicBus.gain.linearRampToValueAtTime(0, toCtx(plan.duration))
  musicBus.connect(limiter)

  for (const s of plan.sfx) {
    if (s.time >= from - 1e-6 && s.time < plan.duration) playSfx(ctx, sfxBus, s, toCtx(s.time), voice)
  }
  plan.notes.forEach((n, i) => {
    if (n.time >= from - 1e-6 && n.time < plan.duration) playNote(ctx, musicBus, n, toCtx(n.time), voice, 1000 + i)
  })
  if (plan.upload && upload) {
    const src = ctx.createBufferSource()
    src.buffer = upload
    const offset = plan.upload.offset + from
    const length = Math.min(plan.duration - from, upload.duration - offset)
    if (length > 0) {
      src.connect(musicBus)
      src.start(at, offset, length)
      voice.sources.push(src)
    }
  }

  return {
    output: limiter,
    stop() {
      for (const s of voice.sources) {
        try {
          s.stop()
        } catch {
          // Already stopped.
        }
      }
      limiter.disconnect()
    },
  }
}

export const SAMPLE_RATE = 48_000

/** Renders the plan offline to a stereo AudioBuffer exactly `plan.duration` long. */
export async function renderPlanOffline(plan: AudioPlan, upload?: AudioBuffer | null): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: Math.max(1, Math.round(plan.duration * SAMPLE_RATE)),
    sampleRate: SAMPLE_RATE,
  })
  schedulePlan(ctx, ctx.destination, plan, { from: 0, at: 0, upload })
  return ctx.startRendering()
}

/** Decodes an uploaded file (MP3/M4A/WAV…) entirely in the browser. */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const data = await file.arrayBuffer()
  const ctx = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE)
  return ctx.decodeAudioData(data)
}
