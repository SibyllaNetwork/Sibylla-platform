import React from 'react'
import PageHead from '../../../core/components/PageHead'
import './SibyllaOp.sass'

// ─── SIBYLLA OP! ──────────────────────────────────────────────────────────────
//  La gestione dei clienti indipendenti dell'app Op! (aziende che la usano senza
//  Sibylla Platform) si è spostata sul sito di Op, con accesso autenticato:
//   - sibyllaop.it/admin: il tecnico Sibylla crea l'azienda con le sue
//     caratteristiche (dati, piano, reparti e moduli) e il suo amministratore;
//   - sibyllaop.it/azienda: l'amministratore dell'azienda, invitato via email,
//     configura strutture, piani, camere, utenti, QR e totem.
//  Qui resta solo il collegamento.

interface Props {
  /** Dentro il pannello Sibylla Admin → Piattaforma: il titolo lo mostra già il pannello. */
  incorporata?: boolean
}

const SITO = 'https://sibyllaop.it'

const AREE = [
  {
    icona: 'fa-user-shield', titolo: 'Area admin dei tecnici Sibylla', url: `${SITO}/admin`,
    testo: 'Crei l’azienda con le sue caratteristiche (dati, piano, reparti e moduli) e il suo amministratore, che riceve l’invito via email. Da qui si sospende o si elimina un’azienda.',
    azione: 'Apri l’area admin',
  },
  {
    icona: 'fa-building', titolo: 'Area admin delle aziende', url: `${SITO}/azienda`,
    testo: 'L’amministratore dell’azienda entra con il suo account e configura strutture, piani, camere, utenti, QR delle camere e totem di timbratura.',
    azione: 'Apri l’area delle aziende',
  },
]

export default function SibyllaOp({ incorporata = false }: Props) {
  return (
    <div className="sibylla-op">
      {!incorporata && (
        <PageHead title="Sibylla Op!" subtitle="Clienti indipendenti dell’app Op!: aziende che la usano senza Sibylla Platform." back={false} />
      )}
      <p className="sibylla-op__intro">
        La gestione delle aziende che usano Op! senza Sibylla Platform si è spostata sul sito di Op, con accesso protetto da credenziali.
      </p>
      <div className="sibylla-op__aree">
        {AREE.map(a => (
          <section key={a.url} className="sibylla-op__area">
            <i className={`fa-solid ${a.icona} sibylla-op__ico`} aria-hidden="true" />
            <h3>{a.titolo}</h3>
            <p>{a.testo}</p>
            <code>{a.url.replace('https://', '')}</code>
            <a className="sib-btn sib-btn--primary" href={a.url} target="_blank" rel="noopener noreferrer">
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> {a.azione}
            </a>
          </section>
        ))}
      </div>
    </div>
  )
}
