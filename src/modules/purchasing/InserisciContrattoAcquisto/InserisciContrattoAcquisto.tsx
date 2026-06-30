import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import FormGrid from '../../../core/components/FormGrid'
import Tooltip from '../../../core/components/Tooltip'
import {
  InputField,
  SelectField,
  TextareaField,
} from '../../../core/components/form'
import { getEditingContrattoAcquisto, clearEditingContrattoAcquisto } from './_state'
import './InserisciContrattoAcquisto.sass'

const SPECIFICHE_OPTIONS = [
  { value: 'misto',     label: 'Misto' },
  { value: 'prodotti',  label: 'Solo prodotti' },
  { value: 'servizi',   label: 'Solo servizi' },
  { value: 'altro',     label: 'Altro' },
]

const GARANZIE_OPTIONS = [
  { value: 'nessuna',  label: 'Nessuna' },
  { value: 'cauzione', label: 'Cauzione' },
  { value: 'fidejussione', label: 'Fidejussione bancaria' },
  { value: 'assicurazione', label: 'Polizza assicurativa' },
]

const PAGAMENTO_OPTIONS = [
  { value: '',           label: 'Seleziona' },
  { value: '30gg',       label: '30 giorni data fattura' },
  { value: '60gg',       label: '60 giorni data fattura' },
  { value: '90gg',       label: '90 giorni data fattura' },
  { value: 'fine-mese',  label: 'Fine mese' },
  { value: 'rid',        label: 'RID bancario' },
  { value: 'bonifico',   label: 'Bonifico immediato' },
]

interface Prodotto {
  id: string
  nome: string
  unita: string
  prezzo: number
  iva: number
  quantita: number
}
interface Servizio {
  id: string
  nome: string
  descrizione: string
  costo: number
  iva: number
}

export default function InserisciContrattoAcquisto({
  navigate,
  editing = false,
}: {
  navigate: (p: string) => void
  editing?: boolean
}) {
  const sectionsLocked = !editing
  const initial = editing ? getEditingContrattoAcquisto() : null
  const backTo = editing ? 'miei-contratti-a' : 'archivio-contratti'

  const [nome,     setNome]     = useState(initial?.ragioneSociale ?? '')
  const [email,    setEmail]    = useState(initial?.email ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')
  const [referente,setReferente]= useState(initial?.referente ?? '')
  const [specifiche, setSpecifiche] = useState('misto')
  const [pdfName,  setPdfName]  = useState<string>('Scegli il file')
  const [inizio,   setInizio]   = useState('2026-05-04')
  const [fine,     setFine]     = useState('2026-05-04')
  const [garanzie, setGaranzie] = useState('nessuna')
  const [pagamento,setPagamento]= useState('')
  const [note,     setNote]     = useState('')

  const [openAnag,  setOpenAnag]  = useState(true)
  const [openProd,  setOpenProd]  = useState(editing)
  const [openServ,  setOpenServ]  = useState(editing)

  const [prodotti, setProdotti] = useState<Prodotto[]>(
    (initial?.prodotti ?? []).map((p, i) => ({ id: `p-init-${i}`, nome: p.nome, unita: 'pz', prezzo: p.prezzo, iva: 22, quantita: 1 }))
  )
  const [servizi,  setServizi]  = useState<Servizio[]>(
    (initial?.servizi ?? []).map((s, i) => ({ id: `s-init-${i}`, nome: s.nome, descrizione: '', costo: s.prezzo, iva: 22 }))
  )

  const tornaIndietro = () => { clearEditingContrattoAcquisto(); navigate(backTo) }

  const fileRef = React.useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPdfName(f.name)
  }

  function addProdotto() {
    setProdotti(prev => [...prev, {
      id: `p-${Date.now()}`, nome: '', unita: 'pz', prezzo: 0, iva: 22, quantita: 1,
    }])
  }
  function removeProdotto(id: string) {
    setProdotti(prev => prev.filter(p => p.id !== id))
  }
  function updateProdotto<K extends keyof Prodotto>(id: string, k: K, v: Prodotto[K]) {
    setProdotti(prev => prev.map(p => p.id === id ? { ...p, [k]: v } : p))
  }

  function addServizio() {
    setServizi(prev => [...prev, {
      id: `s-${Date.now()}`, nome: '', descrizione: '', costo: 0, iva: 22,
    }])
  }
  function removeServizio(id: string) {
    setServizi(prev => prev.filter(s => s.id !== id))
  }
  function updateServizio<K extends keyof Servizio>(id: string, k: K, v: Servizio[K]) {
    setServizi(prev => prev.map(s => s.id === id ? { ...s, [k]: v } : s))
  }

  return (
    <div className="ins-contr">
      <BtnBack onClick={tornaIndietro} />
      <PageHeader title={editing ? 'Modifica contratto' : 'Inserisci contratto'} />

      {/* ── Anagrafica ─────────────────────────────────────── */}
      <section className="ins-contr__section">
        <header
          className="ins-contr__sec-head"
          onClick={() => setOpenAnag(o => !o)}
          role="button"
          aria-expanded={openAnag}
          tabIndex={0}
        >
          <h3 className="ins-contr__sec-title">
            <i className="fa-light fa-file-pen" /> Anagrafica
          </h3>
          <i className={'fa-light ' + (openAnag ? 'fa-minus' : 'fa-plus') + ' ins-contr__sec-toggle'} aria-hidden="true" />
        </header>

        {openAnag && (
          <div className="ins-contr__sec-body">
            <FormGrid cols={4}>
              <InputField
                name="nome" label="Nome azienda" required
                placeholder="Inserisci nome azienda"
                value={nome} onChange={e => setNome(e.target.value)}
              />
              <InputField
                name="email" label="E-mail" required type="email"
                placeholder="Inserisci e-mail"
                value={email} onChange={e => setEmail(e.target.value)}
              />
              <InputField
                name="telefono" label="Telefono" required type="tel"
                placeholder="Inserisci telefono"
                value={telefono} onChange={e => setTelefono(e.target.value)}
              />
              <InputField
                name="referente" label="Referente" required
                placeholder="Inserisci nome referente"
                value={referente} onChange={e => setReferente(e.target.value)}
              />
            </FormGrid>

            <FormGrid cols={4}>
              <SelectField
                name="specifiche" label="Specifiche contratto"
                value={specifiche}
                onChange={e => setSpecifiche(e.target.value)}
                options={SPECIFICHE_OPTIONS}
              />
              <div className="ins-contr__field">
                <label className="ins-contr__label">Carica PDF<span className="ins-contr__req">*</span></label>
                <div className="ins-contr__file">
                  <button type="button" className="ins-contr__file-btn" onClick={() => fileRef.current?.click()}>
                    Seleziona
                  </button>
                  <span className="ins-contr__file-name" title={pdfName}>{pdfName}</span>
                  <Tooltip text="Anteprima">
                    <button type="button" className="ins-contr__file-eye" disabled={pdfName === 'Scegli il file'} aria-label="Anteprima">
                      <i className="fa-light fa-eye" />
                    </button>
                  </Tooltip>
                  <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={handleFile} />
                </div>
              </div>
              <InputField
                name="inizio" label="Inizio periodo" type="text"
                iconLeft="fa-light fa-calendar"
                value={formatDateIt(inizio)}
                onChange={e => setInizio(parseDateIt(e.target.value))}
              />
              <InputField
                name="fine" label="Fine periodo" type="text"
                iconLeft="fa-light fa-calendar"
                value={formatDateIt(fine)}
                onChange={e => setFine(parseDateIt(e.target.value))}
              />
            </FormGrid>

            <FormGrid cols={4}>
              <SelectField
                name="garanzie" label="Tipologia garanzie"
                value={garanzie}
                onChange={e => setGaranzie(e.target.value)}
                options={GARANZIE_OPTIONS}
              />
              <SelectField
                name="pagamento" label="Tipologia pagamento" required
                value={pagamento}
                onChange={e => setPagamento(e.target.value)}
                options={PAGAMENTO_OPTIONS}
              />
            </FormGrid>

            <FormGrid cols={2}>
              <TextareaField
                name="note" label="Note" rows={2}
                placeholder="Inserisci Note"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </FormGrid>

            <div className="ins-contr__sec-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={tornaIndietro}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={tornaIndietro}>
                Salva
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Prodotti ───────────────────────────────────────── */}
      <section className={'ins-contr__section' + (sectionsLocked ? ' ins-contr__section--locked' : '')}>
        <header
          className="ins-contr__sec-head"
          onClick={() => { if (!sectionsLocked) setOpenProd(o => !o) }}
          role="button"
          aria-expanded={openProd}
          aria-disabled={sectionsLocked}
          tabIndex={sectionsLocked ? -1 : 0}
        >
          <h3 className="ins-contr__sec-title">
            <i className="fa-light fa-box-open" /> Prodotti
            {sectionsLocked && (
              <Tooltip text="Disponibile dopo aver salvato l'anagrafica del contratto">
                <span className="ins-contr__lock-badge">
                  <i className="fa-light fa-lock" /> Disponibile in modifica
                </span>
              </Tooltip>
            )}
          </h3>
          <i
            className={
              'fa-light ' +
              (sectionsLocked ? 'fa-lock' : openProd ? 'fa-minus' : 'fa-plus') +
              ' ins-contr__sec-toggle'
            }
            aria-hidden="true"
          />
        </header>

        {openProd && !sectionsLocked && (
          <div className="ins-contr__sec-body">
            {prodotti.length === 0 && (
              <p className="ins-contr__empty">Nessun prodotto inserito. Aggiungi il primo prodotto al contratto.</p>
            )}
            {prodotti.map(p => (
              <FormGrid key={p.id} cols={4}>
                <InputField name={`pn-${p.id}`} label="Nome prodotto"
                  value={p.nome} onChange={e => updateProdotto(p.id, 'nome', e.target.value)} />
                <InputField name={`pu-${p.id}`} label="Unità"
                  value={p.unita} onChange={e => updateProdotto(p.id, 'unita', e.target.value)} />
                <InputField name={`pp-${p.id}`} label="Prezzo (€)" type="number" step={0.01} min={0}
                  value={p.prezzo} onChange={e => updateProdotto(p.id, 'prezzo', Number(e.target.value) || 0)} />
                <div className="ins-contr__row-with-action">
                  <InputField name={`pq-${p.id}`} label="Quantità" type="number" min={1}
                    value={p.quantita} onChange={e => updateProdotto(p.id, 'quantita', Number(e.target.value) || 1)} />
                  <Tooltip text="Rimuovi prodotto">
                    <button type="button" className="sib-btn sib-btn--icon ins-contr__btn-remove" onClick={() => removeProdotto(p.id)} aria-label="Rimuovi">
                      <i className="fa-light fa-trash" />
                    </button>
                  </Tooltip>
                </div>
              </FormGrid>
            ))}
            <div>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={addProdotto}>
                <i className="fa-light fa-circle-plus" /> Aggiungi prodotto
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Servizi ────────────────────────────────────────── */}
      <section className={'ins-contr__section' + (sectionsLocked ? ' ins-contr__section--locked' : '')}>
        <header
          className="ins-contr__sec-head"
          onClick={() => { if (!sectionsLocked) setOpenServ(o => !o) }}
          role="button"
          aria-expanded={openServ}
          aria-disabled={sectionsLocked}
          tabIndex={sectionsLocked ? -1 : 0}
        >
          <h3 className="ins-contr__sec-title">
            <i className="fa-light fa-handshake" /> Servizi
            {sectionsLocked && (
              <Tooltip text="Disponibile dopo aver salvato l'anagrafica del contratto">
                <span className="ins-contr__lock-badge">
                  <i className="fa-light fa-lock" /> Disponibile in modifica
                </span>
              </Tooltip>
            )}
          </h3>
          <i
            className={
              'fa-light ' +
              (sectionsLocked ? 'fa-lock' : openServ ? 'fa-minus' : 'fa-plus') +
              ' ins-contr__sec-toggle'
            }
            aria-hidden="true"
          />
        </header>

        {openServ && !sectionsLocked && (
          <div className="ins-contr__sec-body">
            {servizi.length === 0 && (
              <p className="ins-contr__empty">Nessun servizio inserito. Aggiungi il primo servizio al contratto.</p>
            )}
            {servizi.map(s => (
              <FormGrid key={s.id} cols={4}>
                <InputField name={`sn-${s.id}`} label="Nome servizio"
                  value={s.nome} onChange={e => updateServizio(s.id, 'nome', e.target.value)} />
                <InputField name={`sd-${s.id}`} label="Descrizione"
                  value={s.descrizione} onChange={e => updateServizio(s.id, 'descrizione', e.target.value)} />
                <InputField name={`sc-${s.id}`} label="Costo (€)" type="number" step={0.01} min={0}
                  value={s.costo} onChange={e => updateServizio(s.id, 'costo', Number(e.target.value) || 0)} />
                <div className="ins-contr__row-with-action">
                  <InputField name={`si-${s.id}`} label="IVA (%)" type="number" min={0} max={100}
                    value={s.iva} onChange={e => updateServizio(s.id, 'iva', Number(e.target.value) || 0)} />
                  <Tooltip text="Rimuovi servizio">
                    <button type="button" className="sib-btn sib-btn--icon ins-contr__btn-remove" onClick={() => removeServizio(s.id)} aria-label="Rimuovi">
                      <i className="fa-light fa-trash" />
                    </button>
                  </Tooltip>
                </div>
              </FormGrid>
            ))}
            <div>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={addServizio}>
                <i className="fa-light fa-circle-plus" /> Aggiungi servizio
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function formatDateIt(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
function parseDateIt(it: string): string {
  const m = it.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return it
  return `${m[3]}-${m[2]}-${m[1]}`
}
