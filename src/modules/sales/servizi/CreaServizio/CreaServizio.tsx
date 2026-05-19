import React, { useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import '../../../../admin/SibyllaAdminPanel/modals/ProdottoModal/ProdottoModal.sass'
import './CreaServizio.css'

/* Aree merceologiche disponibili per i servizi. */
const AREE: string[] = [
  'Servizi di Alloggio',
  'Ristorazione e Cibo',
  'Servizi per il Benessere e la Salute',
  'Intrattenimento e Ricreazione',
  'Tecnologia e Comunicazione',
  'Servizi per Riunioni e Conferenze',
  'Servizi per Famiglie e Bambini',
  'Servizi per Animali Domestici',
  'Servizi di Informazione e Assistenza',
  'Altro',
  'Esperienze',
  'Trasferimenti',
  'Ristoranti per gruppi',
  'Facchinaggio',
  'Delivery',
]

/* Classi di servizio. */
const CLASSI: string[] = [
  'NCC',
  'Taxi',
  'Adrenalina',
  'Tours',
  'Fitness',
  'Facchinaggio',
  'Servizio di ascensori e rampe per disabili',
  'Servizio di assistenza per ospiti con mobilità ridotta',
  'Servizio di sicurezza 24 ore su 24',
  'Servizio di sorveglianza video',
  'Servizio di estintori e dispositivi anti-incendio',
  'Servizio di ciotole e cibo per animali domestici',
  'Servizio di pet-sitting',
  'Servizio di babysitter',
  'Servizio di attività per bambini',
  'Servizio di attrezzature audiovisive',
  'Servizio di organizzazione eventi e conferenze',
  'Servizio di videoconferenza',
  'Servizio di assistenza tecnica',
  'Servizio di noleggio dispositivi elettronici',
  'Servizio di intrattenimento serale',
  'Servizio di noleggio DVD o giochi da tavolo',
  'Servizio di escursioni e tour guidati',
  'Servizio di prenotazione di biglietti per spettacoli e attrazioni locali',
  'Servizio di palestra e fitness center',
  'Servizio di piscina e jacuzzi',
  'Servizio di sauna e bagno turco',
  'Servizio di medico o infermiere di guardia',
]

/* Marketplace di vendita: gli stessi 2 (b2c / b2b) mostrati come card. */
interface MercatoServizio {
  id: 'b2c' | 'b2b'
  label: string
  descrizione: string
  colore: string
}
const MERCATI: MercatoServizio[] = [
  { id: 'b2c', label: 'B2C', descrizione: 'Vendita diretta al cliente finale (es. ospite della struttura)', colore: '#E07B39' },
  { id: 'b2b', label: 'B2B', descrizione: 'Vendita ad aziende e operatori della rete Sibylla',           colore: '#5C9CD4' },
]

interface FormState {
  area: string
  classe: string
  nome: string
  descrizione: string
  codArticolo: string
  b2cAbilitato: boolean
  prezzoB2c: string
  b2bAbilitato: boolean
  prezzoB2b: string
  quantitaMin: string
  quantitaMax: string
  sconto1: string
  sconto2: string
  sconto3: string
  commissione: string
  active: boolean
  defaultFlag: boolean
  fullAddress: string
  pubblico: boolean
}

const EMPTY_FORM: FormState = {
  area: '',
  classe: '',
  nome: '',
  descrizione: '',
  codArticolo: '',
  b2cAbilitato: false,
  prezzoB2c: '',
  b2bAbilitato: true,
  prezzoB2b: '',
  quantitaMin: '0',
  quantitaMax: '0',
  sconto1: '',
  sconto2: '',
  sconto3: '',
  commissione: '',
  active: true,
  defaultFlag: false,
  fullAddress: '',
  pubblico: false,
}

export default function CreaServizio({ navigate }: { navigate: (p: string) => void }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const prezzoB2cN = parseFloat(form.prezzoB2c)
  const prezzoB2bN = parseFloat(form.prezzoB2b)

  const noMercatoSelezionato = !form.b2cAbilitato && !form.b2bAbilitato
  const b2cPrezzoInvalido = form.b2cAbilitato && (!form.prezzoB2c || isNaN(prezzoB2cN) || prezzoB2cN <= 0)
  const b2bPrezzoInvalido = form.b2bAbilitato && (!form.prezzoB2b || isNaN(prezzoB2bN) || prezzoB2bN <= 0)

  const disabled =
    !form.nome.trim() ||
    !form.area ||
    !form.classe ||
    noMercatoSelezionato ||
    b2cPrezzoInvalido ||
    b2bPrezzoInvalido

  // Margine calcolato sul prezzo B2B (prezzo di costo per la rete) rispetto
  // al prezzo finale B2C.
  const margineB2c = (() => {
    if (!form.b2cAbilitato || !form.b2bAbilitato) return null
    if (!prezzoB2bN || prezzoB2bN <= 0 || !prezzoB2cN) return null
    return (((prezzoB2cN - prezzoB2bN) / prezzoB2bN) * 100)
  })()

  const handleCancel = () => navigate('i-miei-servizi')

  const handleSave = () => {
    if (disabled) return
    // TODO: persistere su BE/store quando definito.
    navigate('i-miei-servizi')
  }

  return (
    <div className="crea-servizio">
      <BtnBack onClick={handleCancel} />
      <PageHeader
        title="Crea servizio"
        subtitle="Definisci area, classe e mercati di vendita del nuovo servizio"
      />

      <div className="prod-modal crea-servizio__form">
        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Identificazione</div>
          <div className="prod-modal__grid prod-modal__grid--2">
            <Field label="Cod. articolo">
              <input
                value={form.codArticolo}
                onChange={(e) => set('codArticolo', e.target.value)}
                className="sib-input"
                placeholder="Inserisci codice articolo"
              />
            </Field>
            <div className="prod-modal__attivo">
              <label className="prod-modal__label">Stato</label>
              <label className="prod-modal__toggle">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set('active', e.target.checked)}
                  className="sib-checkbox"
                />
                <span>{form.active ? 'Attivo (visibile ai clienti)' : 'Disattivo (nascosto)'}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Anagrafica servizio</div>
          <div className="prod-modal__grid prod-modal__grid--2">
            <Field label="Nome servizio *">
              <input
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                className="sib-input"
                placeholder="Es. Transfer aeroporto"
              />
            </Field>
            <Field label="Full address">
              <input
                value={form.fullAddress}
                onChange={(e) => set('fullAddress', e.target.value)}
                className="sib-input"
                placeholder="Indirizzo completo del servizio (se applicabile)"
              />
            </Field>
          </div>
          <Field label="Descrizione">
            <textarea
              value={form.descrizione}
              onChange={(e) => set('descrizione', e.target.value)}
              className="sib-input prod-modal__textarea"
              rows={2}
              placeholder="Descrizione, dettagli, condizioni..."
            />
          </Field>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Classificazione</div>
          <div className="prod-modal__grid prod-modal__grid--2">
            <Field label="Area *">
              <select
                value={form.area}
                onChange={(e) => set('area', e.target.value)}
                className="sib-select"
              >
                <option value="">Seleziona area...</option>
                {AREE.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Classe servizio *">
              <select
                value={form.classe}
                onChange={(e) => set('classe', e.target.value)}
                className="sib-select"
              >
                <option value="">Seleziona classe...</option>
                {CLASSI.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Quantità</div>
          <div className="prod-modal__grid prod-modal__grid--2">
            <Field label="Quantità minima">
              <input
                type="number"
                step="1"
                min="0"
                value={form.quantitaMin}
                onChange={(e) => set('quantitaMin', e.target.value)}
                className="sib-input"
                placeholder="0"
              />
            </Field>
            <Field label="Quantità massima">
              <input
                type="number"
                step="1"
                min="0"
                value={form.quantitaMax}
                onChange={(e) => set('quantitaMax', e.target.value)}
                className="sib-input"
                placeholder="0 (= illimitata)"
              />
            </Field>
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Mercati di vendita *</div>
          <p className="prod-modal__section-hint">
            Abilita uno o entrambi i canali (B2C / B2B) e imposta il prezzo di vendita.
          </p>

          {MERCATI.map((m) => {
            const enabled = m.id === 'b2c' ? form.b2cAbilitato : form.b2bAbilitato
            const prezzoStr = m.id === 'b2c' ? form.prezzoB2c : form.prezzoB2b
            const cls = `prod-modal__market${enabled ? ' prod-modal__market--on' : ''}`
            const setEn = (v: boolean) =>
              m.id === 'b2c' ? set('b2cAbilitato', v) : set('b2bAbilitato', v)
            const setPr = (v: string) =>
              m.id === 'b2c' ? set('prezzoB2c', v) : set('prezzoB2b', v)
            return (
              <div key={m.id} className={cls} style={{ ['--mercato-color' as any]: m.colore }}>
                <label className="prod-modal__market-toggle">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEn(e.target.checked)}
                    className="sib-checkbox"
                  />
                  <span className="prod-modal__market-name">{m.label}</span>
                </label>
                <div className="prod-modal__market-desc">{m.descrizione}</div>
                {enabled && (
                  <div className="prod-modal__market-price">
                    <label className="prod-modal__label">Prezzo {m.label} (€) *</label>
                    <div className="prod-modal__market-price-row">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={prezzoStr}
                        onChange={(e) => setPr(e.target.value)}
                        className="sib-input prod-modal__market-input"
                        placeholder="0,00"
                      />
                      {m.id === 'b2c' && margineB2c !== null && (
                        <span className={`prod-modal__margine prod-modal__margine--${margineB2c >= 0 ? 'pos' : 'neg'}`}>
                          {margineB2c >= 0 ? '+' : ''}{margineB2c.toFixed(1)}% margine vs B2B
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

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Sconti e commissione</div>
          <div className="prod-modal__grid prod-modal__grid--4">
            <Field label="Sconto 1 (%)">
              <input
                type="number" step="0.01" min="0" max="100"
                value={form.sconto1}
                onChange={(e) => set('sconto1', e.target.value)}
                className="sib-input"
                placeholder="0,00"
              />
            </Field>
            <Field label="Sconto 2 (%)">
              <input
                type="number" step="0.01" min="0" max="100"
                value={form.sconto2}
                onChange={(e) => set('sconto2', e.target.value)}
                className="sib-input"
                placeholder="0,00"
              />
            </Field>
            <Field label="Sconto 3 (%)">
              <input
                type="number" step="0.01" min="0" max="100"
                value={form.sconto3}
                onChange={(e) => set('sconto3', e.target.value)}
                className="sib-input"
                placeholder="0,00"
              />
            </Field>
            <Field label="Commissione (%)">
              <input
                type="number" step="0.01" min="0" max="100"
                value={form.commissione}
                onChange={(e) => set('commissione', e.target.value)}
                className="sib-input"
                placeholder="0,00"
              />
            </Field>
          </div>
        </div>

        <div className="prod-modal__section">
          <div className="prod-modal__section-title">Pubblicazione</div>
          <div className="crea-servizio__flags">
            <label className="prod-modal__toggle">
              <input
                type="checkbox"
                checked={form.defaultFlag}
                onChange={(e) => set('defaultFlag', e.target.checked)}
                className="sib-checkbox"
              />
              <span>Default — proposto automaticamente quando applicabile</span>
            </label>
            <label className="prod-modal__toggle">
              <input
                type="checkbox"
                checked={form.pubblico}
                onChange={(e) => set('pubblico', e.target.checked)}
                className="sib-checkbox"
              />
              <span>Pubblico — visibile anche fuori dalla rete Sibylla</span>
            </label>
          </div>
        </div>

        <div className="prod-modal__actions">
          <button className="sib-btn sib-btn--toolbar" onClick={handleCancel}>Annulla</button>
          <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={handleSave}>
            Crea servizio
          </button>
        </div>
      </div>
    </div>
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
