import React, { useState } from 'react'
import { CheckboxField, InputField } from '../../core/components/form'
import { useConfirmStore } from '../../store/useConfirmStore'
import { eur, oggiIso, testoRiga, trova } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { nuovoNumeroOrdine, useSitoAccountStore } from '../useSitoAccountStore'
import { SnwEsito, SnwFoto, SnwPagamento, SnwStepper, SnwTotali } from '../SnwUi'
import { t } from '../i18n'
import './SnwCarrello.sass'

/**
 * Carrello e checkout in tre passi (Carrello → Dati → Pagamento) più la
 * conferma con il numero d'ordine. Codice sconto dimostrativo: NETWORK10.
 */
const PASSI = ['Carrello', 'Dati', 'Pagamento'] as const

export default function SnwCarrello() {
  const pagina = useSitoStore(s => s.pagina)
  const carrello = useSitoStore(s => s.carrello)
  const vai = useSitoStore(s => s.vai)
  const setQta = useSitoStore(s => s.qta)
  const rimuovi = useSitoStore(s => s.rimuovi)
  const svuota = useSitoStore(s => s.svuota)
  const confirm = useConfirmStore(s => s.confirm)
  const utente = useSitoAccountStore(s => s.utente)
  const aggiungiOrdine = useSitoAccountStore(s => s.aggiungiOrdine)
  const pagaToken = useSitoAccountStore(s => s.pagaToken)
  const [passo, setPasso] = useState(0)
  const [codice, setCodice] = useState('')
  const [sconto, setSconto] = useState(0)
  const [dati, setDati] = useState({ nome: utente?.nome ?? '', cognome: utente?.cognome ?? '', email: utente?.email ?? '', tel: utente?.tel ?? '' })
  const [privacy, setPrivacy] = useState(false)
  const [metodo, setMetodo] = useState('carta')

  if (pagina.nome === 'conferma') {
    return (
      <div className="snw__wrap snw-car">
        <SnwEsito icona="fa-circle-check" livello="h1" titolo={t('Grazie, l\'ordine è confermato')} azioni={<>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'account', sez: 'ordini' })}>{t('Vai ai tuoi ordini')}</button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => vai({ nome: 'home' })}>{t('Torna alla home')}</button>
        </>}>
          {t('Numero d\'ordine')} <b>{pagina.ordine}</b>. {t('Ti abbiamo inviato i voucher via e-mail: li trovi anche nell\'area riservata, in Ordini effettuati. Il booking Sibylla resta a disposizione per qualunque richiesta.')}
        </SnwEsito>
      </div>
    )
  }

  const subtotale = carrello.reduce((a, r) => a + r.prezzo * r.qta, 0)
  const valSconto = Math.round(subtotale * sconto) / 100
  const totale = subtotale - valSconto
  const datiOk = dati.nome && dati.cognome && /.+@.+\..+/.test(dati.email) && privacy

  async function togli(key: string, titolo: string) {
    if (await confirm({ title: t('Rimuovere dal carrello?'), message: t('«{titolo}» verrà tolto dal carrello.', { titolo: t(titolo) }), confirmLabel: t('Rimuovi'), cancelLabel: t('Annulla') })) rimuovi(key)
  }

  // Come su sibyllanetwork.com, per pagare serve l'accesso all'area riservata
  function procedi() {
    if (passo === 0 && !utente) { vai({ nome: 'accesso', poi: { nome: 'carrello' } }); return }
    setPasso(passo + 1)
  }

  function paga() {
    const ordine = nuovoNumeroOrdine()
    const nomi: Record<string, string> = { carta: 'Carta di credito', paypal: 'PayPal', apple: 'Apple Pay', token: 'Sibylla Token' }
    if (utente) {
      aggiungiOrdine({ id: ordine, email: utente.email, data: oggiIso(), righe: carrello.map(r => ({ ...r })), sconto: valSconto, totale, metodo: nomi[metodo] })
      if (metodo === 'token') pagaToken(totale, `Ordine ${ordine}`)
    }
    svuota()
    vai({ nome: 'conferma', ordine })
  }

  if (!carrello.length) {
    return (
      <div className="snw__wrap snw-car">
        <SnwEsito icona="fa-cart-shopping" livello="h1" titolo={t('Il carrello è vuoto')}
          azioni={<button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'catalogo' })}>{t('Esplora le offerte')}</button>}>
          {t('Scopri soggiorni, esperienze e prodotti della rete Sibylla.')}
        </SnwEsito>
      </div>
    )
  }

  return (
    <div className="snw__wrap snw-car">
      <ol className="snw-car__passi" aria-label={t('Passaggi dell\'acquisto')}>
        {PASSI.map((p, i) => (
          <li key={p} className={i === passo ? 'snw-car__passo snw-car__passo--on' : i < passo ? 'snw-car__passo snw-car__passo--fatto' : 'snw-car__passo'}
            aria-current={i === passo ? 'step' : undefined}>
            <span>{i < passo ? <i className="fa-solid fa-check" aria-hidden="true" /> : i + 1}</span>{t(p)}
          </li>
        ))}
      </ol>

      <div className="snw-car__layout">
        <section className="snw-car__main">
          {passo === 0 && (
            <>
              <h1>{t('Il tuo carrello')}</h1>
              <ul className="snw-car__righe">
                {carrello.map(r => {
                  const o = trova(r.id)
                  if (!o) return null
                  return (
                    <li key={r.key}>
                      <button type="button" className="snw-car__foto" onClick={() => vai({ nome: 'scheda', id: o.id })} aria-label={t('Apri {titolo}', { titolo: t(o.titolo) })}>
                        <SnwFoto id={o.foto[0]} w={240} h={240} alt="" />
                      </button>
                      <span className="snw-car__txt">
                        <b>{t(o.titolo)}</b>
                        <span>{t(o.formula)}</span>
                        <small><i className="fa-regular fa-calendar" aria-hidden="true" /> {testoRiga(r)}</small>
                        {r.b2b && <small className="snw-car__b2b"><i className="fa-solid fa-briefcase" aria-hidden="true" /> {t('Tariffa operatore · area riservata')}</small>}
                        {o.cancellazione && <small className="snw-car__canc"><i className="fa-solid fa-circle-check" aria-hidden="true" /> {t('Cancellazione gratuita')}</small>}
                      </span>
                      <SnwStepper valore={r.qta} onChange={v => setQta(r.key, v)} etichetta={t('quantità')} />
                      <span className="snw-car__eur">
                        <b>{eur(r.prezzo * r.qta)}</b>
                        <button type="button" onClick={() => togli(r.key, o.titolo)}><i className="fa-regular fa-trash-can" aria-hidden="true" /> {t('Rimuovi')}</button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {passo === 1 && (
            <>
              <h1>{t('I tuoi dati')}</h1>
              <p className="snw-car__nota">{t('Useremo questi dati per inviarti i voucher e per l\'assistenza durante il viaggio.')}</p>
              <div className="snw-car__form">
                <InputField name="nome" label={t('Nome')} required value={dati.nome} onChange={e => setDati({ ...dati, nome: e.target.value })} />
                <InputField name="cognome" label={t('Cognome')} required value={dati.cognome} onChange={e => setDati({ ...dati, cognome: e.target.value })} />
                <InputField name="email" type="email" label={t('E-mail')} required iconLeft="fa-regular fa-envelope" value={dati.email} onChange={e => setDati({ ...dati, email: e.target.value })} />
                <InputField name="tel" type="tel" label={t('Telefono')} iconLeft="fa-regular fa-phone" value={dati.tel} onChange={e => setDati({ ...dati, tel: e.target.value })} />
              </div>
              <CheckboxField name="privacy" label={t('Accetto le condizioni di vendita e l\'informativa privacy')} checked={privacy} onChange={e => setPrivacy(e.target.checked)} />
            </>
          )}

          {passo === 2 && (
            <>
              <h1>{t('Pagamento')}</h1>
              <SnwPagamento nome="metodo" valore={metodo} onChange={setMetodo} totale={totale} wallet campiCarta intestatario={`${dati.nome} ${dati.cognome}`.trim()} />
            </>
          )}
        </section>

        <aside className="snw-car__riep" aria-label={t('Riepilogo')}>
          <h2>{t('Riepilogo')}</h2>
          <SnwTotali totale={totale} righe={[
            { tit: t('Subtotale'), val: subtotale },
            ...(sconto > 0 ? [{ tit: t('Sconto {codice}', { codice: `NETWORK${sconto}` }), val: valSconto, sconto: true }] : []),
            { tit: t('Tassa di soggiorno'), val: t('in struttura') },
          ]} />
          {passo === 0 && (
            <form className="snw-car__codice" onSubmit={e => { e.preventDefault(); setSconto(codice.trim().toUpperCase() === 'NETWORK10' ? 10 : 0) }}>
              <InputField name="codice" label={t('Codice sconto')} placeholder={t('Es. NETWORK10')} value={codice} onChange={e => setCodice(e.target.value)}
                hint={sconto ? t('Sconto del {perc}% applicato', { perc: sconto }) : undefined} />
              <button type="submit" className="sib-btn sib-btn--secondary">{t('Applica')}</button>
            </form>
          )}
          {passo < 2 ? (
            <button type="button" className="sib-btn sib-btn--primary snw-car__cta" disabled={passo === 1 && !datiOk} onClick={procedi}>
              {passo === 0 ? (utente ? t('Procedi all\'acquisto') : t('Accedi e procedi')) : t('Vai al pagamento')} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="sib-btn sib-btn--primary snw-car__cta" onClick={paga}>
              <i className="fa-solid fa-lock" aria-hidden="true" /> {t('Paga {importo}', { importo: eur(totale) })}
            </button>
          )}
          {passo > 0 && <button type="button" className="sib-btn sib-btn--ghost snw-car__cta" onClick={() => setPasso(passo - 1)}>{t('Indietro')}</button>}
          {passo === 0 && <button type="button" className="sib-btn sib-btn--ghost snw-car__cta" onClick={() => vai({ nome: 'catalogo' })}>{t('Continua gli acquisti')}</button>}
        </aside>
      </div>
    </div>
  )
}
