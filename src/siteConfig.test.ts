import { describe, expect, it } from 'vitest'
import { httpsUrl, parseSiteConfig } from './siteConfig'

const ADDR = '0x1234567890abcdef1234567890ABCDEF12345678'

describe('parseSiteConfig', () => {
  it('hides everything when nothing is set', () => {
    expect(parseSiteConfig({})).toEqual({ token: null, xUrl: null, telegramUrl: null })
  })

  it('hides the token section without an address, even if other token vars are set', () => {
    const c = parseSiteConfig({ VITE_TOKEN_TICKER: 'MOVLY', VITE_TOKEN_ADDRESS: '', VITE_TOKEN_URL: 'https://example.com/movly' })
    expect(c.token).toBeNull()
  })

  it('rejects malformed addresses instead of showing a wrong contract', () => {
    for (const bad of ['0x123', '1234567890abcdef1234567890abcdef12345678', `${ADDR}0`, '0xZZ34567890abcdef1234567890abcdef12345678', ' 0x ']) {
      expect(parseSiteConfig({ VITE_TOKEN_ADDRESS: bad }).token).toBeNull()
    }
  })

  it('builds the token info and explorer link when set', () => {
    const c = parseSiteConfig({
      VITE_TOKEN_TICKER: '$movly',
      VITE_TOKEN_ADDRESS: `  ${ADDR} `,
      VITE_TOKEN_URL: 'https://launchpad.example/token/movly',
      VITE_EXPLORER_URL: 'https://explorer.example/',
    })
    expect(c.token).toEqual({
      ticker: 'MOVLY',
      address: ADDR,
      tradeUrl: 'https://launchpad.example/token/movly',
      explorerUrl: `https://explorer.example/token/${ADDR}`,
    })
  })

  it('drops links that are not https', () => {
    const c = parseSiteConfig({
      VITE_TOKEN_ADDRESS: ADDR,
      VITE_TOKEN_URL: 'http://insecure.example',
      VITE_EXPLORER_URL: 'javascript:alert(1)',
      VITE_X_URL: 'x.com/movly',
      VITE_TELEGRAM_URL: 'https://t.me/movly',
    })
    expect(c.token?.tradeUrl).toBeNull()
    expect(c.token?.explorerUrl).toBeNull()
    expect(c.xUrl).toBeNull()
    expect(c.telegramUrl).toBe('https://t.me/movly')
  })

  it('falls back to MOVLY for an invalid ticker', () => {
    expect(parseSiteConfig({ VITE_TOKEN_ADDRESS: ADDR, VITE_TOKEN_TICKER: 'not a ticker!' }).token?.ticker).toBe('MOVLY')
  })

  it('httpsUrl normalizes and validates', () => {
    expect(httpsUrl(' https://x.com/movly ')).toBe('https://x.com/movly')
    expect(httpsUrl('ftp://x')).toBeNull()
    expect(httpsUrl(undefined)).toBeNull()
  })
})
