import React from 'react'
import Ico from '../../../core/icons/Ico'
import type { PlatformSection } from '../types'
import './PlatformSidebar.sass'

interface SectionItem {
  id: PlatformSection
  label: string
  description: string
  icon: string
}

const SECTIONS: SectionItem[] = [
  {
    id: 'catalogo',
    label: 'Catalogo merceologico',
    description: 'Categorie, fornitori e prodotti',
    icon: 'layers',
  },
  {
    id: 'servizi',
    label: 'Servizi',
    description: 'Escursioni, noleggi, eventi — listini Agorà / B2B / B2C',
    icon: 'concierge-bell',
  },
  {
    id: 'banner',
    label: 'Banner & affiliazione',
    description: 'Genera banner di prenotazione per siti di terzi',
    icon: 'share',
  },
  {
    id: 'agora-console',
    label: 'Piattaforma admin',
    description: 'Contenuti e impostazioni dell\'Agorà',
    icon: 'wheel',
  },
]

interface Props {
  section: PlatformSection
  onSelect: (s: PlatformSection) => void
}

export default function PlatformSidebar({ section, onSelect }: Props) {
  return (
    <aside className="psidebar">
      <div className="psidebar__head">
        <div className="psidebar__title">Piattaforma</div>
        <div className="psidebar__subtitle">Configurazione globale</div>
      </div>

      <nav className="psidebar__list" aria-label="Sezioni di configurazione piattaforma">
        {SECTIONS.map(s => {
          const active = section === s.id
          const itemClass = `psidebar__item${active ? ' psidebar__item--active' : ''}`
          return (
            <button
              key={s.id}
              type="button"
              className={itemClass}
              onClick={() => onSelect(s.id)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="psidebar__icon">
                <Ico n={s.icon} s={16} c={active ? '#fff' : 'var(--color-primary)'} />
              </span>
              <span className="psidebar__meta">
                <span className="psidebar__name">{s.label}</span>
                <span className="psidebar__desc">{s.description}</span>
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
