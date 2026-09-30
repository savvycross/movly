import { SITE } from '../siteConfig'

export function Header() {
  return (
    <header className="header">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label="Movly home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <path d="M8 23V9l8 8 8-8v14" />
          </svg>
        </span>
        <span className="brand-name">Movly</span>
      </a>
      {SITE.token && (
        <a className="header-token" href="#token">
          ${SITE.token.ticker}
        </a>
      )}
    </header>
  )
}
