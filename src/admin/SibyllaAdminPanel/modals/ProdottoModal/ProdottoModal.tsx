import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { UNITA_MISURA_OPTIONS } from '../../catalogo/mockData'
import { getCategoria } from '../../catalogo/classificazione'
import { generateEAN13, isValidEAN13 } from '../../catalogo/helpers'
import { MERCATI } from '../../catalogo/types'
import type { Categoria, Fornitore, Prodotto, ProdottoForm, UnitaMisura } from '../../catalogo/types'
import './ProdottoModal.sass'

interface Props {
  open: boolean
  editing: Prodotto | null
  form: ProdottoForm
  setForm: (f: ProdottoForm) => void
  categorie: Categoria[]
  fornitori: Fornitore[]
  onClose: () => void
  onConfirm: () => void
  isBarcodeUsed: (code: string, exceptId?: string) => boolean
}

export default function ProdottoModal({
  open, editing, form, setForm, categorie, fornitori, onClose, onConfirm, isBarcodeUsed,
}: Props) {
  const set = <K extends keyof ProdottoForm>(k: K, v: ProdottoForm[K]) => setForm({ ...form, [k]: v })

  const selCat = getCategoria(form.categoriaId)
  const selClasse = selCat?.classi.find(c => c.nome === form.classe)
  const setCategoria = (id: string) => setForm({ ...form, categoriaId: id, classe: '', tipologia: '' })
  const setClasse    = (nome: string) => setForm({ ...form, classe: nome, tipologia: '' })

  const barcodeTrim = form.barcode.trim()
  const barcodeFormatOk = isValidEAN13(barcodeTrim)
  const barcodeUsed = barcodeTrim ? isBarcodeUsed(barcodeTrim, editing?.id) : false
  const barcodeError = !barcodeTrim
    ? 'Barcode obbligatorio'
    : !barcodeFormatOk
      ? 'Formato non valido (atteso EAN-13)'
      : barcodeUsed
        ? 'Barcode già utilizzato da un altro prodotto'
        : null

  const prezzoBaseN = parseFloat(form.prezzoBase)
  const agoraPrezzoN = parseFloat(form.agoraPrezzo)
  const networkPrezzoN = parseFloat(form.networkPrezzo)

  const noMercatoSelezionato = !form.agoraAbilitato && !form.networkAbilitato
  const agoraPrezzoInvalido = form.agoraAbilitato && (!form.agoraPrezzo || isNaN(agoraPrezzoN) || agoraPrezzoN <= 0)
  const networkPrezzoInvalido = form.networkAbilitato && (!form.networkPrezzo || isNaN(networkPrezzoN) || networkPrezzoN <= 0)

  const disabled =
    !form.nome.trim() ||
    !form.categoriaId ||
    !form.classe ||
    !form.fornitoreId ||
    !!barcodeError ||
    !form.prezzoBase ||
    isNaN(prezzoBaseN) ||
    prezzoBaseN < 0 ||
    noMercatoSelezionato ||
    agoraPrezzoInvalido ||
    networkPrezzoInvalido

  const margine = (prezzoVendita: number) => {
    if (!prezzoBaseN || prezzoBaseN <= 0 || !prezzoVendita) return null
    return (((prezzoVendita - prezzoBaseN) / prezzoBaseN) * 100)
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="prod-modal">
        <div className="prod-modal__head">
          <div>
            <h2 className="prod-modal__title">{editing ? 'Modifica prodotto' : 'Nuovo prodotto'}</h2>
            <p className="prod-modal__sub">Il barcode è la chiave per la lettura nel magazzino in entrata e uscita</p>
          </div>
          <button className="prod-modal__close" onClick={onClose} aria-label="Chiudi">
            <Ico n="x" s={18} c="var(--color-text-disabled)" />
          </button>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Identificazione</div>
          <div className="prod-modal__barcode-row">
            <div className="prod-modal__barcode-field">
              <label className="prod-modal__label">Barcode (EAN-13) *</label>
              <div className="prod-modal__barcode-input">
                <i className="fa-duotone fa-barcode prod-modal__barcode-ico" />
                <input
                  value={form.barcode}
                  onChange={e => set('barcode', e.target.value.replace(/\D/g, '').slice(0, 13))}
                  className="prod-modal__barcode-text"
                  placeholder="13 cifre numeriche"
                  inputMode="numeric"
                  maxLength={13}
                />
                <button
                  type="button"
                  className="prod-modal__barcode-gen"
                  onClick={() => set('barcode', generateEAN13())}
                  title="Genera barcode EAN-13"
                >
                  <Ico n="bar" s={12} c="var(--color-link)" /> Genera
                </button>
              </div>
              {barcodeError && <div className="prod-modal__error">{barcodeError}</div>}
              {!barcodeError && barcodeTrim && (
                <div className="prod-modal__hint">EAN-13 valido — pronto per la lettura</div>
              )}
            </div>
            <div className="prod-modal__attivo">
              <label className="prod-modal__label">Stato</label>
              <label className="prod-modal__toggle">
                <input
                  type="checkbox"
                  checked={form.attivo}
                  onChange={e => set('attivo', e.target.checked)}
                  className="sib-checkbox"
                />
                <span>{form.attivo ? 'Attivo (visibile ai clienti)' : 'Disattivo (nascosto)'}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Anagrafica prodotto</div>
          <div className="prod-modal__grid prod-modal__grid--2">
            <Field label="Nome prodotto *">
              <input value={form.nome} onChange={e => set('nome', e.target.value)} className="sib-input" placeholder="Es. Olio EVO 1L" />
            </Field>
            <Field label="URL immagine">
              <input value={form.immagineUrl} onChange={e => set('immagineUrl', e.target.value)} className="sib-input" placeholder="https://..." />
            </Field>
          </div>
          <Field label="Descrizione">
            <textarea
              value={form.descrizione}
              onChange={e => set('descrizione', e.target.value)}
              className="sib-input prod-modal__textarea"
              rows={2}
              placeholder="Descrizione, formato, caratteristiche..."
            />
          </Field>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Classificazione e fornitura</div>
          <div className="prod-modal__grid prod-modal__grid--2">
            <Field label="Categoria *">
              <select value={form.categoriaId} onChange={e => setCategoria(e.target.value)} className="sib-select">
                <option value="">Seleziona categoria...</option>
                {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Classe *">
              <select value={form.classe} onChange={e => setClasse(e.target.value)} className="sib-select" disabled={!selCat}>
                <option value="">{selCat ? 'Seleziona classe...' : 'Seleziona prima la categoria'}</option>
                {selCat?.classi.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Tipologia">
              <select value={form.tipologia} onChange={e => set('tipologia', e.target.value)} className="sib-select" disabled={!selClasse || selClasse.tipologie.length === 0}>
                <option value="">{selClasse && selClasse.tipologie.length > 0 ? 'Seleziona tipologia...' : 'Nessuna tipologia'}</option>
                {selClasse?.tipologie.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Fornitore *">
              <select value={form.fornitoreId} onChange={e => set('fornitoreId', e.target.value)} className="sib-select">
                <option value="">Seleziona fornitore...</option>
                {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Prezzo base e magazzino</div>
          <div className="prod-modal__grid prod-modal__grid--4">
            <Field label="Prezzo base / acquisto (€) *">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.prezzoBase}
                onChange={e => set('prezzoBase', e.target.value)}
                className="sib-input"
                placeholder="0,00"
              />
            </Field>
            <Field label="Unità di misura">
              <select
                value={form.unita}
                onChange={e => set('unita', e.target.value as UnitaMisura)}
                className="sib-select"
              >
                {UNITA_MISURA_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Quantità per unità">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.quantitaUnita}
                onChange={e => set('quantitaUnita', e.target.value)}
                className="sib-input"
                placeholder="1"
              />
            </Field>
            <Field label="Scorta minima">
              <input
                type="number"
                step="1"
                min="0"
                value={form.scortaMinima}
                onChange={e => set('scortaMinima', e.target.value)}
                className="sib-input"
                placeholder="0"
              />
            </Field>
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Mercati di vendita *</div>
          <p className="prod-modal__section-hint">
            Abilita uno o entrambi i marketplace e imposta il prezzo di vendita. Il margine è calcolato sul prezzo base.
          </p>

          {MERCATI.map(m => {
            const enabled  = m.id === 'agora' ? form.agoraAbilitato : form.networkAbilitato
            const prezzoStr = m.id === 'agora' ? form.agoraPrezzo : form.networkPrezzo
            const prezzoN   = parseFloat(prezzoStr) || 0
            const marginePct = enabled ? margine(prezzoN) : null
            const cls = `prod-modal__market${enabled ? ' prod-modal__market--on' : ''}`
            const setEn = (v: boolean) => m.id === 'agora' ? set('agoraAbilitato', v) : set('networkAbilitato', v)
            const setPr = (v: string) => m.id === 'agora' ? set('agoraPrezzo', v) : set('networkPrezzo', v)
            // colore mercato solo runtime — palette fissa di 2 valori, CSS custom property
            return (
              <div key={m.id} className={cls} style={{ ['--mercato-color' as any]: m.colore }}>
                <label className="prod-modal__market-toggle">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={e => setEn(e.target.checked)}
                    className="sib-checkbox"
                  />
                  <span className="prod-modal__market-name">{m.label}</span>
                </label>
                <div className="prod-modal__market-desc">{m.descrizione}</div>
                {enabled && (
                  <div className="prod-modal__market-price">
                    <label className="prod-modal__label">Prezzo vendita {m.label} (€) *</label>
                    <div className="prod-modal__market-price-row">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={prezzoStr}
                        onChange={e => setPr(e.target.value)}
                        className="sib-input prod-modal__market-input"
                        placeholder="0,00"
                      />
                      {marginePct !== null && (
                        <span className={`prod-modal__margine prod-modal__margine--${marginePct >= 0 ? 'pos' : 'neg'}`}>
                          {marginePct >= 0 ? '+' : ''}{marginePct.toFixed(1)}% margine
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {noMercatoSelezionato && (
            <div className="prod-modal__error">Almeno un mercato deve essere abilitato</div>
          )}
        </div>

        <div className="prod-modal__actions">
          <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
          <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>
            {editing ? 'Aggiorna prodotto' : 'Crea prodotto'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prod-modal__field">
      <label className="prod-modal__label">{label}</label>
      {children}
    </div>
  )
}
