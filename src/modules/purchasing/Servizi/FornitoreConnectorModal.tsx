import React, { useMemo, useState } from 'react'
import Modal from '../../../core/components/Modal'
import Ico from '../../../core/icons/Ico'
import { InputField, SelectField, TextareaField, CheckboxField } from '../../../core/components/form'
import { Icon } from '../_shared/Icon'
import { useTipiServizioStore } from '../../../store/useTipiServizioStore'
import { MERCATI_SERVIZI } from './servizi-types'
import {
  AUTH_MODE_LABELS,
  FORNITORI_META,
  POLITICA_RIMOZIONE_LABELS,
  PUBBLICAZIONE_LABELS,
  SYNC_FREQUENCY_LABELS,
  fornitoreMeta,
  type AuthMode,
  type CategoryMappingRule,
  type FieldMappingRule,
  type FornitoreProvider,
  type FornitoreServiziConnector,
  type FornitoreServiziForm,
  type PoliticaRimozione,
  type PubblicazioneImport,
  type SyncFrequency,
} from './fornitori-types'
import './FornitoreConnectorModal.sass'

interface Props {
  open: boolean
  editing: FornitoreServiziConnector | null
  form: FornitoreServiziForm
  setForm: (f: FornitoreServiziForm) => void
  onClose: () => void
  onConfirm: () => void
}

type Section = 'identita' | 'endpoint' | 'sync' | 'filtri' | 'categorie' | 'mapping' | 'canali' | 'override'

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'identita',  label: 'Identità',          icon: 'fa-id-card' },
  { id: 'endpoint',  label: 'Endpoint & Auth',   icon: 'fa-key' },
  { id: 'sync',      label: 'Sincronizzazione',  icon: 'fa-rotate' },
  { id: 'filtri',    label: 'Filtri import',     icon: 'fa-filter' },
  { id: 'categorie', label: 'Tipi di servizio',  icon: 'fa-diagram-project' },
  { id: 'mapping',   label: 'Mappatura campi',   icon: 'fa-arrows-left-right' },
  { id: 'canali',    label: 'Canali e markup',   icon: 'fa-tower-broadcast' },
  { id: 'override',  label: 'Override UI',       icon: 'fa-paintbrush' },
]

export default function FornitoreConnectorModal({
  open, editing, form, setForm, onClose, onConfirm,
}: Props) {
  const [section, setSection] = useState<Section>('identita')
  const tipi = useTipiServizioStore(s => s.tipi)

  const upd = <K extends keyof FornitoreServiziForm>(key: K, value: FornitoreServiziForm[K]) =>
    setForm({ ...form, [key]: value })

  const meta = fornitoreMeta(form.provider)
  const title = editing ? `Modifica connettore — ${editing.nome}` : 'Nuovo connettore fornitore'
  const canSave = !!form.nome.trim() && !!form.baseUrl.trim()

  // Cambiando fornitore precompila endpoint, auth, accento e le categorie
  // tipiche del provider (che restano da mappare sui tipi Sibylla).
  const onProviderChange = (p: FornitoreProvider) => {
    const m = fornitoreMeta(p)
    const categorieVuote = form.categoryMapping.every(r => r.tipoServizio === '')
    setForm({
      ...form,
      provider: p,
      baseUrl: form.baseUrl ? form.baseUrl : m.defaultBaseUrl,
      authMode: form.authMode === 'api-key' && form.credApiKey === '' ? m.defaultAuth : form.authMode,
      overridePaletteAccent: form.overridePaletteAccent === '#5C9CD4' ? m.color : form.overridePaletteAccent,
      // Non sovrascrive un lavoro di mappatura già fatto.
      categoryMapping: categorieVuote
        ? m.categorieTipiche.map(c => ({ categoriaFornitore: c, tipoServizio: '' as const }))
        : form.categoryMapping,
    })
  }

  // ─── Mappatura categorie → tipo servizio ──────────────────────────────────
  const updCategoria = (idx: number, patch: Partial<CategoryMappingRule>) =>
    upd('categoryMapping', form.categoryMapping.map((r, i) => i === idx ? { ...r, ...patch } : r))
  const addCategoria = () =>
    upd('categoryMapping', [...form.categoryMapping, { categoriaFornitore: '', tipoServizio: '' }])
  const removeCategoria = (idx: number) =>
    upd('categoryMapping', form.categoryMapping.filter((_, i) => i !== idx))

  const mappate = form.categoryMapping.filter(r => r.tipoServizio !== '').length

  // ─── Mappatura campi ──────────────────────────────────────────────────────
  const updMapping = (idx: number, patch: Partial<FieldMappingRule>) =>
    upd('fieldMapping', form.fieldMapping.map((r, i) => i === idx ? { ...r, ...patch } : r))
  const addMapping = () =>
    upd('fieldMapping', [...form.fieldMapping, { partnerField: '', sibyllaField: '', trasformazione: '' }])
  const removeMapping = (idx: number) =>
    upd('fieldMapping', form.fieldMapping.filter((_, i) => i !== idx))

  const tipiOptions = useMemo(
    () => [{ value: '', label: '— Da mappare —' }, ...tipi.map(t => ({ value: t.id, label: t.label }))],
    [tipi],
  )

  const canaliRows = [
    { id: 'agora', abilitato: 'canaleAgoraAbilitato', markup: 'canaleAgoraMarkup', tagline: 'canaleAgoraTagline' },
    { id: 'b2b',   abilitato: 'canaleB2BAbilitato',   markup: 'canaleB2BMarkup',   tagline: 'canaleB2BTagline'   },
    { id: 'b2c',   abilitato: 'canaleB2CAbilitato',   markup: 'canaleB2CMarkup',   tagline: 'canaleB2CTagline'   },
  ] as const

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="fc-modal">
        <nav className="fc-modal__nav" role="tablist">
          {SECTIONS.map(s => {
            const active = section === s.id
            const alert = s.id === 'categorie' && mappate === 0
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                className={`fc-modal__nav-btn${active ? ' fc-modal__nav-btn--active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                <i className={`fa-duotone ${s.icon} fc-modal__nav-ico`} />
                {s.label}
                {alert && <span className="fc-modal__nav-dot" aria-label="Da completare" />}
              </button>
            )
          })}
        </nav>

        <div className="fc-modal__body">

          {/* ── IDENTITÀ ─────────────────────────────────────────────────── */}
          {section === 'identita' && (
            <section className="fc-modal__section">
              <div className="fc-modal__provider-grid">
                {FORNITORI_META.map(p => {
                  const active = form.provider === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`fc-modal__provider-card${active ? ' fc-modal__provider-card--active' : ''}`}
                      style={{ ['--provider-color' as any]: p.color }}
                      onClick={() => onProviderChange(p.id)}
                    >
                      <span className="fc-modal__provider-icon">
                        <Icon family="light" name={p.icon} />
                      </span>
                      <span className="fc-modal__provider-label">{p.label}</span>
                      <span className="fc-modal__provider-desc">{p.description}</span>
                    </button>
                  )
                })}
              </div>

              <div className="fc-modal__grid">
                <InputField
                  className="fc-modal__field fc-modal__field--full"
                  name="nome"
                  label="Nome interno del connettore"
                  required
                  value={form.nome}
                  placeholder={`es. ${meta.label} — Italia`}
                  onChange={(e) => upd('nome', e.target.value)}
                />
                <TextareaField
                  className="fc-modal__field fc-modal__field--full"
                  name="descrizione"
                  label="Descrizione"
                  rows={2}
                  value={form.descrizione}
                  placeholder="Che tipo di servizi porta dentro questo fornitore"
                  onChange={(e) => upd('descrizione', e.target.value)}
                />
              </div>

              <CheckboxField
                name="attivo"
                label="Connettore attivo"
                checked={form.attivo}
                onChange={(e) => upd('attivo', e.target.checked)}
              />
            </section>
          )}

          {/* ── ENDPOINT & AUTH ──────────────────────────────────────────── */}
          {section === 'endpoint' && (
            <section className="fc-modal__section">
              <div className="fc-modal__grid">
                <InputField
                  className="fc-modal__field fc-modal__field--full"
                  name="baseUrl"
                  label="Base URL endpoint"
                  required
                  value={form.baseUrl}
                  placeholder={meta.defaultBaseUrl || 'https://api.fornitore.com/v1'}
                  onChange={(e) => upd('baseUrl', e.target.value)}
                />
                <SelectField
                  className="fc-modal__field"
                  name="authMode"
                  label="Modalità autenticazione"
                  value={form.authMode}
                  onChange={(e) => upd('authMode', e.target.value as AuthMode)}
                  options={(Object.keys(AUTH_MODE_LABELS) as AuthMode[])
                    .map(a => ({ value: a, label: AUTH_MODE_LABELS[a] }))}
                />
              </div>

              <div className="fc-modal__grid">
                {form.authMode === 'api-key' && (
                  <InputField
                    className="fc-modal__field fc-modal__field--full"
                    name="credApiKey"
                    label="API key"
                    type="password"
                    value={form.credApiKey}
                    onChange={(e) => upd('credApiKey', e.target.value)}
                  />
                )}
                {form.authMode === 'basic' && (
                  <>
                    <InputField
                      className="fc-modal__field" name="credUsername" label="Username"
                      value={form.credUsername} onChange={(e) => upd('credUsername', e.target.value)}
                    />
                    <InputField
                      className="fc-modal__field" name="credPassword" label="Password" type="password"
                      value={form.credPassword} onChange={(e) => upd('credPassword', e.target.value)}
                    />
                  </>
                )}
                {form.authMode === 'oauth2' && (
                  <>
                    <InputField
                      className="fc-modal__field" name="credClientId" label="Client ID"
                      value={form.credClientId} onChange={(e) => upd('credClientId', e.target.value)}
                    />
                    <InputField
                      className="fc-modal__field" name="credClientSecret" label="Client secret" type="password"
                      value={form.credClientSecret} onChange={(e) => upd('credClientSecret', e.target.value)}
                    />
                    <InputField
                      className="fc-modal__field" name="credTenantId" label="Tenant ID (opzionale)"
                      value={form.credTenantId} onChange={(e) => upd('credTenantId', e.target.value)}
                    />
                  </>
                )}
                {form.authMode === 'bearer' && (
                  <InputField
                    className="fc-modal__field fc-modal__field--full"
                    name="credBearerToken" label="Bearer token" type="password"
                    value={form.credBearerToken} onChange={(e) => upd('credBearerToken', e.target.value)}
                  />
                )}
              </div>

              <p className="fc-modal__note">
                <i className="fa-light fa-lock" aria-hidden="true" />
                Le credenziali sono cifrate e valgono solo per questo connettore.
              </p>
            </section>
          )}

          {/* ── SINCRONIZZAZIONE ─────────────────────────────────────────── */}
          {section === 'sync' && (
            <section className="fc-modal__section">
              <div className="fc-modal__grid">
                <SelectField
                  className="fc-modal__field"
                  name="syncFrequency"
                  label="Frequenza di sincronizzazione"
                  value={form.syncFrequency}
                  onChange={(e) => upd('syncFrequency', e.target.value as SyncFrequency)}
                  options={(Object.keys(SYNC_FREQUENCY_LABELS) as SyncFrequency[])
                    .map(f => ({ value: f, label: SYNC_FREQUENCY_LABELS[f] }))}
                />
                <SelectField
                  className="fc-modal__field"
                  name="pubblicazione"
                  label="Servizi importati"
                  value={form.pubblicazione}
                  onChange={(e) => upd('pubblicazione', e.target.value as PubblicazioneImport)}
                  options={(Object.keys(PUBBLICAZIONE_LABELS) as PubblicazioneImport[])
                    .map(p => ({ value: p, label: PUBBLICAZIONE_LABELS[p] }))}
                />
                <SelectField
                  className="fc-modal__field"
                  name="politicaRimozione"
                  label="Se il fornitore rimuove un servizio"
                  value={form.politicaRimozione}
                  onChange={(e) => upd('politicaRimozione', e.target.value as PoliticaRimozione)}
                  options={(Object.keys(POLITICA_RIMOZIONE_LABELS) as PoliticaRimozione[])
                    .map(p => ({ value: p, label: POLITICA_RIMOZIONE_LABELS[p] }))}
                />
              </div>

              <p className="fc-modal__note">
                <i className="fa-light fa-circle-info" aria-hidden="true" />
                Con «{PUBBLICAZIONE_LABELS.moderazione}» i servizi entrano in stato
                «in attesa di approvazione» e restano invisibili ai canali finché non
                vengono approvati.
              </p>
            </section>
          )}

          {/* ── FILTRI IMPORT ────────────────────────────────────────────── */}
          {section === 'filtri' && (
            <section className="fc-modal__section">
              <div className="fc-modal__grid">
                <InputField
                  className="fc-modal__field"
                  name="filtriPaesi" label="Paesi (codici ISO, separati da virgola)"
                  value={form.filtriPaesi} placeholder="IT, ES, FR"
                  onChange={(e) => upd('filtriPaesi', e.target.value)}
                />
                <InputField
                  className="fc-modal__field"
                  name="filtriCitta" label="Città (vuoto = tutte)"
                  value={form.filtriCitta} placeholder="Roma, Firenze, Venezia"
                  onChange={(e) => upd('filtriCitta', e.target.value)}
                />
                <InputField
                  className="fc-modal__field fc-modal__field--full"
                  name="filtriCategorie" label="Categorie del fornitore da importare (vuoto = tutte)"
                  value={form.filtriCategorie}
                  placeholder={meta.categorieTipiche.slice(0, 3).join(', ') || 'Categoria A, Categoria B'}
                  onChange={(e) => upd('filtriCategorie', e.target.value)}
                />
                <InputField
                  className="fc-modal__field"
                  name="filtriPrezzoMax" label="Prezzo massimo (€, 0 = nessun tetto)"
                  type="number" min={0}
                  value={form.filtriPrezzoMax}
                  onChange={(e) => upd('filtriPrezzoMax', e.target.value)}
                />
              </div>

              <CheckboxField
                name="filtriSoloDisponibili"
                label="Importa solo servizi con disponibilità confermata"
                checked={form.filtriSoloDisponibili}
                onChange={(e) => upd('filtriSoloDisponibili', e.target.checked)}
              />
            </section>
          )}

          {/* ── CATEGORIE → TIPI DI SERVIZIO ─────────────────────────────── */}
          {section === 'categorie' && (
            <section className="fc-modal__section">
              <p className="fc-modal__section-intro">
                Ogni categoria del fornitore va ricondotta a un <strong>tipo di servizio
                Sibylla</strong>: è il tipo che definisce i campi del form di prenotazione
                (data, orario, adulti, documento…). Le categorie non mappate vengono
                importate ma <strong>non sono prenotabili</strong>.
              </p>

              <div className={`fc-modal__mapped-badge${mappate === 0 ? ' fc-modal__mapped-badge--alert' : ''}`}>
                <i className={`fa-solid ${mappate === 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} aria-hidden="true" />
                {mappate} di {form.categoryMapping.length} categorie mappate
              </div>

              <div className="fc-modal__cat-list">
                {form.categoryMapping.length === 0 && (
                  <p className="fc-modal__empty-row">
                    Nessuna categoria: aggiungine una, oppure scegli un fornitore con
                    categorie tipiche già note.
                  </p>
                )}
                {form.categoryMapping.map((r, i) => (
                  <div key={i} className="fc-modal__cat-row">
                    <InputField
                      className="fc-modal__cat-field"
                      name={`cat-${i}`}
                      ariaLabel={`Categoria fornitore ${i + 1}`}
                      dense
                      value={r.categoriaFornitore}
                      placeholder="Categoria del fornitore"
                      onChange={(e) => updCategoria(i, { categoriaFornitore: e.target.value })}
                    />
                    <i className="fa-solid fa-arrow-right-long fc-modal__cat-arrow" aria-hidden="true" />
                    <SelectField
                      className="fc-modal__cat-field"
                      name={`tipo-${i}`}
                      value={r.tipoServizio}
                      onChange={(e) => updCategoria(i, { tipoServizio: e.target.value })}
                      options={tipiOptions}
                    />
                    <button
                      type="button"
                      className="fc-modal__row-del"
                      onClick={() => removeCategoria(i)}
                      aria-label={`Rimuovi la categoria ${r.categoriaFornitore || i + 1}`}
                    >
                      <Ico n="trash" s={12} c="var(--color-text-inactive)" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className="sib-btn sib-btn--secondary" onClick={addCategoria}>
                <i className="fa-light fa-circle-plus" aria-hidden="true" />
                Aggiungi categoria
              </button>
            </section>
          )}

          {/* ── MAPPATURA CAMPI ──────────────────────────────────────────── */}
          {section === 'mapping' && (
            <section className="fc-modal__section">
              <p className="fc-modal__section-intro">
                Corrispondenza tra i campi della risposta del fornitore e i campi del
                servizio Sibylla (nome, descrizione, città, durata…).
              </p>

              <div className="fc-modal__cat-list">
                {form.fieldMapping.length === 0 && (
                  <p className="fc-modal__empty-row">
                    Nessuna regola: senza mappatura si usano i nomi campo di default del
                    fornitore.
                  </p>
                )}
                {form.fieldMapping.map((r, i) => (
                  <div key={i} className="fc-modal__map-row">
                    <InputField
                      className="fc-modal__cat-field" name={`pf-${i}`} dense
                      ariaLabel={`Campo fornitore ${i + 1}`}
                      value={r.partnerField} placeholder="campo_fornitore"
                      onChange={(e) => updMapping(i, { partnerField: e.target.value })}
                    />
                    <i className="fa-solid fa-arrow-right-long fc-modal__cat-arrow" aria-hidden="true" />
                    <InputField
                      className="fc-modal__cat-field" name={`sf-${i}`} dense
                      ariaLabel={`Campo Sibylla ${i + 1}`}
                      value={r.sibyllaField} placeholder="campoSibylla"
                      onChange={(e) => updMapping(i, { sibyllaField: e.target.value })}
                    />
                    <InputField
                      className="fc-modal__cat-field" name={`tr-${i}`} dense
                      ariaLabel={`Trasformazione ${i + 1}`}
                      value={r.trasformazione} placeholder="trim, lowercase…"
                      onChange={(e) => updMapping(i, { trasformazione: e.target.value })}
                    />
                    <button
                      type="button"
                      className="fc-modal__row-del"
                      onClick={() => removeMapping(i)}
                      aria-label={`Rimuovi la regola ${i + 1}`}
                    >
                      <Ico n="trash" s={12} c="var(--color-text-inactive)" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className="sib-btn sib-btn--secondary" onClick={addMapping}>
                <i className="fa-light fa-circle-plus" aria-hidden="true" />
                Aggiungi regola
              </button>
            </section>
          )}

          {/* ── CANALI E MARKUP ──────────────────────────────────────────── */}
          {section === 'canali' && (
            <section className="fc-modal__section">
              <p className="fc-modal__section-intro">
                Su quali canali rivendere i servizi di questo fornitore e con quale
                margine sul prezzo netto ricevuto.
              </p>

              {canaliRows.map(row => {
                const canale = MERCATI_SERVIZI.find(m => m.id === row.id)!
                const on = form[row.abilitato] as boolean
                return (
                  <div
                    key={row.id}
                    className={`fc-modal__canale${on ? ' fc-modal__canale--on' : ''}`}
                    style={{ ['--canale-color' as any]: canale.color }}
                  >
                    <div className="fc-modal__canale-head">
                      <CheckboxField
                        name={row.abilitato}
                        label={`Pubblica su ${canale.label}`}
                        checked={on}
                        onChange={(e) => upd(row.abilitato, e.target.checked as never)}
                      />
                    </div>
                    {on && (
                      <div className="fc-modal__grid">
                        <InputField
                          className="fc-modal__field"
                          name={row.markup}
                          label="Markup applicato (%)"
                          type="number" min={0}
                          value={form[row.markup] as string}
                          onChange={(e) => upd(row.markup, e.target.value as never)}
                        />
                        <InputField
                          className="fc-modal__field"
                          name={row.tagline}
                          label="Tagline override (opzionale)"
                          value={form[row.tagline] as string}
                          placeholder="Messaggio marketing per questo canale"
                          onChange={(e) => upd(row.tagline, e.target.value as never)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          )}

          {/* ── OVERRIDE UI ──────────────────────────────────────────────── */}
          {section === 'override' && (
            <section className="fc-modal__section">
              <div className="fc-modal__grid">
                <InputField
                  className="fc-modal__field fc-modal__field--full"
                  name="overrideLogoUrl" label="URL logo fornitore"
                  value={form.overrideLogoUrl}
                  placeholder="https://…"
                  onChange={(e) => upd('overrideLogoUrl', e.target.value)}
                />
                <InputField
                  className="fc-modal__field"
                  name="overridePaletteAccent" label="Colore accento"
                  value={form.overridePaletteAccent}
                  placeholder="#FF5533"
                  onChange={(e) => upd('overridePaletteAccent', e.target.value)}
                />
              </div>
              <CheckboxField
                name="overrideMostraBadgeFornitore"
                label={`Mostra «via ${meta.label}» nella scheda pubblica del servizio`}
                checked={form.overrideMostraBadgeFornitore}
                onChange={(e) => upd('overrideMostraBadgeFornitore', e.target.checked)}
              />
            </section>
          )}
        </div>

        <div className="fc-modal__foot">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            disabled={!canSave}
            onClick={onConfirm}
          >
            {editing ? 'Salva modifiche' : 'Crea connettore'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
