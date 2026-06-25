import React, { useState } from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField, TextareaField } from '../../../../core/components/form'
import { Icon } from '../../../../modules/purchasing/_shared/Icon'
import {
  AMBITI,
  ARRANGIAMENTI_OPTIONS,
  CANALI_VENDITA,
  CLASSIFICAZIONI,
  TIPI_STRUTTURA,
  type CanaleVendita,
  type Struttura,
  type StrutturaForm,
  type TipologiaCamera,
} from '../../strutture/types'
import './StrutturaPlatformModal.sass'

interface Props {
  open: boolean
  editing: Struttura | null
  form: StrutturaForm
  setForm: (f: StrutturaForm) => void
  onClose: () => void
  onConfirm: () => void
}

type Section = 'identita' | 'foto' | 'posizione' | 'contatti' | 'camere' | 'canali' | 'config'

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'identita',  label: 'Identità',         icon: 'fa-id-card' },
  { id: 'foto',      label: 'Foto e galleria',  icon: 'fa-images' },
  { id: 'posizione', label: 'Posizione',        icon: 'fa-location-dot' },
  { id: 'contatti',  label: 'Contatti',         icon: 'fa-envelope' },
  { id: 'camere',    label: 'Tipologie camere', icon: 'fa-bed' },
  { id: 'canali',    label: 'Canali e prezzi',  icon: 'fa-tower-broadcast' },
  { id: 'config',    label: 'Configurazione',   icon: 'fa-gear' },
]

const newTipologiaId = () => `cam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`

export default function StrutturaPlatformModal({
  open, editing, form, setForm, onClose, onConfirm,
}: Props) {
  const [section, setSection] = useState<Section>('identita')

  const upd = <K extends keyof StrutturaForm>(key: K, value: StrutturaForm[K]) =>
    setForm({ ...form, [key]: value })

  const title = editing ? 'Modifica struttura' : 'Nuova struttura'
  const canSave = !!form.nome.trim() && !!form.citta.trim()

  // Arrangiamenti chip toggle
  const toggleArr = (code: string) => {
    const list = form.arrangiamenti
      .split(',')
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
    const has = list.includes(code)
    const next = has ? list.filter(x => x !== code) : [...list, code]
    upd('arrangiamenti', next.join(', '))
  }
  const arrSet = new Set(
    form.arrangiamenti.split(',').map(x => x.trim().toUpperCase()).filter(Boolean),
  )

  // ─── Galleria foto ──────────────────────────────────────────────────────
  const galleriaArr = form.galleria.split('\n').map(x => x.trim()).filter(Boolean)

  const addFoto = () => upd('galleria', form.galleria + (form.galleria ? '\n' : '') + '')
  const removeFoto = (idx: number) => {
    const list = galleriaArr.filter((_, i) => i !== idx)
    upd('galleria', list.join('\n'))
  }
  const updFoto = (idx: number, url: string) => {
    const list = galleriaArr.map((u, i) => i === idx ? url : u)
    upd('galleria', list.join('\n'))
  }

  // ─── Tipologie camere ───────────────────────────────────────────────────
  const updCamera = (idx: number, patch: Partial<TipologiaCamera>) => {
    const list = form.tipologieCamere.map((c, i) => i === idx ? { ...c, ...patch } : c)
    upd('tipologieCamere', list)
  }
  const addCamera = () => {
    const nuova: TipologiaCamera = {
      id: newTipologiaId(),
      nome: 'Nuova tipologia',
      descrizione: '',
      capacita: 2,
      letti: '1 matrimoniale',
      metratura: 20,
      immagineUrl: '',
      prezzoAgora: 0, prezzoB2B: 0, prezzoB2C: 0,
    }
    upd('tipologieCamere', [...form.tipologieCamere, nuova])
  }
  const removeCamera = (idx: number) => {
    upd('tipologieCamere', form.tipologieCamere.filter((_, i) => i !== idx))
  }

  // ─── Tab canale attivo (UI preview) ─────────────────────────────────────
  const [canaleAttivo, setCanaleAttivo] = useState<CanaleVendita>('agora')

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="str-modal">
        {/* ─── Nav sezioni ───────────────────────────────────────────────── */}
        <nav className="str-modal__nav" role="tablist">
          {SECTIONS.map(s => {
            const active = section === s.id
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                className={`str-modal__nav-btn${active ? ' str-modal__nav-btn--active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                <i className={`fa-duotone ${s.icon} str-modal__nav-ico`} />
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="str-modal__body">

          {/* ═══════════════════════════════════════════════════════════════
              IDENTITÀ
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'identita' && (
            <section className="str-modal__section">
              <div className="str-modal__grid str-modal__grid--3">
                <InputField
                  className="str-modal__field str-modal__field--full"
                  name="nome"
                  label="Nome struttura"
                  value={form.nome}
                  onChange={(e) => upd('nome', e.target.value)}
                  placeholder="es. Eternal City Boutique Hotel"
                />
                <InputField
                  className="str-modal__field str-modal__field--full"
                  name="ragione-sociale"
                  label="Ragione sociale"
                  value={form.ragioneSociale}
                  onChange={(e) => upd('ragioneSociale', e.target.value)}
                  placeholder="es. Eternal Hospitality S.r.l."
                />
                <SelectField
                  className="str-modal__field"
                  name="tipo"
                  label="Tipo"
                  value={form.tipo}
                  onChange={(e) => upd('tipo', e.target.value as StrutturaForm['tipo'])}
                  options={TIPI_STRUTTURA.map(t => ({ value: t.value, label: t.label }))}
                />
                <SelectField
                  className="str-modal__field"
                  name="classificazione"
                  label="Classificazione (★)"
                  value={form.classificazione}
                  onChange={(e) => upd('classificazione', e.target.value as StrutturaForm['classificazione'])}
                  options={CLASSIFICAZIONI.map(c => ({ value: c, label: c }))}
                />
                <SelectField
                  className="str-modal__field"
                  name="ambito"
                  label="Ambito"
                  value={form.ambito}
                  onChange={(e) => upd('ambito', e.target.value as StrutturaForm['ambito'])}
                  options={AMBITI.map(a => ({ value: a.value, label: a.label }))}
                />
                <TextareaField
                  className="str-modal__field str-modal__field--full"
                  name="descrizione"
                  label="Descrizione struttura"
                  rows={3}
                  value={form.descrizione}
                  onChange={(e) => upd('descrizione', e.target.value)}
                  placeholder="Cosa rende speciale la struttura"
                />
                <TextareaField
                  className="str-modal__field str-modal__field--full"
                  name="descrizione-localita"
                  label="Descrizione della località"
                  rows={3}
                  value={form.descrizioneLocalita}
                  onChange={(e) => upd('descrizioneLocalita', e.target.value)}
                  placeholder="Cosa c'è da vedere nei dintorni, atmosfera, attrazioni vicine"
                />
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              FOTO E GALLERIA
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'foto' && (
            <section className="str-modal__section">
              <div className="str-modal__hero">
                <InputField
                  className="str-modal__field str-modal__field--full"
                  name="foto-principale"
                  label="Foto principale (hero della scheda)"
                  type="url"
                  value={form.fotoPrincipale}
                  onChange={(e) => upd('fotoPrincipale', e.target.value)}
                  placeholder="https://…"
                />
                <div className="str-modal__hero-preview">
                  {form.fotoPrincipale
                    ? <img src={form.fotoPrincipale} alt="Hero" />
                    : <div className="str-modal__hero-placeholder">
                        <Ico n="image" s={32} c="var(--color-text-disabled)" />
                        Nessuna foto principale
                      </div>}
                </div>
              </div>

              <div className="str-modal__gallery">
                <div className="str-modal__gallery-head">
                  <label className="str-modal__label">Galleria — foto scorrevoli e cliccabili nella scheda</label>
                  <button type="button" className="sib-btn sib-btn--ghost" onClick={addFoto}>
                    <Ico n="plus" s={11} c="var(--color-primary)" />
                    Aggiungi foto
                  </button>
                </div>

                {galleriaArr.length === 0 ? (
                  <div className="str-modal__empty-mini">Nessuna foto aggiuntiva. Aggiungi URL di immagini per arricchire la scheda.</div>
                ) : (
                  <div className="str-modal__gallery-list">
                    {galleriaArr.map((url, idx) => (
                      <div key={idx} className="str-modal__gallery-row">
                        <div className="str-modal__gallery-thumb">
                          {url
                            ? <img src={url} alt={`Foto ${idx + 1}`} />
                            : <Ico n="image" s={18} c="var(--color-text-disabled)" />}
                        </div>
                        <input
                          type="url"
                          className="sib-input"
                          value={url}
                          onChange={(e) => updFoto(idx, e.target.value)}
                          placeholder="https://…"
                        />
                        <button
                          type="button"
                          className="str-modal__gallery-remove"
                          onClick={() => removeFoto(idx)}
                          title="Rimuovi"
                        >
                          <Ico n="trash" s={12} c="var(--color-error, #c0392b)" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              POSIZIONE
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'posizione' && (
            <section className="str-modal__section">
              <div className="str-modal__grid str-modal__grid--3">
                <InputField className="str-modal__field str-modal__field--full" name="indirizzo" label="Indirizzo" value={form.indirizzo} onChange={(e) => upd('indirizzo', e.target.value)} />
                <InputField className="str-modal__field" name="citta" label="Città" value={form.citta} onChange={(e) => upd('citta', e.target.value)} />
                <InputField className="str-modal__field" name="provincia" label="Provincia (sigla)" maxLength={2} value={form.provincia} onChange={(e) => upd('provincia', e.target.value)} />
                <InputField className="str-modal__field" name="regione" label="Regione" value={form.regione} onChange={(e) => upd('regione', e.target.value)} />
                <InputField className="str-modal__field" name="cap" label="CAP" value={form.cap} onChange={(e) => upd('cap', e.target.value)} />
                <InputField className="str-modal__field" name="paese" label="Paese" value={form.paese} onChange={(e) => upd('paese', e.target.value)} />
                <InputField className="str-modal__field" name="lat" label="Latitudine" type="number" step={0.0001} value={form.lat} onChange={(e) => upd('lat', e.target.value)} placeholder="es. 41.8925" />
                <InputField className="str-modal__field" name="lon" label="Longitudine" type="number" step={0.0001} value={form.lon} onChange={(e) => upd('lon', e.target.value)} placeholder="es. 12.4924" />
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              CONTATTI
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'contatti' && (
            <section className="str-modal__section">
              <div className="str-modal__grid">
                <InputField className="str-modal__field" name="email" label="Email" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} />
                <InputField className="str-modal__field" name="telefono" label="Telefono" type="tel" value={form.telefono} onChange={(e) => upd('telefono', e.target.value)} />
                <InputField className="str-modal__field str-modal__field--full" name="sito" label="Sito web" type="url" value={form.sito} onChange={(e) => upd('sito', e.target.value)} placeholder="es. miastruttura.it" />
                <InputField className="str-modal__field" name="logo-url" label="Logo (URL)" type="url" value={form.logoUrl} onChange={(e) => upd('logoUrl', e.target.value)} placeholder="https://…" />
                <InputField className="str-modal__field" name="cliente-id" label="ID cliente" type="number" value={form.clienteId} onChange={(e) => upd('clienteId', e.target.value)} />
                <InputField className="str-modal__field" name="cliente-nome" label="Nome cliente" value={form.clienteNome} onChange={(e) => upd('clienteNome', e.target.value)} placeholder="Ragione sociale" />
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TIPOLOGIE CAMERE — i prezzi per canale vivono qui
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'camere' && (
            <section className="str-modal__section">
              <div className="str-modal__camere-head">
                <p className="str-modal__hint-text">
                  Configura le tipologie con i prezzi differenziati per i tre canali.
                  Imposta 0 per disattivare la vendita di una tipologia su un canale specifico.
                </p>
                <button type="button" className="sib-btn sib-btn--primary" onClick={addCamera}>
                  <Ico n="plus" s={11} c="#fff" />
                  Aggiungi tipologia
                </button>
              </div>

              {form.tipologieCamere.length === 0 ? (
                <div className="str-modal__empty-mini">
                  Nessuna tipologia configurata. Aggiungine almeno una per pubblicare la struttura sui canali di vendita.
                </div>
              ) : (
                <div className="str-modal__camere">
                  {form.tipologieCamere.map((c, idx) => (
                    <div key={c.id} className="str-modal__camera">
                      <div className="str-modal__camera-thumb">
                        {c.immagineUrl
                          ? <img src={c.immagineUrl} alt={c.nome} />
                          : <Ico n="image" s={22} c="var(--color-text-disabled)" />}
                      </div>
                      <div className="str-modal__camera-body">
                        <div className="str-modal__grid str-modal__grid--3">
                          <InputField
                            className="str-modal__field str-modal__field--full"
                            name={`camera-nome-${idx}`}
                            label="Nome tipologia"
                            value={c.nome}
                            onChange={(e) => updCamera(idx, { nome: e.target.value })}
                          />
                          <InputField
                            className="str-modal__field str-modal__field--full"
                            name={`camera-descrizione-${idx}`}
                            label="Descrizione"
                            value={c.descrizione}
                            onChange={(e) => updCamera(idx, { descrizione: e.target.value })}
                          />
                          <InputField
                            className="str-modal__field"
                            name={`camera-capacita-${idx}`}
                            label="Capacità (pax)"
                            type="number" min={1}
                            value={c.capacita}
                            onChange={(e) => updCamera(idx, { capacita: parseInt(e.target.value || '0', 10) })}
                          />
                          <InputField
                            className="str-modal__field"
                            name={`camera-letti-${idx}`}
                            label="Letti"
                            value={c.letti}
                            onChange={(e) => updCamera(idx, { letti: e.target.value })}
                          />
                          <InputField
                            className="str-modal__field"
                            name={`camera-metratura-${idx}`}
                            label="Metratura (m²)"
                            type="number" min={0}
                            value={c.metratura}
                            onChange={(e) => updCamera(idx, { metratura: parseInt(e.target.value || '0', 10) })}
                          />
                          <InputField
                            className="str-modal__field str-modal__field--full"
                            name={`camera-immagine-${idx}`}
                            label="Foto camera (URL)"
                            type="url"
                            value={c.immagineUrl}
                            onChange={(e) => updCamera(idx, { immagineUrl: e.target.value })}
                          />
                          <InputField
                            className="str-modal__field str-modal__price-field str-modal__price-field--agora"
                            name={`camera-prezzo-agora-${idx}`}
                            label="Prezzo Agorà (€/notte)"
                            type="number" step={0.01} min={0}
                            value={c.prezzoAgora}
                            onChange={(e) => updCamera(idx, { prezzoAgora: parseFloat(e.target.value) || 0 })}
                          />
                          <InputField
                            className="str-modal__field str-modal__price-field str-modal__price-field--b2b"
                            name={`camera-prezzo-b2b-${idx}`}
                            label="Prezzo B2B (€/notte)"
                            type="number" step={0.01} min={0}
                            value={c.prezzoB2B}
                            onChange={(e) => updCamera(idx, { prezzoB2B: parseFloat(e.target.value) || 0 })}
                          />
                          <InputField
                            className="str-modal__field str-modal__price-field str-modal__price-field--b2c"
                            name={`camera-prezzo-b2c-${idx}`}
                            label="Prezzo B2C (€/notte)"
                            type="number" step={0.01} min={0}
                            value={c.prezzoB2C}
                            onChange={(e) => updCamera(idx, { prezzoB2C: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="str-modal__camera-remove"
                        onClick={() => removeCamera(idx)}
                        title="Rimuovi tipologia"
                      >
                        <Ico n="trash" s={13} c="var(--color-error, #c0392b)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              CANALI E PREZZI — pubblicazione e preview UI per canale
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'canali' && (
            <section className="str-modal__section">
              <div className="str-modal__canali-nav">
                {CANALI_VENDITA.map(c => {
                  const active = canaleAttivo === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`str-modal__canale-tab${active ? ' str-modal__canale-tab--active' : ''}`}
                      style={{ '--canale-color': c.color } as React.CSSProperties}
                      onClick={() => setCanaleAttivo(c.id)}
                    >
                      <span className="str-modal__canale-dot" />
                      <span className="str-modal__canale-tab-label">{c.label}</span>
                      <span className="str-modal__canale-flavor">
                        → {c.destinazione}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Configurazione canale corrente */}
              {(() => {
                const cMeta = CANALI_VENDITA.find(x => x.id === canaleAttivo)!
                const pubblK = `canale${canaleAttivo === 'agora' ? 'Agora' : canaleAttivo === 'b2b' ? 'B2B' : 'B2C'}Pubblicata` as keyof StrutturaForm
                const tagK   = `canale${canaleAttivo === 'agora' ? 'Agora' : canaleAttivo === 'b2b' ? 'B2B' : 'B2C'}Tagline` as keyof StrutturaForm
                const noteK  = `canale${canaleAttivo === 'agora' ? 'Agora' : canaleAttivo === 'b2b' ? 'B2B' : 'B2C'}Note` as keyof StrutturaForm
                const pubbl = form[pubblK] as boolean
                const tag   = form[tagK]   as string
                const note  = form[noteK]  as string

                return (
                  <>
                    <div className="str-modal__canale-config">
                      <div className="str-modal__canale-destinazione">
                        <span className="str-modal__canale-destinazione-label">Destinazione di pubblicazione</span>
                        <span
                          className="str-modal__canale-destinazione-value"
                          style={{ '--canale-color': cMeta.color } as React.CSSProperties}
                        >
                          <Icon family="regular" name="arrow-right" />
                          {cMeta.destinazione}
                          {cMeta.destinazioneUrl && (
                            <code className="str-modal__canale-destinazione-url">{cMeta.destinazioneUrl}</code>
                          )}
                        </span>
                      </div>
                      <p className="str-modal__hint-text">{cMeta.description}</p>
                      <label className="str-modal__toggle">
                        <input
                          type="checkbox"
                          checked={pubbl}
                          onChange={(e) => upd(pubblK, e.target.checked as any)}
                        />
                        Pubblicata su {cMeta.label}
                      </label>
                      <InputField
                        className="str-modal__field str-modal__field--full"
                        name="canale-tagline"
                        label="Tagline / slogan canale"
                        value={tag}
                        onChange={(e) => upd(tagK, e.target.value as any)}
                        placeholder="Breve frase di lancio specifica per questo canale"
                      />
                      <TextareaField
                        className="str-modal__field str-modal__field--full"
                        name="canale-note"
                        label="Note pubblicazione / condizioni"
                        rows={2}
                        value={note}
                        onChange={(e) => upd(noteK, e.target.value as any)}
                        placeholder="es. cancellazione gratuita fino a 48h, free breakfast incluso, ecc."
                      />
                    </div>

                    {/* Preview: Agorà e B2B condividono lo stesso layout
                        (uiFlavor=platform), B2C ha quello consumer. */}
                    <div className="str-modal__preview-wrap">
                      <div className="str-modal__preview-head">
                        <Icon family="light" name="eye" />
                        Anteprima — come apparirà su <strong>{cMeta.destinazione}</strong>
                      </div>
                      {cMeta.uiFlavor === 'platform'
                        ? <PreviewPlatform form={form} tag={tag} cMeta={cMeta} />
                        : <PreviewConsumer form={form} tag={tag} />}
                    </div>
                  </>
                )
              })()}
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              CONFIGURAZIONE OPERATIVA
              ═══════════════════════════════════════════════════════════════ */}
          {section === 'config' && (
            <section className="str-modal__section">
              <div className="str-modal__grid str-modal__grid--3">
                <InputField className="str-modal__field" name="camere" label="Camere totali" type="number" min={0} value={form.camere} onChange={(e) => upd('camere', e.target.value)} />
                <InputField className="str-modal__field" name="valuta" label="Valuta" maxLength={3} value={form.valuta} onChange={(e) => upd('valuta', e.target.value)} placeholder="EUR" />
                <InputField className="str-modal__field" name="lingua" label="Lingua" maxLength={2} value={form.lingua} onChange={(e) => upd('lingua', e.target.value)} placeholder="it" />
                <InputField className="str-modal__field" name="timezone" label="Timezone" value={form.timezone} onChange={(e) => upd('timezone', e.target.value)} placeholder="Europe/Rome" />
                <InputField className="str-modal__field" name="tassa-soggiorno" label="Tassa di soggiorno (€)" type="number" step={0.5} min={0} value={form.tassaSoggiorno} onChange={(e) => upd('tassaSoggiorno', e.target.value)} />
                <div className="str-modal__field str-modal__field-raw">
                  <label className="str-modal__label">Check-in dalle</label>
                  <input type="time" className="sib-input" value={form.checkInOra} onChange={(e) => upd('checkInOra', e.target.value)} />
                </div>
                <div className="str-modal__field str-modal__field-raw">
                  <label className="str-modal__label">Check-out entro</label>
                  <input type="time" className="sib-input" value={form.checkOutOra} onChange={(e) => upd('checkOutOra', e.target.value)} />
                </div>
                <div className="str-modal__field str-modal__field--full">
                  <label className="str-modal__label">Arrangiamenti</label>
                  <div className="str-modal__arr-chips">
                    {ARRANGIAMENTI_OPTIONS.map(code => {
                      const active = arrSet.has(code)
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`str-modal__arr-chip${active ? ' str-modal__arr-chip--active' : ''}`}
                          onClick={() => toggleArr(code)}
                          aria-pressed={active}
                        >
                          {code}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <label className="str-modal__toggle str-modal__field--full">
                  <input
                    type="checkbox"
                    checked={form.attiva}
                    onChange={(e) => upd('attiva', e.target.checked)}
                  />
                  Attiva nelle operazioni (PMS / planner / cassa)
                </label>
              </div>
            </section>
          )}
        </div>

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <div className="str-modal__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={onConfirm}
            disabled={!canSave}
          >
            {editing ? 'Salva modifiche' : 'Crea struttura'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Preview Platform (Agorà / B2B) — UI compatta stile dashboard Sibylla ───
// Agorà e B2B condividono identico layout: cambia solo etichetta canale,
// colore badge e (a livello logico) la pagina di destinazione.
function PreviewPlatform({ form, tag, cMeta }: {
  form: StrutturaForm
  tag: string
  cMeta: { label: string; color: string; destinazione: string }
}) {
  const minPrice = form.tipologieCamere
    .map(c => cMeta.label === 'Agorà' ? c.prezzoAgora : c.prezzoB2B)
    .filter(p => p > 0)
    .sort((a, b) => a - b)[0]

  return (
    <div className="str-preview str-preview--platform">
      <div className="str-preview__img-wrap">
        {form.fotoPrincipale
          ? <img src={form.fotoPrincipale} alt={form.nome} />
          : <div className="str-preview__img-placeholder">Foto principale</div>}
        <span
          className="str-preview__badge"
          style={{ '--canale-color': cMeta.color } as React.CSSProperties}
        >
          {cMeta.label}
        </span>
        <span className="str-preview__destination" title={cMeta.destinazione}>
          {cMeta.destinazione}
        </span>
      </div>
      <div className="str-preview__body">
        <div className="str-preview__head">
          <h4 className="str-preview__title">{form.nome || 'Nome struttura'}</h4>
          <span className="str-preview__stars">{form.classificazione}</span>
        </div>
        <p className="str-preview__city">{form.citta}, {form.regione}</p>
        {tag && <p className="str-preview__tag">{tag}</p>}
        <p className="str-preview__desc">{form.descrizione}</p>
        <div className="str-preview__cta-row">
          <span className="str-preview__price">
            {minPrice ? <>da € {minPrice.toFixed(0)} <small>/notte</small></> : '— prezzo non definito —'}
          </span>
          <span className="str-preview__btn-platform">Apri scheda</span>
        </div>
      </div>
    </div>
  )
}

// ─── Preview Consumer (B2C) — UI sibyllanetwork.com (OTA-style) ─────────────
function PreviewConsumer({ form, tag }: { form: StrutturaForm; tag: string }) {
  const minPrice = form.tipologieCamere
    .map(c => c.prezzoB2C)
    .filter(p => p > 0)
    .sort((a, b) => a - b)[0]

  const galleria = form.galleria.split('\n').map(x => x.trim()).filter(Boolean)

  return (
    <div className="str-preview str-preview--consumer">
      <div className="str-preview-c__hero">
        {form.fotoPrincipale
          ? <img src={form.fotoPrincipale} alt={form.nome} />
          : <div className="str-preview-c__hero-placeholder">Foto principale</div>}
        <div className="str-preview-c__hero-overlay">
          <span className="str-preview-c__stars">{form.classificazione}</span>
          <h4 className="str-preview-c__title">{form.nome || 'Nome struttura'}</h4>
          <p className="str-preview-c__city">{form.citta}, {form.regione}</p>
          {tag && <p className="str-preview-c__tag">{tag}</p>}
        </div>
      </div>

      {galleria.length > 0 && (
        <div className="str-preview-c__gallery">
          {galleria.slice(0, 5).map((u, i) => (
            <div key={i} className="str-preview-c__gallery-thumb">
              <img src={u} alt={`thumb-${i}`} />
            </div>
          ))}
        </div>
      )}

      <div className="str-preview-c__body">
        <p className="str-preview-c__desc">{form.descrizione}</p>
        {form.descrizioneLocalita && (
          <p className="str-preview-c__locality">
            <strong>La località — </strong>{form.descrizioneLocalita}
          </p>
        )}
        <div className="str-preview-c__cta">
          <div>
            <span className="str-preview-c__price-label">A partire da</span>
            <span className="str-preview-c__price">
              {minPrice ? <>€ {minPrice.toFixed(0)} <small>/notte</small></> : '— prezzo non definito —'}
            </span>
          </div>
          <span className="str-preview-c__btn">Prenota ora</span>
        </div>
      </div>
    </div>
  )
}
