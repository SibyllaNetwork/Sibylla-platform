import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { Icon } from '../_shared/Icon'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import { CATEGORIE, areeOf, type Area } from '../../../admin/SibyllaAdminPanel/catalogo/classificazione'
import './AreaMerceologica.sass'

type AreaFilter = 'tutte' | Area

const AREA_TABS: Array<{ value: AreaFilter; label: string }> = [
  { value: 'tutte',    label: 'Tutte' },
  { value: 'Prodotti', label: 'Prodotti' },
  { value: 'Servizi',  label: 'Servizi' },
]

type SortKey = 'name-asc' | 'name-desc' | 'classi-desc' | 'classi-asc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',    label: 'Nome (A → Z)' },
  { value: 'name-desc',   label: 'Nome (Z → A)' },
  { value: 'classi-desc', label: 'Più classi prima' },
  { value: 'classi-asc',  label: 'Meno classi prima' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

export default function AreaMerceologica({ navigate }: { navigate: (p: string) => void }) {
  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [area, setArea] = useState<AreaFilter>('tutte')

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matchesArea = (c: typeof CATEGORIE[number]) =>
      area === 'tutte' || c.classi.some(cl => cl.area === area)
    const matchesQuery = (c: typeof CATEGORIE[number]) => {
      if (q === '') return true
      if (c.nome.toLowerCase().includes(q)) return true
      return c.classi.some(cl =>
        cl.nome.toLowerCase().includes(q) ||
        cl.tipologie.some(t => t.toLowerCase().includes(q)),
      )
    }
    const filtered = CATEGORIE.filter(c => matchesArea(c) && matchesQuery(c))
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':    return a.nome.localeCompare(b.nome)
        case 'name-desc':   return b.nome.localeCompare(a.nome)
        case 'classi-asc':  return a.classi.length - b.classi.length
        case 'classi-desc': return b.classi.length - a.classi.length
      }
    })
  }, [search, sortBy, area])

  const filtersDirty = sortBy !== DEFAULT_SORT
  const resetFilters = () => setSortBy(DEFAULT_SORT)

  return (
    <div className="area-merceologica">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        eyebrow="Catalogo · Categorie"
        title="Area merceologica"
        subtitle="Esplora la classificazione di prodotti e servizi: scegli una categoria per vederne le classi, poi le tipologie e i prodotti"
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca categoria, classe, tipologia…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        filterPanel={
          <fieldset className="page-toolbar__filter-section">
            <legend className="page-toolbar__filter-label">Ordina per</legend>
            <div className="page-toolbar__filter-options">
              {SORT_OPTIONS.map((opt) => (
                <label key={opt.value} className="page-toolbar__filter-option">
                  <input
                    type="radio"
                    name="categories-sortBy"
                    value={opt.value}
                    checked={sortBy === opt.value}
                    onChange={() => setSortBy(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        }
      />

      <div className="am-area-tabs" role="group" aria-label="Filtra per area">
        {AREA_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            className={`am-area-tabs__btn${area === tab.value ? ' am-area-tabs__btn--active' : ''}`}
            onClick={() => setArea(tab.value)}
            aria-pressed={area === tab.value}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="am-empty">
          Nessuna categoria trovata con i filtri selezionati.
        </div>
      ) : (
        <div className={`am-grid${view === 'list' ? ' am-grid--list' : ''}`}>
          {displayed.map((cat) => {
            const aree = areeOf(cat)
            return (
              <button
                key={cat.id}
                type="button"
                className="am-cat-card"
                onClick={() => navigate(`dettaglio-area-merceologica:${cat.id}`)}
              >
                <div className="am-cat-card__head">
                  <span className="am-cat-card__icon">
                    <Icon family="light" name={cat.icon} />
                  </span>
                  <span className="am-cat-card__badge">{cat.classi.length} classi</span>
                </div>

                <h3 className="am-cat-card__title">{cat.nome}</h3>
                <p className="am-cat-card__desc">{cat.classi.map(c => c.nome).join(' · ')}</p>

                <div className="am-cat-card__foot">
                  <div className="am-cat-card__areas">
                    {aree.map(a => (
                      <span key={a} className={`am-area-tag am-area-tag--${a === 'Prodotti' ? 'prodotti' : 'servizi'}`}>
                        {a}
                      </span>
                    ))}
                  </div>
                  <span className="am-cat-card__link">
                    Esplora classi
                    <Icon family="regular" name="arrow-right" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
