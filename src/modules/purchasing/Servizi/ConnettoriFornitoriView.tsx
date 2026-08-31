import React, { useMemo, useState } from 'react'
import Ico from '../../../core/icons/Ico'
import { Icon } from '../_shared/Icon'
import { PageToolbar } from '../_shared/PageToolbar'
import ConfirmDeleteModal from '../../../admin/SibyllaAdminPanel/modals/ConfirmDeleteModal/ConfirmDeleteModal'
import FornitoreConnectorModal from './FornitoreConnectorModal'
import { useFornitoreServiziStore } from '../../../store/useFornitoreServiziStore'
import { useTipiServizioStore } from '../../../store/useTipiServizioStore'
import { MERCATI_SERVIZI } from './servizi-types'
import {
  FORNITORI_META,
  PUBBLICAZIONE_LABELS,
  SYNC_FREQUENCY_LABELS,
  categorieMappate,
  fornitoreMeta,
  type FornitoreProvider,
  type FornitoreServiziConnector,
  type FornitoreServiziForm,
  type SyncStatus,
} from './fornitori-types'
import './ConnettoriFornitoriView.sass'

// ─── CONNETTORI FORNITORI SERVIZI ────────────────────────────────────────────
//  Terzo sub-tab di Servizi (admin piattaforma): collega le API dei fornitori
//  terzi da cui importiamo servizi da rivendere sui canali Agorà / B2B / B2C.
//  Gemello di "Connettori partner" (Strutture), che fa lo stesso per le
//  strutture ricettive.

type SortKey = 'name-asc' | 'name-desc' | 'provider' | 'imported-desc' | 'lastSync-desc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',      label: 'Nome (A → Z)' },
  { value: 'name-desc',     label: 'Nome (Z → A)' },
  { value: 'provider',      label: 'Fornitore' },
  { value: 'imported-desc', label: 'Servizi importati ↓' },
  { value: 'lastSync-desc', label: 'Ultimo sync ↓' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  'ok':           'OK',
  'errore':       'Errore',
  'in-corso':     'In corso',
  'mai-eseguito': 'Mai eseguito',
}

const EMPTY_FORM: FornitoreServiziForm = {
  nome: '', provider: 'custom', descrizione: '',
  baseUrl: '', authMode: 'api-key',
  credApiKey: '', credClientId: '', credClientSecret: '',
  credUsername: '', credPassword: '', credBearerToken: '', credTenantId: '',
  syncFrequency: 'manual', pubblicazione: 'moderazione', politicaRimozione: 'disattiva',
  filtriPaesi: '', filtriCitta: '', filtriCategorie: '', filtriPrezzoMax: '0',
  filtriSoloDisponibili: true,
  categoryMapping: [], fieldMapping: [],
  canaleAgoraAbilitato: false, canaleAgoraMarkup: '0', canaleAgoraTagline: '',
  canaleB2BAbilitato:   false, canaleB2BMarkup:   '0', canaleB2BTagline:   '',
  canaleB2CAbilitato:   false, canaleB2CMarkup:   '0', canaleB2CTagline:   '',
  overrideLogoUrl: '', overridePaletteAccent: '#5C9CD4', overrideMostraBadgeFornitore: true,
  attivo: true,
}

const csv = (s: string): string[] => s.split(',').map(x => x.trim()).filter(Boolean)

const formToConnector = (f: FornitoreServiziForm): Omit<FornitoreServiziConnector, 'id'> => ({
  nome: f.nome.trim(),
  provider: f.provider,
  descrizione: f.descrizione.trim(),
  baseUrl: f.baseUrl.trim(),
  authMode: f.authMode,
  credentials: {
    apiKey:       f.credApiKey || undefined,
    clientId:     f.credClientId || undefined,
    clientSecret: f.credClientSecret || undefined,
    username:     f.credUsername || undefined,
    password:     f.credPassword || undefined,
    bearerToken:  f.credBearerToken || undefined,
    tenantId:     f.credTenantId || undefined,
  },
  syncFrequency: f.syncFrequency,
  ultimoSync: undefined,
  statoSync: 'mai-eseguito',
  messaggioSync: 'In attesa di prima sincronizzazione',
  serviziImportati: 0,
  filtri: {
    paesi: csv(f.filtriPaesi).map(x => x.toUpperCase()),
    citta: csv(f.filtriCitta),
    categorie: csv(f.filtriCategorie),
    prezzoMax: parseFloat(f.filtriPrezzoMax) || 0,
    soloConDisponibilita: f.filtriSoloDisponibili,
  },
  pubblicazione: f.pubblicazione,
  politicaRimozione: f.politicaRimozione,
  categoryMapping: f.categoryMapping.map(r => ({ ...r })),
  fieldMapping: f.fieldMapping.map(r => ({ ...r })),
  canali: {
    agora: { abilitato: f.canaleAgoraAbilitato, markup: parseFloat(f.canaleAgoraMarkup) || 0, taglineOverride: f.canaleAgoraTagline.trim() },
    b2b:   { abilitato: f.canaleB2BAbilitato,   markup: parseFloat(f.canaleB2BMarkup)   || 0, taglineOverride: f.canaleB2BTagline.trim() },
    b2c:   { abilitato: f.canaleB2CAbilitato,   markup: parseFloat(f.canaleB2CMarkup)   || 0, taglineOverride: f.canaleB2CTagline.trim() },
  },
  uiOverride: {
    logoUrl: f.overrideLogoUrl.trim(),
    paletteAccent: f.overridePaletteAccent || '#5C9CD4',
    mostraBadgeFornitore: f.overrideMostraBadgeFornitore,
  },
  attivo: f.attivo,
})

const connectorToForm = (c: FornitoreServiziConnector): FornitoreServiziForm => ({
  nome: c.nome,
  provider: c.provider,
  descrizione: c.descrizione,
  baseUrl: c.baseUrl,
  authMode: c.authMode,
  credApiKey:       c.credentials.apiKey || '',
  credClientId:     c.credentials.clientId || '',
  credClientSecret: c.credentials.clientSecret || '',
  credUsername:     c.credentials.username || '',
  credPassword:     c.credentials.password || '',
  credBearerToken:  c.credentials.bearerToken || '',
  credTenantId:     c.credentials.tenantId || '',
  syncFrequency: c.syncFrequency,
  pubblicazione: c.pubblicazione,
  politicaRimozione: c.politicaRimozione,
  filtriPaesi: c.filtri.paesi.join(', '),
  filtriCitta: c.filtri.citta.join(', '),
  filtriCategorie: c.filtri.categorie.join(', '),
  filtriPrezzoMax: String(c.filtri.prezzoMax),
  filtriSoloDisponibili: c.filtri.soloConDisponibilita,
  categoryMapping: c.categoryMapping.map(r => ({ ...r })),
  fieldMapping: c.fieldMapping.map(r => ({ ...r })),
  canaleAgoraAbilitato: c.canali.agora.abilitato,
  canaleAgoraMarkup:    String(c.canali.agora.markup),
  canaleAgoraTagline:   c.canali.agora.taglineOverride,
  canaleB2BAbilitato:   c.canali.b2b.abilitato,
  canaleB2BMarkup:      String(c.canali.b2b.markup),
  canaleB2BTagline:     c.canali.b2b.taglineOverride,
  canaleB2CAbilitato:   c.canali.b2c.abilitato,
  canaleB2CMarkup:      String(c.canali.b2c.markup),
  canaleB2CTagline:     c.canali.b2c.taglineOverride,
  overrideLogoUrl: c.uiOverride.logoUrl,
  overridePaletteAccent: c.uiOverride.paletteAccent,
  overrideMostraBadgeFornitore: c.uiOverride.mostraBadgeFornitore,
  attivo: c.attivo,
})

const formatLastSync = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function ConnettoriFornitoriView() {
  const connectors      = useFornitoreServiziStore(s => s.connectors)
  const addConnector    = useFornitoreServiziStore(s => s.addConnector)
  const updateConnector = useFornitoreServiziStore(s => s.updateConnector)
  const removeConnector = useFornitoreServiziStore(s => s.removeConnector)
  const toggleAttivo    = useFornitoreServiziStore(s => s.toggleAttivo)
  const toggleCanale    = useFornitoreServiziStore(s => s.toggleCanale)
  const triggerSync     = useFornitoreServiziStore(s => s.triggerSync)
  const tipoMeta        = useTipiServizioStore(s => s.meta)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [providerFilter, setProviderFilter] = useState<FornitoreProvider | ''>('')
  const [statoFilter, setStatoFilter] = useState<SyncStatus | ''>('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FornitoreServiziConnector | null>(null)
  const [form, setForm] = useState<FornitoreServiziForm>(EMPTY_FORM)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = connectors.filter(c => {
      if (providerFilter && c.provider !== providerFilter) return false
      if (statoFilter && c.statoSync !== statoFilter) return false
      if (!q) return true
      return (
        c.nome.toLowerCase().includes(q) ||
        c.descrizione.toLowerCase().includes(q) ||
        fornitoreMeta(c.provider).label.toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':      return a.nome.localeCompare(b.nome)
        case 'name-desc':     return b.nome.localeCompare(a.nome)
        case 'provider':      return a.provider.localeCompare(b.provider) || a.nome.localeCompare(b.nome)
        case 'imported-desc': return b.serviziImportati - a.serviziImportati
        case 'lastSync-desc': return (b.ultimoSync || '').localeCompare(a.ultimoSync || '')
      }
    })
  }, [connectors, search, sortBy, providerFilter, statoFilter])

  const filtersDirty = sortBy !== DEFAULT_SORT || providerFilter !== '' || statoFilter !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setProviderFilter(''); setStatoFilter('') }

  const stats = useMemo(() => {
    const attivi = connectors.filter(c => c.attivo).length
    const totImported = connectors.reduce((acc, c) => acc + c.serviziImportati, 0)
    const daMappare = connectors.filter(c => categorieMappate(c) < c.categoryMapping.length).length
    const errori = connectors.filter(c => c.statoSync === 'errore').length
    return { total: connectors.length, attivi, totImported, daMappare, errori }
  }, [connectors])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }
  const openEdit = (c: FornitoreServiziConnector) => {
    setEditing(c)
    setForm(connectorToForm(c))
    setShowModal(true)
  }
  const confirmEdit = () => {
    if (!form.nome.trim()) return
    const data = formToConnector(form)
    if (editing) {
      // Preserva lo stato di sincronizzazione già maturato dal connettore.
      updateConnector(editing.id, {
        ...data,
        ultimoSync: editing.ultimoSync,
        statoSync: editing.statoSync,
        messaggioSync: editing.messaggioSync,
        serviziImportati: editing.serviziImportati,
      })
    } else {
      addConnector(data)
    }
    setShowModal(false)
  }
  const confirmDelete = () => {
    if (!deletingId) return
    removeConnector(deletingId)
    setDeletingId(null)
  }

  return (
    <div className="cnf-view">
      {/* ─── Contatori ──────────────────────────────────────────────────── */}
      <div className="cnf-view__counters">
        <div className="cnf-view__counter">
          <i className="fa-duotone fa-plug cnf-view__counter-ico" />
          <div>
            <div className="cnf-view__counter-value">{stats.total}</div>
            <div className="cnf-view__counter-label">Connettori</div>
          </div>
        </div>
        <div className="cnf-view__counter">
          <i className="fa-duotone fa-circle-check cnf-view__counter-ico" />
          <div>
            <div className="cnf-view__counter-value">{stats.attivi}</div>
            <div className="cnf-view__counter-label">Attivi</div>
          </div>
        </div>
        <div className="cnf-view__counter">
          <i className="fa-duotone fa-concierge-bell cnf-view__counter-ico" />
          <div>
            <div className="cnf-view__counter-value">{stats.totImported.toLocaleString('it-IT')}</div>
            <div className="cnf-view__counter-label">Servizi importati</div>
          </div>
        </div>
        <div className={`cnf-view__counter${stats.errori > 0 ? ' cnf-view__counter--alert' : ''}`}>
          <i className="fa-duotone fa-triangle-exclamation cnf-view__counter-ico" />
          <div>
            <div className="cnf-view__counter-value">{stats.errori}</div>
            <div className="cnf-view__counter-label">Errori sync</div>
          </div>
        </div>
      </div>

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca per nome, fornitore o descrizione…' }}
        view="list"
        onViewChange={() => { /* solo lista */ }}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={openCreate}>
            <Ico n="plus" s={12} c="#fff" />
            Nuovo connettore
          </button>
        }
        filterPanel={
          <>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Ordina per</legend>
              <div className="page-toolbar__filter-options">
                <select
                  className="sib-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </fieldset>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Fornitore</legend>
              <select
                className="sib-select"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as FornitoreProvider | '')}
              >
                <option value="">Tutti</option>
                {FORNITORI_META.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </fieldset>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Stato sincronizzazione</legend>
              <select
                className="sib-select"
                value={statoFilter}
                onChange={(e) => setStatoFilter(e.target.value as SyncStatus | '')}
              >
                <option value="">Tutti</option>
                {(Object.keys(SYNC_STATUS_LABELS) as SyncStatus[]).map(s => (
                  <option key={s} value={s}>{SYNC_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </fieldset>
          </>
        }
      />

      <div className="cnf-view__count">
        {displayed.length} connettori{displayed.length !== connectors.length && ` su ${connectors.length}`}
      </div>

      {displayed.length === 0 ? (
        <div className="cnf-view__empty">
          Nessun connettore configurato. Aggiungine uno per importare il catalogo servizi
          di un fornitore terzo e rivenderlo sui canali Sibylla.
        </div>
      ) : (
        <div className="cnf-view__list">
          {displayed.map(c => {
            const fm = fornitoreMeta(c.provider)
            const mappate = categorieMappate(c)
            const totCat = c.categoryMapping.length
            const mappaturaIncompleta = mappate < totCat
            const nessunaMappatura = mappate === 0
            return (
              <article key={c.id} className={`cnf-card${c.attivo ? '' : ' cnf-card--off'}`}>
                <div
                  className="cnf-card__provider"
                  style={{ ['--provider-color' as any]: fm.color }}
                >
                  <Icon family="light" name={fm.icon} />
                </div>

                <div className="cnf-card__body">
                  <div className="cnf-card__head">
                    <h3 className="cnf-card__title">{c.nome}</h3>
                    <span
                      className="cnf-card__provider-badge"
                      style={{ ['--provider-color' as any]: fm.color }}
                    >
                      {fm.label}
                    </span>
                    <span className="cnf-card__pub">
                      {PUBBLICAZIONE_LABELS[c.pubblicazione]}
                    </span>
                  </div>
                  <p className="cnf-card__desc">{c.descrizione}</p>

                  <div className="cnf-card__meta-row">
                    <span className={`cnf-card__sync cnf-card__sync--${c.statoSync}`}>
                      <span className="cnf-card__sync-dot" />
                      {SYNC_STATUS_LABELS[c.statoSync]}
                      {c.statoSync === 'ok' && c.ultimoSync && <> · {formatLastSync(c.ultimoSync)}</>}
                    </span>
                    <span className="cnf-card__meta-item">
                      <Icon family="regular" name="concierge-bell" />
                      {c.serviziImportati.toLocaleString('it-IT')} servizi
                    </span>
                    <span className="cnf-card__meta-item">
                      <Icon family="regular" name="rotate" />
                      {SYNC_FREQUENCY_LABELS[c.syncFrequency]}
                    </span>
                  </div>

                  {c.messaggioSync && (
                    <p className={`cnf-card__sync-msg cnf-card__sync-msg--${c.statoSync}`}>
                      {c.messaggioSync}
                    </p>
                  )}

                  {/* Mappatura categorie → tipi di servizio: senza di essa i
                      servizi importati non hanno i campi di prenotazione. */}
                  <div className="cnf-card__mapping-row">
                    <span
                      className={
                        'cnf-card__mapping-badge'
                        + (nessunaMappatura ? ' cnf-card__mapping-badge--alert' : '')
                        + (!nessunaMappatura && mappaturaIncompleta ? ' cnf-card__mapping-badge--warn' : '')
                      }
                    >
                      <i
                        className={`fa-solid ${nessunaMappatura ? 'fa-triangle-exclamation' : mappaturaIncompleta ? 'fa-circle-half-stroke' : 'fa-circle-check'}`}
                        aria-hidden="true"
                      />
                      {mappate} di {totCat} categorie mappate
                    </span>
                    <div className="cnf-card__tipi">
                      {c.categoryMapping
                        .filter(r => r.tipoServizio !== '')
                        .slice(0, 4)
                        .map(r => (
                          <span key={r.categoriaFornitore} className="cnf-card__tipo-chip">
                            {tipoMeta(r.tipoServizio).label}
                          </span>
                        ))}
                      {mappate > 4 && <span className="cnf-card__tipo-chip">+{mappate - 4}</span>}
                    </div>
                  </div>

                  {nessunaMappatura && (
                    <p className="cnf-card__warning">
                      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                      Nessuna categoria mappata su un tipo di servizio: i servizi importati
                      non sarebbero prenotabili. Apri «Configura → Tipi di servizio».
                    </p>
                  )}

                  <div className="cnf-card__canali-row">
                    <span className="cnf-card__canali-label">Rivendi su:</span>
                    <div className="cnf-card__canali">
                      {MERCATI_SERVIZI.map(ch => {
                        const cfg = c.canali[ch.id]
                        const on = cfg.abilitato
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            className={`cnf-card__canale-pill${on ? ' cnf-card__canale-pill--on' : ''}`}
                            style={{ ['--canale-color' as any]: ch.color }}
                            onClick={() => toggleCanale(c.id, ch.id)}
                            aria-label={`${on ? 'Disabilita' : 'Abilita'} ${ch.label}${on && cfg.markup > 0 ? `, markup +${cfg.markup}%` : ''}`}
                          >
                            {ch.label}
                            {on && cfg.markup > 0 && <span className="cnf-card__canale-markup">+{cfg.markup}%</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="cnf-card__actions">
                  <label className="cnf-card__switch">
                    <input
                      type="checkbox"
                      checked={c.attivo}
                      onChange={() => toggleAttivo(c.id)}
                      aria-label={c.attivo ? `Disattiva ${c.nome}` : `Attiva ${c.nome}`}
                    />
                    <span className="cnf-card__switch-slider" />
                  </label>
                  <button
                    type="button"
                    className="sib-btn sib-btn--ghost cnf-card__action-btn"
                    onClick={() => triggerSync(c.id)}
                    disabled={!c.attivo || c.statoSync === 'in-corso'}
                  >
                    <Icon family="regular" name="rotate" />
                    Sincronizza ora
                  </button>
                  <button
                    type="button"
                    className="sib-btn sib-btn--ghost cnf-card__action-btn"
                    onClick={() => openEdit(c)}
                  >
                    <Ico n="edit" s={11} c="var(--color-text-inactive)" />
                    Configura
                  </button>
                  <button
                    type="button"
                    className="cnf-card__icon-btn cnf-card__icon-btn--danger"
                    onClick={() => setDeletingId(c.id)}
                    aria-label={`Elimina ${c.nome}`}
                  >
                    <Ico n="trash" s={12} c="var(--color-text-inactive)" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <FornitoreConnectorModal
        open={showModal}
        editing={editing}
        form={form}
        setForm={setForm}
        onClose={() => setShowModal(false)}
        onConfirm={confirmEdit}
      />

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina connettore fornitore"
        itemName={connectors.find(c => c.id === deletingId)?.nome || ''}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
