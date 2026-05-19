import React, { useMemo, useState } from 'react'
import Ico from '../../../../../core/icons/Ico'
import { MACRO_AREE } from '../../../catalogo/mockData'
import type { Categoria, Fornitore } from '../../../catalogo/types'
import './FornitoriView.sass'

interface Props {
  fornitori: Fornitore[]
  categorie: Categoria[]
  countByFornitore: (fornitoreId: string) => number
  onCreate: () => void
  onEdit: (f: Fornitore) => void
  onDelete: (id: string) => void
  onTogglePubblicato: (id: string) => void
}

export default function FornitoriView({ fornitori, categorie, countByFornitore, onCreate, onEdit, onDelete, onTogglePubblicato }: Props) {
  const [search, setSearch] = useState('')
  const [macroFilter, setMacroFilter] = useState<string>('')

  const macroLabel = (id: string) => MACRO_AREE.find(m => m.id === id)?.label || id
  const categoriaLabel = (id: string) => categorie.find(c => c.id === id)?.nome || '—'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return fornitori.filter(f => {
      if (macroFilter && f.macroArea !== macroFilter) return false
      if (!q) return true
      return f.nome.toLowerCase().includes(q) ||
             f.citta.toLowerCase().includes(q) ||
             f.descrizione.toLowerCase().includes(q)
    })
  }, [fornitori, search, macroFilter])

  return (
    <div className="forn-view">
      <div className="forn-view__head">
        <div>
          <div className="forn-view__title">Fornitori</div>
          <div className="forn-view__sub">{fornitori.length} fornitori registrati</div>
        </div>
        <button className="sib-btn sib-btn--primary forn-view__btn-new" onClick={onCreate}>
          <Ico n="plus" s={12} c="#fff" />
          Nuovo fornitore
        </button>
      </div>

      <div className="forn-view__filters">
        <div className="forn-view__search">
          <Ico n="search" s={12} c="var(--color-text-disabled)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, città o descrizione..."
            className="sib-search-input"
          />
        </div>
        <select
          value={macroFilter}
          onChange={e => setMacroFilter(e.target.value)}
          className="sib-select forn-view__macro-filter"
        >
          <option value="">Tutte le macro-aree</option>
          {MACRO_AREE.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="forn-view__empty">Nessun fornitore trovato.</div>
      ) : (
        <div className="forn-view__table">
          <div className="forn-view__thead">
            <div>Fornitore</div>
            <div>Categoria · Macro-area</div>
            <div>Sede</div>
            <div>Contatti</div>
            <div>Prodotti</div>
            <div>Pubblicazione</div>
            <div></div>
          </div>
          {filtered.map(f => (
            <div key={f.id} className="forn-view__row">
              <div className="forn-view__cell-name">
                <div className="forn-view__avatar">
                  {f.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="forn-view__name-block">
                  <div className="forn-view__name">{f.nome}</div>
                  <div className="forn-view__desc">{f.descrizione}</div>
                </div>
              </div>
              <div className="forn-view__cell">
                <div className="forn-view__cat">{categoriaLabel(f.categoriaId)}</div>
                <div className="forn-view__macro">{macroLabel(f.macroArea)}</div>
              </div>
              <div className="forn-view__cell">
                <div className="forn-view__primary">{f.citta} ({f.regione})</div>
                <div className="forn-view__muted">{f.indirizzo}</div>
              </div>
              <div className="forn-view__cell">
                <div className="forn-view__primary">{f.email}</div>
                <div className="forn-view__muted">{f.telefono}</div>
              </div>
              <div className="forn-view__cell-count">
                <span className="forn-view__count">{countByFornitore(f.id)}</span>
              </div>
              <div className="forn-view__cell-publish">
                {f.pubblicato ? (
                  <>
                    <span className="forn-view__pub-badge forn-view__pub-badge--on">
                      <Ico n="globe" s={11} c="var(--color-success)" />
                      Pubblicato
                    </span>
                    <button
                      className="forn-view__pub-btn forn-view__pub-btn--off"
                      onClick={() => onTogglePubblicato(f.id)}
                      aria-label="Rimuovi dalla pubblicazione"
                    >
                      <Ico n="eye-off" s={11} c="var(--color-warning)" />
                      Rimuovi pubblicazione
                    </button>
                  </>
                ) : (
                  <>
                    <span className="forn-view__pub-badge forn-view__pub-badge--draft">
                      <Ico n="eye-off" s={11} c="var(--color-text-disabled)" />
                      Bozza
                    </span>
                    <button
                      className="forn-view__pub-btn forn-view__pub-btn--on"
                      onClick={() => onTogglePubblicato(f.id)}
                      aria-label="Pubblica fornitore"
                    >
                      <Ico n="globe" s={11} c="#fff" />
                      Pubblica
                    </button>
                  </>
                )}
              </div>
              <div className="forn-view__row-actions">
                <button className="forn-view__icon-btn forn-view__icon-btn--edit" onClick={() => onEdit(f)} aria-label="Modifica fornitore">
                  <Ico n="edit" s={13} c="var(--color-link)" />
                </button>
                <button className="forn-view__icon-btn forn-view__icon-btn--del" onClick={() => onDelete(f.id)} aria-label="Elimina fornitore">
                  <Ico n="trash" s={13} c="var(--color-error)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
