/**
 * Minimal CanvasRenderingContext2D stand-in for tests (Node has no canvas).
 * Tracks the transform stack and records the bounding box of every
 * fillText/strokeText call in stage coordinates, using approximate metrics
 * (0.6em per character; ascent 0.8em, descent 0.2em).
 */
type Matrix = [number, number, number, number, number, number]

export interface TextBox {
  text: string
  left: number
  right: number
  top: number
  bottom: number
}

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]

export function createMockContext(width: number, height: number) {
  const texts: TextBox[] = []
  const problems: string[] = []
  let m: Matrix = [1, 0, 0, 1, 0, 0]
  const stack: { m: Matrix; state: Record<string, unknown> }[] = []
  const state: Record<string, unknown> = {
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    letterSpacing: '0px',
    globalAlpha: 1,
  }

  const fontSize = () => Number(/([\d.]+)px/.exec(String(state.font))?.[1] ?? 10)
  const spacing = () => Number(/(-?[\d.]+)px/.exec(String(state.letterSpacing))?.[1] ?? 0)
  const measureText = (text: string) => {
    const size = fontSize()
    const n = Array.from(text).length
    const w = n * size * 0.6 + n * spacing()
    return {
      width: w,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: w,
      actualBoundingBoxAscent: size * 0.8,
      actualBoundingBoxDescent: size * 0.2,
      fontBoundingBoxAscent: size * 0.9,
      fontBoundingBoxDescent: size * 0.25,
    }
  }

  const record = (text: string, x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) problems.push(`non-finite text position for "${text}"`)
    if (!text.trim() || Number(state.globalAlpha) <= 0.01) return
    const { width: w } = measureText(text)
    const size = fontSize()
    const align = String(state.textAlign)
    const left = align === 'center' ? x - w / 2 : align === 'right' || align === 'end' ? x - w : x
    const base = String(state.textBaseline)
    const top = base === 'middle' ? y - size * 0.5 : base === 'top' ? y : y - size * 0.8
    const corners = [
      [left, top],
      [left + w, top],
      [left, top + size],
      [left + w, top + size],
    ].map(([px, py]) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]])
    // Undo the renderer's stage→canvas scale (the canvas here is stage-sized, so it's 1).
    texts.push({
      text,
      left: Math.min(...corners.map((c) => c[0])),
      right: Math.max(...corners.map((c) => c[0])),
      top: Math.min(...corners.map((c) => c[1])),
      bottom: Math.max(...corners.map((c) => c[1])),
    })
  }

  const gradient = () => ({ addColorStop() {} })
  const methods: Record<string, (...args: never[]) => unknown> = {
    save: () => stack.push({ m: [...m] as Matrix, state: { ...state } }),
    restore: () => {
      const s = stack.pop()
      if (s) {
        m = s.m
        Object.assign(state, s.state)
      }
    },
    translate: (x: number, y: number) => (m = multiply(m, [1, 0, 0, 1, x, y])),
    scale: (x: number, y: number) => (m = multiply(m, [x, 0, 0, y, 0, 0])),
    rotate: (a: number) => (m = multiply(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])),
    transform: (a: number, b: number, c: number, d: number, e: number, f: number) => (m = multiply(m, [a, b, c, d, e, f])),
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => (m = [a, b, c, d, e, f]),
    resetTransform: () => (m = [1, 0, 0, 1, 0, 0]),
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    measureText,
    fillText: record,
    strokeText: record,
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createConicGradient: gradient,
    getLineDash: () => [],
  }

  const ctx = new Proxy(
    { canvas: { width, height } },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        if (prop in methods) return methods[prop]
        if (prop in state) return state[prop]
        return () => undefined // beginPath, rect, fill, clip, arc, …
      },
      set(_, prop: string, value) {
        if (typeof value === 'number' && !Number.isFinite(value)) problems.push(`non-finite ${prop}`)
        state[prop] = value
        return true
      },
      has(target, prop: string) {
        return prop in target || prop in methods || prop in state || prop === 'letterSpacing'
      },
    },
  ) as unknown as CanvasRenderingContext2D

  return { ctx, texts, problems }
}
