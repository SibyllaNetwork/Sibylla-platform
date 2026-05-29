import React, { useMemo, useState } from 'react'
import Ico from '../../../../core/icons/Ico'
import { Icon } from '../../../../modules/purchasing/_shared/Icon'
import { PageToolbar } from '../../../../modules/purchasing/_shared/PageToolbar'
import ConfirmDeleteModal from '../../modals/ConfirmDeleteModal/ConfirmDeleteModal'
import PartnerConnectorModal from '../../modals/PartnerConnectorModal/PartnerConnectorModal'
import { usePartnerConnectorStore } from '../../../../store/usePartnerConnectorStore'
import { CANALI_VENDITA } from '../../strutture/types'
import {
  PROVIDERS_META,
  providerMeta,
  SYNC_FREQUENCY_LABELS,
  type PartnerConnector,
  type PartnerConnectorForm,
  type PartnerProvider,
  type SyncStatus,
} from '../../strutture/partner-types'
import './ConnettoriPartnerView.sass'

type SortKey = 'name-asc' | 'name-desc' | 'provider' | 'imported-desc' | 'lastSync-desc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',      label: 'Nome (A → Z)' },
  { value: 'name-desc',     label: 'Nome (Z → A)' },
  { value: 'provider',      label: 'Provider' },
  { value: 'imported-desc', label: 'Strutture importate ↓' },
  { value: 'lastSync-desc', label: 'Ultimo sync ↓' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

const EMPTY_FORM: PartnerConnectorForm = {
  nome: '', provider: 'custom', descrizione: '',
  baseUrl: '', authMode: 'api-key',
  credApiKey: '', credClientId: '', credClientSecret: '',
  credUsername: '', credPassword: '', credBearerToken: '', credTenantId: '',
  syncFrequency: 'manual',
  filtriPaesi: '', filtriRegioni: '', filtriTipi: '', filtriClassMin: '',
  canaleAgoraAbilitato: false, canaleAgoraMarkup: '0', canaleAgoraTagline: '',
  canaleB2BAbilitato:   false, canaleB2BMarkup:   '0', canaleB2BTagline:   '',
  canaleB2CAbilitato:   false, canaleB2CMarkup:   '0', canaleB2CTagline:   '',
  fieldMapping: [],
  overrideLogoUrl: '', overridePaletteAccent: '#5C9CD4', overrideMostraBadgePartner: true,
  attivo: true,
}

const formToConnector = (f: PartnerConnectorForm): Omit<PartnerConnector, 'id'> => ({
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
  struttureImportate: 0,
  filtri: {
    paesi:   f.filtriPaesi.split(',').map(x => x.trim().toUpperCase()).filter(Boolean),
    regioni: f.filtriRegioni.split(',').map(x => x.trim()).filter(Boolean),
    tipi:    f.filtriTipi.split(',').map(x => x.trim().toLowerCase()).filter(Boolean),
    classificazioneMin: f.filtriClassMin.trim(),
  },
  canali: {
    agora: { abilitato: f.canaleAgoraAbilitato, markup: parseFloat(f.canaleAgoraMarkup) || 0, taglineOverride: f.canaleAgoraTagline.trim() },
    b2b:   { abilitato: f.canaleB2BAbilitato,   markup: parseFloat(f.canaleB2BMarkup)   || 0, taglineOverride: f.canaleB2BTagline.trim() },
    b2c:   { abilitato: f.canaleB2CAbilitato,   markup: parseFloat(f.canaleB2CMarkup)   || 0, taglineOverride: f.canaleB2CTagline.trim() },
  },
  fieldMapping: f.fieldMapping,
  uiOverride: {
    logoUrl: f.overrideLogoUrl.trim(),
    paletteAccent: f.overridePaletteAccent || '#5C9CD4',
    mostraBadgePartner: f.overrideMostraBadgePartner,
  },
  attivo: f.attivo,
})

const connectorToForm = (c: PartnerConnector): PartnerConnectorForm => ({
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
  filtriPaesi:   c.filtri.paesi.join(', '),
  filtriRegioni: c.filtri.regioni.join(', '),
  filtriTipi:    c.filtri.tipi.join(', '),
  filtriClassMin: c.filtri.classificazioneMin,
  canaleAgoraAbilitato: c.canali.agora.abilitato,
  canaleAgoraMarkup:    String(c.canali.agora.markup),
  canaleAgoraTagline:   c.canali.agora.taglineOverride,
  canaleB2BAbilitato:   c.canali.b2b.abilitato,
  canaleB2BMarkup:      String(c.canali.b2b.markup),
  canaleB2BTagline:     c.canali.b2b.taglineOverride,
  canaleB2CAbilitato:   c.canali.b2c.abilitato,
  canaleB2CMarkup:      String(c.canali.b2c.markup),
  canaleB2CTagline:     c.canali.b2c.taglineOverride,
  fieldMapping: c.fieldMapping.map(r => ({ ...r })),
  overrideLogoUrl: c.uiOverride.logoUrl,
  overridePaletteAccent: c.uiOverride.paletteAccent,
  overrideMostraBadgePartner: c.uiOverride.mostraBadgePartner,
  attivo: c.attivo,
})

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  'ok':           'OK',
  'errore':       'Errore',
  'in-corso':     'In corso',
  'mai-eseguito': 'Mai eseguito',
}

const formatLastSync = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function ConnettoriPartnerView() {
  const connectors      = usePartnerConnectorStore(s => s.connectors)
  const addConnector    = usePartnerConnectorStore(s => s.addConnector)
  const updateConnector = usePartnerConnectorStore(s => s.updateConnector)
  const removeConnector = usePartnerConnectorStore(s => s.removeConnector)
  const toggleAttivo    = usePartnerConnectorStore(s => s.toggleAttivo)
  const toggleCanale    = usePartnerConnectorStore(s => s.toggleCanale)
  const triggerSync     = usePartnerConnectorStore(s => s.triggerSync)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [providerFilter, setProviderFilter] = useState<PartnerProvider | ''>('')
  const [statoFilter, setStatoFilter]       = useState<SyncStatus | ''>('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PartnerConnector | null>(null)
  const [form, setForm] = useState<PartnerConnectorForm>(EMPTY_FORM)
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
        providerMeta(c.provider).label.toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':      return a.nome.localeCompare(b.nome)
        case 'name-desc':     return b.nome.localeCompare(a.nome)
        case 'provider':      return a.provider.localeCompare(b.provider) || a.nome.localeCompare(b.nome)
        case 'imported-desc': return b.struttureImportate - a.struttureImportate
        case 'lastSync-desc': return (b.ultimoSync || '').localeCompare(a.ultimoSync || '')
      }
    })
  }, [connectors, search, sortBy, providerFilter, statoFilter])

  const filtersDirty = sortBy !== DEFAULT_SORT || providerFilter !== '' || statoFilter !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setProviderFilter(''); setStatoFilter('') }

  const stats = useMemo(() => {
    const attivi = connectors.filter(c => c.attivo).length
    const totImported = connectors.reduce((acc, c) => acc + c.struttureImportate, 0)
    const errori = connectors.filter(c => c.statoSync === 'errore').length
    return { total: connectors.length, attivi, totImported, errori }
  }, [connectors])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }
  const openEdit = (c: PartnerConnector) => {
    setEditing(c)
    setForm(connectorToForm(c))
    setShowModal(true)
  }
  const confirmEdit = () => {
    if (!form.nome.trim()) return
    const data = formToConnector(form)
    if (editing) {
      // Preserva i campi di stato sync esistenti
      updateConnector(editing.id, {
        ...data,
        ultimoSync: editing.ultimoSync,
        statoSync: editing.statoSync,
        messaggioSync: editing.messaggioSync,
        struttureImportate: editing.struttureImportate,
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
    <div className="cnp-view">
      {/* ─── Counter strip ─────────────────────────────────────────────── */}
      <div className="cnp-view__counters">
        <div className="cnp-view__counter">
          <i className="fa-duotone fa-plug cnp-view__counter-ico" />
          <div>
            <div className="cnp-view__counter-value">{stats.total}</div>
            <div className="cnp-view__counter-label">Connettori</div>
          </div>
        </div>
        <div className="cnp-view__counter">
          <i className="fa-duotone fa-circle-check cnp-view__counter-ico" />
          <div>
            <div className="cnp-view__counter-value">{stats.attivi}</div>
            <div className="cnp-view__counter-label">Attivi</div>
          </div>
        </div>
        <div className="cnp-view__counter">
          <i className="fa-duotone fa-building cnp-view__counter-ico" />
          <div>
            <div className="cnp-view__counter-value">{stats.totImported.toLocaleString('it-IT')}</div>
            <div className="cnp-view__counter-label">Strutture importate</div>
          </div>
        </div>
        <div className="cnp-view__counter cnp-view__counter--alert">
          <i className="fa-duotone fa-triangle-exclamation cnp-view__counter-ico" />
          <div>
            <div className="cnp-view__counter-value">{stats.errori}</div>
            <div className="cnp-view__counter-label">Errori sync</div>
          </div>
        </div>
      </div>

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca per nome, provider o descrizione…' }}
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
                {SORT_OPTIONS.map(opt => (
                  <label key={opt.value} className="page-toolbar__filter-option">
                    <input
                      type="radio"
                      name="cnp-sortBy"
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
              <legend className="page-toolbar__filter-label">Provider</legend>
              <select
                className="sib-select"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as PartnerProvider | '')}
              >
                <option value="">Tutti</option>
                {PROVIDERS_META.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </fieldset>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Stato sync</legend>
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

      <div className="cnp-view__count">
        {displayed.length} connettori{displayed.length !== connectors.length && ` su ${connectors.length}`}
      </div>

      {displayed.length === 0 ? (
        <div className="cnp-view__empty">
          Nessun connettore configurato. Aggiungine uno per importare l'inventario di un partner esterno.
        </div>
      ) : (
        <div className="cnp-view__list">
          {displayed.map(c => {
            const pm = providerMeta(c.provider)
            const canaliAttivi = CANALI_VENDITA.filter(ch => c.canali[ch.id].abilitato)
            return (
              <article key={c.id} className={`cnp-card${c.attivo ? '' : ' cnp-card--off'}`}>
                <div
                  className="cnp-card__provider"
                  style={{ '--provider-color': pm.color } as React.CSSProperties}
                >
                  <Icon family="light" name={pm.icon} />
                </div>

                <div className="cnp-card__body">
                  <div className="cnp-card__head">
                    <h3 className="cnp-card__title">{c.nome}</h3>
                    <span
                      className="cnp-card__provider-badge"
                      style={{ '--provider-color': pm.color } as React.CSSProperties}
                    >
                      {pm.label}
                    </span>
                  </div>
                  <p className="cnp-card__desc">{c.descrizione}</p>

                  <div className="cnp-card__meta-row">
                    <span className={`cnp-card__sync cnp-card__sync--${c.statoSync}`}>
                      <span className="cnp-card__sync-dot" />
                      {SYNC_STATUS_LABELS[c.statoSync]}
                      {c.statoSync === 'ok' && c.ultimoSync && <> · {formatLastSync(c.ultimoSync)}</>}
                    </span>
                    <span className="cnp-card__meta-item">
                      <Icon family="regular" name="building" />
                      {c.struttureImportate.toLocaleString('it-IT')} strutture
                    </span>
                    <span className="cnp-card__meta-item">
                      <Icon family="regular" name="rotate" />
                      {SYNC_FREQUENCY_LABELS[c.syncFrequency]}
                    </span>
                  </div>

                  {c.messaggioSync && (
                    <p className={`cnp-card__sync-msg cnp-card__sync-msg--${c.statoSync}`}>
                      {c.messaggioSync}
                    </p>
                  )}

                  <div className="cnp-card__canali-row">
                    <span className="cnp-card__canali-label">Pubblica su:</span>
                    <div className="cnp-card__canali">
                      {CANALI_VENDITA.map(ch => {
                        const cfg = c.canali[ch.id]
                        const on = cfg.abilitato
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            className={`cnp-card__canale-pill${on ? ' cnp-card__canale-pill--on' : ''}`}
                            style={{ '--canale-color': ch.color } as React.CSSProperties}
                            onClick={() => toggleCanale(c.id, ch.id)}
                            title={`${on ? 'Disabilita' : 'Abilita'} ${ch.label}${on ? ` (markup +${cfg.markup}%)` : ''}`}
                          >
                            {ch.label}
                            {on && cfg.markup > 0 && <span className="cnp-card__canale-markup">+{cfg.markup}%</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="cnp-card__actions">
                  <label className="cnp-card__switch" title={c.attivo ? 'Disattiva connettore' : 'Attiva connettore'}>
                    <input type="checkbox" checked={c.attivo} onChange={() => toggleAttivo(c.id)} />
                    <span className="cnp-card__switch-slider" />
                  </label>
                  <button
                    type="button"
                    className="sib-btn sib-btn--ghost cnp-card__action-btn"
                    onClick={() => triggerSync(c.id)}
                    disabled={!c.attivo || c.statoSync === 'in-corso'}
                  >
                    <Icon family="regular" name="rotate" />
                    Sincronizza ora
                  </button>
                  <button
                    type="button"
                    className="sib-btn sib-btn--ghost cnp-card__action-btn"
                    onClick={() => openEdit(c)}
                  >
                    <Ico n="edit" s={11} c="var(--color-text-inactive)" />
                    Configura
                  </button>
                  <button
                    type="button"
                    className="cnp-card__icon-btn cnp-card__icon-btn--danger"
                    onClick={() => setDeletingId(c.id)}
                    title="Elimina"
                  >
                    <Ico n="trash" s={12} c="var(--color-text-inactive)" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <PartnerConnectorModal
        open={showModal}
        editing={editing}
        form={form}
        setForm={setForm}
        onClose={() => setShowModal(false)}
        onConfirm={confirmEdit}
      />

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina connettore partner"
        itemName={connectors.find(c => c.id === deletingId)?.nome || ''}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
