import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Ico from '../../../core/icons/Ico'
import { Icon } from '../_shared/Icon'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import { useServiziStore } from '../../../store/useServiziStore'
import { useCartStore } from '../../../store/useCartStore'
import { useTipiServizioStore } from '../../../store/useTipiServizioStore'
import {
  MERCATI_SERVIZI,
  type TipoServizio,
  type MercatoServizio,
  type Servizio,
} from './servizi-types'
import PrenotaServizioModal from './PrenotaServizioModal'
import './Servizi.sass'

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',   label: 'Nome (A → Z)' },
  { value: 'name-desc',  label: 'Nome (Z → A)' },
  { value: 'price-asc',  label: 'Prezzo crescente' },
  { value: 'price-desc', label: 'Prezzo decrescente' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

const prezzoPerListino = (s: Servizio, m: MercatoServizio): number => {
  switch (m) {
    case 'agora': return s.prezzoAgora
    case 'b2b':   return s.prezzoB2B
    case 'b2c':   return s.prezzoB2C
  }
}

const pricingLabel = (mode: Servizio['pricingMode']): string => {
  switch (mode) {
    case 'per-persona': return 'a persona'
    case 'per-gruppo':  return 'a gruppo'
    case 'per-giorno':  return 'al giorno'
    case 'per-ora':     return 'all\'ora'
  }
}

export default function Servizi({ navigate }: { navigate: (p: string) => void }) {
  const servizi     = useServiziStore(s => s.servizi)
  const tipi        = useTipiServizioStore(s => s.tipi)
  const tipoMeta    = useTipiServizioStore(s => s.meta)
  const totaleItems = useCartStore(s => s.totaleItems())

  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [tipiAttivi, setTipiAttivi] = useState<TipoServizio[]>([])
  const [cittaFilter, setCittaFilter] = useState<string>('')
  const [dataDal, setDataDal] = useState<string>('')
  const [dataAl, setDataAl]   = useState<string>('')
  const [adulti, setAdulti]   = useState<number>(1)
  const [bambini, setBambini] = useState<number>(0)
  const [listino, setListino] = useState<MercatoServizio>('agora')

  const [bookingFor, setBookingFor] = useState<Servizio | null>(null)

  const citta = useMemo(() => {
    return Array.from(new Set(servizi.map(s => s.citta))).sort()
  }, [servizi])

  const toggleTipo = (t: TipoServizio) => {
    setTipiAttivi(curr => curr.includes(t) ? curr.filter(x => x !== t) : [...curr, t])
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = servizi.filter(s => {
      if (!s.attivo || !s.pubblicato) return false
      if (tipiAttivi.length > 0 && !tipiAttivi.includes(s.tipo)) return false
      if (cittaFilter && s.citta !== cittaFilter) return false
      if (adulti  > s.adultiMax)  return false
      if (bambini > s.bambiniMax) return false
      // Filtro periodo: la richiesta deve cadere dentro la finestra di disponibilità.
      if (dataDal && dataDal < s.disponibileDal) return false
      if (dataAl  && dataAl  > s.disponibileAl)  return false
      if (q && !(
        s.nome.toLowerCase().includes(q) ||
        s.descrizione.toLowerCase().includes(q) ||
        s.citta.toLowerCase().includes(q) ||
        tipoMeta(s.tipo).label.toLowerCase().includes(q)
      )) return false
      return true
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.nome.localeCompare(b.nome)
        case 'name-desc':  return b.nome.localeCompare(a.nome)
        case 'price-asc':  return prezzoPerListino(a, listino) - prezzoPerListino(b, listino)
        case 'price-desc': return prezzoPerListino(b, listino) - prezzoPerListino(a, listino)
      }
    })
  }, [servizi, search, sortBy, tipiAttivi, cittaFilter, dataDal, dataAl, adulti, bambini, listino])

  const filtersDirty =
    sortBy !== DEFAULT_SORT ||
    tipiAttivi.length > 0 ||
    cittaFilter !== '' ||
    dataDal !== '' || dataAl !== '' ||
    adulti !== 1 || bambini !== 0 ||
    listino !== 'agora'

  const resetFilters = () => {
    setSortBy(DEFAULT_SORT)
    setTipiAttivi([])
    setCittaFilter('')
    setDataDal(''); setDataAl('')
    setAdulti(1); setBambini(0)
    setListino('agora')
  }

  return (
    <div className="servizi">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Servizi"
        subtitle="Acquisto di servizi: escursioni, noleggi, biglietti per eventi, parchi, musei e altro"
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca servizio, città o tipo…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button
            type="button"
            className="sib-btn sib-btn--ghost servizi__cart-btn"
            onClick={() => navigate('agora-cart')}
            aria-label="Vai al carrello"
          >
            <Icon family="regular" name="cart-shopping" />
            Carrello
            {totaleItems > 0 && <span className="servizi__cart-count">{totaleItems}</span>}
          </button>
        }
        filterPanel={
          <>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Ordina per</legend>
              <div className="page-toolbar__filter-options">
                {SORT_OPTIONS.map(opt => (
                  <label key={opt.value} className="page-toolbar__filter-option">
                    <input
                      type="radio"
                      name="servizi-sortBy"
                      value={opt.value}
                      checked={sortBy === opt.value}
                      onChange={() => setSortBy(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Listino prezzi</legend>
              <div className="page-toolbar__filter-options">
                {MERCATI_SERVIZI.map(m => (
                  <label key={m.id} className="page-toolbar__filter-option">
                    <input
                      type="radio"
                      name="servizi-listino"
                      value={m.id}
                      checked={listino === m.id}
                      onChange={() => setListino(m.id)}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Città</legend>
              <select
                className="sib-select"
                value={cittaFilter}
                onChange={(e) => setCittaFilter(e.target.value)}
              >
                <option value="">Tutte le città</option>
                {citta.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </fieldset>
          </>
        }
      />

      {/* Filtri rapidi sempre visibili sotto la toolbar */}
      <div className="servizi__quick-filters">
        <div className="servizi__qf-row">
          <span className="servizi__qf-label">Tipi di servizio</span>
          <div className="servizi__chips">
            {tipi.map(t => {
              const active = tipiAttivi.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`servizi__chip${active ? ' servizi__chip--active' : ''}`}
                  onClick={() => toggleTipo(t.id)}
                  aria-pressed={active}
                  title={t.label}
                >
                  <Icon family="light" name={t.icon} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="servizi__qf-row servizi__qf-row--inline">
          <label className="servizi__qf-field">
            <span>Dal</span>
            <input
              type="date"
              className="sib-input"
              value={dataDal}
              onChange={(e) => setDataDal(e.target.value)}
            />
          </label>
          <label className="servizi__qf-field">
            <span>Al</span>
            <input
              type="date"
              className="sib-input"
              value={dataAl}
              onChange={(e) => setDataAl(e.target.value)}
            />
          </label>
          <label className="servizi__qf-field servizi__qf-field--num">
            <span>Adulti</span>
            <input
              type="number"
              className="sib-input"
              min={0}
              max={50}
              value={adulti}
              onChange={(e) => setAdulti(Math.max(0, parseInt(e.target.value || '0', 10)))}
            />
          </label>
          <label className="servizi__qf-field servizi__qf-field--num">
            <span>Bambini</span>
            <input
              type="number"
              className="sib-input"
              min={0}
              max={50}
              value={bambini}
              onChange={(e) => setBambini(Math.max(0, parseInt(e.target.value || '0', 10)))}
            />
          </label>
        </div>
      </div>

      <div className="servizi__count">
        {displayed.length} servizi{displayed.length !== servizi.length && ` su ${servizi.length}`}
        {' · listino '}
        <strong>{MERCATI_SERVIZI.find(m => m.id === listino)?.label}</strong>
      </div>

      {displayed.length === 0 ? (
        <div className="servizi__empty">
          Nessun servizio corrisponde ai filtri impostati.
        </div>
      ) : (
        <div className={`servizi__grid${view === 'list' ? ' servizi__grid--list' : ''}`}>
          {displayed.map(s => {
            const meta = tipoMeta(s.tipo)
            const prezzo = prezzoPerListino(s, listino)
            return (
              <article key={s.id} className="srv-card">
                <div className="srv-card__image-wrap">
                  <img src={s.immagineUrl} alt={s.nome} className="srv-card__image" />
                  <span
                    className="srv-card__type-badge"
                    style={{ '--type-color': meta.color } as React.CSSProperties}
                  >
                    <Icon family="light" name={meta.icon} />
                    {meta.label}
                  </span>
                </div>

                <div className="srv-card__body">
                  <h3 className="srv-card__title">{s.nome}</h3>
                  <p className="srv-card__city">
                    <Icon family="regular" name="location-dot" />
                    {s.citta}, {s.paese}
                  </p>
                  <p className="srv-card__desc">{s.descrizione}</p>

                  {s.caratteristiche.length > 0 && (
                    <ul className="srv-card__tags">
                      {s.caratteristiche.slice(0, 3).map((c, i) => (
                        <li key={i} className="srv-card__tag">{c}</li>
                      ))}
                    </ul>
                  )}

                  <dl className="srv-card__meta">
                    <div className="srv-card__meta-row">
                      <dt>Durata</dt>
                      <dd>{s.durata}</dd>
                    </div>
                    <div className="srv-card__meta-row">
                      <dt>Disponibile</dt>
                      <dd>{s.disponibileDal} → {s.disponibileAl}</dd>
                    </div>
                    <div className="srv-card__meta-row">
                      <dt>Capienza</dt>
                      <dd>{s.adultiMax} adulti{s.bambiniMax > 0 ? ` + ${s.bambiniMax} bambini` : ''}</dd>
                    </div>
                    {s.fornitoreNome && (
                      <div className="srv-card__meta-row">
                        <dt>Fornitore</dt>
                        <dd>
                          {s.fornitoreNome}
                          {s.sitoFornitore && (
                            <a
                              className="srv-card__supplier-site"
                              href={s.sitoFornitore.startsWith('http') ? s.sitoFornitore : `https://${s.sitoFornitore}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              sito
                            </a>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="srv-card__buy">
                  <div className="srv-card__price-block">
                    <span className="srv-card__price-label">
                      Prezzo {MERCATI_SERVIZI.find(m => m.id === listino)?.label}
                    </span>
                    <span className="srv-card__price">€ {prezzo.toFixed(2)}</span>
                    <span className="srv-card__price-note">{pricingLabel(s.pricingMode)}</span>
                  </div>

                  <button
                    type="button"
                    className="sib-btn sib-btn--primary srv-card__cta"
                    onClick={() => setBookingFor(s)}
                  >
                    <Ico n="cart" s={12} c="#fff" />
                    Prenota e aggiungi al carrello
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <PrenotaServizioModal
        open={bookingFor !== null}
        servizio={bookingFor}
        listino={listino}
        adultiPref={adulti}
        bambiniPref={bambini}
        onClose={() => setBookingFor(null)}
      />
    </div>
  )
}
