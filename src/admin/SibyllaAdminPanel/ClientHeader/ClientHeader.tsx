import React from 'react'
import Ico from '../../../core/icons/Ico'
import type { AdminTab, Cliente } from '../types'
import './ClientHeader.sass'

/* Le tab del ClientHeader riguardano esclusivamente la struttura selezionata.
   Le tab globali (Catalogo, Console Agorà) sono rese fuori, sopra il header. */
const TABS: ReadonlyArray<readonly [AdminTab, string, string]> = [
  ['struttura', 'Struttura', 'gear'],
  ['moduli',    'Pagine',    'menu'],
  ['pacchetti', 'Moduli',    'bar'],
  ['ruoli',     'Ruoli',     'org'],
  ['funzioni',  'Funzioni',  'gear'],
  ['utenti',    'Utenti',    'profile'],
  ['associazioni', 'Gestione associazioni', 'link'],
] as const

interface Props {
  client: Cliente
  formStato: string
  formTipo: string
  formCitta: string
  enabledCount: number
  totalCount: number
  saved: boolean
  tab: AdminTab
  onTabChange: (t: AdminTab) => void
}

export default function ClientHeader({
  client, formStato, formTipo, formCitta, enabledCount, totalCount, saved, tab, onTabChange,
}: Props) {
  const stateClass = `chead__state chead__state--${formStato}`

  return (
    <header className="chead">
      <div className="chead__row">
        <div>
          <div className="chead__title">{client.nome}</div>
          <div className="chead__subtitle">
            {formTipo} · {formCitta} · {enabledCount}/{totalCount} pagine abilitate
          </div>
        </div>
        <div className="chead__badges">
          <span className={stateClass}>
            ● {formStato === 'attivo' ? 'Attivo' : 'Sospeso'}
          </span>
          {saved && <span className="chead__saved">✓ Salvato</span>}
        </div>
      </div>
      <nav className="chead__tabs" role="tablist">
        {TABS.map(([id, label, ico]) => {
          const active = tab === id
          const cls = `chead__tab${active ? ' chead__tab--active' : ''}`
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              className={cls}
              onClick={() => onTabChange(id)}
            >
              <Ico n={ico} s={13} c={active ? 'var(--color-primary)' : 'var(--color-text-disabled)'} />
              {label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
