import { describe, expect, it } from 'vitest'
import { SETTINGS_KEY, loadSettings, parseSettings, saveSettings, type SavedSettings } from './settings'

const IDS = ['kinetic-title', 'neon-glow']

class MemoryStorage {
  data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
}

const valid: SavedSettings = {
  templateId: 'neon-glow',
  headline: 'Hello',
  subline: 'World',
  colors: { bg: '#000000', primary: '#ffffff', accent: '#ff00aa' },
  font: 'Space Mono',
  aspect: '9:16',
  speed: 1.25,
  duration: 7.5,
}

describe('settings', () => {
  it('round-trips through storage', () => {
    const store = new MemoryStorage() as unknown as Storage
    saveSettings(valid, store)
    expect(loadSettings(IDS, store)).toEqual(valid)
  })

  it('never stores a logo', () => {
    const store = new MemoryStorage()
    saveSettings({ ...valid, logo: { big: 'image' } } as unknown as SavedSettings, store as unknown as Storage)
    expect(JSON.parse(store.data.get(SETTINGS_KEY)!)).not.toHaveProperty('logo')
  })

  it('drops invalid fields individually', () => {
    expect(
      parseSettings(
        {
          templateId: 'deleted-template',
          headline: 42,
          subline: 'ok',
          colors: { bg: 'red', primary: '#fff', accent: '#000000' },
          font: 'Comic Sans',
          aspect: '21:9',
          speed: 'fast',
          duration: Infinity,
        },
        IDS,
      ),
    ).toEqual({ subline: 'ok' })
  })

  it('clamps and snaps numbers, truncates text, keeps null colors', () => {
    const s = parseSettings({ speed: 9, duration: 3.3, headline: 'x'.repeat(200), colors: null }, IDS)
    expect(s.speed).toBe(2)
    expect(s.duration).toBe(3.5)
    expect(s.headline).toHaveLength(60)
    expect(s.colors).toBeNull()
  })

  it('survives corrupt JSON and throwing storage', () => {
    const corrupt = { getItem: () => '{nope' } as unknown as Storage
    expect(loadSettings(IDS, corrupt)).toEqual({})
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
    } as unknown as Storage
    expect(loadSettings(IDS, throwing)).toEqual({})
    expect(() => saveSettings(valid, throwing)).not.toThrow()
  })
})
