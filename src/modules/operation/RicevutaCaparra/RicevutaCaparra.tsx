import React from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { useEmissioneStore } from '../../../store/useEmissioneStore'
import './RicevutaCaparra.sass'

// Documento (stampabile) che attesta la caparra versata dal cliente.

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

// Importo in cifre → euro (parsing del campo "importo" del form, formato it: 1.234,56)
function parseImporto(s: string): number {
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export default function RicevutaCaparra({ navigate }: { navigate: (p: string) => void }) {
  const doc = useEmissioneStore((s) => s.documento)

  if (!doc) {
    return (
      <div className="ricevuta-caparra">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <div className="sib-empty-state">Nessuna ricevuta da mostrare. Emetti un documento dalla pagina Emissione documenti.</div>
      </div>
    )
  }

  const versato = parseImporto(doc.importo)
  const totaleSoggiorno = doc.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const residuo = Math.max(0, totaleSoggiorno - versato)
  const intestatario = doc.ragioneSociale || [doc.nome, doc.cognome].filter(Boolean).join(' ') || '—'
  const camere = Array.from(new Set(doc.addebiti.map((a) => a.camera).filter(Boolean))).join(', ')

  return (
    <div className="ricevuta-caparra">
      <div className="ricevuta-caparra__toolbar">
        <BtnBack onClick={() => navigate('emissione-documenti')} />
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}>
          <i className="fa-light fa-print" /> Stampa
        </button>
      </div>

      <div className="ricevuta-caparra__sheet">
        <header className="ricevuta-caparra__head">
          <div>
            <div className="ricevuta-caparra__seller-name">{doc.struttura}</div>
            <div className="ricevuta-caparra__seller-line">{SELLER.indirizzo}</div>
            <div className="ricevuta-caparra__seller-line">P. IVA {SELLER.piva} · {SELLER.tel}</div>
          </div>
          <div className="ricevuta-caparra__meta">
            <div className="ricevuta-caparra__doc-title">Ricevuta di caparra</div>
            <div className="ricevuta-caparra__meta-row"><span>Numero</span><strong>{doc.numero}</strong></div>
            <div className="ricevuta-caparra__meta-row"><span>Data</span><strong>{doc.data}</strong></div>
          </div>
        </header>

        <section className="ricevuta-caparra__body">
          <p className="ricevuta-caparra__attesto">
            Si attesta di aver ricevuto da <strong>{intestatario}</strong>
            {doc.codiceFiscale ? <> (C.F./P.IVA {doc.codiceFiscale || doc.partitaIva})</> : null}
            {' '}la somma di:
          </p>

          <div className="ricevuta-caparra__amount">{fmt(versato)}</div>
          <div className="ricevuta-caparra__amount-label">a titolo di caparra sulla prenotazione</div>

          <div className="ricevuta-caparra__grid">
            <div><span>Camera/e</span><strong>{camere || '—'}</strong></div>
            <div><span>Modalità di pagamento</span><strong>{doc.modoPagamento}</strong></div>
            <div><span>Totale soggiorno</span><strong>{fmt(totaleSoggiorno)}</strong></div>
            <div><span>Caparra versata</span><strong>{fmt(versato)}</strong></div>
            <div className="ricevuta-caparra__residuo"><span>Saldo residuo</span><strong>{fmt(residuo)}</strong></div>
          </div>

          <p className="ricevuta-caparra__note">
            La presente ricevuta attesta il versamento della caparra e non costituisce documento
            fiscale. Il saldo residuo sarà regolato al momento del soggiorno.
          </p>
        </section>

        <footer className="ricevuta-caparra__foot">
          <div>
            <div className="ricevuta-caparra__foot-lbl">Coordinate bancarie</div>
            <div>IBAN {SELLER.iban}</div>
          </div>
          <div className="ricevuta-caparra__sign">
            <div className="ricevuta-caparra__sign-line" />
            <div className="ricevuta-caparra__foot-lbl">Timbro e firma</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
