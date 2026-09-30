import { describe, expect, it } from 'vitest'
import { normalizeBase } from './vite.config'

describe('normalizeBase', () => {
  it('defaults to the domain root', () => {
    expect(normalizeBase(undefined)).toBe('/')
    expect(normalizeBase('')).toBe('/')
    expect(normalizeBase('/')).toBe('/')
  })
  it('accepts sub-paths in any slash style', () => {
    expect(normalizeBase('/movly/')).toBe('/movly/')
    expect(normalizeBase('movly')).toBe('/movly/')
    expect(normalizeBase(' /movly ')).toBe('/movly/')
  })
})
