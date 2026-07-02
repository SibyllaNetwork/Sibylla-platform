import React from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { useEmissioneStore } from '../../../store/useEmissioneStore'
import './FatturaDocumento.sass'

// Documento fattura in grafica professionale, aperto da EmissioneDocumenti quando
// si emette una Fattura. I dati arrivano dallo store di navigazione.
// NB: layout "prima versione" — da allineare all'eventuale grafica ufficiale.

// Dati emittente (struttura). In un secondo momento vanno resi dinamici per cliente.
const SELLER = {
  indirizzo: 'Via Roma 1, 39100 Bolzano (BZ), Italia',
  piva: 'IT 01234567890',
  tel: '+39 0471 000000',
  email: 'amministrazione@grimshotel.it',
  iban: 'IT80 E030 6909 5081 0000 0006 451',
}

function fmt(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

export default function FatturaDocumento({ navigate }: { navigate: (p: string) => void }) {
  const fattura = useEmissioneStore((s) => s.documento)

  if (!fattura) {
    return (
      <div className="fattura-doc">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <div className="sib-empty-state">Nessuna fattura da mostrare. Emetti un documento dalla pagina Emissione documenti.</div>
      </div>
    )
  }

  // Riepilogo IVA per aliquota (prezzo trattato come importo lordo).
  const groups = new Map<number, { imponibile: number; imposta: number }>()
  for (const a of fattura.addebiti) {
    const imponibile = a.prezzo / (1 + a.iva / 100)
    const imposta = a.prezzo - imponibile
    const g = groups.get(a.iva) ?? { imponibile: 0, imposta: 0 }
    g.imponibile += imponibile
    g.imposta += imposta
    groups.set(a.iva, g)
  }
  const totImponibile = Array.from(groups.values()).reduce((s, g) => s + g.imponibile, 0)
  const totImposta = Array.from(groups.values()).reduce((s, g) => s + g.imposta, 0)
  const totDoc = fattura.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const daSaldare = totDoc - fattura.caparra

  return (
    <div className="fattura-doc">
      <div className="fattura-doc__toolbar">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}>
          <i className="fa-light fa-print" /> Stampa
        </button>
      </div>

      <div className="fattura-doc__sheet">
        {/* Intestazione */}
        <header className="fattura-doc__head">
          <div className="fattura-doc__seller">
            <div className="fattura-doc__seller-name">{fattura.struttura}</div>
            <div className="fattura-doc__seller-line">{SELLER.indirizzo}</div>
            <div className="fattura-doc__seller-line">P. IVA {SELLER.piva}</div>
            <div className="fattura-doc__seller-line">{SELLER.tel} · {SELLER.email}</div>
          </div>
          <div className="fattura-doc__doc-meta">
            <div className="fattura-doc__doc-title">Fattura</div>
            <div className="fattura-doc__doc-row"><span>Numero</span><strong>{fattura.numero}</strong></div>
            <div className="fattura-doc__doc-row"><span>Data</span><strong>{fattura.data}</strong></div>
          </div>
        </header>

        {/* Cliente */}
        <section className="fattura-doc__client">
          <div className="fattura-doc__block-label">Spett.le</div>
          <div className="fattura-doc__client-name">{fattura.ragioneSociale || '—'}</div>
          <div className="fattura-doc__client-line">{[fattura.indirizzo, [fattura.cap, fattura.citta].filter(Boolean).join(' '), fattura.provincia].filter(Boolean).join(', ')}</div>
          <div className="fattura-doc__client-line">{fattura.nazionalita}</div>
          <div className="fattura-doc__client-grid">
            {fattura.partitaIva && <span><em>P. IVA</em> {fattura.partitaIva}</span>}
            {fattura.codiceFiscale && <span><em>Cod. fiscale</em> {fattura.codiceFiscale}</span>}
            {fattura.codiceUnivoco && <span><em>Cod. univoco</em> {fattura.codiceUnivoco}</span>}
            {fattura.pec && <span><em>PEC</em> {fattura.pec}</span>}
          </div>
        </section>

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
            {fattura.addebiti.map((a) => {
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

        {/* Riepilogo IVA + totali */}
        <div className="fattura-doc__summary">
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

          <div className="fattura-doc__totals">
            <div className="fattura-doc__tot-row"><span>Totale imponibile</span><span>{fmt(totImponibile)}</span></div>
            <div className="fattura-doc__tot-row"><span>Totale IVA</span><span>{fmt(totImposta)}</span></div>
            <div className="fattura-doc__tot-row fattura-doc__tot-row--strong"><span>Totale documento</span><span>{fmt(totDoc)}</span></div>
            {fattura.caparra > 0 && <div className="fattura-doc__tot-row"><span>Caparra</span><span>− {fmt(fattura.caparra)}</span></div>}
            <div className="fattura-doc__tot-row fattura-doc__tot-row--pay"><span>Netto a pagare</span><span>{fmt(daSaldare)}</span></div>
          </div>
        </div>

        {/* Pagamento */}
        <footer className="fattura-doc__foot">
          <div>
            <div className="fattura-doc__block-label">Modalità di pagamento</div>
            <div>{fattura.modoPagamento} · {fattura.importo} €</div>
          </div>
          <div>
            <div className="fattura-doc__block-label">Coordinate bancarie</div>
            <div>IBAN {SELLER.iban}</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
