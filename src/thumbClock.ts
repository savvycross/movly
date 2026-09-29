/**
 * One shared requestAnimationFrame loop for all template thumbnails, so a
 * dozen mini-previews don't each run their own loop. Throttled to ~24fps.
 */
type Tick = (seconds: number) => void

const subscribers = new Set<Tick>()
let raf = 0
let last = 0

function loop(now: number) {
  raf = requestAnimationFrame(loop)
  if (now - last < 1000 / 24) return
  last = now
  const seconds = now / 1000
  subscribers.forEach((fn) => fn(seconds))
}

export function subscribeThumbClock(fn: Tick): () => void {
  subscribers.add(fn)
  if (!raf) raf = requestAnimationFrame(loop)
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0 && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }
}
