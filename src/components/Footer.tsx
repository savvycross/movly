import type { SiteConfig } from '../siteConfig'

/** Site footer; each social link only renders when its env var is set. */
export function Footer({ xUrl, telegramUrl }: Pick<SiteConfig, 'xUrl' | 'telegramUrl'>) {
  return (
    <footer className="footer">
      <span>Movly · free motion graphics, made in your browser</span>
      {(xUrl || telegramUrl) && (
        <nav className="footer-links" aria-label="Community">
          {xUrl && (
            <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="Movly on X">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
              </svg>
              <span>X</span>
            </a>
          )}
          {telegramUrl && (
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Movly on Telegram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3Z" />
              </svg>
              <span>Telegram</span>
            </a>
          )}
        </nav>
      )}
    </footer>
  )
}
