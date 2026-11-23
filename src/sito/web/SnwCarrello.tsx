import React, { useState } from 'react'
import { CheckboxField, InputField, RadioGroup } from '../../core/components/form'
import { useConfirmStore } from '../../store/useConfirmStore'
import { eur, trova } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { SnwFoto, SnwStepper } from '../SnwUi'
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
  const [passo, setPasso] = useState(0)
  const [codice, setCodice] = useState('')
  const [sconto, setSconto] = useState(0)
  const [dati, setDati] = useState({ nome: '', cognome: '', email: '', tel: '' })
  const [privacy, setPrivacy] = useState(false)
  const [metodo, setMetodo] = useState('carta')

  if (pagina.nome === 'conferma') {
    return (
      <div className="snw__wrap snw-car snw-car__ok">
        <i className="fa-light fa-circle-check" aria-hidden="true" />
        <h1>Grazie, l'ordine è confermato</h1>
        <p>Numero d'ordine <b>{pagina.ordine}</b>. Ti abbiamo inviato i voucher via e-mail; il booking Sibylla resta a disposizione per qualunque richiesta.</p>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'home' })}>Torna alla home</button>
      </div>
    )
  }

  const subtotale = carrello.reduce((a, r) => a + r.prezzo * r.qta, 0)
  const valSconto = Math.round(subtotale * sconto) / 100
  const totale = subtotale - valSconto
  const datiOk = dati.nome && dati.cognome && /.+@.+\..+/.test(dati.email) && privacy

  async function togli(key: string, titolo: string) {
    if (await confirm({ title: 'Rimuovere dal carrello?', message: `«${titolo}» verrà tolto dal carrello.`, confirmLabel: 'Rimuovi' })) rimuovi(key)
  }

  function paga() {
    const ordine = `SN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`
    svuota()
    vai({ nome: 'conferma', ordine })
  }

  if (!carrello.length) {
    return (
      <div className="snw__wrap snw-car snw-car__ok">
        <i className="fa-light fa-cart-shopping" aria-hidden="true" />
        <h1>Il carrello è vuoto</h1>
        <p>Scopri soggiorni, esperienze e prodotti della rete Sibylla.</p>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'catalogo' })}>Esplora le offerte</button>
      </div>
    )
  }

  return (
    <div className="snw__wrap snw-car">
      <ol className="snw-car__passi" aria-label="Passaggi dell'acquisto">
        {PASSI.map((p, i) => (
          <li key={p} className={i === passo ? 'snw-car__passo snw-car__passo--on' : i < passo ? 'snw-car__passo snw-car__passo--fatto' : 'snw-car__passo'}
            aria-current={i === passo ? 'step' : undefined}>
            <span>{i < passo ? <i className="fa-solid fa-check" aria-hidden="true" /> : i + 1}</span>{p}
          </li>
        ))}
      </ol>

      <div className="snw-car__layout">
        <section className="snw-car__main">
          {passo === 0 && (
            <>
              <h1>Il tuo carrello</h1>
              <ul className="snw-car__righe">
                {carrello.map(r => {
                  const o = trova(r.id)
                  if (!o) return null
                  return (
                    <li key={r.key}>
                      <button type="button" className="snw-car__foto" onClick={() => vai({ nome: 'scheda', id: o.id })} aria-label={`Apri ${o.titolo}`}>
                        <SnwFoto id={o.foto[0]} w={240} h={240} alt="" />
                      </button>
                      <span className="snw-car__txt">
                        <b>{o.titolo}</b>
                        <span>{o.formula}</span>
                        <small><i className="fa-regular fa-calendar" aria-hidden="true" /> {r.dettaglio}</small>
                        {o.cancellazione && <small className="snw-car__canc"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Cancellazione gratuita</small>}
                      </span>
                      <SnwStepper valore={r.qta} onChange={v => setQta(r.key, v)} etichetta="quantità" />
                      <span className="snw-car__eur">
                        <b>{eur(r.prezzo * r.qta)}</b>
                        <button type="button" onClick={() => togli(r.key, o.titolo)}><i className="fa-regular fa-trash-can" aria-hidden="true" /> Rimuovi</button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {passo === 1 && (
            <>
              <h1>I tuoi dati</h1>
              <p className="snw-car__nota">Useremo questi dati per inviarti i voucher e per l'assistenza durante il viaggio.</p>
              <div className="snw-car__form">
                <InputField name="nome" label="Nome" required value={dati.nome} onChange={e => setDati({ ...dati, nome: e.target.value })} />
                <InputField name="cognome" label="Cognome" required value={dati.cognome} onChange={e => setDati({ ...dati, cognome: e.target.value })} />
                <InputField name="email" type="email" label="E-mail" required iconLeft="fa-regular fa-envelope" value={dati.email} onChange={e => setDati({ ...dati, email: e.target.value })} />
                <InputField name="tel" type="tel" label="Telefono" iconLeft="fa-regular fa-phone" value={dati.tel} onChange={e => setDati({ ...dati, tel: e.target.value })} />
              </div>
              <CheckboxField name="privacy" label="Accetto le condizioni di vendita e l'informativa privacy" checked={privacy} onChange={e => setPrivacy(e.target.checked)} />
            </>
          )}

          {passo === 2 && (
            <>
              <h1>Pagamento</h1>
              <RadioGroup name="metodo" label="Metodo di pagamento" value={metodo} onChange={setMetodo}
                options={[{ value: 'carta', label: 'Carta di credito o debito' }, { value: 'paypal', label: 'PayPal' }, { value: 'apple', label: 'Apple Pay' }]} />
              {metodo === 'carta' && (
                <div className="snw-car__form">
                  <InputField name="intestatario" label="Intestatario" defaultValue={`${dati.nome} ${dati.cognome}`.trim()} />
                  <InputField name="numero" label="Numero carta" iconLeft="fa-regular fa-credit-card" placeholder="1234 5678 9012 3456" />
                  <InputField name="scadenza" label="Scadenza" placeholder="MM/AA" />
                  <InputField name="cvv" label="CVV" placeholder="123" maxLength={4} />
                </div>
              )}
              <p className="snw-car__nota"><i className="fa-solid fa-lock" aria-hidden="true" /> Pagamento protetto con 3-D Secure. Demo: nessun addebito reale.</p>
            </>
          )}
        </section>

        <aside className="snw-car__riep" aria-label="Riepilogo">
          <h2>Riepilogo</h2>
          <dl>
            <div><dt>Subtotale</dt><dd>{eur(subtotale)}</dd></div>
            {sconto > 0 && <div className="snw-car__sconto"><dt>Sconto NETWORK{sconto}</dt><dd>−{eur(valSconto)}</dd></div>}
            <div><dt>Tassa di soggiorno</dt><dd>in struttura</dd></div>
            <div className="snw-car__totale"><dt>Totale</dt><dd>{eur(totale)}</dd></div>
          </dl>
          {passo === 0 && (
            <form className="snw-car__codice" onSubmit={e => { e.preventDefault(); setSconto(codice.trim().toUpperCase() === 'NETWORK10' ? 10 : 0) }}>
              <InputField name="codice" label="Codice sconto" placeholder="Es. NETWORK10" value={codice} onChange={e => setCodice(e.target.value)}
                hint={sconto ? `Sconto del ${sconto}% applicato` : undefined} />
              <button type="submit" className="sib-btn sib-btn--secondary">Applica</button>
            </form>
          )}
          {passo < 2 ? (
            <button type="button" className="sib-btn sib-btn--primary snw-car__cta" disabled={passo === 1 && !datiOk} onClick={() => setPasso(passo + 1)}>
              {passo === 0 ? 'Procedi all\'acquisto' : 'Vai al pagamento'} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="sib-btn sib-btn--primary snw-car__cta" onClick={paga}>
              <i className="fa-solid fa-lock" aria-hidden="true" /> Paga {eur(totale)}
            </button>
          )}
          {passo > 0 && <button type="button" className="sib-btn sib-btn--ghost snw-car__cta" onClick={() => setPasso(passo - 1)}>Indietro</button>}
          {passo === 0 && <button type="button" className="sib-btn sib-btn--ghost snw-car__cta" onClick={() => vai({ nome: 'catalogo' })}>Continua gli acquisti</button>}
        </aside>
      </div>
    </div>
  )
}
