import React, { useState } from 'react'
import { InputField, RadioGroup, TextareaField } from '../../core/components/form'
import { FOTO, STRUTTURA_OSPITE, eur, oggiIso } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { useSaldo, useSitoAccountStore } from '../useSitoAccountStore'
import { SnwFoto } from '../SnwUi'
import './SnwPreventivo.sass'

/**
 * Preventivo ricevuto per e-mail (sibyllanetwork.com/quotes/…): la struttura
 * lo prepara in Sibylla Platform e il cliente lo apre con il codice, lo
 * accetta e paga, oppure chiede modifiche. Senza codice valido, il messaggio
 * del sito attuale («Nessun preventivo disponibile»). Codice demo: PRV-2026-0142.
 */
const DEMO = 'PRV-2026-0142'
const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })

const PREV = {
  arrivo: oggiIso(24), partenza: oggiIso(27), adulti: 2, bambini: 1, scadenza: oggiIso(5),
  voci: [
    { tit: 'Camera Family Superior', det: '3 notti · colazione inclusa · 2 adulti + 1 bambino', eur: 3 * 189 },
    { tit: 'Transfer privato da Fiumicino', det: 'Berlina · arrivo', eur: 65 },
    { tit: 'Dolce Vita Tour', det: 'Privato · 3 ore · 2° giorno', eur: 590 },
  ],
  sconto: 60,
  note: "Culla in camera e late check-out alle 13:00 senza supplemento. Il tour parte dall'hotel alle 9:00.",
}

export default function SnwPreventivo({ codice: iniziale }: { codice?: string }) {
  const vai = useSitoStore(s => s.vai)
  const utente = useSitoAccountStore(s => s.utente)
  const pagaToken = useSitoAccountStore(s => s.pagaToken)
  const saldo = useSaldo()
  const [cod, setCod] = useState(iniziale ?? DEMO)
  const [aperto, setAperto] = useState(iniziale?.toUpperCase() === DEMO ? DEMO : '')
  const [errore, setErrore] = useState(false)
  const [fase, setFase] = useState<'vedi' | 'paga' | 'modifica' | 'ok' | 'inviata'>('vedi')
  const [metodo, setMetodo] = useState('carta')
  const [msg, setMsg] = useState('')

  const subtot = PREV.voci.reduce((a, v) => a + v.eur, 0)
  const totale = subtot - PREV.sconto
  const tokenOk = !!utente && saldo >= totale

  function apri(e: React.FormEvent) {
    e.preventDefault()
    if (cod.trim().toUpperCase() === DEMO) { setAperto(DEMO); setErrore(false); setFase('vedi') } else { setAperto(''); setErrore(true) }
  }

  function conferma() {
    if (metodo === 'token') pagaToken(totale, `Preventivo ${DEMO}`)
    setFase('ok')
  }

  return (
    <div className="snw__wrap snw-prv">
      <form className="snw-prv__codice" onSubmit={apri}>
        <span><i className="fa-light fa-file-invoice" aria-hidden="true" /> <b>Preventivo</b> · inserisci il codice che trovi nell'e-mail della struttura</span>
        <InputField name="prv-cod" label="Codice preventivo" value={cod} onChange={e => setCod(e.target.value)} hint={`Demo: ${DEMO}`} />
        <button type="submit" className="sib-btn sib-btn--primary">Apri</button>
      </form>

      {!aperto ? (
        <div className="snw-prv__vuoto">
          <i className="fa-light fa-file-circle-question" aria-hidden="true" />
          <h1>Nessun preventivo disponibile</h1>
          <p>{errore ? `Il codice «${cod.trim()}» non corrisponde a un preventivo attivo.` : 'Il link che hai utilizzato non contiene le informazioni necessarie per visualizzare un preventivo.'} Contatta la struttura per ricevere un nuovo link.</p>
        </div>
      ) : fase === 'ok' || fase === 'inviata' ? (
        <div className="snw-prv__vuoto">
          <i className={`fa-light ${fase === 'ok' ? 'fa-circle-check' : 'fa-paper-plane'}`} aria-hidden="true" />
          <h1>{fase === 'ok' ? 'Preventivo confermato' : 'Richiesta di modifica inviata'}</h1>
          <p>{fase === 'ok'
            ? `${STRUTTURA_OSPITE.nome} ha ricevuto la conferma del preventivo ${DEMO} (${eur(totale)}). Ti arrivano via e-mail la ricevuta e i voucher.`
            : `${STRUTTURA_OSPITE.nome} ti risponde con un preventivo aggiornato, di solito entro la giornata.`}</p>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai(utente ? { nome: 'account', sez: 'ordini' } : { nome: 'home' })}>{utente ? 'Vai ai tuoi ordini' : 'Torna alla home'}</button>
        </div>
      ) : (
        <div className="snw-prv__layout">
          <article className="snw-prv__doc">
            <header className="snw-prv__testa">
              <span className="snw-prv__foto"><SnwFoto id={STRUTTURA_OSPITE.foto[0] ?? FOTO.camera} w={400} h={400} alt="" /></span>
              <span>
                <small>Preventivo {DEMO} · valido fino a {fmt(PREV.scadenza)}</small>
                <h1>{STRUTTURA_OSPITE.nome}</h1>
                <span className="snw-prv__soggiorno">
                  <span><i className="fa-regular fa-calendar" aria-hidden="true" /> {fmt(PREV.arrivo)} → {fmt(PREV.partenza)}</span>
                  <span><i className="fa-regular fa-user" aria-hidden="true" /> {PREV.adulti} adulti · {PREV.bambini} bambino</span>
                </span>
              </span>
            </header>
            <ul className="snw-prv__voci">
              {PREV.voci.map(v => <li key={v.tit}><span><b>{v.tit}</b><small>{v.det}</small></span><b>{eur(v.eur)}</b></li>)}
            </ul>
            <dl className="snw-prv__tot">
              <div><dt>Subtotale</dt><dd>{eur(subtot)}</dd></div>
              <div className="snw-prv__sconto"><dt>Sconto della struttura</dt><dd>−{eur(PREV.sconto)}</dd></div>
              <div><dt>Tassa di soggiorno</dt><dd>in struttura</dd></div>
              <div className="snw-prv__totale"><dt>Totale</dt><dd>{eur(totale)}</dd></div>
            </dl>
            <p className="snw-prv__note"><i className="fa-solid fa-message-lines" aria-hidden="true" /> {PREV.note}</p>
          </article>

          <aside className="snw-prv__lato">
            {fase === 'modifica' ? (
              <>
                <h2>Chiedi una modifica</h2>
                <TextareaField name="prv-msg" label="Cosa vuoi cambiare?" rows={5} placeholder="Es. un'altra data, una camera in più…" value={msg} onChange={e => setMsg(e.target.value)} />
                <button type="button" className="sib-btn sib-btn--primary" disabled={!msg.trim()} onClick={() => setFase('inviata')}>Invia alla struttura</button>
                <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setFase('vedi')}>Indietro</button>
              </>
            ) : fase === 'paga' ? (
              <>
                <h2>Accetta e paga</h2>
                <RadioGroup name="prv-metodo" label="Metodo di pagamento" value={metodo} onChange={setMetodo}
                  options={[
                    { value: 'carta', label: 'Carta di credito' },
                    ...(utente ? [{ value: 'token', label: `Sibylla Token · saldo ${eur(saldo)}`, disabled: !tokenOk }] : []),
                  ]} />
                {!utente && <p className="snw-prv__hint"><button type="button" className="snw-prv__link" onClick={() => vai({ nome: 'accesso', poi: { nome: 'preventivo', codice: DEMO } })}>Accedi</button> per pagare con i Sibylla Token del tuo portafoglio.</p>}
                {utente && !tokenOk && <p className="snw-prv__hint">Il saldo token non basta: puoi ricaricarlo dal Portafoglio.</p>}
                <button type="button" className="sib-btn sib-btn--primary" onClick={conferma}><i className="fa-solid fa-lock" aria-hidden="true" /> Paga {eur(totale)}</button>
                <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setFase('vedi')}>Indietro</button>
              </>
            ) : (
              <>
                <h2>Ti piace la proposta?</h2>
                <p>Accettala entro il {fmt(PREV.scadenza)}: dopo, le camere tornano in vendita.</p>
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => setFase('paga')}>Accetta e paga {eur(totale)}</button>
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setFase('modifica')}>Chiedi una modifica</button>
                <a className="snw-prv__tel" href="tel:00390691714070"><i className="fa-solid fa-phone" aria-hidden="true" /> Parla con il booking</a>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
