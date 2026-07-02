import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import { withFlag } from '../../../core/utils/countryFlags'
import { useEmissioneStore } from '../../../store/useEmissioneStore'
import './EmissioneDocumenti.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Addebito {
  id: number
  camera: string
  data: string
  riferimento: string
  descrizione: string
  prezzo: number
  iva: number
}

interface Data {
  addebiti: Addebito[]
  caparra: number
}

const FALLBACK: Data = {
  addebiti: [
    { id: 1, camera: '307', data: '22/04/2026', riferimento: '',                  descrizione: 'Room Only',         prezzo: 303.80, iva: 10 },
    { id: 2, camera: '307', data: '22/04/2026', riferimento: 'Ruggero Poliziani', descrizione: 'Tassa di soggiorno', prezzo: 7.50,   iva: 0  },
    { id: 3, camera: '307', data: '23/04/2026', riferimento: '',                  descrizione: 'Room Only',         prezzo: 303.80, iva: 10 },
    { id: 4, camera: '307', data: '23/04/2026', riferimento: 'Ruggero Poliziani', descrizione: 'Tassa di soggiorno', prezzo: 7.50,   iva: 0  },
  ],
  caparra: 0,
}

const TIPI_DOCUMENTO = ['Scontrino', 'Caparra', 'Fattura']
const NAZIONALITA = ['ITALIA', 'AUSTRIA', 'FRANCIA', 'GERMANIA', 'SPAGNA', 'SVIZZERA', 'REGNO UNITO', 'STATI UNITI']
const MODALITA_PAGAMENTO = ['Contanti', 'Bancomat', 'Carta di credito', 'Bonifico', 'Assegno', 'Ricevuta bancaria']

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function EmissioneDocumenti({ navigate }: { navigate: (p: string) => void }) {
  const checkout = useEmissioneStore((s) => s.checkout)
  const clearCheckout = useEmissioneStore((s) => s.clearCheckout)
  const setFattura = useEmissioneStore((s) => s.setFattura)

  // Se arrivo da "Paga ora" uso gli addebiti selezionati, altrimenti i dati demo.
  const [data, setData] = useState<Data>(() =>
    checkout ? { addebiti: checkout.addebiti, caparra: checkout.caparra } : FALLBACK)

  const [tipoDoc, setTipoDoc] = useState('Scontrino')
  const isFattura = tipoDoc === 'Fattura'

  // Scontrino
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  // Fattura
  const [ragioneSociale, setRagioneSociale] = useState('')
  const [partitaIva, setPartitaIva] = useState('')
  const [codiceUnivoco, setCodiceUnivoco] = useState('')
  const [pec, setPec] = useState('')
  // Comuni
  const [indirizzo, setIndirizzo] = useState('')
  const [cap, setCap] = useState('')
  const [citta, setCitta] = useState('')
  const [provincia, setProvincia] = useState('')
  const [nazionalita, setNazionalita] = useState('ITALIA')
  const [codiceFiscale, setCodiceFiscale] = useState('')
  const [modoPagamento, setModoPagamento] = useState('Contanti')

  const totale = data.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const daSaldare = totale - data.caparra
  const [importo, setImporto] = useState(daSaldare.toFixed(2).replace('.', ','))
  const [riferimento, setRiferimento] = useState('')

  useEffect(() => {
    if (checkout) return // dati già passati da ContiCamera
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetEmissioneDocumenti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [checkout])

  // Ripulisce il payload di checkout lasciando la pagina.
  useEffect(() => () => clearCheckout(), [clearCheckout])

  const emetti = () => {
    if (!isFattura) return // scontrino/altri: emissione fiscale (fuori scope)
    setFattura({
      numero: 'FT/' + new Date().getFullYear() + '/' + String(Math.floor(Math.random() * 9000) + 1000),
      data: new Date().toLocaleDateString('it-IT'),
      struttura: "Grim's Hotel",
      ragioneSociale, indirizzo, cap, citta, provincia, nazionalita,
      partitaIva, codiceFiscale, codiceUnivoco, pec,
      addebiti: data.addebiti, caparra: data.caparra,
      modoPagamento, importo,
    })
    navigate('fattura-documento')
  }

  return (
    <div className="emissione-doc">
      <BtnBack onClick={() => navigate('ospiti-in-casa')} />

      <div className="emissione-doc__stampante">Stampante fiscale ...</div>

      <PageHeader
        title="Emissione documenti"
        subtitle="Gestisci facilmente gli addebiti del soggiorno: sposta le singole voci tra camere o ripartisci il valore della prenotazione"
      />

      {/* ─── Documento ─────────────────────────────────────────────────────── */}
      <div className="emissione-doc__field">
        <SelectField
          label="Documento"
          name="tipoDoc"
          value={tipoDoc}
          options={TIPI_DOCUMENTO.map((t) => ({ value: t, label: t }))}
          onChange={(e) => setTipoDoc(e.target.value)}
        />
      </div>

      {/* ─── Anagrafica ─────────────────────────────────────────────────────── */}
      {isFattura ? (
        <>
          <div className="emissione-doc__grid emissione-doc__grid--fatt1">
            <div className="emissione-doc__field">
              <InputField label="Ragione sociale" name="ragioneSociale" required iconRight="fa-light fa-wand-magic-sparkles" value={ragioneSociale} onChange={(e) => setRagioneSociale(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Indirizzo" name="indirizzo" required value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
            </div>
            <div className="emissione-doc__field emissione-doc__field--cap">
              <InputField label="CAP" name="cap" required value={cap} onChange={(e) => setCap(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Città" name="citta" required value={citta} onChange={(e) => setCitta(e.target.value)} />
            </div>
            <div className="emissione-doc__field emissione-doc__field--prov">
              <InputField label="Provincia" name="provincia" required value={provincia} onChange={(e) => setProvincia(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <SelectField
                label="Nazionalità" name="nazionalita" required
                value={nazionalita}
                options={NAZIONALITA.map((n) => ({ value: n, label: withFlag(n) }))}
                onChange={(e) => setNazionalita(e.target.value)}
              />
            </div>
          </div>
          <div className="emissione-doc__grid emissione-doc__grid--fatt2">
            <div className="emissione-doc__field">
              <InputField label="Partita IVA" name="partitaIva" required iconRight="fa-light fa-wand-magic-sparkles" value={partitaIva} onChange={(e) => setPartitaIva(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Codice fiscale" name="codiceFiscale" value={codiceFiscale} onChange={(e) => setCodiceFiscale(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Codice univoco" name="codiceUnivoco" value={codiceUnivoco} onChange={(e) => setCodiceUnivoco(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Pec" name="pec" value={pec} onChange={(e) => setPec(e.target.value)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="emissione-doc__grid emissione-doc__grid--anag">
            <div className="emissione-doc__field">
              <InputField label="Nome" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Cognome" name="cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Indirizzo" name="indirizzo" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
            </div>
            <div className="emissione-doc__field emissione-doc__field--cap">
              <InputField label="CAP" name="cap" value={cap} onChange={(e) => setCap(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Città" name="citta" value={citta} onChange={(e) => setCitta(e.target.value)} />
            </div>
          </div>

          <div className="emissione-doc__grid emissione-doc__grid--anag2">
            <div className="emissione-doc__field emissione-doc__field--prov">
              <InputField label="Provincia" name="provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
            </div>
            <div className="emissione-doc__field">
              <SelectField
                label="Nazionalità"
                name="nazionalita"
                value={nazionalita}
                options={NAZIONALITA.map((n) => ({ value: n, label: withFlag(n) }))}
                onChange={(e) => setNazionalita(e.target.value)}
              />
            </div>
            <div className="emissione-doc__field">
              <InputField label="Codice fiscale" name="codiceFiscale" value={codiceFiscale} onChange={(e) => setCodiceFiscale(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {/* ─── Addebiti ───────────────────────────────────────────────────────── */}
      <h3 className="emissione-doc__section-title">Addebiti</h3>
      <div className="sib-table-wrap">
        <table className="sib-table emissione-doc__table">
          <thead>
            <tr>
              <th>Camera</th>
              <th>Data</th>
              <th>Riferimento</th>
              <th>Descrizione</th>
              <th className="emissione-doc__th-num">Prezzo</th>
              <th className="emissione-doc__th-num">IVA</th>
            </tr>
          </thead>
          <tbody>
            {data.addebiti.map((a, idx) => (
              <tr key={a.id} className={idx % 2 === 0 ? 'emissione-doc__row--alt' : ''}>
                <td className="emissione-doc__td-center">{a.camera}</td>
                <td className="emissione-doc__td-center">{a.data}</td>
                <td className="emissione-doc__td-center">{a.riferimento}</td>
                <td className="emissione-doc__td-center">{a.descrizione}</td>
                <td className="emissione-doc__td-num">{fmtCurrency(a.prezzo)}</td>
                <td className="emissione-doc__td-num">{a.iva.toFixed(2).replace('.', ',')} %</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="emissione-doc__tfoot">
              <td colSpan={2} />
              <td colSpan={2} className="emissione-doc__td-num">
                Totale: <strong>{fmtCurrency(totale)}</strong>
              </td>
              <td className="emissione-doc__td-num">
                Caparra: <strong>{fmtCurrency(data.caparra)}</strong>
              </td>
              <td className="emissione-doc__td-num">
                Da saldare: <strong>{fmtCurrency(daSaldare)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ─── Modalità Incasso ──────────────────────────────────────────────── */}
      <h3 className="emissione-doc__section-title">Modalità Incasso</h3>
      <div className="emissione-doc__incasso">
        <div className="emissione-doc__field">
          <SelectField
            label="Modo di pagamento"
            name="modoPagamento"
            value={modoPagamento}
            options={MODALITA_PAGAMENTO.map((m) => ({ value: m, label: m }))}
            onChange={(e) => setModoPagamento(e.target.value)}
          />
        </div>
        <div className="emissione-doc__field emissione-doc__field--importo">
          <InputField
            label="Importo"
            name="importo"
            value={importo}
            iconRight="fa-light fa-euro-sign"
            onChange={(e) => setImporto(e.target.value)}
          />
        </div>
        <div className="emissione-doc__field emissione-doc__field--rif">
          <InputField label="Riferimento" name="riferimento" placeholder="Riferimento" value={riferimento} onChange={(e) => setRiferimento(e.target.value)} />
        </div>
        <button type="button" className="emissione-doc__add-row" aria-label="Aggiungi modalità di pagamento">
          <i className="fa-light fa-plus" />
        </button>
      </div>

      {/* ─── Emetti ────────────────────────────────────────────────────────── */}
      <div className="emissione-doc__emetti">
        <button type="button" className="sib-btn sib-btn--primary" onClick={emetti}>Emetti documento</button>
      </div>
    </div>
  )
}
