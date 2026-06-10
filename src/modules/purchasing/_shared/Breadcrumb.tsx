import React from 'react'
import { Icon } from './Icon'
import './Breadcrumb.css'

export interface Crumb {
  /** Etichetta visibile del livello */
  label: string
  /** Pagina di destinazione: se presente il crumb è cliccabile. L'ultimo (corrente) di norma la omette. */
  page?: string
}

interface BreadcrumbProps {
  items: Crumb[]
  navigate: (p: string) => void
  className?: string
}

/**
 * Percorso di navigazione gerarchico, cliccabile.
 * Rende esplicito "dove sei" e permette di risalire a qualunque livello.
 * Usato nel flusso Area merceologica → Categoria → Classe → Prodotto.
 */
export function Breadcrumb({ items, navigate, className }: BreadcrumbProps) {
  return (
    <nav className={`am-breadcrumb${className ? ' ' + className : ''}`} aria-label="Percorso di navigazione">
      <ol className="am-breadcrumb__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          const clickable = !!item.page && !isLast
          return (
            <li key={i} className="am-breadcrumb__item">
              {clickable ? (
                <button
                  type="button"
                  className="am-breadcrumb__link"
                  onClick={() => navigate(item.page!)}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={isLast ? 'am-breadcrumb__current' : 'am-breadcrumb__text'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <Icon family="regular" name="chevron-right" className="am-breadcrumb__sep" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
