import React, { useEffect, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import FormGrid from '../../../../core/components/FormGrid'
import Tooltip from '../../../../core/components/Tooltip'
import {
  InputField,
  SelectField,
  TextareaField,
} from '../../../../core/components/form'
import { getEditingContract, clearEditingContract } from './_state'
import './InserisciContrattoVendita.sass'

const SPECIFICHE_OPTIONS = [
  { value: 'camere',   label: 'Solo camere' },
  { value: 'pacchetti', label: 'Pacchetti' },
  { value: 'misto',    label: 'Misto' },
  { value: 'altro',    label: 'Altro' },
]

const GARANZIE_OPTIONS = [
  { value: 'nessuna',  label: 'Nessuna' },
  { value: 'cauzione', label: 'Cauzione' },
  { value: 'fidejussione', label: 'Fidejussione bancaria' },
  { value: 'caparra',  label: 'Caparra confirmatoria' },
]

const PAGAMENTO_OPTIONS = [
  { value: '',           label: 'Seleziona' },
  { value: '30gg',       label: '30 giorni data fattura' },
  { value: '60gg',       label: '60 giorni data fattura' },
  { value: 'caparra',    label: 'Caparra anticipata' },
  { value: 'check-in',   label: 'Saldo al check-in' },
  { value: 'commissioni', label: 'Commissioni a fine mese' },
]

const TIPO_CAMERA_OPTIONS = [
  { value: 'singola',     label: 'Singola Classic' },
  { value: 'doppia',      label: 'Doppia Classic' },
  { value: 'doppia-eco',  label: 'Doppia Economy' },
  { value: 'tripla',      label: 'Tripla Classic' },
  { value: 'matr',        label: 'Matrimoniale' },
  { value: 'suite',       label: 'Suite' },
]

const MERCATO_OPTIONS = [
  { value: 'it', label: 'Italia' },
  { value: 'fr', label: 'Francia' },
  { value: 'de', label: 'Germania' },
  { value: 'gb', label: 'Regno Unito' },
  { value: 'us', label: 'Stati Uniti' },
  { value: 'jp', label: 'Giappone' },
]

interface CameraRow {
  id: string
  tipo: string
  quantita: number
  prezzo: number
  supplemento: number
}
interface TariffaRow {
  id: string
  nome: string
  periodoInizio: string
  periodoFine: string
  mercato: string
  prezzo: number
  sconto: number
}

export default function InserisciContrattoVendita({
  navigate,
  editing: editingProp = false,
}: {
  navigate: (p: string) => void
  editing?: boolean
}) {
  const initial = editingProp ? getEditingContract() : null
  const editing = editingProp && !!initial

  const [nome,     setNome]     = useState(initial?.ragioneSociale ?? '')
  const [email,    setEmail]    = useState(initial?.email ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')
  const [referente,setReferente]= useState(initial?.referente ?? '')
  const [specifiche, setSpecifiche] = useState('camere')
  const [pdfName,  setPdfName]  = useState<string>('Scegli il file')
  const [inizio,   setInizio]   = useState(initial?.periodoInizio ?? '2026-05-04')
  const [fine,     setFine]     = useState(initial?.periodoFine ?? '2026-12-31')
  const [garanzie, setGaranzie] = useState('nessuna')
  const [pagamento,setPagamento]= useState('')
  const [note,     setNote]     = useState(initial?.note ?? '')

  const [openAnag, setOpenAnag] = useState(true)
  const [openCam,  setOpenCam]  = useState(editing)
  const [openTar,  setOpenTar]  = useState(false)

  const [camere,   setCamere]   = useState<CameraRow[]>(editing
    ? [{ id: 'c-init', tipo: 'doppia', quantita: 5, prezzo: initial?.camera ?? 0, supplemento: initial?.supplemento ?? 0 }]
    : [])
  const [tariffe,  setTariffe]  = useState<TariffaRow[]>(editing
    ? [{ id: 't-init', nome: 'Tariffa standard', periodoInizio: initial?.periodoInizio ?? '', periodoFine: initial?.periodoFine ?? '', mercato: 'it', prezzo: initial?.persona ?? 0, sconto: initial?.sconto ?? 0 }]
    : [])

  const fileRef = React.useRef<HTMLInputElement>(null)
  const sectionsLocked = !editing

  useEffect(() => {
    return () => { if (editingProp) clearEditingContract() }
  }, [editingProp])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPdfName(f.name)
  }

  function addCamera() {
    setCamere(prev => [...prev, {
      id: `c-${Date.now()}`, tipo: 'doppia', quantita: 1, prezzo: 0, supplemento: 0,
    }])
  }
  function removeCamera(id: string) { setCamere(prev => prev.filter(c => c.id !== id)) }
  function updateCamera<K extends keyof CameraRow>(id: string, k: K, v: CameraRow[K]) {
    setCamere(prev => prev.map(c => c.id === id ? { ...c, [k]: v } : c))
  }

  function addTariffa() {
    setTariffe(prev => [...prev, {
      id: `t-${Date.now()}`, nome: '', periodoInizio: inizio, periodoFine: fine, mercato: 'it', prezzo: 0, sconto: 0,
    }])
  }
  function removeTariffa(id: string) { setTariffe(prev => prev.filter(t => t.id !== id)) }
  function updateTariffa<K extends keyof TariffaRow>(id: string, k: K, v: TariffaRow[K]) {
    setTariffe(prev => prev.map(t => t.id === id ? { ...t, [k]: v } : t))
  }

  return (
    <div className="ins-contr-v">
      <BtnBack onClick={() => navigate('miei-contratti-v')} />
      <PageHeader title={editing ? 'Modifica contratto di vendita' : 'Inserisci contratto di vendita'} />

      {/* ── Anagrafica ─────────────────────────────────────── */}
      <section className="ins-contr-v__section">
        <header
          className="ins-contr-v__sec-head"
          onClick={() => setOpenAnag(o => !o)}
          role="button"
          aria-expanded={openAnag}
          tabIndex={0}
        >
          <h3 className="ins-contr-v__sec-title">
            <i className="fa-light fa-file-pen" /> Anagrafica
          </h3>
          <i className={'fa-light ' + (openAnag ? 'fa-minus' : 'fa-plus') + ' ins-contr-v__sec-toggle'} aria-hidden="true" />
        </header>

        {openAnag && (
          <div className="ins-contr-v__sec-body">
            <FormGrid cols={4}>
              <InputField name="nome" label="Nome azienda" required
                placeholder="Inserisci nome azienda"
                value={nome} onChange={e => setNome(e.target.value)} />
              <InputField name="email" label="E-mail" required type="email"
                placeholder="Inserisci e-mail"
                value={email} onChange={e => setEmail(e.target.value)} />
              <InputField name="telefono" label="Telefono" required type="tel"
                placeholder="Inserisci telefono"
                value={telefono} onChange={e => setTelefono(e.target.value)} />
              <InputField name="referente" label="Referente" required
                placeholder="Inserisci nome referente"
                value={referente} onChange={e => setReferente(e.target.value)} />
            </FormGrid>

            <FormGrid cols={4}>
              <SelectField name="specifiche" label="Specifiche contratto"
                value={specifiche}
                onChange={e => setSpecifiche(e.target.value)}
                options={SPECIFICHE_OPTIONS} />
              <div className="ins-contr-v__field">
                <label className="ins-contr-v__label">Carica PDF<span className="ins-contr-v__req">*</span></label>
                <div className="ins-contr-v__file">
                  <button type="button" className="ins-contr-v__file-btn" onClick={() => fileRef.current?.click()}>
                    Seleziona
                  </button>
                  <span className="ins-contr-v__file-name" title={pdfName}>{pdfName}</span>
                  <Tooltip text="Anteprima">
                    <button type="button" className="ins-contr-v__file-eye" disabled={pdfName === 'Scegli il file'} aria-label="Anteprima">
                      <i className="fa-light fa-eye" />
                    </button>
                  </Tooltip>
                  <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={handleFile} />
                </div>
              </div>
              <InputField name="inizio" label="Inizio periodo" type="text"
                iconLeft="fa-light fa-calendar"
                value={formatDateIt(inizio)}
                onChange={e => setInizio(parseDateIt(e.target.value))} />
              <InputField name="fine" label="Fine periodo" type="text"
                iconLeft="fa-light fa-calendar"
                value={formatDateIt(fine)}
                onChange={e => setFine(parseDateIt(e.target.value))} />
            </FormGrid>

            <FormGrid cols={4}>
              <SelectField name="garanzie" label="Tipologia garanzie"
                value={garanzie}
                onChange={e => setGaranzie(e.target.value)}
                options={GARANZIE_OPTIONS} />
              <SelectField name="pagamento" label="Tipologia pagamento" required
                value={pagamento}
                onChange={e => setPagamento(e.target.value)}
                options={PAGAMENTO_OPTIONS} />
            </FormGrid>

            <FormGrid cols={2}>
              <TextareaField name="note" label="Note" rows={2}
                placeholder="Inserisci Note"
                value={note}
                onChange={e => setNote(e.target.value)} />
            </FormGrid>

            <div className="ins-contr-v__sec-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('miei-contratti-v')}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary">
                {editing ? 'Salva modifiche' : 'Salva'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Camere ─────────────────────────────────────────── */}
      <section className={'ins-contr-v__section' + (sectionsLocked ? ' ins-contr-v__section--locked' : '')}>
        <header
          className="ins-contr-v__sec-head"
          onClick={() => { if (!sectionsLocked) setOpenCam(o => !o) }}
          role="button"
          aria-expanded={openCam}
          aria-disabled={sectionsLocked}
          tabIndex={sectionsLocked ? -1 : 0}
        >
          <h3 className="ins-contr-v__sec-title">
            <i className="fa-light fa-bed" /> Camere
            {sectionsLocked && (
              <Tooltip text="Disponibile dopo aver salvato l'anagrafica del contratto">
                <span className="ins-contr-v__lock-badge">
                  <i className="fa-light fa-lock" /> Disponibile in modifica
                </span>
              </Tooltip>
            )}
          </h3>
          <i className={'fa-light ' + (sectionsLocked ? 'fa-lock' : openCam ? 'fa-minus' : 'fa-plus') + ' ins-contr-v__sec-toggle'} aria-hidden="true" />
        </header>

        {openCam && !sectionsLocked && (
          <div className="ins-contr-v__sec-body">
            {camere.length === 0 && (
              <p className="ins-contr-v__empty">Nessuna camera inserita. Aggiungi una tipologia di camera al contratto.</p>
            )}
            {camere.map(c => (
              <FormGrid key={c.id} cols={4}>
                <SelectField name={`ct-${c.id}`} label="Tipo camera"
                  value={c.tipo}
                  onChange={e => updateCamera(c.id, 'tipo', e.target.value)}
                  options={TIPO_CAMERA_OPTIONS} />
                <InputField name={`cq-${c.id}`} label="Quantità" type="number" min={1}
                  value={c.quantita}
                  onChange={e => updateCamera(c.id, 'quantita', Number(e.target.value) || 1)} />
                <InputField name={`cp-${c.id}`} label="Prezzo (€)" type="number" step={0.01} min={0}
                  value={c.prezzo}
                  onChange={e => updateCamera(c.id, 'prezzo', Number(e.target.value) || 0)} />
                <div className="ins-contr-v__row-with-action">
                  <InputField name={`cs-${c.id}`} label="Supplemento (€)" type="number" step={0.01} min={0}
                    value={c.supplemento}
                    onChange={e => updateCamera(c.id, 'supplemento', Number(e.target.value) || 0)} />
                  <Tooltip text="Rimuovi camera">
                    <button type="button" className="sib-btn sib-btn--icon ins-contr-v__btn-remove" onClick={() => removeCamera(c.id)} aria-label="Rimuovi">
                      <i className="fa-light fa-trash" />
                    </button>
                  </Tooltip>
                </div>
              </FormGrid>
            ))}
            <div>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={addCamera}>
                <i className="fa-light fa-circle-plus" /> Aggiungi camera
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Tariffe ────────────────────────────────────────── */}
      <section className={'ins-contr-v__section' + (sectionsLocked ? ' ins-contr-v__section--locked' : '')}>
        <header
          className="ins-contr-v__sec-head"
          onClick={() => { if (!sectionsLocked) setOpenTar(o => !o) }}
          role="button"
          aria-expanded={openTar}
          aria-disabled={sectionsLocked}
          tabIndex={sectionsLocked ? -1 : 0}
        >
          <h3 className="ins-contr-v__sec-title">
            <i className="fa-light fa-tag" /> Tariffe
            {sectionsLocked && (
              <Tooltip text="Disponibile dopo aver salvato l'anagrafica del contratto">
                <span className="ins-contr-v__lock-badge">
                  <i className="fa-light fa-lock" /> Disponibile in modifica
                </span>
              </Tooltip>
            )}
          </h3>
          <i className={'fa-light ' + (sectionsLocked ? 'fa-lock' : openTar ? 'fa-minus' : 'fa-plus') + ' ins-contr-v__sec-toggle'} aria-hidden="true" />
        </header>

        {openTar && !sectionsLocked && (
          <div className="ins-contr-v__sec-body">
            {tariffe.length === 0 && (
              <p className="ins-contr-v__empty">Nessuna tariffa inserita. Aggiungi una tariffa per mercato o periodo.</p>
            )}
            {tariffe.map(t => (
              <React.Fragment key={t.id}>
                <FormGrid cols={4}>
                  <InputField name={`tn-${t.id}`} label="Nome tariffa"
                    value={t.nome}
                    onChange={e => updateTariffa(t.id, 'nome', e.target.value)} />
                  <SelectField name={`tm-${t.id}`} label="Mercato"
                    value={t.mercato}
                    onChange={e => updateTariffa(t.id, 'mercato', e.target.value)}
                    options={MERCATO_OPTIONS} />
                  <InputField name={`tp-${t.id}`} label="Prezzo (€)" type="number" step={0.01} min={0}
                    value={t.prezzo}
                    onChange={e => updateTariffa(t.id, 'prezzo', Number(e.target.value) || 0)} />
                  <div className="ins-contr-v__row-with-action">
                    <InputField name={`ts-${t.id}`} label="Sconto (%)" type="number" min={0} max={100}
                      value={t.sconto}
                      onChange={e => updateTariffa(t.id, 'sconto', Number(e.target.value) || 0)} />
                    <Tooltip text="Rimuovi tariffa">
                      <button type="button" className="sib-btn sib-btn--icon ins-contr-v__btn-remove" onClick={() => removeTariffa(t.id)} aria-label="Rimuovi">
                        <i className="fa-light fa-trash" />
                      </button>
                    </Tooltip>
                  </div>
                </FormGrid>
                <FormGrid cols={4}>
                  <InputField name={`ti-${t.id}`} label="Inizio validità" type="text"
                    iconLeft="fa-light fa-calendar"
                    value={formatDateIt(t.periodoInizio)}
                    onChange={e => updateTariffa(t.id, 'periodoInizio', parseDateIt(e.target.value))} />
                  <InputField name={`tf-${t.id}`} label="Fine validità" type="text"
                    iconLeft="fa-light fa-calendar"
                    value={formatDateIt(t.periodoFine)}
                    onChange={e => updateTariffa(t.id, 'periodoFine', parseDateIt(e.target.value))} />
                </FormGrid>
              </React.Fragment>
            ))}
            <div>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={addTariffa}>
                <i className="fa-light fa-circle-plus" /> Aggiungi tariffa
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function formatDateIt(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
function parseDateIt(it: string): string {
  const m = it.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return it
  return `${m[3]}-${m[2]}-${m[1]}`
}
