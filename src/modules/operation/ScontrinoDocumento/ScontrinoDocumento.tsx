import React from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { useEmissioneStore } from '../../../store/useEmissioneStore'
import './ScontrinoDocumento.sass'

// Documento commerciale (scontrino) in stile scontrino fiscale, stampabile.
// Verrà stampato anche dalla stampante fiscale collegata.

const SELLER = {
  indirizzo: 'Via Roma 1, 39100 Bolzano (BZ)',
  piva: 'IT 01234567890',
}

function fmt(v: number): string {
  return v.toFixed(2).replace('.', ',')
}

export default function ScontrinoDocumento({ navigate }: { navigate: (p: string) => void }) {
  const doc = useEmissioneStore((s) => s.documento)

  if (!doc) {
    return (
      <div className="scontrino-doc">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <div className="sib-empty-state">Nessuno scontrino da mostrare. Emetti un documento dalla pagina Emissione documenti.</div>
      </div>
    )
  }

  // Riepilogo IVA per aliquota (prezzo trattato come importo lordo).
  const groups = new Map<number, { imponibile: number; imposta: number }>()
  for (const a of doc.addebiti) {
    const imponibile = a.prezzo / (1 + a.iva / 100)
    const g = groups.get(a.iva) ?? { imponibile: 0, imposta: 0 }
    g.imponibile += imponibile
    g.imposta += a.prezzo - imponibile
    groups.set(a.iva, g)
  }
  const totale = doc.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const totIva = Array.from(groups.values()).reduce((s, g) => s + g.imposta, 0)
  const intestatario = [doc.nome, doc.cognome].filter(Boolean).join(' ')

  return (
    <div className="scontrino-doc">
      <div className="scontrino-doc__toolbar">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}>
          <i className="fa-light fa-print" /> Stampa
        </button>
      </div>

      <div className="scontrino-doc__fiscal-note">
        Il documento verrà stampato dalla stampante fiscale collegata.
      </div>

      {/* Rotolo scontrino */}
      <div className="scontrino-doc__roll">
        <div className="scontrino-doc__head">
          <div className="scontrino-doc__shop">{doc.struttura}</div>
          <div className="scontrino-doc__shop-line">{SELLER.indirizzo}</div>
          <div className="scontrino-doc__shop-line">P.IVA {SELLER.piva}</div>
        </div>

        <div className="scontrino-doc__title">DOCUMENTO COMMERCIALE</div>
        <div className="scontrino-doc__subtitle">di vendita o prestazione</div>

        <div className="scontrino-doc__sep" />

        <div className="scontrino-doc__lines">
          <div className="scontrino-doc__line scontrino-doc__line--head">
            <span>DESCRIZIONE</span>
            <span>IVA</span>
            <span>EUR</span>
          </div>
          {doc.addebiti.map((a) => (
            <div key={a.id} className="scontrino-doc__line">
              <span className="scontrino-doc__desc">{a.descrizione}</span>
              <span>{a.iva}%</span>
              <span>{fmt(a.prezzo)}</span>
            </div>
          ))}
        </div>

        <div className="scontrino-doc__sep" />

        <div className="scontrino-doc__line scontrino-doc__line--tot">
          <span>TOTALE COMPLESSIVO</span>
          <span />
          <span>{fmt(totale)}</span>
        </div>
        <div className="scontrino-doc__line scontrino-doc__line--muted">
          <span>di cui IVA</span>
          <span />
          <span>{fmt(totIva)}</span>
        </div>
        <div className="scontrino-doc__line scontrino-doc__line--tot">
          <span>Pagamento {doc.modoPagamento}</span>
          <span />
          <span>{fmt(totale)}</span>
        </div>

        {/* Riepilogo IVA */}
        <div className="scontrino-doc__sep" />
        <div className="scontrino-doc__iva">
          <div className="scontrino-doc__line scontrino-doc__line--head">
            <span>ALIQUOTA</span>
            <span>IMPON.</span>
            <span>IMPOSTA</span>
          </div>
          {Array.from(groups.entries()).sort((a, b) => a[0] - b[0]).map(([iva, g]) => (
            <div key={iva} className="scontrino-doc__line">
              <span>{iva}%</span>
              <span>{fmt(g.imponibile)}</span>
              <span>{fmt(g.imposta)}</span>
            </div>
          ))}
        </div>

        <div className="scontrino-doc__sep" />
        <div className="scontrino-doc__foot">
          <div>Documento n. {doc.numero}</div>
          <div>{doc.data}</div>
          {intestatario && <div>Cliente: {intestatario}</div>}
          {doc.codiceFiscale && <div>C.F. {doc.codiceFiscale}</div>}
        </div>
        <div className="scontrino-doc__thanks">ARRIVEDERCI E GRAZIE</div>
      </div>
    </div>
  )
}
