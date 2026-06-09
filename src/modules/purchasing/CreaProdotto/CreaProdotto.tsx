import React, { useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import Ico from '../../../core/icons/Ico'
import {
  InputField,
  SelectField,
  TextareaField,
  ToggleSwitch,
} from '../../../core/components/form'
import { UNITA_MISURA_OPTIONS } from '../../../admin/SibyllaAdminPanel/catalogo/mockData'
import { getCategoria } from '../../../admin/SibyllaAdminPanel/catalogo/classificazione'
import { generateEAN13, isValidEAN13 } from '../../../admin/SibyllaAdminPanel/catalogo/helpers'
import { MERCATI } from '../../../admin/SibyllaAdminPanel/catalogo/types'
import type {
  Prodotto, ProdottoForm, UnitaMisura, ProdottoParametro, ParametroTipo,
} from '../../../admin/SibyllaAdminPanel/catalogo/types'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import './CreaProdotto.sass'

const EMPTY_FORM: ProdottoForm = {
  barcode: '', nome: '', descrizione: '', categoriaId: '', classe: '', tipologia: '', fornitoreId: '',
  prezzoBase: '', unita: 'pz', quantitaUnita: '1', immagineUrl: '', scortaMinima: '0', attivo: true,
  agoraAbilitato: false, agoraPrezzo: '',
  networkAbilitato: true, networkPrezzo: '',
  parametri: [],
}

// ── Builder parametri personalizzati ───────────────────────────────────────
const PARAM_TIPO_LABELS: Record<ParametroTipo, string> = {
  text: 'Testo', number: 'Numero', select: 'Scelta', checkbox: 'Sì/No', date: 'Data',
}

// Parametri pronti all'uso per le tipologie di prodotto più comuni
const PRESET_PARAMS: Array<{ label: string; param: ProdottoParametro }> = [
  { label: 'Marca',     param: { tipo: 'text',     nome: 'Marca',      valore: '' } },
  { label: 'Colore',    param: { tipo: 'select',   nome: 'Colore',     valore: '', opzioni: ['Rosso', 'Blu', 'Verde', 'Nero', 'Bianco'] } },
  { label: 'Taglia',    param: { tipo: 'select',   nome: 'Taglia',     valore: '', opzioni: ['XS', 'S', 'M', 'L', 'XL'] } },
  { label: 'Materiale', param: { tipo: 'text',     nome: 'Materiale',  valore: '' } },
  { label: 'Peso',      param: { tipo: 'number',   nome: 'Peso',       valore: '', unita: 'kg' } },
  { label: 'Bio',       param: { tipo: 'checkbox', nome: 'Biologico',  valore: 'false' } },
  { label: 'Scadenza',  param: { tipo: 'date',     nome: 'Scadenza',   valore: '' } },
]

export default function CreaProdotto({ navigate }: { navigate: (p: string) => void }) {
  const categorie = useCatalogoStore(s => s.categorie)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const magazzini = useCatalogoStore(s => s.magazzini)
  const addProdotto = useCatalogoStore(s => s.addProdotto)
  const registraMovimento = useCatalogoStore(s => s.registraMovimento)
  const isBarcodeUsed = useCatalogoStore(s => s.isBarcodeUsed)

  const [form, setForm] = useState<ProdottoForm>(EMPTY_FORM)
  const [scannerArmed, setScannerArmed] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Assegnazione opzionale a un magazzino esistente (creato in "Movimenti scorte")
  const [magAssign, setMagAssign] = useState({ magazzinoId: '', collocazione: '', quantita: '' })
  const magSel = magazzini.find(m => m.id === magAssign.magazzinoId)

  const armScanner = () => {
    setScannerArmed(true)
    barcodeInputRef.current?.focus()
    barcodeInputRef.current?.select()
  }

  const set = <K extends keyof ProdottoForm>(k: K, v: ProdottoForm[K]) =>
    setForm({ ...form, [k]: v })

  // ── Builder parametri personalizzati ───────────────────────────────────────
  const addParam = (preset?: ProdottoParametro) =>
    set('parametri', [...form.parametri, preset ? { ...preset } : { tipo: 'text', nome: '', valore: '' }])
  const updParam = (i: number, patch: Partial<ProdottoParametro>) =>
    set('parametri', form.parametri.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  const rmParam = (i: number) =>
    set('parametri', form.parametri.filter((_, idx) => idx !== i))
  const moveParam = (i: number, dir: -1 | 1) => {
    const n = [...form.parametri]; const j = i + dir
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    set('parametri', n)
  }

  const barcodeTrim = form.barcode.trim()
  const barcodeFormatOk = isValidEAN13(barcodeTrim)
  const barcodeUsed = barcodeTrim ? isBarcodeUsed(barcodeTrim) : false
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

  const handleConfirm = () => {
    if (disabled) return
    const data: Omit<Prodotto, 'id'> = {
      barcode: barcodeTrim,
      nome: form.nome,
      descrizione: form.descrizione,
      categoriaId: form.categoriaId,
      classe: form.classe,
      tipologia: form.tipologia,
      fornitoreId: form.fornitoreId,
      prezzoBase: prezzoBaseN,
      unita: form.unita,
      quantitaUnita: parseFloat(form.quantitaUnita) || 1,
      immagineUrl: form.immagineUrl,
      scortaMinima: parseInt(form.scortaMinima) || 0,
      attivo: form.attivo,
      pubblicato: false,
      mercati: {
        agora:   { abilitato: form.agoraAbilitato,   prezzoVendita: form.agoraAbilitato ? agoraPrezzoN : 0 },
        network: { abilitato: form.networkAbilitato, prezzoVendita: form.networkAbilitato ? networkPrezzoN : 0 },
      },
      parametri: form.parametri.filter(p => p.nome.trim()),
    }
    const creato = addProdotto(data)

    // Inserimento diretto in magazzino (movimento di entrata) se selezionato
    const qtaIniziale = parseFloat(magAssign.quantita)
    if (magSel && qtaIniziale > 0) {
      registraMovimento({
        prodottoId: creato.id,
        barcode: creato.barcode,
        tipo: 'entrata',
        quantita: qtaIniziale,
        magazzinoId: magSel.id,
        collocazione: magAssign.collocazione || magSel.collocazioni[0] || '',
        operatore: '',
        note: 'Carico iniziale alla creazione del prodotto',
      })
    }
    navigate('area-merceologica')
  }

  const handleCancel = () => navigate('area-merceologica')

  const categorieOpts = categorie.map(c => ({ value: c.id, label: c.nome }))
  const fornitoriOpts = fornitori.map(f => ({ value: f.id, label: f.nome }))

  // Classi/tipologie a cascata dalla classificazione merceologica
  const selCat = getCategoria(form.categoriaId)
  const classeOpts = selCat ? selCat.classi.map(c => ({ value: c.nome, label: c.nome })) : []
  const selClasse = selCat?.classi.find(c => c.nome === form.classe)
  const tipologiaOpts = selClasse ? selClasse.tipologie.map(t => ({ value: t, label: t })) : []

  const setCategoria = (id: string) => setForm({ ...form, categoriaId: id, classe: '', tipologia: '' })
  const setClasse    = (nome: string) => setForm({ ...form, classe: nome, tipologia: '' })

  return (
    <div className="crea-prodotto">
      <BtnBack onClick={handleCancel} />
      <PageHeader
        title="Crea prodotto"
        subtitle="Il barcode è la chiave per la lettura nel magazzino in entrata e uscita"
      />

      <section className="crea-prodotto__section">
        <h3 className="sib-section-title crea-prodotto__section-title">Identificazione</h3>
        <FormGrid cols={2}>
          <div className="crea-prodotto__field">
            <label
              htmlFor="prod-barcode"
              className="text-[11px] font-semibold font-opensans text-ink"
            >
              Barcode (EAN-13)<span className="text-error ml-0.5">*</span>
            </label>
            <div
              className={'crea-prodotto__barcode' + (scannerArmed ? ' crea-prodotto__barcode--armed' : '')}
            >
              <i className="fa-duotone fa-barcode crea-prodotto__barcode-ico" />
              <input
                id="prod-barcode"
                ref={barcodeInputRef}
                value={form.barcode}
                onChange={e => set('barcode', e.target.value.replace(/\D/g, '').slice(0, 13))}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setScannerArmed(false)
                    barcodeInputRef.current?.blur()
                  }
                }}
                onBlur={() => setScannerArmed(false)}
                className="crea-prodotto__barcode-text"
                placeholder={scannerArmed ? 'In attesa di lettura…' : '13 cifre numeriche'}
                inputMode="numeric"
                maxLength={13}
              />
              <button
                type="button"
                className="crea-prodotto__barcode-action"
                onClick={armScanner}
                title="Inserisci barcode tramite lettore"
                aria-pressed={scannerArmed}
              >
                <i className="fa-light fa-barcode-read" aria-hidden="true" /> Lettore
              </button>
              <button
                type="button"
                className="crea-prodotto__barcode-action"
                onClick={() => set('barcode', generateEAN13())}
                title="Genera barcode EAN-13"
              >
                <Ico n="bar" s={12} c="var(--color-link)" /> Genera
              </button>
            </div>
            {barcodeError && (
              <span className="text-[11px] font-opensans text-error">
                <i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />
                {barcodeError}
              </span>
            )}
            {!barcodeError && barcodeTrim && (
              <span className="text-[11px] font-opensans text-ink-muted">
                EAN-13 valido — pronto per la lettura
              </span>
            )}
          </div>
          <div className="crea-prodotto__field">
            <span className="text-[11px] font-semibold font-opensans text-ink">Stato</span>
            <ToggleSwitch
              checked={form.attivo}
              onChange={v => set('attivo', v)}
              label={form.attivo ? 'Attivo (visibile ai clienti)' : 'Disattivo (nascosto)'}
            />
          </div>
        </FormGrid>
      </section>

      <section className="crea-prodotto__section">
        <h3 className="sib-section-title crea-prodotto__section-title">Anagrafica prodotto</h3>
        <FormGrid cols={2}>
          <InputField
            name="nome"
            label="Nome prodotto"
            required
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
            placeholder="Es. Olio EVO 1L"
          />
          <InputField
            name="immagineUrl"
            label="URL immagine"
            value={form.immagineUrl}
            onChange={e => set('immagineUrl', e.target.value)}
            placeholder="https://..."
          />
        </FormGrid>
        <TextareaField
          name="descrizione"
          label="Descrizione"
          rows={2}
          value={form.descrizione}
          onChange={e => set('descrizione', e.target.value)}
          placeholder="Descrizione, formato, caratteristiche..."
          className="crea-prodotto__textarea"
        />
      </section>

      <section className="crea-prodotto__section">
        <h3 className="sib-section-title crea-prodotto__section-title">Classificazione e fornitura</h3>
        <FormGrid cols={2}>
          <SelectField
            name="categoria"
            label="Categoria"
            required
            value={form.categoriaId}
            onChange={e => setCategoria(e.target.value)}
            placeholder="Seleziona categoria..."
            options={categorieOpts}
          />
          <SelectField
            name="classe"
            label="Classe"
            required
            value={form.classe}
            onChange={e => setClasse(e.target.value)}
            placeholder={form.categoriaId ? 'Seleziona classe...' : 'Seleziona prima la categoria'}
            options={classeOpts}
          />
          <SelectField
            name="tipologia"
            label="Tipologia"
            value={form.tipologia}
            onChange={e => set('tipologia', e.target.value)}
            placeholder={tipologiaOpts.length ? 'Seleziona tipologia...' : 'Nessuna tipologia per questa classe'}
            options={tipologiaOpts}
          />
          <SelectField
            name="fornitore"
            label="Fornitore"
            required
            value={form.fornitoreId}
            onChange={e => set('fornitoreId', e.target.value)}
            placeholder="Seleziona fornitore..."
            options={fornitoriOpts}
          />
        </FormGrid>
      </section>

      <section className="crea-prodotto__section">
        <h3 className="sib-section-title crea-prodotto__section-title">Prezzo base e magazzino</h3>
        <FormGrid cols={4}>
          <InputField
            name="prezzoBase"
            label="Prezzo base / acquisto (€)"
            required
            type="number"
            step={0.01}
            min={0}
            value={form.prezzoBase}
            onChange={e => set('prezzoBase', e.target.value)}
            placeholder="0,00"
          />
          <SelectField
            name="unita"
            label="Unità di misura"
            value={form.unita}
            onChange={e => set('unita', e.target.value as UnitaMisura)}
            options={UNITA_MISURA_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          />
          <InputField
            name="quantitaUnita"
            label="Quantità per unità"
            type="number"
            step={0.01}
            min={0}
            value={form.quantitaUnita}
            onChange={e => set('quantitaUnita', e.target.value)}
            placeholder="1"
          />
          <InputField
            name="scortaMinima"
            label="Scorta minima"
            type="number"
            step={1}
            min={0}
            value={form.scortaMinima}
            onChange={e => set('scortaMinima', e.target.value)}
            placeholder="0"
          />
        </FormGrid>
      </section>

      {/* ── Inserimento diretto in magazzino ─────────────────────────────── */}
      <section className="crea-prodotto__section">
        <h3 className="sib-section-title crea-prodotto__section-title">Inserisci in magazzino</h3>
        <p className="crea-prodotto__hint">
          Carica subito una giacenza iniziale in un magazzino già configurato. Genera un movimento di entrata.
        </p>

        {magazzini.length === 0 ? (
          <div className="crea-prodotto__mag-empty">
            <i className="fa-light fa-boxes-stacked" aria-hidden="true" />
            <span>
              Nessun magazzino configurato.{' '}
              <button type="button" className="crea-prodotto__link-btn" onClick={() => navigate('crea-magazzino')}>
                Crea un magazzino
              </button>{' '}
              in «Movimenti scorte» per abilitare l'inserimento.
            </span>
          </div>
        ) : (
          <FormGrid cols={3}>
            <SelectField
              name="magazzino"
              label="Magazzino"
              value={magAssign.magazzinoId}
              onChange={e => setMagAssign({ magazzinoId: e.target.value, collocazione: '', quantita: magAssign.quantita })}
              placeholder="Nessuno (non caricare)"
              options={magazzini.map(m => ({ value: m.id, label: m.nome }))}
            />
            <SelectField
              name="collocazione"
              label="Collocazione"
              value={magAssign.collocazione}
              onChange={e => setMagAssign({ ...magAssign, collocazione: e.target.value })}
              placeholder={magSel ? 'Seleziona collocazione...' : 'Seleziona prima il magazzino'}
              options={(magSel?.collocazioni ?? []).map(c => ({ value: c, label: c }))}
            />
            <InputField
              name="quantitaIniziale"
              label="Quantità iniziale"
              type="number"
              step={1}
              min={0}
              value={magAssign.quantita}
              onChange={e => setMagAssign({ ...magAssign, quantita: e.target.value })}
              placeholder="0"
            />
          </FormGrid>
        )}
      </section>

      {/* ── Parametri personalizzati ─────────────────────────────────────── */}
      <section className="crea-prodotto__section">
        <h3 className="sib-section-title crea-prodotto__section-title">Parametri personalizzati</h3>
        <p className="crea-prodotto__hint">
          Aggiungi attributi liberi e tipizzati per descrivere il prodotto (colore, taglia, peso, scadenza, certificazioni…).
          Ogni prodotto può avere parametri diversi.
        </p>

        <div className="crea-prodotto__presets">
          {PRESET_PARAMS.map(p => (
            <button key={p.label} type="button" className="crea-prodotto__preset" onClick={() => addParam(p.param)}>
              <i className="fa-light fa-plus" aria-hidden="true" /> {p.label}
            </button>
          ))}
        </div>

        {form.parametri.length === 0 ? (
          <div className="crea-prodotto__params-empty">
            Nessun parametro: usa i pulsanti qui sopra o «Aggiungi parametro».
          </div>
        ) : (
          <div className="crea-prodotto__params">
            {form.parametri.map((p, i) => (
              <div key={i} className="crea-prodotto__param">
                <div className="crea-prodotto__param-head">
                  <span className="crea-prodotto__param-idx">#{i + 1}</span>
                  <div className="crea-prodotto__param-ctrls">
                    <button type="button" onClick={() => moveParam(i, -1)} disabled={i === 0} title="Sposta su"><i className="fa-light fa-chevron-up" /></button>
                    <button type="button" onClick={() => moveParam(i, 1)} disabled={i === form.parametri.length - 1} title="Sposta giù"><i className="fa-light fa-chevron-down" /></button>
                    <button type="button" className="crea-prodotto__param-del" onClick={() => rmParam(i)} title="Elimina parametro"><i className="fa-light fa-trash-can" /></button>
                  </div>
                </div>
                <div className="crea-prodotto__param-grid">
                  <div className="crea-prodotto__pfield">
                    <span className="crea-prodotto__plabel">Tipo</span>
                    <select className="sib-select" value={p.tipo} onChange={e => updParam(i, { tipo: e.target.value as ParametroTipo })}>
                      {(Object.keys(PARAM_TIPO_LABELS) as ParametroTipo[]).map(k => <option key={k} value={k}>{PARAM_TIPO_LABELS[k]}</option>)}
                    </select>
                  </div>
                  <div className="crea-prodotto__pfield">
                    <span className="crea-prodotto__plabel">Nome parametro</span>
                    <input className="sib-input" value={p.nome} onChange={e => updParam(i, { nome: e.target.value })} placeholder="es. Colore, Peso…" />
                  </div>

                  {/* Valore — dipende dal tipo */}
                  {p.tipo === 'text' && (
                    <div className="crea-prodotto__pfield crea-prodotto__pfield--wide">
                      <span className="crea-prodotto__plabel">Valore</span>
                      <input className="sib-input" value={p.valore} onChange={e => updParam(i, { valore: e.target.value })} placeholder="Valore" />
                    </div>
                  )}
                  {p.tipo === 'number' && (
                    <>
                      <div className="crea-prodotto__pfield">
                        <span className="crea-prodotto__plabel">Valore</span>
                        <input type="number" className="sib-input" value={p.valore} onChange={e => updParam(i, { valore: e.target.value })} placeholder="0" />
                      </div>
                      <div className="crea-prodotto__pfield crea-prodotto__pfield--sm">
                        <span className="crea-prodotto__plabel">Unità</span>
                        <input className="sib-input" value={p.unita ?? ''} onChange={e => updParam(i, { unita: e.target.value })} placeholder="kg, cm…" />
                      </div>
                    </>
                  )}
                  {p.tipo === 'date' && (
                    <div className="crea-prodotto__pfield">
                      <span className="crea-prodotto__plabel">Valore</span>
                      <input type="date" className="sib-input" value={p.valore} onChange={e => updParam(i, { valore: e.target.value })} />
                    </div>
                  )}
                  {p.tipo === 'checkbox' && (
                    <label className="crea-prodotto__param-check">
                      <input type="checkbox" checked={p.valore === 'true'} onChange={e => updParam(i, { valore: e.target.checked ? 'true' : 'false' })} /> Sì
                    </label>
                  )}
                  {p.tipo === 'select' && (
                    <>
                      <div className="crea-prodotto__pfield">
                        <span className="crea-prodotto__plabel">Valore</span>
                        <select className="sib-select" value={p.valore} onChange={e => updParam(i, { valore: e.target.value })}>
                          <option value="">—</option>
                          {(p.opzioni ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="crea-prodotto__pfield crea-prodotto__pfield--wide">
                        <span className="crea-prodotto__plabel">Opzioni <em>(separate da virgola)</em></span>
                        <input className="sib-input" value={(p.opzioni ?? []).join(', ')} onChange={e => updParam(i, { opzioni: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })} placeholder="es. Rosso, Blu, Verde" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="sib-btn sib-btn--ghost crea-prodotto__add-param" onClick={() => addParam()}>
          <i className="fa-light fa-plus" aria-hidden="true" /> Aggiungi parametro
        </button>
      </section>

      <section className="crea-prodotto__section">
        <h3 className="sib-section-title crea-prodotto__section-title">
          Mercati di vendita<span className="text-error ml-0.5">*</span>
        </h3>
        <p className="crea-prodotto__hint">
          Abilita uno o entrambi i marketplace e imposta il prezzo di vendita. Il margine è calcolato sul prezzo base.
        </p>

        <div className="crea-prodotto__mercati">
          {MERCATI.map(m => {
            const enabled   = m.id === 'agora' ? form.agoraAbilitato : form.networkAbilitato
            const prezzoStr = m.id === 'agora' ? form.agoraPrezzo : form.networkPrezzo
            const prezzoN   = parseFloat(prezzoStr) || 0
            const marginePct = enabled ? margine(prezzoN) : null
            const setEn = (v: boolean) => m.id === 'agora' ? set('agoraAbilitato', v) : set('networkAbilitato', v)
            const setPr = (v: string) => m.id === 'agora' ? set('agoraPrezzo', v) : set('networkPrezzo', v)
            return (
              <div
                key={m.id}
                className={'crea-prodotto__mercato' + (enabled ? ' crea-prodotto__mercato--on' : '')}
                style={{ ['--mercato-color' as any]: m.colore }}
              >
                <ToggleSwitch
                  checked={enabled}
                  onChange={setEn}
                  label={m.label}
                  description={m.descrizione}
                />
                {enabled && (
                  <div className="crea-prodotto__mercato-prezzo">
                    <InputField
                      name={`prezzo-${m.id}`}
                      label={`Prezzo vendita ${m.label} (€)`}
                      required
                      type="number"
                      step={0.01}
                      min={0.01}
                      value={prezzoStr}
                      onChange={e => setPr(e.target.value)}
                      placeholder="0,00"
                    />
                    {marginePct !== null && (
                      <span className={'crea-prodotto__margine crea-prodotto__margine--' + (marginePct >= 0 ? 'pos' : 'neg')}>
                        {marginePct >= 0 ? '+' : ''}{marginePct.toFixed(1)}% margine
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {noMercatoSelezionato && (
          <span className="text-[11px] font-opensans text-error">
            <i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />
            Almeno un mercato deve essere abilitato
          </span>
        )}
      </section>

      <FormActions
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        confirmLabel="Crea prodotto"
        confirmIcon="fa-floppy-disk"
        confirmDisabled={disabled}
      />
    </div>
  )
}
