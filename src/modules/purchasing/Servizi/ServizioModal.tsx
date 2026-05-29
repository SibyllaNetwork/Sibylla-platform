import React from 'react'
import Modal from '../../../core/components/Modal'
import { Icon } from '../_shared/Icon'
import { useTipiServizioStore } from '../../../store/useTipiServizioStore'
import {
  type Servizio,
  type ServizioForm,
} from './servizi-types'
import './ServizioModal.sass'

interface Props {
  open: boolean
  editing: Servizio | null
  form: ServizioForm
  setForm: (f: ServizioForm) => void
  onClose: () => void
  onConfirm: () => void
}

const PRICING_OPTIONS: Array<{ value: ServizioForm['pricingMode']; label: string }> = [
  { value: 'per-persona', label: 'Per persona' },
  { value: 'per-gruppo',  label: 'Per gruppo' },
  { value: 'per-giorno',  label: 'Per giorno' },
  { value: 'per-ora',     label: 'Per ora' },
]

export default function ServizioModal({ open, editing, form, setForm, onClose, onConfirm }: Props) {
  const tipi = useTipiServizioStore(s => s.tipi)
  const upd = <K extends keyof ServizioForm>(key: K, value: ServizioForm[K]) =>
    setForm({ ...form, [key]: value })

  const title = editing ? 'Modifica servizio' : 'Crea servizio'
  const canSave =
    form.nome.trim() &&
    form.citta.trim() &&
    form.prezzoAgora !== '' &&
    form.prezzoB2B   !== '' &&
    form.prezzoB2C   !== ''

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="srv-modal">
        {/* ─── Sezione 1: Identità ───────────────────────────────────────── */}
        <section className="srv-modal__section">
          <h3 className="srv-modal__section-title">Identità</h3>
          <div className="srv-modal__grid">
            <div className="srv-modal__field srv-modal__field--full">
              <label className="srv-modal__label">Tipo di servizio</label>
              <div className="srv-modal__type-grid">
                {tipi.map(t => {
                  const active = form.tipo === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`srv-modal__type-chip${active ? ' srv-modal__type-chip--active' : ''}`}
                      onClick={() => upd('tipo', t.id)}
                      aria-pressed={active}
                    >
                      <Icon family="light" name={t.icon} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="srv-modal__field srv-modal__field--full">
              <label className="srv-modal__label">Nome</label>
              <input
                type="text"
                className="sib-input"
                value={form.nome}
                onChange={(e) => upd('nome', e.target.value)}
                placeholder="Es. Tour Cinque Terre in barca"
              />
            </div>

            <div className="srv-modal__field srv-modal__field--full">
              <label className="srv-modal__label">Descrizione</label>
              <textarea
                className="sib-input sib-input--area"
                value={form.descrizione}
                onChange={(e) => upd('descrizione', e.target.value)}
                rows={3}
                placeholder="Descrivi cosa è incluso, durata e dettagli logistici"
              />
            </div>

            <div className="srv-modal__field">
              <label className="srv-modal__label">Città</label>
              <input
                type="text"
                className="sib-input"
                value={form.citta}
                onChange={(e) => upd('citta', e.target.value)}
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Paese</label>
              <input
                type="text"
                className="sib-input"
                value={form.paese}
                onChange={(e) => upd('paese', e.target.value)}
              />
            </div>
            <div className="srv-modal__field srv-modal__field--full">
              <label className="srv-modal__label">URL immagine</label>
              <input
                type="url"
                className="sib-input"
                value={form.immagineUrl}
                onChange={(e) => upd('immagineUrl', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
        </section>

        {/* ─── Sezione 2: Disponibilità e capienza ───────────────────────── */}
        <section className="srv-modal__section">
          <h3 className="srv-modal__section-title">Disponibilità e capienza</h3>
          <div className="srv-modal__grid">
            <div className="srv-modal__field">
              <label className="srv-modal__label">Disponibile dal</label>
              <input
                type="date"
                className="sib-input"
                value={form.disponibileDal}
                onChange={(e) => upd('disponibileDal', e.target.value)}
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Disponibile al</label>
              <input
                type="date"
                className="sib-input"
                value={form.disponibileAl}
                onChange={(e) => upd('disponibileAl', e.target.value)}
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Max adulti per slot</label>
              <input
                type="number"
                className="sib-input"
                min={0}
                value={form.adultiMax}
                onChange={(e) => upd('adultiMax', e.target.value)}
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Max bambini per slot</label>
              <input
                type="number"
                className="sib-input"
                min={0}
                value={form.bambiniMax}
                onChange={(e) => upd('bambiniMax', e.target.value)}
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Durata</label>
              <input
                type="text"
                className="sib-input"
                value={form.durata}
                onChange={(e) => upd('durata', e.target.value)}
                placeholder="Es. 2h, 1 giorno, weekend"
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Modalità prezzo</label>
              <select
                className="sib-select"
                value={form.pricingMode}
                onChange={(e) => upd('pricingMode', e.target.value as ServizioForm['pricingMode'])}
              >
                {PRICING_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ─── Sezione 3: Listini ────────────────────────────────────────── */}
        <section className="srv-modal__section">
          <h3 className="srv-modal__section-title">Listini (€)</h3>
          <div className="srv-modal__grid srv-modal__grid--3">
            <div className="srv-modal__field srv-modal__price-field srv-modal__price-field--agora">
              <label className="srv-modal__label">Agorà</label>
              <input
                type="number"
                step="0.01"
                className="sib-input"
                value={form.prezzoAgora}
                onChange={(e) => upd('prezzoAgora', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="srv-modal__field srv-modal__price-field srv-modal__price-field--b2b">
              <label className="srv-modal__label">B2B</label>
              <input
                type="number"
                step="0.01"
                className="sib-input"
                value={form.prezzoB2B}
                onChange={(e) => upd('prezzoB2B', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="srv-modal__field srv-modal__price-field srv-modal__price-field--b2c">
              <label className="srv-modal__label">B2C</label>
              <input
                type="number"
                step="0.01"
                className="sib-input"
                value={form.prezzoB2C}
                onChange={(e) => upd('prezzoB2C', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
        </section>

        {/* ─── Sezione 4: Caratteristiche e fornitore ────────────────────── */}
        <section className="srv-modal__section">
          <h3 className="srv-modal__section-title">Caratteristiche e fornitore</h3>
          <div className="srv-modal__grid">
            <div className="srv-modal__field srv-modal__field--full">
              <label className="srv-modal__label">
                Caratteristiche / inclusioni <span className="srv-modal__hint">(separate da virgola)</span>
              </label>
              <input
                type="text"
                className="sib-input"
                value={form.caratteristiche}
                onChange={(e) => upd('caratteristiche', e.target.value)}
                placeholder="Es. Pranzo incluso, Skipper locale, Sosta bagno"
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Nome fornitore</label>
              <input
                type="text"
                className="sib-input"
                value={form.fornitoreNome}
                onChange={(e) => upd('fornitoreNome', e.target.value)}
              />
            </div>
            <div className="srv-modal__field">
              <label className="srv-modal__label">Sito fornitore</label>
              <input
                type="url"
                className="sib-input"
                value={form.sitoFornitore}
                onChange={(e) => upd('sitoFornitore', e.target.value)}
                placeholder="es. dolomitiadventure.com"
              />
            </div>
          </div>
        </section>

        {/* ─── Sezione 5: Stato ──────────────────────────────────────────── */}
        <section className="srv-modal__section">
          <h3 className="srv-modal__section-title">Stato</h3>
          <div className="srv-modal__toggles">
            <label className="srv-modal__toggle">
              <input
                type="checkbox"
                checked={form.attivo}
                onChange={(e) => upd('attivo', e.target.checked)}
              />
              Attivo (disponibile in catalogo)
            </label>
            <label className="srv-modal__toggle">
              <input
                type="checkbox"
                checked={form.pubblicato}
                onChange={(e) => upd('pubblicato', e.target.checked)}
              />
              Pubblicato (visibile nella vetrina Servizi)
            </label>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <div className="srv-modal__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={onConfirm}
            disabled={!canSave}
          >
            {editing ? 'Salva modifiche' : 'Crea servizio'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
