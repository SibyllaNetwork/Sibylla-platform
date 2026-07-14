import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../services/api'
import { InputField, SelectField } from '../../../core/components/form'
import { useEmissioneStore, type EmAddebito } from '../../../store/useEmissioneStore'
import './ContiCamera.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Dettaglio {
  prenotazioneNum: string
  nominativo: string
  dataArrivo: string
  dataPartenza: string
  giorni: number
  ospiti: number
  agenzia: string
  credit: string
  struttura: string
  arrangiamento: string
  nCamere: number
  totale: number
  diCuiCamere: number
  diCuiServizi: number
  diCuiTasse: number
  pagato: number
  daPagare: number
  note: string
}

interface Addebito {
  id: number
  camera: string
  data: string
  pertinenza: string
  descrizione: string
  descrizioneInfo?: boolean
  prezzo: number
  iva: number
  trasf: string
}

interface Anticipo {
  id: number
  camera: string
  data: string
  tipologia: string
  prezzo: number
  iva: number
  trasf: string
}

interface Documento {
  id: number
  documento: string
  data: string
  intestatario: string
  totale: number
  pagato: number
  sospeso: number
}

interface Data {
  dettaglio: Dettaglio
  addebiti: Addebito[]
  anticipi: Anticipo[]
  documenti: Documento[]
}

const FALLBACK: Data = {
  dettaglio: {
    prenotazioneNum: '14999',
    nominativo: 'Novi Rudolph',
    dataArrivo: '22/04/2026',
    dataPartenza: '24/04/2026',
    giorni: 2,
    ospiti: 1,
    agenzia: 'Nessuna',
    credit: 'NC',
    struttura: 'Hotel Tutorial',
    arrangiamento: 'Room Only',
    nCamere: 1,
    totale: 622.60,
    diCuiCamere: 607.60,
    diCuiServizi: 0,
    diCuiTasse: 15,
    pagato: 0,
    daPagare: 472.60,
    note: '',
  },
  addebiti: [
    { id: 1, camera: '307', data: '22/04/2026', pertinenza: 'Ospite', descrizione: 'Room Only',         prezzo: 303.80, iva: 10, trasf: '' },
    { id: 2, camera: '307', data: '22/04/2026', pertinenza: 'Ospite', descrizione: 'Tassa di soggiorno', descrizioneInfo: true, prezzo: 7.50,   iva: 0,  trasf: '' },
    { id: 3, camera: '307', data: '23/04/2026', pertinenza: 'Ospite', descrizione: 'Room Only',         prezzo: 303.80, iva: 10, trasf: '' },
    { id: 4, camera: '307', data: '23/04/2026', pertinenza: 'Ospite', descrizione: 'Tassa di soggiorno', descrizioneInfo: true, prezzo: 7.50,   iva: 0,  trasf: '' },
  ],
  anticipi: [
    { id: 1, camera: '307', data: '22/04/2026', tipologia: 'Caparra', prezzo: -150, iva: 0, trasf: '' },
  ],
  documenti: [
    { id: 1, documento: 'Caparra n. 19', data: '20/04/2026', intestatario: '', totale: 150, pagato: 150, sospeso: 0 },
  ],
}

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ContiCamera({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [selAddebiti, setSelAddebiti] = useState<number[]>([])
  const [selAnticipi, setSelAnticipi] = useState<number[]>([])
  const setCheckout = useEmissioneStore((s) => s.setCheckout)

  // Modali
  const [modModifica, setModModifica] = useState<Addebito | null>(null)
  const [modFrazionato, setModFrazionato] = useState<Addebito | null>(null)
  const [modPartiUguali, setModPartiUguali] = useState<Addebito | null>(null)
  const [modTrasferisci, setModTrasferisci] = useState<Addebito | null>(null)
  const [modElimina, setModElimina] = useState<Addebito | null>(null)
  const [modAggiungi, setModAggiungi] = useState(false)
  const [estrattoOpen, setEstrattoOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetContiCamera', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const toggleAddebito = (id: number) =>
    setSelAddebiti((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAllAddebiti = () =>
    setSelAddebiti((p) => (p.length === data.addebiti.length ? [] : data.addebiti.map((a) => a.id)))
  const toggleAnticipo = (id: number) =>
    setSelAnticipi((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAllAnticipi = () =>
    setSelAnticipi((p) => (p.length === data.anticipi.length ? [] : data.anticipi.map((a) => a.id)))

  const totAddebiti = data.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const totAnticipi = data.anticipi.reduce((s, a) => s + a.prezzo, 0)

  const d = data.dettaglio

  // Paga ora → porta gli addebiti selezionati (o tutti, se nessuno) alla pagina
  // Emissione documenti.
  const pagaOra = () => {
    const scelti = selAddebiti.length ? data.addebiti.filter((a) => selAddebiti.includes(a.id)) : data.addebiti
    const emAddebiti: EmAddebito[] = scelti.map((a) => ({
      id: a.id,
      camera: a.camera,
      data: a.data,
      riferimento: a.pertinenza && a.pertinenza !== 'Ospite' ? a.pertinenza : '',
      descrizione: a.descrizione,
      prezzo: a.prezzo,
      iva: a.iva,
    }))
    setCheckout({ addebiti: emAddebiti, caparra: Math.abs(totAnticipi) })
    navigate('emissione-documenti')
  }

  return (
    <div className="conti-camera">
      <PageHead
        title="Conti camera"
        subtitle="Gestisci facilmente gli addebiti del soggiorno: sposta le singole voci tra camere o ripartisci il valore della prenotazione"
        onBack={() => navigate('ospiti-in-casa')}
        actions={<div className="conti-camera__stampante">Stampante fiscale ...</div>}
      />

      {/* ─── Dettaglio ─────────────────────────────────────────────────────── */}
      <h3 className="conti-camera__section-title">Dettaglio</h3>
      <div className="conti-camera__detail-card">
        <div className="conti-camera__detail-row">
          <DetailField label="N. Prenotazione" value={d.prenotazioneNum} />
          <DetailField label="Nominativo" value={d.nominativo} />
          <DetailField label="Data di arrivo" value={d.dataArrivo} />
          <DetailField label="Data di partenza" value={d.dataPartenza} />
          <DetailField label="Giorni" value={String(d.giorni)} />
          <DetailField label="Ospiti" value={String(d.ospiti)} />
          <DetailField label="Agenzia" value={d.agenzia} />
          <DetailField label="Credit" value={d.credit} />
          <DetailField label="Struttura" value={d.struttura} />
        </div>
        <div className="conti-camera__detail-row">
          <DetailField label="Arrangiamento" value={d.arrangiamento} />
          <DetailField label="N camere" value={String(d.nCamere)} />
          <DetailField label="Totale" value={fmtCurrency(d.totale)} />
          <DetailField label="Di cui camere" value={fmtCurrency(d.diCuiCamere)} />
          <DetailField label="Di cui servizi" value={fmtCurrency(d.diCuiServizi)} />
          <DetailField label="Di cui tasse di soggiorno" value={fmtCurrency(d.diCuiTasse)} />
          <DetailField label="Pagato" value={fmtCurrency(d.pagato)} />
          <DetailField label="Da pagare" value={fmtCurrency(d.daPagare)} />
          <DetailField label="Note" value={d.note} />
        </div>
      </div>

      {/* ─── Layout 2 colonne ──────────────────────────────────────────────── */}
      <div className="conti-camera__layout">
        {/* Colonna sx: Addebiti */}
        <div className="conti-camera__col">
          <h3 className="conti-camera__section-title">Addebiti</h3>
          <div className="sib-table-wrap">
            <table className="sib-table conti-camera__table">
              <thead>
                <tr>
                  <th className="conti-camera__th-check">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={selAddebiti.length === data.addebiti.length && data.addebiti.length > 0}
                      onChange={toggleAllAddebiti}
                    />
                    <i className="fa-solid fa-chevron-down conti-camera__chevron" />
                  </th>
                  <th>Camera</th>
                  <th>Data</th>
                  <th>Pertinenza</th>
                  <th>Descrizione</th>
                  <th className="conti-camera__th-num">Prezzo</th>
                  <th className="conti-camera__th-num">IVA</th>
                  <th>Trasf.</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {data.addebiti.map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? 'conti-camera__row--alt' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        className="sib-checkbox"
                        checked={selAddebiti.includes(a.id)}
                        onChange={() => toggleAddebito(a.id)}
                      />
                    </td>
                    <td>{a.camera}</td>
                    <td>{a.data}</td>
                    <td>{a.pertinenza}</td>
                    <td>
                      {a.descrizione}
                      {a.descrizioneInfo && <i className="fa-solid fa-circle-info conti-camera__info-ico" />}
                    </td>
                    <td className="conti-camera__td-num">{fmtCurrency(a.prezzo)}</td>
                    <td className="conti-camera__td-num">{a.iva} %</td>
                    <td>{a.trasf}</td>
                    <td>
                      <div className="conti-camera__row-actions">
                        <button type="button" className="sib-btn sib-btn--icon" title="Modifica addebito" aria-label="Modifica addebito" onClick={() => setModModifica(a)}><i className="fa-solid fa-pen" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Addebito frazionato" aria-label="Addebito frazionato" onClick={() => setModFrazionato(a)}><i className="fa-solid fa-arrows-split-up-and-left" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Addebito in parti uguali" aria-label="Addebito in parti uguali" onClick={() => setModPartiUguali(a)}><i className="fa-solid fa-equals" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Trasferisci addebito" aria-label="Trasferisci addebito" onClick={() => setModTrasferisci(a)}><i className="fa-solid fa-right-left" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Elimina" aria-label="Elimina" onClick={() => setModElimina(a)}><i className="fa-solid fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="conti-camera__bar">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModAggiungi(true)}><i className="fa-regular fa-circle-plus" /> Aggiungi addebito</button>
            <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-regular fa-right-left" /> Trasferisci addebiti</button>
            <div className="conti-camera__estratto">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEstrattoOpen((v) => !v)}>
                <i className="fa-regular fa-file-lines" /> Estratto conto <i className="fa-regular fa-chevron-down" />
              </button>
              {estrattoOpen && (
                <>
                  <div className="conti-camera__estratto-overlay" onClick={() => setEstrattoOpen(false)} />
                  <div className="conti-camera__estratto-menu" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => setEstrattoOpen(false)}>Estratto conto totale</button>
                    <button type="button" onClick={() => setEstrattoOpen(false)}>Estratto conto cliente</button>
                    <button type="button" onClick={() => setEstrattoOpen(false)}>Estratto conto ospite</button>
                  </div>
                </>
              )}
            </div>
            <button type="button" className="sib-btn sib-btn--primary" onClick={pagaOra}>Paga ora</button>
            <span className="conti-camera__total">Totale: <strong>{fmtCurrency(totAddebiti)}</strong></span>
          </div>
        </div>

        {/* Colonna dx: Anticipi + Documenti */}
        <div className="conti-camera__col">
          <h3 className="conti-camera__section-title">Anticipi</h3>
          <div className="sib-table-wrap">
            <table className="sib-table conti-camera__table">
              <thead>
                <tr>
                  <th className="conti-camera__th-check">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={selAnticipi.length === data.anticipi.length && data.anticipi.length > 0}
                      onChange={toggleAllAnticipi}
                    />
                  </th>
                  <th>Camera</th>
                  <th>Data</th>
                  <th>Tipologia</th>
                  <th className="conti-camera__th-num">Prezzo</th>
                  <th className="conti-camera__th-num">IVA</th>
                  <th>Trasf</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {data.anticipi.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="sib-checkbox"
                        checked={selAnticipi.includes(a.id)}
                        onChange={() => toggleAnticipo(a.id)}
                      />
                    </td>
                    <td>{a.camera}</td>
                    <td>{a.data}</td>
                    <td>{a.tipologia}</td>
                    <td className="conti-camera__td-num">{fmtCurrency(a.prezzo)}</td>
                    <td className="conti-camera__td-num">{a.iva} %</td>
                    <td>{a.trasf}</td>
                    <td>
                      <div className="conti-camera__row-actions">
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Trasferisci"><i className="fa-solid fa-right-left" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Documento"><i className="fa-solid fa-file-lines" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina"><i className="fa-solid fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="conti-camera__total-row">
            Totale: <strong>{fmtCurrency(totAnticipi)}</strong>
          </div>

          <h3 className="conti-camera__section-title">Documenti emessi</h3>
          <div className="sib-table-wrap">
            <table className="sib-table conti-camera__table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Data</th>
                  <th>Intestatario</th>
                  <th className="conti-camera__th-num">Totale €</th>
                  <th className="conti-camera__th-num">Pagato €</th>
                  <th className="conti-camera__th-num">Sospeso €</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {data.documenti.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.documento}</td>
                    <td>{doc.data}</td>
                    <td className={doc.intestatario ? '' : 'sib-cell--muted'}>{doc.intestatario || '-'}</td>
                    <td className="conti-camera__td-num">{doc.totale.toFixed(2).replace('.', ',')}</td>
                    <td className="conti-camera__td-num">{doc.pagato.toFixed(2).replace('.', ',')}</td>
                    <td className="conti-camera__td-num">{doc.sospeso.toFixed(2).replace('.', ',')}</td>
                    <td>
                      <div className="conti-camera__row-actions">
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Stampa"><i className="fa-solid fa-print" /></button>
                        <button type="button" className="sib-btn sib-btn--icon conti-camera__icon-danger" aria-label="Visualizza"><i className="fa-solid fa-eye" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modModifica && <ModificaAddebitoModal addebito={modModifica} onClose={() => setModModifica(null)} />}
      {modFrazionato && <FrazionatoModal addebito={modFrazionato} onClose={() => setModFrazionato(null)} />}
      {modPartiUguali && <PartiUgualiModal addebito={modPartiUguali} onClose={() => setModPartiUguali(null)} />}
      {modTrasferisci && <TrasferisciModal addebito={modTrasferisci} addebiti={data.addebiti} onClose={() => setModTrasferisci(null)} />}
      {modElimina && <EliminaModal addebito={modElimina} onClose={() => setModElimina(null)} onConfirm={() => setModElimina(null)} />}
      {modAggiungi && <AggiungiAddebitoModal dettaglio={d} onClose={() => setModAggiungi(false)} />}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="conti-camera__field">
      <div className="conti-camera__field-label">{label}</div>
      <div className="conti-camera__field-value">{value || '-'}</div>
    </div>
  )
}

// ─── MODAL: Modifica addebito ────────────────────────────────────────────────
function ModificaAddebitoModal({ addebito, onClose }: { addebito: Addebito; onClose: () => void }) {
  const [importo, setImporto] = useState('')
  const [motivazione, setMotivazione] = useState('')

  return (
    <ModalShell title="Modifica addebito" onClose={onClose} maxWidth={520}>
      <p className="cc-modal__totale">Totale addebito <strong>{fmtCurrency(addebito.prezzo)}</strong></p>
      <div className="cc-modal__grid cc-modal__grid--2">
        <InputField
          className="cc-modal__field"
          name="importo"
          label="Modifica importo"
          type="text"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
        />
        <InputField
          className="cc-modal__field"
          name="motivazione"
          label="Motivazione"
          placeholder="Inserire motivazione"
          value={motivazione}
          onChange={(e) => setMotivazione(e.target.value)}
        />
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={!importo || !motivazione} onClick={onClose}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Addebito frazionato ──────────────────────────────────────────────
function FrazionatoModal({ addebito, onClose }: { addebito: Addebito; onClose: () => void }) {
  const [parti, setParti] = useState(2)
  const [valori, setValori] = useState<string[]>(['', ''])

  const setNumeroParti = (n: number) => {
    setParti(n)
    setValori((p) => {
      const next = p.slice(0, n)
      while (next.length < n) next.push('')
      return next
    })
  }
  const setValore = (i: number, v: string) =>
    setValori((p) => p.map((x, idx) => (idx === i ? v : x)))

  return (
    <ModalShell title="Addebito frazionato" onClose={onClose} maxWidth={620}>
      <p className="cc-modal__totale">Totale addebito <strong>{fmtCurrency(addebito.prezzo)}</strong></p>
      <div className="cc-modal__frazionato">
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="numeroParti"
          label="Numero parti"
          value={parti}
          onChange={(e) => setNumeroParti(Number(e.target.value))}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        />
        {valori.map((v, i) => (
          <div key={i} className="cc-modal__field-raw cc-modal__field--narrow">
            <label>Parte {i + 1}</label>
            <div className="cc-modal__amount">
              <input className="sib-input" type="text" placeholder="0.00" value={v} onChange={(e) => setValore(i, e.target.value)} />
              <span>€</span>
            </div>
          </div>
        ))}
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={valori.some((v) => !v)} onClick={onClose}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Addebito in parti uguali ─────────────────────────────────────────
function PartiUgualiModal({ addebito, onClose }: { addebito: Addebito; onClose: () => void }) {
  const [parti, setParti] = useState(2)
  const valore = addebito.prezzo / parti

  return (
    <ModalShell title="Addebito in parti uguali" onClose={onClose} maxWidth={620}>
      <p className="cc-modal__totale">Totale addebito <strong>{fmtCurrency(addebito.prezzo)}</strong></p>
      <div className="cc-modal__frazionato">
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="numeroParti"
          label="Numero parti"
          value={parti}
          onChange={(e) => setParti(Number(e.target.value))}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        />
        {Array.from({ length: parti }, (_, i) => (
          <div key={i} className="cc-modal__field-raw cc-modal__field--narrow">
            <label>Parte {i + 1}</label>
            <div className="cc-modal__amount">
              <input className="sib-input" type="text" value={valore.toFixed(2).replace('.', ',')} readOnly />
              <span>€</span>
            </div>
          </div>
        ))}
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Trasferisci addebito ─────────────────────────────────────────────
function TrasferisciModal({ addebito, addebiti, onClose }: { addebito: Addebito; addebiti: Addebito[]; onClose: () => void }) {
  const [selected, setSelected] = useState<number[]>([addebito.id])
  const [destCamera, setDestCamera] = useState('')
  const camereDisponibili = ['101', '102', '103', '105', '201', '301', '305', '306', '307']

  const toggle = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAll = () =>
    setSelected((p) => (p.length === addebiti.length ? [] : addebiti.map((a) => a.id)))

  const totale = addebiti.filter((a) => selected.includes(a.id)).reduce((s, a) => s + a.prezzo, 0)

  return (
    <ModalShell title="Trasferisci addebito" onClose={onClose} maxWidth={760}>
      <p className="cc-modal__subtitle">Seleziona gli addebiti da trasferire</p>
      <div className="sib-table-wrap cc-modal__table-wrap">
        <table className="sib-table cc-modal__table">
          <thead>
            <tr>
              <th className="cc-modal__th-check">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={selected.length === addebiti.length && addebiti.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th>Camera</th>
              <th>Data</th>
              <th>Intestatario</th>
              <th>Descrizione</th>
              <th className="cc-modal__th-num">Prezzo</th>
              <th className="cc-modal__th-num">IVA</th>
            </tr>
          </thead>
          <tbody>
            {addebiti.map((a) => (
              <tr key={a.id}>
                <td className="cc-modal__td-center">
                  <input type="checkbox" className="sib-checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                </td>
                <td>{a.camera}</td>
                <td>{a.data}</td>
                <td className={a.pertinenza === 'Ospite' ? 'sib-cell--muted' : ''}>{a.pertinenza === 'Ospite' ? '' : a.pertinenza}</td>
                <td>{a.descrizione}</td>
                <td className="cc-modal__td-num">{fmtCurrency(a.prezzo)}</td>
                <td className="cc-modal__td-num">{(a.prezzo * a.iva / 100).toFixed(2).replace('.', ',')} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cc-modal__totale-row">Totale: <strong>{fmtCurrency(totale)}</strong></div>
      <SelectField
        className="cc-modal__field"
        name="destCamera"
        label="Seleziona camera di destinazione"
        value={destCamera}
        onChange={(e) => setDestCamera(e.target.value)}
        options={[
          { value: '', label: 'Seleziona' },
          ...camereDisponibili.map((c) => ({ value: c, label: `Camera ${c}` })),
        ]}
      />
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={!destCamera || selected.length === 0} onClick={onClose}>Trasferisci</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Elimina ──────────────────────────────────────────────────────────
function EliminaModal({ addebito, onClose, onConfirm }: { addebito: Addebito; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalShell title="Elimina addebito" onClose={onClose} maxWidth={460}>
      <p className="cc-modal__subtitle">
        Sei sicuro di voler eliminare l'addebito <strong>{addebito.descrizione}</strong> da <strong>{fmtCurrency(addebito.prezzo)}</strong>?
      </p>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--danger" onClick={onConfirm}>Elimina</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Aggiungi addebito ────────────────────────────────────────────────
function AggiungiAddebitoModal({ dettaglio, onClose }: { dettaglio: Dettaglio; onClose: () => void }) {
  const [nomeServizio, setNomeServizio] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [ospite, setOspite] = useState('')
  const [pertinenza, setPertinenza] = useState('Ospite')
  const [quantita, setQuantita] = useState('1')
  const [prezzo, setPrezzo] = useState('')
  const [iva, setIva] = useState('')
  const today = new Date().toLocaleDateString('it-IT')
  const [del, setDel] = useState(today)

  return (
    <ModalShell title="Aggiungi addebito" onClose={onClose} maxWidth={1100}>
      <div className="cc-modal__detail-row">
        <DetailField label="N. Prenotazione" value={dettaglio.prenotazioneNum} />
        <DetailField label="N. Camera" value="403" />
        <DetailField label="Nominativo" value={dettaglio.nominativo} />
        <DetailField label="Data di arrivo" value={dettaglio.dataArrivo} />
        <DetailField label="Data di partenza" value={dettaglio.dataPartenza} />
        <DetailField label="Giorni" value={String(dettaglio.giorni)} />
        <DetailField label="Ospiti" value={String(dettaglio.ospiti)} />
      </div>
      <div className="cc-modal__row">
        <SelectField
          className="cc-modal__field cc-modal__field--medium"
          name="nomeServizio"
          label="Nome servizio"
          value={nomeServizio}
          onChange={(e) => setNomeServizio(e.target.value)}
          options={[
            { value: '', label: 'Seleziona' },
            { value: 'room-only', label: 'Room Only' },
            { value: 'frigo-bar', label: 'Frigo Bar' },
            { value: 'lavanderia', label: 'Lavanderia' },
            { value: 'parcheggio', label: 'Parcheggio' },
          ]}
        />
        <InputField
          className="cc-modal__field cc-modal__field--medium"
          name="descrizione"
          label="Descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
        />
        <SelectField
          className="cc-modal__field cc-modal__field--medium"
          name="ospite"
          label="Ospite"
          value={ospite}
          onChange={(e) => setOspite(e.target.value)}
          options={[
            { value: '', label: 'Seleziona' },
            { value: 'novi', label: 'Novi Ruggero' },
          ]}
        />
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="pertinenza"
          label="Pertinenza"
          value={pertinenza}
          onChange={(e) => setPertinenza(e.target.value)}
          options={[
            { value: 'Ospite', label: 'Ospite' },
            { value: 'Camera', label: 'Camera' },
            { value: 'Prenotazione', label: 'Prenotazione' },
          ]}
        />
        <SelectField
          className="cc-modal__field cc-modal__field--xs"
          name="quantita"
          label="Quantità"
          value={quantita}
          onChange={(e) => setQuantita(e.target.value)}
          options={[1,2,3,4,5,6,7,8,9,10].map((n) => ({ value: n, label: String(n) }))}
        />
        <div className="cc-modal__field-raw cc-modal__field--xs">
          <label>Prezzo</label>
          <div className="cc-modal__amount">
            <input className="sib-input" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} />
            <span>€</span>
          </div>
        </div>
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="iva"
          label="IVA"
          value={iva}
          onChange={(e) => setIva(e.target.value)}
          options={[
            { value: '', label: 'Seleziona' },
            { value: '0', label: '0%' },
            { value: '4', label: '4%' },
            { value: '10', label: '10%' },
            { value: '22', label: '22%' },
          ]}
        />
        <InputField
          className="cc-modal__field cc-modal__field--narrow"
          name="del"
          label="Del"
          value={del}
          onChange={(e) => setDel(e.target.value)}
        />
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={!nomeServizio || !prezzo || !iva} onClick={onClose}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL SHELL ─────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, maxWidth = 600, children }: { title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode }) {
  return (
    <div className="cc-modal__overlay" onClick={onClose}>
      <div className="cc-modal" style={{ '--modal-max-w': `${maxWidth}px` } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal__head">
          <h3>{title}</h3>
          <button type="button" className="cc-modal__close" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
        <div className="cc-modal__body">{children}</div>
      </div>
    </div>
  )
}
