import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField, TextareaField } from '../../../../core/components/form'
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
            <InputField className="prod-modal__field" name="nome" label="Nome prodotto *" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Es. Olio EVO 1L" />
            <InputField className="prod-modal__field" name="immagine-url" label="URL immagine" value={form.immagineUrl} onChange={e => set('immagineUrl', e.target.value)} placeholder="https://..." />
          </div>
          <TextareaField
            className="prod-modal__field"
            name="descrizione"
            label="Descrizione"
            value={form.descrizione}
            onChange={e => set('descrizione', e.target.value)}
            rows={2}
            placeholder="Descrizione, formato, caratteristiche..."
          />
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Classificazione e fornitura</div>
          <div className="prod-modal__grid prod-modal__grid--2">
            <SelectField
              className="prod-modal__field"
              name="categoria"
              label="Categoria *"
              value={form.categoriaId}
              onChange={e => setCategoria(e.target.value)}
              placeholder="Seleziona categoria..."
              options={categorie.map(c => ({ value: c.id, label: c.nome }))}
            />
            <SelectField
              className="prod-modal__field"
              name="classe"
              label="Classe *"
              value={form.classe}
              onChange={e => setClasse(e.target.value)}
              disabled={!selCat}
              options={[
                { value: '', label: selCat ? 'Seleziona classe...' : 'Seleziona prima la categoria' },
                ...(selCat?.classi.map(c => ({ value: c.nome, label: c.nome })) ?? []),
              ]}
            />
            <SelectField
              className="prod-modal__field"
              name="tipologia"
              label="Tipologia"
              value={form.tipologia}
              onChange={e => set('tipologia', e.target.value)}
              disabled={!selClasse || selClasse.tipologie.length === 0}
              options={[
                { value: '', label: selClasse && selClasse.tipologie.length > 0 ? 'Seleziona tipologia...' : 'Nessuna tipologia' },
                ...(selClasse?.tipologie.map(t => ({ value: t, label: t })) ?? []),
              ]}
            />
            <SelectField
              className="prod-modal__field"
              name="fornitore"
              label="Fornitore *"
              value={form.fornitoreId}
              onChange={e => set('fornitoreId', e.target.value)}
              placeholder="Seleziona fornitore..."
              options={fornitori.map(f => ({ value: f.id, label: f.nome }))}
            />
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Prezzo base e magazzino</div>
          <div className="prod-modal__grid prod-modal__grid--4">
            <InputField
              className="prod-modal__field"
              name="prezzo-base"
              label="Prezzo base / acquisto (€) *"
              type="number"
              step={0.01}
              min={0}
              iconLeft="fa-light fa-euro-sign"
              value={form.prezzoBase}
              onChange={e => set('prezzoBase', e.target.value)}
              placeholder="0,00"
            />
            <SelectField
              className="prod-modal__field"
              name="unita"
              label="Unità di misura"
              value={form.unita}
              onChange={e => set('unita', e.target.value as UnitaMisura)}
              options={UNITA_MISURA_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            />
            <InputField
              className="prod-modal__field"
              name="quantita-unita"
              label="Quantità per unità"
              type="number"
              step={0.01}
              min={0}
              value={form.quantitaUnita}
              onChange={e => set('quantitaUnita', e.target.value)}
              placeholder="1"
            />
            <InputField
              className="prod-modal__field"
              name="scorta-minima"
              label="Scorta minima"
              type="number"
              step={1}
              min={0}
              value={form.scortaMinima}
              onChange={e => set('scortaMinima', e.target.value)}
              placeholder="0"
            />
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
