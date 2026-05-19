import React, { useMemo, useState } from 'react'
import Ico from '../../../../../core/icons/Ico'
import { UNITA_MISURA_OPTIONS } from '../../../catalogo/mockData'
import { MERCATI } from '../../../catalogo/types'
import type { Categoria, Fornitore, Mercato, Prodotto } from '../../../catalogo/types'
import './ProdottiView.sass'

interface Props {
  prodotti: Prodotto[]
  categorie: Categoria[]
  fornitori: Fornitore[]
  onCreate: () => void
  onEdit: (p: Prodotto) => void
  onDelete: (id: string) => void
  onToggleAttivo: (id: string) => void
  onTogglePubblicato: (id: string) => void
}

export default function ProdottiView({
  prodotti, categorie, fornitori, onCreate, onEdit, onDelete, onToggleAttivo, onTogglePubblicato,
}: Props) {
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [fornitoreFilter, setFornitoreFilter] = useState('')
  const [mercatoFilter, setMercatoFilter] = useState<Mercato | ''>('')

  const categoriaLabel = (id: string) => categorie.find(c => c.id === id)?.nome || '—'
  const fornitoreLabel = (id: string) => fornitori.find(f => f.id === id)?.nome || '—'
  const unitaLabel = (u: string) => UNITA_MISURA_OPTIONS.find(o => o.value === u)?.label || u

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return prodotti.filter(p => {
      if (categoriaFilter && p.categoriaId !== categoriaFilter) return false
      if (fornitoreFilter && p.fornitoreId !== fornitoreFilter) return false
      if (mercatoFilter && !p.mercati[mercatoFilter].abilitato) return false
      if (!q) return true
      return p.nome.toLowerCase().includes(q) ||
             p.barcode.includes(q) ||
             p.descrizione.toLowerCase().includes(q)
    })
  }, [prodotti, search, categoriaFilter, fornitoreFilter, mercatoFilter])

  return (
    <div className="prod-view">
      <div className="prod-view__head">
        <div>
          <div className="prod-view__title">Prodotti</div>
          <div className="prod-view__sub">{prodotti.length} prodotti — il barcode abilita la lettura nel magazzino</div>
        </div>
        <button className="sib-btn sib-btn--primary prod-view__btn-new" onClick={onCreate}>
          <Ico n="plus" s={12} c="#fff" />
          Nuovo prodotto
        </button>
      </div>

      <div className="prod-view__filters">
        <div className="prod-view__search">
          <Ico n="search" s={12} c="var(--color-text-disabled)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, barcode o descrizione..."
            className="sib-search-input"
          />
        </div>
        <select
          value={categoriaFilter}
          onChange={e => setCategoriaFilter(e.target.value)}
          className="sib-select prod-view__select"
        >
          <option value="">Tutte le categorie</option>
          {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select
          value={fornitoreFilter}
          onChange={e => setFornitoreFilter(e.target.value)}
          className="sib-select prod-view__select"
        >
          <option value="">Tutti i fornitori</option>
          {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select
          value={mercatoFilter}
          onChange={e => setMercatoFilter(e.target.value as Mercato | '')}
          className="sib-select prod-view__select"
        >
          <option value="">Tutti i mercati</option>
          {MERCATI.map(m => <option key={m.id} value={m.id}>Solo {m.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="prod-view__empty">Nessun prodotto trovato.</div>
      ) : (
        <div className="prod-view__table">
          <div className="prod-view__thead">
            <div>Barcode</div>
            <div>Prodotto</div>
            <div>Categoria · Fornitore</div>
            <div>Base / UM</div>
            <div>Mercati di vendita</div>
            <div>Scorta</div>
            <div>Stato</div>
            <div>Pubblicazione</div>
            <div></div>
          </div>
          {filtered.map(p => (
            <div key={p.id} className="prod-view__row">
              <div className="prod-view__barcode">
                <i className="fa-duotone fa-barcode prod-view__barcode-ico" />
                {p.barcode}
              </div>
              <div className="prod-view__cell-name">
                <div className="prod-view__name">{p.nome}</div>
                <div className="prod-view__desc">{p.descrizione}</div>
              </div>
              <div className="prod-view__cell">
                <div className="prod-view__primary">{categoriaLabel(p.categoriaId)}</div>
                <div className="prod-view__muted">{fornitoreLabel(p.fornitoreId)}</div>
              </div>
              <div className="prod-view__cell">
                <div className="prod-view__primary">€ {p.prezzoBase.toFixed(2)}</div>
                <div className="prod-view__muted">{p.quantitaUnita} {unitaLabel(p.unita).split(' ')[0].toLowerCase()}</div>
              </div>
              <div className="prod-view__cell prod-view__markets">
                {MERCATI.map(m => {
                  const mk = p.mercati[m.id]
                  if (!mk.abilitato) return null
                  return (
                    // colore mercato runtime — palette fissa di 2 valori
                    <span
                      key={m.id}
                      className="prod-view__market-chip"
                      style={{ ['--mercato-color' as any]: m.colore }}
                    >
                      {m.label} <strong>€ {mk.prezzoVendita.toFixed(2)}</strong>
                    </span>
                  )
                })}
                {!p.mercati.agora.abilitato && !p.mercati.network.abilitato && (
                  <span className="prod-view__no-market">Nessun mercato</span>
                )}
              </div>
              <div className="prod-view__cell prod-view__cell--right">{p.scortaMinima}</div>
              <div className="prod-view__cell">
                <button
                  className={`prod-view__state${p.attivo ? ' prod-view__state--on' : ''}`}
                  onClick={() => onToggleAttivo(p.id)}
                >
                  {p.attivo ? '● Attivo' : '● Disattivo'}
                </button>
              </div>
              <div className="prod-view__cell-publish">
                {p.pubblicato ? (
                  <>
                    <span className="prod-view__pub-badge prod-view__pub-badge--on">
                      <Ico n="globe" s={11} c="var(--color-success)" />
                      Pubblicato
                    </span>
                    <button
                      className="prod-view__pub-btn prod-view__pub-btn--off"
                      onClick={() => onTogglePubblicato(p.id)}
                      aria-label="Rimuovi dalla pubblicazione"
                    >
                      <Ico n="eye-off" s={11} c="var(--color-warning)" />
                      Rimuovi pubblicazione
                    </button>
                  </>
                ) : (
                  <>
                    <span className="prod-view__pub-badge prod-view__pub-badge--draft">
                      <Ico n="eye-off" s={11} c="var(--color-text-disabled)" />
                      Bozza
                    </span>
                    <button
                      className="prod-view__pub-btn prod-view__pub-btn--on"
                      onClick={() => onTogglePubblicato(p.id)}
                      aria-label="Pubblica prodotto"
                    >
                      <Ico n="globe" s={11} c="#fff" />
                      Pubblica
                    </button>
                  </>
                )}
              </div>
              <div className="prod-view__row-actions">
                <button className="prod-view__icon-btn prod-view__icon-btn--edit" onClick={() => onEdit(p)} aria-label="Modifica prodotto">
                  <Ico n="edit" s={13} c="var(--color-link)" />
                </button>
                <button className="prod-view__icon-btn prod-view__icon-btn--del" onClick={() => onDelete(p.id)} aria-label="Elimina prodotto">
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
