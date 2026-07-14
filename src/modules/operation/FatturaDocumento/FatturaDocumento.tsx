import React from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { useEmissioneStore } from '../../../store/useEmissioneStore'
import './FatturaDocumento.sass'

// Pagina documento emesso: STESSA grafica professionale (foglio A4) per tutti i
// tipi — Fattura, Scontrino (documento commerciale), Caparra (ricevuta) — con
// contenuti differenti. Servita dalle rotte fattura-documento / scontrino-documento
// / ricevuta-caparra. I dati arrivano dallo store di navigazione.

const SELLER = {
  indirizzo: 'Via Roma 1, 39100 Bolzano (BZ), Italia',
  piva: 'IT 01234567890',
  tel: '+39 0471 000000',
  email: 'amministrazione@grimshotel.it',
  iban: 'IT80 E030 6909 5081 0000 0006 451',
}

const TITOLI: Record<string, string> = {
  Fattura: 'Fattura',
  Scontrino: 'Documento commerciale',
  Caparra: 'Ricevuta di caparra',
}

function fmt(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}
function parseImporto(s: string): number {
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export default function FatturaDocumento({ navigate }: { navigate: (p: string) => void }) {
  const doc = useEmissioneStore((s) => s.documento)

  if (!doc) {
    return (
      <div className="fattura-doc">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <div className="sib-empty-state">Nessun documento da mostrare. Emetti un documento dalla pagina Emissione documenti.</div>
      </div>
    )
  }

  const isFattura = doc.tipo === 'Fattura'
  const isScontrino = doc.tipo === 'Scontrino'
  const isCaparra = doc.tipo === 'Caparra'

  // Riepilogo IVA per aliquota (prezzo trattato come importo lordo).
  const groups = new Map<number, { imponibile: number; imposta: number }>()
  for (const a of doc.addebiti) {
    const imponibile = a.prezzo / (1 + a.iva / 100)
    const g = groups.get(a.iva) ?? { imponibile: 0, imposta: 0 }
    g.imponibile += imponibile
    g.imposta += a.prezzo - imponibile
    groups.set(a.iva, g)
  }
  const totImponibile = Array.from(groups.values()).reduce((s, g) => s + g.imponibile, 0)
  const totImposta = Array.from(groups.values()).reduce((s, g) => s + g.imposta, 0)
  const totDoc = doc.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const versato = parseImporto(doc.importo)
  const residuoCaparra = Math.max(0, totDoc - versato)
  const daSaldare = totDoc - doc.caparra

  const clienteNome = isFattura
    ? (doc.ragioneSociale || '—')
    : ([doc.nome, doc.cognome].filter(Boolean).join(' ') || '—')

  return (
    <div className="fattura-doc">
      <div className="fattura-doc__toolbar">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}>
          <i className="fa-regular fa-print" /> Stampa
        </button>
      </div>

      {isScontrino && (
        <div className="fattura-doc__fiscal-note">
          Il documento verrà stampato anche dalla stampante fiscale collegata.
        </div>
      )}

      <div className="fattura-doc__sheet">
        {/* Intestazione */}
        <header className="fattura-doc__head">
          <div className="fattura-doc__seller">
            <div className="fattura-doc__seller-name">{doc.struttura}</div>
            <div className="fattura-doc__seller-line">{SELLER.indirizzo}</div>
            <div className="fattura-doc__seller-line">P. IVA {SELLER.piva}</div>
            <div className="fattura-doc__seller-line">{SELLER.tel} · {SELLER.email}</div>
          </div>
          <div className="fattura-doc__doc-meta">
            <div className="fattura-doc__doc-title">{TITOLI[doc.tipo]}</div>
            <div className="fattura-doc__doc-row"><span>Numero</span><strong>{doc.numero}</strong></div>
            <div className="fattura-doc__doc-row"><span>Data</span><strong>{doc.data}</strong></div>
          </div>
        </header>

        {/* Cliente */}
        <section className="fattura-doc__client">
          <div className="fattura-doc__block-label">{isFattura ? 'Spett.le' : 'Cliente'}</div>
          <div className="fattura-doc__client-name">{clienteNome}</div>
          <div className="fattura-doc__client-line">{[doc.indirizzo, [doc.cap, doc.citta].filter(Boolean).join(' '), doc.provincia].filter(Boolean).join(', ')}</div>
          <div className="fattura-doc__client-line">{doc.nazionalita}</div>
          <div className="fattura-doc__client-grid">
            {isFattura && doc.partitaIva && <span><em>P. IVA</em> {doc.partitaIva}</span>}
            {doc.codiceFiscale && <span><em>Cod. fiscale</em> {doc.codiceFiscale}</span>}
            {isFattura && doc.codiceUnivoco && <span><em>Cod. univoco</em> {doc.codiceUnivoco}</span>}
            {isFattura && doc.pec && <span><em>PEC</em> {doc.pec}</span>}
          </div>
        </section>

        {/* Attestazione caparra */}
        {isCaparra && (
          <section className="fattura-doc__attesto-box">
            <p className="fattura-doc__attesto">Si attesta di aver ricevuto da <strong>{clienteNome}</strong> la somma di:</p>
            <div className="fattura-doc__amount">{fmt(versato)}</div>
            <div className="fattura-doc__amount-label">a titolo di caparra sulla prenotazione</div>
          </section>
        )}

        {/* Righe */}
        <table className="fattura-doc__lines">
          <thead>
            <tr>
              <th>Descrizione</th>
              <th className="fattura-doc__num">Camera</th>
              <th className="fattura-doc__num">Data</th>
              <th className="fattura-doc__num">Imponibile</th>
              <th className="fattura-doc__num">IVA</th>
              <th className="fattura-doc__num">Importo</th>
            </tr>
          </thead>
          <tbody>
            {doc.addebiti.map((a) => {
              const imponibile = a.prezzo / (1 + a.iva / 100)
              return (
                <tr key={a.id}>
                  <td>{a.descrizione}{a.riferimento ? ` · ${a.riferimento}` : ''}</td>
                  <td className="fattura-doc__num">{a.camera}</td>
                  <td className="fattura-doc__num">{a.data}</td>
                  <td className="fattura-doc__num">{fmt(imponibile)}</td>
                  <td className="fattura-doc__num">{a.iva.toFixed(2).replace('.', ',')} %</td>
                  <td className="fattura-doc__num">{fmt(a.prezzo)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Riepilogo IVA (non per la caparra) + totali */}
        <div className="fattura-doc__summary">
          {!isCaparra ? (
            <table className="fattura-doc__iva">
              <thead>
                <tr><th>Aliquota</th><th className="fattura-doc__num">Imponibile</th><th className="fattura-doc__num">Imposta</th></tr>
              </thead>
              <tbody>
                {Array.from(groups.entries()).sort((a, b) => a[0] - b[0]).map(([iva, g]) => (
                  <tr key={iva}>
                    <td>{iva.toFixed(2).replace('.', ',')} %</td>
                    <td className="fattura-doc__num">{fmt(g.imponibile)}</td>
                    <td className="fattura-doc__num">{fmt(g.imposta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div />}

          <div className="fattura-doc__totals">
            {isCaparra ? (
              <>
                <div className="fattura-doc__tot-row"><span>Totale soggiorno</span><span>{fmt(totDoc)}</span></div>
                <div className="fattura-doc__tot-row"><span>Caparra versata</span><span>{fmt(versato)}</span></div>
                <div className="fattura-doc__tot-row fattura-doc__tot-row--pay"><span>Saldo residuo</span><span>{fmt(residuoCaparra)}</span></div>
              </>
            ) : (
              <>
                <div className="fattura-doc__tot-row"><span>Totale imponibile</span><span>{fmt(totImponibile)}</span></div>
                <div className="fattura-doc__tot-row"><span>Totale IVA</span><span>{fmt(totImposta)}</span></div>
                <div className="fattura-doc__tot-row fattura-doc__tot-row--strong"><span>Totale documento</span><span>{fmt(totDoc)}</span></div>
                {doc.caparra > 0 && <div className="fattura-doc__tot-row"><span>Caparra</span><span>− {fmt(doc.caparra)}</span></div>}
                <div className="fattura-doc__tot-row fattura-doc__tot-row--pay"><span>Netto a pagare</span><span>{fmt(daSaldare)}</span></div>
              </>
            )}
          </div>
        </div>

        {/* Piè di pagina */}
        <footer className="fattura-doc__foot">
          <div>
            <div className="fattura-doc__block-label">Modalità di pagamento</div>
            <div>{doc.modoPagamento} · {doc.importo} €</div>
          </div>
          {isScontrino ? (
            <div className="fattura-doc__foot-note">Documento commerciale valido ai fini fiscali (RT).</div>
          ) : (
            <div>
              <div className="fattura-doc__block-label">Coordinate bancarie</div>
              <div>IBAN {SELLER.iban}</div>
            </div>
          )}
          {isCaparra && (
            <div className="fattura-doc__sign">
              <div className="fattura-doc__sign-line" />
              <div className="fattura-doc__block-label">Timbro e firma</div>
            </div>
          )}
        </footer>

        {isCaparra && (
          <p className="fattura-doc__note">
            La presente ricevuta attesta il versamento della caparra e non costituisce documento
            fiscale. Il saldo residuo sarà regolato al momento del soggiorno.
          </p>
        )}
      </div>
    </div>
  )
}
