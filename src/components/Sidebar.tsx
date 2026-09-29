import type { Template } from '../engine'

interface SidebarProps {
  templates: readonly Template[]
  selectedId: string
  onSelect: (id: string) => void
}

export function Sidebar({ templates, selectedId, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Templates and customization">
      <section className="panel">
        <h2 className="panel-title">Templates</h2>
        <div className="template-list" role="listbox" aria-label="Templates">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={t.id === selectedId}
              className="template-card"
              onClick={() => onSelect(t.id)}
            >
              <span
                className="template-swatch"
                style={{ background: `linear-gradient(135deg, ${t.defaultColors.bg} 40%, ${t.defaultColors.accent})` }}
                aria-hidden="true"
              />
              <span className="template-meta">
                <span className="template-name">{t.name}</span>
                <span className="template-sub">
                  {t.category} · {t.defaultDuration}s
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2 className="panel-title">Customize</h2>
        <div className="panel-empty">Text, colors and logo controls will appear here.</div>
      </section>
    </aside>
  )
}
