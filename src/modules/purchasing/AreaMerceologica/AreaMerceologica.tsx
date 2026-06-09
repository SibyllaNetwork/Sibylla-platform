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

  // ── Statistiche derivate dalla tassonomia ──────────────────────────────────
  const stats = useMemo(() => {
    const classi    = CATEGORIE.flatMap(c => c.classi)
    const tipologie = classi.flatMap(c => c.tipologie)
    return [
      { icon: 'layer-group',   value: String(CATEGORIE.length), label: 'Categorie',  hint: '2 aree merceologiche' },
      { icon: 'sitemap',       value: String(classi.length),    label: 'Classi',      hint: 'in tutte le categorie' },
      { icon: 'tags',          value: String(tipologie.length), label: 'Tipologie',   hint: 'esempi classificati' },
      { icon: 'shapes',        value: '2',                      label: 'Aree',        hint: 'Prodotti e Servizi' },
    ]
  }, [])

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
        title="Area merceologica"
        subtitle="Esplora la classificazione di prodotti e servizi per categoria, classe e tipologia"
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

      <div className="am-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="am-stat-card">
            <div className="am-stat-card__head">
              <p className="am-stat-card__label">{stat.label}</p>
              <Icon family="duotone" name={stat.icon} className="am-stat-card__icon" />
            </div>
            <p className="am-stat-card__value">{stat.value}</p>
            <p className="am-stat-card__hint">{stat.hint}</p>
          </div>
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
