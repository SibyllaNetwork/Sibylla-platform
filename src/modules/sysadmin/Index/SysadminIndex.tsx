import React from 'react'
import PageHead from '../../../core/components/PageHead'
import './SysadminIndex.sass'

/**
 * Sysadmin index — replica `Views/SYSADMIN/index.cshtml`.
 * Punto di accesso al pannello di gestione globale.
 */

const TILES: Array<{ page: string; icon: string; title: string; subtitle: string; color: string }> = [
  { page: 'gestione-aziende',      icon: 'fa-building',       title: 'Gestione aziende',      subtitle: 'Aziende clienti registrate',  color: '#5C9CD4' },
  { page: 'gestione-utenti',       icon: 'fa-users',          title: 'Gestione utenti',       subtitle: 'Utenti & accessi',            color: '#5A8A3C' },
  { page: 'comissioni-aziende',    icon: 'fa-percent',        title: 'Commissioni',           subtitle: 'Pannello commissioni',        color: '#E07B39' },
  { page: 'codici-sconto',         icon: 'fa-ticket',         title: 'Codici sconto',         subtitle: 'Codici promozionali',         color: '#9B59B6' },
  { page: 'cache-manager',         icon: 'fa-database',       title: 'Cache manager',         subtitle: 'Invalidazione cache',         color: '#C4A820' },
  { page: 'imposta-pagine',        icon: 'fa-list-tree',      title: 'Imposta pagine',        subtitle: 'Permessi & menu',             color: '#5C9CD4' },
  { page: 'processi-automatici',   icon: 'fa-robot',          title: 'Processi automatici',   subtitle: 'Job & scheduler',             color: '#5A8A3C' },
  { page: 'payment-management',    icon: 'fa-credit-card',    title: 'Payment management',    subtitle: 'Gateway pagamenti',           color: '#E07B39' },
]

export default function SysadminIndex({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div>
      <PageHead title="Sysadmin" subtitle="Pannello di amministrazione globale Sibylla" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {TILES.map((tile) => (
          <button
            key={tile.page}
            onClick={() => navigate(tile.page)}
            className="bg-white border border-line rounded-field p-4 text-left hover:border-primary transition-colors"
          >
            <div
              className="sysadmin-tile__icon inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
              style={{ '--tile-color': tile.color } as React.CSSProperties}
            >
              <i className={`fa-duotone ${tile.icon} sysadmin-tile__icon-glyph`} />
            </div>
            <div className="text-[14px] font-bold font-poppins text-primary">{tile.title}</div>
            <div className="text-[12px] text-ink-muted">{tile.subtitle}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
