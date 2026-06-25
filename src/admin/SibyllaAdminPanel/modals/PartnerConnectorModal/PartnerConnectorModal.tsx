import React, { useState } from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField, TextareaField } from '../../../../core/components/form'
import { Icon } from '../../../../modules/purchasing/_shared/Icon'
import { CANALI_VENDITA } from '../../strutture/types'
import {
  AUTH_MODE_LABELS,
  PROVIDERS_META,
  SYNC_FREQUENCY_LABELS,
  providerMeta,
  type AuthMode,
  type FieldMappingRule,
  type PartnerConnector,
  type PartnerConnectorForm,
  type PartnerProvider,
  type SyncFrequency,
} from '../../strutture/partner-types'
import './PartnerConnectorModal.sass'

interface Props {
  open: boolean
  editing: PartnerConnector | null
  form: PartnerConnectorForm
  setForm: (f: PartnerConnectorForm) => void
  onClose: () => void
  onConfirm: () => void
}

type Section = 'identita' | 'endpoint' | 'sync' | 'filtri' | 'mapping' | 'canali' | 'override'

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'identita', label: 'Identità',         icon: 'fa-id-card' },
  { id: 'endpoint', label: 'Endpoint & Auth',  icon: 'fa-key' },
  { id: 'sync',     label: 'Sincronizzazione', icon: 'fa-rotate' },
  { id: 'filtri',   label: 'Filtri import',    icon: 'fa-filter' },
  { id: 'mapping',  label: 'Mappatura campi',  icon: 'fa-arrows-left-right' },
  { id: 'canali',   label: 'Canali e markup',  icon: 'fa-tower-broadcast' },
  { id: 'override', label: 'Override UI',      icon: 'fa-paintbrush' },
]

export default function PartnerConnectorModal({
  open, editing, form, setForm, onClose, onConfirm,
}: Props) {
  const [section, setSection] = useState<Section>('identita')

  const upd = <K extends keyof PartnerConnectorForm>(key: K, value: PartnerConnectorForm[K]) =>
    setForm({ ...form, [key]: value })

  const title = editing ? `Modifica connettore — ${editing.nome}` : 'Nuovo connettore partner'
  const canSave = !!form.nome.trim() && !!form.baseUrl.trim()

  // Quando cambia il provider, applica default ragionevoli.
  const onProviderChange = (p: PartnerProvider) => {
    const meta = providerMeta(p)
    setForm({
      ...form,
      provider: p,
      // Se baseUrl è vuoto o uguale al default del precedente provider, riempi col nuovo default.
      baseUrl: form.baseUrl ? form.baseUrl : meta.defaultBaseUrl,
      authMode: form.authMode === 'api-key' && form.credApiKey === '' ? meta.defaultAuth : form.authMode,
      overridePaletteAccent: form.overridePaletteAccent === '#5C9CD4' ? meta.color : form.overridePaletteAccent,
    })
  }

  // ─── Mapping campi ──────────────────────────────────────────────────────
  const updMapping = (idx: number, patch: Partial<FieldMappingRule>) => {
    upd('fieldMapping', form.fieldMapping.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }
  const addMapping = () => {
    upd('fieldMapping', [...form.fieldMapping, { partnerField: '', sibyllaField: '', trasformazione: '' }])
  }
  const removeMapping = (idx: number) => {
    upd('fieldMapping', form.fieldMapping.filter((_, i) => i !== idx))
  }

  const pm = providerMeta(form.provider)

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="pc-modal">
        <nav className="pc-modal__nav" role="tablist">
          {SECTIONS.map(s => {
            const active = section === s.id
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                className={`pc-modal__nav-btn${active ? ' pc-modal__nav-btn--active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                <i className={`fa-duotone ${s.icon} pc-modal__nav-ico`} />
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="pc-modal__body">

          {/* ═══════════════════════════════════════════════════════════════
              IDENTITÀ
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'identita' && (
            <section className="pc-modal__section">
              <div className="pc-modal__provider-grid">
                {PROVIDERS_META.map(p => {
                  const active = form.provider === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`pc-modal__provider-card${active ? ' pc-modal__provider-card--active' : ''}`}
                      style={{ '--provider-color': p.color } as React.CSSProperties}
                      onClick={() => onProviderChange(p.id)}
                    >
                      <span className="pc-modal__provider-icon">
                        <Icon family="light" name={p.icon} />
                      </span>
                      <span className="pc-modal__provider-label">{p.label}</span>
                      <span className="pc-modal__provider-desc">{p.description}</span>
                    </button>
                  )
                })}
              </div>

              <div className="pc-modal__grid">
                <InputField
                  className="pc-modal__field pc-modal__field--full"
                  name="nome"
                  label="Nome interno del connettore"
                  value={form.nome}
                  onChange={(e) => upd('nome', e.target.value)}
                  placeholder={`es. ${pm.label} — Italian inventory`}
                />
                <TextareaField
                  className="pc-modal__field pc-modal__field--full"
                  name="descrizione"
                  label="Descrizione"
                  rows={2}
                  value={form.descrizione}
                  onChange={(e) => upd('descrizione', e.target.value)}
                  placeholder="Scopo del connettore, contenuti previsti"
                />
                <label className="pc-modal__toggle pc-modal__field--full">
                  <input
                    type="checkbox"
                    checked={form.attivo}
                    onChange={(e) => upd('attivo', e.target.checked)}
                  />
                  Connettore attivo (esegui sync e pubblica sui canali)
                </label>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ENDPOINT & AUTH
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'endpoint' && (
            <section className="pc-modal__section">
              <div className="pc-modal__grid">
                <InputField
                  className="pc-modal__field pc-modal__field--full"
                  name="base-url"
                  label="Base URL endpoint"
                  type="url"
                  value={form.baseUrl}
                  onChange={(e) => upd('baseUrl', e.target.value)}
                  placeholder={pm.defaultBaseUrl || 'https://api.partner.com/v1'}
                />
                <SelectField
                  className="pc-modal__field pc-modal__field--full"
                  name="auth-mode"
                  label="Modalità autenticazione"
                  value={form.authMode}
                  onChange={(e) => upd('authMode', e.target.value as AuthMode)}
                  options={(Object.keys(AUTH_MODE_LABELS) as AuthMode[]).map(m => ({ value: m, label: AUTH_MODE_LABELS[m] }))}
                />

                {/* Campi credenziali condizionali al metodo selezionato */}
                {form.authMode === 'api-key' && (
                  <InputField
                    className="pc-modal__field pc-modal__field--full"
                    name="cred-api-key"
                    label="API key"
                    type="password"
                    value={form.credApiKey}
                    onChange={(e) => upd('credApiKey', e.target.value)}
                    placeholder="••••••••"
                  />
                )}

                {form.authMode === 'basic' && (
                  <>
                    <InputField
                      className="pc-modal__field"
                      name="cred-username"
                      label="Username"
                      value={form.credUsername}
                      onChange={(e) => upd('credUsername', e.target.value)}
                    />
                    <InputField
                      className="pc-modal__field"
                      name="cred-password"
                      label="Password"
                      type="password"
                      value={form.credPassword}
                      onChange={(e) => upd('credPassword', e.target.value)}
                    />
                  </>
                )}

                {form.authMode === 'oauth2' && (
                  <>
                    <InputField
                      className="pc-modal__field"
                      name="cred-client-id"
                      label="Client ID"
                      value={form.credClientId}
                      onChange={(e) => upd('credClientId', e.target.value)}
                    />
                    <InputField
                      className="pc-modal__field"
                      name="cred-client-secret"
                      label="Client secret"
                      type="password"
                      value={form.credClientSecret}
                      onChange={(e) => upd('credClientSecret', e.target.value)}
                    />
                    <InputField
                      className="pc-modal__field pc-modal__field--full"
                      name="cred-tenant-id"
                      label="Tenant ID (opzionale)"
                      value={form.credTenantId}
                      onChange={(e) => upd('credTenantId', e.target.value)}
                    />
                  </>
                )}

                {form.authMode === 'bearer' && (
                  <InputField
                    className="pc-modal__field pc-modal__field--full"
                    name="cred-bearer-token"
                    label="Bearer token"
                    type="password"
                    value={form.credBearerToken}
                    onChange={(e) => upd('credBearerToken', e.target.value)}
                    placeholder="••••••••"
                  />
                )}
              </div>

              <button type="button" className="sib-btn sib-btn--ghost pc-modal__test-btn" disabled>
                <Icon family="regular" name="plug-circle-bolt" />
                Test connessione (disponibile al salvataggio)
              </button>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SYNC
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'sync' && (
            <section className="pc-modal__section">
              <div className="pc-modal__grid">
                <SelectField
                  className="pc-modal__field pc-modal__field--full"
                  name="sync-frequency"
                  label="Frequenza di sincronizzazione"
                  value={form.syncFrequency}
                  onChange={(e) => upd('syncFrequency', e.target.value as SyncFrequency)}
                  options={(Object.keys(SYNC_FREQUENCY_LABELS) as SyncFrequency[]).map(s => ({ value: s, label: SYNC_FREQUENCY_LABELS[s] }))}
                />
                {editing && (
                  <div className="pc-modal__sync-info">
                    <div>
                      <span className="pc-modal__sync-label">Stato</span>
                      <span className={`pc-modal__sync-state pc-modal__sync-state--${editing.statoSync}`}>
                        {editing.statoSync}
                      </span>
                    </div>
                    <div>
                      <span className="pc-modal__sync-label">Ultimo sync</span>
                      <span>{editing.ultimoSync ? new Date(editing.ultimoSync).toLocaleString('it-IT') : '—'}</span>
                    </div>
                    <div>
                      <span className="pc-modal__sync-label">Strutture importate</span>
                      <span>{editing.struttureImportate.toLocaleString('it-IT')}</span>
                    </div>
                    <div className="pc-modal__sync-msg-box">
                      <span className="pc-modal__sync-label">Messaggio</span>
                      <span>{editing.messaggioSync || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              FILTRI IMPORT
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'filtri' && (
            <section className="pc-modal__section">
              <p className="pc-modal__hint-text">
                Limita l'inventario importato dal partner ai parametri qui sotto. Lascia un campo vuoto per non applicare quel filtro.
              </p>
              <div className="pc-modal__grid">
                <div className="pc-modal__field pc-modal__field-raw pc-modal__field--full">
                  <label className="pc-modal__label">Paesi <span className="pc-modal__hint">(ISO codes separati da virgola, es. IT, FR, ES)</span></label>
                  <input
                    type="text"
                    className="sib-input"
                    value={form.filtriPaesi}
                    onChange={(e) => upd('filtriPaesi', e.target.value)}
                  />
                </div>
                <div className="pc-modal__field pc-modal__field-raw pc-modal__field--full">
                  <label className="pc-modal__label">Regioni <span className="pc-modal__hint">(separate da virgola)</span></label>
                  <input
                    type="text"
                    className="sib-input"
                    value={form.filtriRegioni}
                    onChange={(e) => upd('filtriRegioni', e.target.value)}
                    placeholder="es. Toscana, Sicilia, Lazio"
                  />
                </div>
                <InputField
                  className="pc-modal__field"
                  name="filtri-tipi"
                  label="Tipi di struttura"
                  value={form.filtriTipi}
                  onChange={(e) => upd('filtriTipi', e.target.value)}
                  placeholder="hotel, resort, agriturismo"
                />
                <SelectField
                  className="pc-modal__field"
                  name="filtri-class-min"
                  label="Classificazione minima"
                  value={form.filtriClassMin}
                  onChange={(e) => upd('filtriClassMin', e.target.value)}
                  options={[
                    { value: '', label: 'Nessuna' },
                    ...['1★', '2★', '3★', '4★', '5★', '5★L'].map(c => ({ value: c, label: c })),
                  ]}
                />
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              MAPPING CAMPI
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'mapping' && (
            <section className="pc-modal__section">
              <div className="pc-modal__mapping-head">
                <p className="pc-modal__hint-text">
                  Mappa i campi del feed partner sui campi del modello Sibylla.
                  La trasformazione è opzionale (es. <code>prefix:bk-</code>, <code>trim</code>, <code>star→★</code>).
                </p>
                <button type="button" className="sib-btn sib-btn--ghost" onClick={addMapping}>
                  <Ico n="plus" s={11} c="var(--color-primary)" />
                  Aggiungi regola
                </button>
              </div>

              {form.fieldMapping.length === 0 ? (
                <div className="pc-modal__empty-mini">Nessuna regola di mappatura definita.</div>
              ) : (
                <div className="pc-modal__mapping-list">
                  <div className="pc-modal__mapping-header">
                    <span>Campo partner</span>
                    <span>→</span>
                    <span>Campo Sibylla</span>
                    <span>Trasformazione</span>
                    <span />
                  </div>
                  {form.fieldMapping.map((r, idx) => (
                    <div key={idx} className="pc-modal__mapping-row">
                      <input
                        type="text"
                        className="sib-input"
                        value={r.partnerField}
                        onChange={(e) => updMapping(idx, { partnerField: e.target.value })}
                        placeholder="es. hotel_name"
                      />
                      <span className="pc-modal__mapping-arrow">→</span>
                      <input
                        type="text"
                        className="sib-input"
                        value={r.sibyllaField}
                        onChange={(e) => updMapping(idx, { sibyllaField: e.target.value })}
                        placeholder="es. nome"
                      />
                      <input
                        type="text"
                        className="sib-input"
                        value={r.trasformazione}
                        onChange={(e) => updMapping(idx, { trasformazione: e.target.value })}
                        placeholder="opzionale"
                      />
                      <button
                        type="button"
                        className="pc-modal__mapping-remove"
                        onClick={() => removeMapping(idx)}
                      >
                        <Ico n="trash" s={11} c="var(--color-error, #c0392b)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              CANALI & MARKUP
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'canali' && (
            <section className="pc-modal__section">
              <p className="pc-modal__hint-text">
                Definisci su quali canali Sibylla Network pubblicare l'inventario del partner e applica un markup
                percentuale sui prezzi importati. La UI/UX dei canali è quella standard di Sibylla (Agorà e B2B usano
                lo stile piattaforma, B2C lo stile sibyllanetwork.com).
              </p>

              <div className="pc-modal__canali-grid">
                {CANALI_VENDITA.map(ch => {
                  const abilK = ch.id === 'agora' ? 'canaleAgoraAbilitato'
                              : ch.id === 'b2b'   ? 'canaleB2BAbilitato'
                              :                     'canaleB2CAbilitato'
                  const markK = ch.id === 'agora' ? 'canaleAgoraMarkup'
                              : ch.id === 'b2b'   ? 'canaleB2BMarkup'
                              :                     'canaleB2CMarkup'
                  const tagK  = ch.id === 'agora' ? 'canaleAgoraTagline'
                              : ch.id === 'b2b'   ? 'canaleB2BTagline'
                              :                     'canaleB2CTagline'
                  const abil = form[abilK as keyof PartnerConnectorForm] as boolean
                  const mark = form[markK as keyof PartnerConnectorForm] as string
                  const tag  = form[tagK  as keyof PartnerConnectorForm] as string

                  return (
                    <div
                      key={ch.id}
                      className={`pc-modal__canale-card${abil ? ' pc-modal__canale-card--on' : ''}`}
                      style={{ '--canale-color': ch.color } as React.CSSProperties}
                    >
                      <div className="pc-modal__canale-head">
                        <span className="pc-modal__canale-name">{ch.label}</span>
                        <label className="pc-modal__switch">
                          <input
                            type="checkbox"
                            checked={abil}
                            onChange={(e) => upd(abilK as any, e.target.checked as any)}
                          />
                          <span className="pc-modal__switch-slider" />
                        </label>
                      </div>
                      <span className="pc-modal__canale-flavor">
                        UI {ch.uiFlavor === 'platform' ? 'piattaforma Sibylla' : 'sibyllanetwork.com'}
                      </span>
                      <p className="pc-modal__canale-desc">{ch.description}</p>

                      <InputField
                        className="pc-modal__field"
                        name={`canale-markup-${ch.id}`}
                        label="Markup applicato (%)"
                        type="number"
                        step={0.5}
                        min={0}
                        value={mark}
                        onChange={(e) => upd(markK as any, e.target.value as any)}
                        disabled={!abil}
                      />
                      <InputField
                        className="pc-modal__field"
                        name={`canale-tagline-${ch.id}`}
                        label="Tagline override"
                        value={tag}
                        onChange={(e) => upd(tagK as any, e.target.value as any)}
                        disabled={!abil}
                        placeholder="Opzionale — frase di vetrina canale"
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              OVERRIDE UI
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'override' && (
            <section className="pc-modal__section">
              <p className="pc-modal__hint-text">
                Le schede pubblicate mantengono la UI/UX standard dei canali Sibylla; questi parametri permettono
                solo di personalizzare badge e accento colore con il branding del partner.
              </p>
              <div className="pc-modal__grid">
                <InputField
                  className="pc-modal__field pc-modal__field--full"
                  name="override-logo-url"
                  label="URL logo partner"
                  type="url"
                  value={form.overrideLogoUrl}
                  onChange={(e) => upd('overrideLogoUrl', e.target.value)}
                  placeholder="https://…"
                />
                <div className="pc-modal__field pc-modal__field-raw">
                  <label className="pc-modal__label">Colore accento</label>
                  <div className="pc-modal__color-row">
                    <input
                      type="color"
                      className="pc-modal__color-input"
                      value={form.overridePaletteAccent || '#5C9CD4'}
                      onChange={(e) => upd('overridePaletteAccent', e.target.value)}
                    />
                    <input
                      type="text"
                      className="sib-input"
                      value={form.overridePaletteAccent}
                      onChange={(e) => upd('overridePaletteAccent', e.target.value)}
                    />
                  </div>
                </div>
                <label className="pc-modal__toggle pc-modal__field--full">
                  <input
                    type="checkbox"
                    checked={form.overrideMostraBadgePartner}
                    onChange={(e) => upd('overrideMostraBadgePartner', e.target.checked)}
                  />
                  Mostra badge "via {pm.label}" sulle schede pubbliche
                </label>
              </div>

              <div className="pc-modal__override-preview">
                <span className="pc-modal__override-preview-label">Anteprima badge canale</span>
                <span
                  className="pc-modal__override-preview-badge"
                  style={{ '--provider-color': form.overridePaletteAccent || pm.color } as React.CSSProperties}
                >
                  via {pm.label}
                </span>
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="pc-modal__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={onConfirm}
            disabled={!canSave}
          >
            {editing ? 'Salva modifiche' : 'Crea connettore'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
