import React, { useState } from 'react'
import { InputField, TextareaField } from '../../core/components/form'
import { FOTO, STRUTTURA_OSPITE, eur, oggiIso } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { useSaldo, useSitoAccountStore } from '../useSitoAccountStore'
import { SnwEsito, SnwFoto, SnwPagamento, SnwTotali } from '../SnwUi'
import { loc, t } from '../i18n'
import './SnwPreventivo.sass'

/**
 * Preventivo ricevuto per e-mail (sibyllanetwork.com/quotes/…): la struttura
 * lo prepara in Sibylla Platform e il cliente lo apre con il codice, lo
 * accetta e paga, oppure chiede modifiche. Senza codice valido, il messaggio
 * del sito attuale («Nessun preventivo disponibile»). Codice demo: PRV-2026-0142.
 */
const DEMO = 'PRV-2026-0142'
const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'long' })

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
        <span><i className="fa-light fa-file-invoice" aria-hidden="true" /> <b>{t('Preventivo')}</b> · {t('inserisci il codice che trovi nell\'e-mail della struttura')}</span>
        <InputField name="prv-cod" label={t('Codice preventivo')} value={cod} onChange={e => setCod(e.target.value)} hint={t('Demo: {codice}', { codice: DEMO })} />
        <button type="submit" className="sib-btn sib-btn--primary">{t('Apri')}</button>
      </form>

      {!aperto ? (
        <SnwEsito icona="fa-file-circle-question" livello="h1" titolo={t('Nessun preventivo disponibile')}>
          {errore ? t('Il codice «{codice}» non corrisponde a un preventivo attivo.', { codice: cod.trim() }) : t('Il link che hai utilizzato non contiene le informazioni necessarie per visualizzare un preventivo.')} {t('Contatta la struttura per ricevere un nuovo link.')}
        </SnwEsito>
      ) : fase === 'ok' || fase === 'inviata' ? (
        <SnwEsito icona={fase === 'ok' ? 'fa-circle-check' : 'fa-paper-plane'} livello="h1" titolo={fase === 'ok' ? t('Preventivo confermato') : t('Richiesta di modifica inviata')}
          azioni={<button type="button" className="sib-btn sib-btn--primary" onClick={() => vai(utente ? { nome: 'account', sez: 'ordini' } : { nome: 'home' })}>{utente ? t('Vai ai tuoi ordini') : t('Torna alla home')}</button>}>
          {fase === 'ok'
            ? t('{struttura} ha ricevuto la conferma del preventivo {codice} ({importo}). Ti arrivano via e-mail la ricevuta e i voucher.', { struttura: STRUTTURA_OSPITE.nome, codice: DEMO, importo: eur(totale) })
            : t('{struttura} ti risponde con un preventivo aggiornato, di solito entro la giornata.', { struttura: STRUTTURA_OSPITE.nome })}
        </SnwEsito>
      ) : (
        <div className="snw-prv__layout">
          <article className="snw-prv__doc">
            <header className="snw-prv__testa">
              <span className="snw-prv__foto"><SnwFoto id={STRUTTURA_OSPITE.foto[0] ?? FOTO.camera} w={400} h={400} alt="" /></span>
              <span>
                <small>{t('Preventivo {codice} · valido fino a {data}', { codice: DEMO, data: fmt(PREV.scadenza) })}</small>
                <h1>{STRUTTURA_OSPITE.nome}</h1>
                <span className="snw-prv__soggiorno">
                  <span><i className="fa-regular fa-calendar" aria-hidden="true" /> {fmt(PREV.arrivo)} → {fmt(PREV.partenza)}</span>
                  <span><i className="fa-regular fa-user" aria-hidden="true" /> {t('{adulti} adulti · {bambini} bambino', { adulti: PREV.adulti, bambini: PREV.bambini })}</span>
                </span>
              </span>
            </header>
            <ul className="snw-prv__voci">
              {PREV.voci.map(v => <li key={v.tit}><span><b>{t(v.tit)}</b><small>{t(v.det)}</small></span><b>{eur(v.eur)}</b></li>)}
            </ul>
            <SnwTotali className="snw-prv__tot" totale={totale} righe={[
              { tit: t('Subtotale'), val: subtot },
              { tit: t('Sconto della struttura'), val: PREV.sconto, sconto: true },
              { tit: t('Tassa di soggiorno'), val: t('in struttura') },
            ]} />
            <p className="snw-prv__note"><i className="fa-solid fa-message-lines" aria-hidden="true" /> {t(PREV.note)}</p>
          </article>

          <aside className="snw-prv__lato">
            {fase === 'modifica' ? (
              <>
                <h2>{t('Chiedi una modifica')}</h2>
                <TextareaField name="prv-msg" label={t('Cosa vuoi cambiare?')} rows={5} placeholder={t('Es. un\'altra data, una camera in più…')} value={msg} onChange={e => setMsg(e.target.value)} />
                <button type="button" className="sib-btn sib-btn--primary" disabled={!msg.trim()} onClick={() => setFase('inviata')}>{t('Invia alla struttura')}</button>
                <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setFase('vedi')}>{t('Indietro')}</button>
              </>
            ) : fase === 'paga' ? (
              <>
                <h2>{t('Accetta e paga')}</h2>
                <SnwPagamento nome="prv-metodo" valore={metodo} onChange={setMetodo} totale={totale} verticale />
                {!utente && <p className="snw-prv__hint"><button type="button" className="snw-prv__link" onClick={() => vai({ nome: 'accesso', poi: { nome: 'preventivo', codice: DEMO } })}>{t('Accedi')}</button> {t('per pagare con i Sibylla Token del tuo portafoglio.')}</p>}
                {utente && !tokenOk && <p className="snw-prv__hint">{t('Il saldo token non basta: puoi ricaricarlo dal Portafoglio.')}</p>}
                <button type="button" className="sib-btn sib-btn--primary" onClick={conferma}><i className="fa-solid fa-lock" aria-hidden="true" /> {t('Paga {importo}', { importo: eur(totale) })}</button>
                <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setFase('vedi')}>{t('Indietro')}</button>
              </>
            ) : (
              <>
                <h2>{t('Ti piace la proposta?')}</h2>
                <p>{t('Accettala entro il {data}: dopo, le camere tornano in vendita.', { data: fmt(PREV.scadenza) })}</p>
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => setFase('paga')}>{t('Accetta e paga {importo}', { importo: eur(totale) })}</button>
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setFase('modifica')}>{t('Chiedi una modifica')}</button>
                <a className="snw-prv__tel" href="tel:00390691714070"><i className="fa-solid fa-phone" aria-hidden="true" /> {t('Parla con il booking')}</a>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
