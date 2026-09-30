/**
 * Optional token + community links, configured with VITE_* env vars (see .env
 * and CLAUDE.md). Everything is validated: a missing or malformed value hides
 * the related UI instead of showing something wrong. Movly never depends on
 * any of this: the editor works the same with every value empty.
 */

export const TOKEN_CHAIN_NAME = 'Robinhood Chain'

export interface TokenInfo {
  /** e.g. "MOVLY" (shown as $MOVLY). */
  ticker: string
  /** 0x-prefixed 40-hex-digit contract address, exactly as configured. */
  address: string
  /** Launchpad/trade page, or null to hide the Trade link. */
  tradeUrl: string | null
  /** Explorer page for this token, or null to hide the link. */
  explorerUrl: string | null
}

export interface SiteConfig {
  /** Null when VITE_TOKEN_ADDRESS is empty or invalid: the whole token UI is hidden. */
  token: TokenInfo | null
  xUrl: string | null
  telegramUrl: string | null
}

type Env = Record<string, string | boolean | undefined>

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Only absolute https:// URLs are accepted (no javascript:, no http:). */
export function httpsUrl(value: unknown): string | null {
  const s = str(value)
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

export const isEvmAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s)

export function parseSiteConfig(env: Env): SiteConfig {
  const address = str(env.VITE_TOKEN_ADDRESS)
  const tickerRaw = str(env.VITE_TOKEN_TICKER).replace(/^\$/, '').toUpperCase()
  const ticker = /^[A-Z0-9]{1,12}$/.test(tickerRaw) ? tickerRaw : 'MOVLY'
  const explorerBase = httpsUrl(env.VITE_EXPLORER_URL)
  const token: TokenInfo | null = isEvmAddress(address)
    ? {
        ticker,
        address,
        tradeUrl: httpsUrl(env.VITE_TOKEN_URL),
        // Blockscout (and Etherscan-style) explorers use /token/<address>.
        explorerUrl: explorerBase ? `${explorerBase.replace(/\/+$/, '')}/token/${address}` : null,
      }
    : null
  return { token, xUrl: httpsUrl(env.VITE_X_URL), telegramUrl: httpsUrl(env.VITE_TELEGRAM_URL) }
}

export const SITE = parseSiteConfig(import.meta.env)
