import { useState } from 'react'
import { TOKEN_CHAIN_NAME, type TokenInfo } from '../siteConfig'

/**
 * Small, optional community-token panel below the editor. Rendered only when a
 * valid contract address is configured. Nothing in Movly depends on it.
 */
export function TokenSection({ token }: { token: TokenInfo }) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token.address)
      setCopied('ok')
    } catch {
      // Clipboard blocked (e.g. insecure context): select the text so it can be copied manually.
      const el = document.getElementById('token-address')
      if (el) window.getSelection()?.selectAllChildren(el)
      setCopied('fail')
    }
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section id="token" className="token" aria-labelledby="token-title">
      <div className="token-card">
        <h2 id="token-title">
          ${token.ticker} on {TOKEN_CHAIN_NAME}
        </h2>
        <div className="token-address-row">
          <span className="token-label">Contract</span>
          <code id="token-address" className="token-address">
            {token.address}
          </code>
          <button type="button" className="btn-secondary token-copy" onClick={copy} aria-live="polite">
            {copied === 'ok' ? 'Copied!' : copied === 'fail' ? 'Press Ctrl/⌘+C' : 'Copy'}
          </button>
        </div>
        {(token.tradeUrl || token.explorerUrl) && (
          <div className="token-links">
            {token.tradeUrl && (
              <a className="btn-primary" href={token.tradeUrl} target="_blank" rel="noopener noreferrer">
                Trade
              </a>
            )}
            {token.explorerUrl && (
              <a className="btn-secondary" href={token.explorerUrl} target="_blank" rel="noopener noreferrer">
                View on explorer
              </a>
            )}
          </div>
        )}
        <p className="token-disclaimer">
          ${token.ticker} is a community token. It is not an investment and comes with no promise of profit or value.
          Only buy what you can afford to lose. Always check the contract address here.
        </p>
      </div>
    </section>
  )
}
