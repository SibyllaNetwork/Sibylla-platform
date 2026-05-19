import React, { useMemo, useState } from 'react'
import Ico from '../../../../../core/icons/Ico'
import { MACRO_AREE } from '../../../catalogo/mockData'
import type { Categoria } from '../../../catalogo/types'
import './CategorieView.sass'

interface Props {
  categorie: Categoria[]
  countByCategoria: (categoriaId: string) => number
  onCreate: () => void
  onEdit: (c: Categoria) => void
  onDelete: (id: string) => void
}

export default function CategorieView({ categorie, countByCategoria, onCreate, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const macroLabel = (id: string) => MACRO_AREE.find(m => m.id === id)?.label || id

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categorie
    return categorie.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.descrizione.toLowerCase().includes(q),
    )
  }, [categorie, search])

  return (
    <div className="cat-view">
      <div className="cat-view__head">
        <div>
          <div className="cat-view__title">Categorie merceologiche</div>
          <div className="cat-view__sub">{categorie.length} categorie configurate</div>
        </div>
        <button className="sib-btn sib-btn--primary cat-view__btn-new" onClick={onCreate}>
          <Ico n="plus" s={12} c="#fff" />
          Nuova categoria
        </button>
      </div>

      <div className="cat-view__search">
        <Ico n="search" s={12} c="var(--color-text-disabled)" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca categoria..."
          className="sib-search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="cat-view__empty">Nessuna categoria trovata.</div>
      ) : (
        <div className="cat-view__grid">
          {filtered.map(c => (
            <div key={c.id} className="cat-view__card">
              <div className="cat-view__icon">
                <i className={`fa-duotone ${c.icona}`} />
              </div>
              <div className="cat-view__body">
                <div className="cat-view__name">{c.nome}</div>
                <div className="cat-view__desc">{c.descrizione}</div>
                <div className="cat-view__meta">
                  <span className="cat-view__macro">{macroLabel(c.macroArea)}</span>
                  <span className="cat-view__count">{countByCategoria(c.id)} prodotti</span>
                </div>
              </div>
              <div className="cat-view__actions">
                <button className="cat-view__icon-btn cat-view__icon-btn--edit" onClick={() => onEdit(c)} aria-label="Modifica categoria">
                  <Ico n="edit" s={13} c="var(--color-link)" />
                </button>
                <button className="cat-view__icon-btn cat-view__icon-btn--del" onClick={() => onDelete(c.id)} aria-label="Elimina categoria">
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
