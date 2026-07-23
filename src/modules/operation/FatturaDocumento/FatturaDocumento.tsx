import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField } from '../../../core/components/form'
import { useEmissioneStore } from '../../../store/useEmissioneStore'
import logoKey from './sibylla-key.svg'
import './FatturaDocumento.sass'

// Pagina "Documento fiscale" in chiave WEB (non foglio A4): intestazione,
// letterhead venditore, tabelle Addebiti/Pagamenti in stile piattaforma e
// barra di icone-azione. Serve le rotte fattura-documento / scontrino-documento
// / ricevuta-caparra; i dati arrivano dallo store di navigazione.
// Due conformazioni principali:
//   • Scontrino → intestatario minimo, nessun XML / niente fattura elettronica;
//   • Fattura   → blocco intestazione fiscale completo, XML + fattura elettronica.

// Dati del venditore (mock struttura).
const SELLER = {
  nome: 'Sibylla',
  righe: ['Via Vicenza 5a', '20154, Roma, Italy'],
  piva: '80979970466',
}

// Etichetta inline del tipo documento (il titolo di pagina resta "Documento fiscale").
const TIPO_LABEL: Record<string, string> = {
  Fattura: 'Fattura',
  Scontrino: 'Scontrino',
  Caparra: 'Ricevuta',
}

// Voci di incasso selezionabili sulla riga di pagamento.
const VOCI_INCASSO = [
  'American Express',
  'Bonifico',
  'Carta Credito MasterCard',
  'Contanti',
  'neol',
  'Sospeso',
]

function fmt(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}
function parseImporto(s: string): number {
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export default function FatturaDocumento({ navigate }: { navigate: (p: string) => void }) {
  const doc = useEmissioneStore((s) => s.documento)
  const [voceIncasso, setVoceIncasso] = useState(
    doc?.modoPagamento && VOCI_INCASSO.includes(doc.modoPagamento) ? doc.modoPagamento : 'Contanti',
  )

  if (!doc) {
    return (
      <div className="doc-fisc">
        <PageHead title="Documento fiscale" onBack={() => navigate('emissione-documenti')} />
        <div className="sib-empty-state">
          Nessun documento da mostrare. Emetti un documento dalla pagina Emissione documenti.
        </div>
      </div>
    )
  }

  const isFattura = doc.tipo === 'Fattura'
  const isCaparra = doc.tipo === 'Caparra'

  const totDoc = doc.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const versato = parseImporto(doc.importo)

  // Numero prenotazione: derivato in modo deterministico dal numero documento
  // (i mock addebiti non portano il riferimento prenotazione).
  const bookingNo = (doc.numero.replace(/\D/g, '').slice(-5) || '00000').padStart(5, '0')

  const clienteFattura = [
    doc.ragioneSociale,
    doc.indirizzo,
    [doc.cap, doc.citta, doc.provincia].filter(Boolean).join(' '),
  ].filter(Boolean)

  return (
    <div className="doc-fisc">
      <PageHead title="Documento fiscale" onBack={() => navigate('emissione-documenti')} />

      {/* Intestazione: numero/intestatario a sinistra, venditore a destra */}
      <header className="doc-fisc__head">
        <div className="doc-fisc__meta">
          <p className="doc-fisc__docline">
            {TIPO_LABEL[doc.tipo]} n. {doc.numero} del {doc.data}
          </p>
          {isFattura ? (
            <div className="doc-fisc__client">
              {clienteFattura.map((r, i) => (
                <span key={i}>{r}</span>
              ))}
              <span>P.IVA {doc.partitaIva || '—'}</span>
            </div>
          ) : (
            <p className="doc-fisc__client doc-fisc__client--inline">
              P.Iva: {doc.partitaIva || ''}
            </p>
          )}
        </div>

        <div className="doc-fisc__seller">
          <img className="doc-fisc__seller-logo" src={logoKey} alt="Sibylla" />
          <div className="doc-fisc__seller-info">
            <span className="doc-fisc__seller-name">{SELLER.nome}</span>
            {SELLER.righe.map((r, i) => (
              <span key={i}>{r}</span>
            ))}
            <span>P.Iva {SELLER.piva}</span>
          </div>
        </div>
      </header>

      {/* Addebiti */}
      <section className="doc-fisc__section">
        <h3 className="doc-fisc__section-title">Addebiti</h3>
        <div className="sib-table-wrap">
          <table className="sib-table doc-fisc__table">
            <thead>
              <tr>
                <th>Camera</th>
                <th>Data</th>
                <th>Riferimento</th>
                <th>Descrizione</th>
                <th className="doc-fisc__num">Importo</th>
                <th className="doc-fisc__num">IVA</th>
                <th className="doc-fisc__num">Totale</th>
              </tr>
            </thead>
            <tbody>
              <tr className="doc-fisc__group-row">
                <td colSpan={7}>
                  Prenotazione {bookingNo} <span className="doc-fisc__group-sep">•</span> Totale {fmt(totDoc)}
                </td>
              </tr>
              {doc.addebiti.map((a) => {
                const imponibile = a.prezzo / (1 + a.iva / 100)
                return (
                  <tr key={a.id}>
                    <td>{a.camera}</td>
                    <td>{a.data}</td>
                    <td>{a.riferimento}</td>
                    <td>{a.descrizione}</td>
                    <td className="doc-fisc__num">{fmt(imponibile)}</td>
                    <td className="doc-fisc__num">{a.iva.toFixed(2).replace('.', ',')} %</td>
                    <td className="doc-fisc__num">{fmt(a.prezzo)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="doc-fisc__total-row">
                <td colSpan={7} className="doc-fisc__num">
                  Totale: <strong>{fmt(totDoc)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Pagamenti */}
      <section className="doc-fisc__section">
        <h3 className="doc-fisc__section-title">Pagamenti</h3>
        <div className="sib-table-wrap">
          <table className="sib-table doc-fisc__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Gruppo incasso</th>
                <th className="doc-fisc__th-voce">Voce incasso</th>
                <th className="doc-fisc__num">Importo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{doc.data}</td>
                <td>{doc.modoPagamento}</td>
                <td className="doc-fisc__td-voce">
                  <SelectField
                    name="voce-incasso"
                    value={voceIncasso}
                    onChange={(e) => setVoceIncasso(e.target.value)}
                    options={VOCI_INCASSO.map((v) => ({ value: v, label: v }))}
                  />
                </td>
                <td className="doc-fisc__num">{fmt(isCaparra ? versato : totDoc)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Azioni */}
      <div className="doc-fisc__actions">
        {isFattura && (
          <button type="button" className="sib-btn sib-btn--secondary doc-fisc__fe-btn">
            <i className="fa-solid fa-file-lines" /> Genera fattura elettronica
          </button>
        )}

        <div className="doc-fisc__icons">
          <Tooltip text="Invia per email">
            <button type="button" className="doc-fisc__icon-btn" aria-label="Invia per email">
              <i className="fa-solid fa-envelope" />
            </button>
          </Tooltip>
          <Tooltip text="Modifica intestazione fiscale">
            <button type="button" className="doc-fisc__icon-btn" aria-label="Modifica intestazione fiscale">
              <i className="fa-solid fa-file-pen" />
            </button>
          </Tooltip>
          {isFattura && (
            <Tooltip text="Scarica XML">
              <button type="button" className="doc-fisc__icon-btn" aria-label="Scarica XML">
                <i className="fa-solid fa-file-code" />
              </button>
            </Tooltip>
          )}
          <Tooltip text="Invia a Business Central">
            <button type="button" className="doc-fisc__icon-btn" aria-label="Invia a Business Central">
              <i className="fa-solid fa-paper-plane" />
            </button>
          </Tooltip>
          <Tooltip text="Esporta in PDF">
            <button type="button" className="doc-fisc__icon-btn" aria-label="Esporta in PDF">
              <i className="fa-solid fa-file-pdf" />
            </button>
          </Tooltip>
          <Tooltip text="Stampa documento">
            <button type="button" className="doc-fisc__icon-btn" aria-label="Stampa documento" onClick={() => window.print()}>
              <i className="fa-solid fa-print" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
