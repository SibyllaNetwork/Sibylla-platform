import React, { useEffect, useState } from 'react'
import { InputField, RadioGroup } from '../../../../core/components/form'
import type { PreventivoSoggiorno, PropostaSoggiorno, TentativoPagamento } from '../../../../store/usePreventiviSoggiornoStore'
import type { TemplateSoggiorno } from './templateSoggiorno'
import { conto, LETTERE } from './soggiorno'
import { LINGUE, tr, type Lingua } from './lingue'
import './PagamentoNexi.sass'

/**
 * Pagina di pagamento con carta (gateway Nexi XPay) che il cliente apre dopo
 * aver accettato una proposta: caparra o totale, dati della carta, verifica
 * 3-D Secure, esito. AMBIENTE DI PROVA: la piattaforma non è ancora collegata
 * a Nexi, nessun addebito reale e nessun dato di carta salvato (solo circuito
 * e ultime 4 cifre). L'esito dipende dalla carta di prova (CARTE_PROVA). Con
 * l'integrazione vera i dati della carta si inseriscono sulla pagina ospitata
 * da Nexi (la piattaforma non li vede mai) e l'esito arriva con la notifica
 * server-to-server del gateway.
 */

type Testi = Record<
  'titolo' | 'sicuro' | 'prova' | 'provaCarte' | 'riepilogo' | 'proposta' | 'totaleSoggiorno' | 'paghiOra' | 'restante'
  | 'caparra' | 'totale' | 'titolare' | 'numero' | 'scadenza' | 'cvv' | 'paga' | 'indietro' | 'verifica' | 'verificaTesto'
  | 'confermaBanca' | 'annulla' | 'okTitolo' | 'okTesto' | 'codice' | 'koTitolo' | 'riprova' | 'altraCarta' | 'tornaProposta'
  | 'vediConferma' | 'errNumero' | 'errScadenza' | 'errCvv' | 'errTitolare' | 'inElaborazione',
  string
>

const T: Record<Lingua, Testi> = {
  it: {
    titolo: 'Pagamento con carta', sicuro: 'Pagamento sicuro · Nexi XPay', prova: 'Ambiente di prova: nessun addebito reale.', provaCarte: 'Carte di prova',
    riepilogo: 'Riepilogo', proposta: 'Proposta', totaleSoggiorno: 'Totale del soggiorno', paghiOra: 'Paghi ora', restante: 'Il resto si paga in struttura',
    caparra: 'Caparra', totale: 'Intero importo', titolare: 'Titolare della carta', numero: 'Numero della carta', scadenza: 'Scadenza (MM/AA)', cvv: 'CVV',
    paga: 'Paga', indietro: 'Indietro', verifica: 'Verifica 3-D Secure', verificaTesto: 'La tua banca ti chiede di confermare il pagamento nell\'app o con il codice ricevuto via SMS.',
    confermaBanca: 'Ho confermato nell\'app della banca', annulla: 'Annulla', okTitolo: 'Pagamento autorizzato', okTesto: 'La prenotazione è confermata: riceverai la mail di conferma con il riepilogo del soggiorno.',
    codice: 'Codice di autorizzazione', koTitolo: 'Pagamento non riuscito', riprova: 'Riprova', altraCarta: 'Usa un\'altra carta', tornaProposta: 'Torna alla proposta',
    vediConferma: 'Vedi la mail di conferma', errNumero: 'Numero di carta non valido', errScadenza: 'Scadenza non valida', errCvv: 'CVV non valido', errTitolare: 'Indica il titolare', inElaborazione: 'Elaborazione in corso…',
  },
  en: {
    titolo: 'Card payment', sicuro: 'Secure payment · Nexi XPay', prova: 'Test environment: no real charge.', provaCarte: 'Test cards',
    riepilogo: 'Summary', proposta: 'Offer', totaleSoggiorno: 'Stay total', paghiOra: 'Pay now', restante: 'The balance is paid at the property',
    caparra: 'Deposit', totale: 'Full amount', titolare: 'Cardholder', numero: 'Card number', scadenza: 'Expiry (MM/YY)', cvv: 'CVV',
    paga: 'Pay', indietro: 'Back', verifica: '3-D Secure verification', verificaTesto: 'Your bank asks you to confirm the payment in its app or with the code sent by SMS.',
    confermaBanca: 'I confirmed in my banking app', annulla: 'Cancel', okTitolo: 'Payment authorised', okTesto: 'Your booking is confirmed: you will receive a confirmation email with the summary of your stay.',
    codice: 'Authorisation code', koTitolo: 'Payment failed', riprova: 'Try again', altraCarta: 'Use another card', tornaProposta: 'Back to the offer',
    vediConferma: 'View the confirmation email', errNumero: 'Invalid card number', errScadenza: 'Invalid expiry date', errCvv: 'Invalid CVV', errTitolare: 'Enter the cardholder', inElaborazione: 'Processing…',
  },
  fr: {
    titolo: 'Paiement par carte', sicuro: 'Paiement sécurisé · Nexi XPay', prova: 'Environnement de test : aucun débit réel.', provaCarte: 'Cartes de test',
    riepilogo: 'Récapitulatif', proposta: 'Offre', totaleSoggiorno: 'Total du séjour', paghiOra: 'À payer maintenant', restante: 'Le solde se règle sur place',
    caparra: 'Acompte', totale: 'Montant total', titolare: 'Titulaire de la carte', numero: 'Numéro de carte', scadenza: 'Expiration (MM/AA)', cvv: 'CVV',
    paga: 'Payer', indietro: 'Retour', verifica: 'Vérification 3-D Secure', verificaTesto: 'Votre banque vous demande de confirmer le paiement dans son application ou avec le code reçu par SMS.',
    confermaBanca: 'J\'ai confirmé dans l\'application', annulla: 'Annuler', okTitolo: 'Paiement autorisé', okTesto: 'La réservation est confirmée : vous recevrez l\'e-mail de confirmation avec le récapitulatif du séjour.',
    codice: 'Code d\'autorisation', koTitolo: 'Paiement refusé', riprova: 'Réessayer', altraCarta: 'Utiliser une autre carte', tornaProposta: 'Retour à l\'offre',
    vediConferma: 'Voir l\'e-mail de confirmation', errNumero: 'Numéro de carte invalide', errScadenza: 'Date d\'expiration invalide', errCvv: 'CVV invalide', errTitolare: 'Indiquez le titulaire', inElaborazione: 'Traitement en cours…',
  },
  de: {
    titolo: 'Kartenzahlung', sicuro: 'Sichere Zahlung · Nexi XPay', prova: 'Testumgebung: keine echte Belastung.', provaCarte: 'Testkarten',
    riepilogo: 'Übersicht', proposta: 'Angebot', totaleSoggiorno: 'Gesamtbetrag', paghiOra: 'Jetzt zahlen', restante: 'Der Rest wird vor Ort bezahlt',
    caparra: 'Anzahlung', totale: 'Gesamtbetrag', titolare: 'Karteninhaber', numero: 'Kartennummer', scadenza: 'Ablauf (MM/JJ)', cvv: 'CVV',
    paga: 'Zahlen', indietro: 'Zurück', verifica: '3-D-Secure-Prüfung', verificaTesto: 'Ihre Bank bittet Sie, die Zahlung in der App oder mit dem per SMS erhaltenen Code zu bestätigen.',
    confermaBanca: 'In der Banking-App bestätigt', annulla: 'Abbrechen', okTitolo: 'Zahlung autorisiert', okTesto: 'Die Buchung ist bestätigt: Sie erhalten die Bestätigungs-E-Mail mit der Übersicht Ihres Aufenthalts.',
    codice: 'Autorisierungscode', koTitolo: 'Zahlung fehlgeschlagen', riprova: 'Erneut versuchen', altraCarta: 'Andere Karte verwenden', tornaProposta: 'Zurück zum Angebot',
    vediConferma: 'Bestätigungs-E-Mail ansehen', errNumero: 'Ungültige Kartennummer', errScadenza: 'Ungültiges Ablaufdatum', errCvv: 'Ungültiger CVV', errTitolare: 'Karteninhaber angeben', inElaborazione: 'Wird verarbeitet…',
  },
  es: {
    titolo: 'Pago con tarjeta', sicuro: 'Pago seguro · Nexi XPay', prova: 'Entorno de pruebas: ningún cargo real.', provaCarte: 'Tarjetas de prueba',
    riepilogo: 'Resumen', proposta: 'Propuesta', totaleSoggiorno: 'Total de la estancia', paghiOra: 'Pagas ahora', restante: 'El resto se paga en el establecimiento',
    caparra: 'Depósito', totale: 'Importe total', titolare: 'Titular de la tarjeta', numero: 'Número de tarjeta', scadenza: 'Caducidad (MM/AA)', cvv: 'CVV',
    paga: 'Pagar', indietro: 'Atrás', verifica: 'Verificación 3-D Secure', verificaTesto: 'Tu banco te pide confirmar el pago en su app o con el código recibido por SMS.',
    confermaBanca: 'He confirmado en la app del banco', annulla: 'Cancelar', okTitolo: 'Pago autorizado', okTesto: 'La reserva está confirmada: recibirás el correo de confirmación con el resumen de la estancia.',
    codice: 'Código de autorización', koTitolo: 'Pago no realizado', riprova: 'Reintentar', altraCarta: 'Usar otra tarjeta', tornaProposta: 'Volver a la propuesta',
    vediConferma: 'Ver el correo de confirmación', errNumero: 'Número de tarjeta no válido', errScadenza: 'Caducidad no válida', errCvv: 'CVV no válido', errTitolare: 'Indica el titular', inElaborazione: 'Procesando…',
  },
  zh: {
    titolo: '银行卡支付', sicuro: '安全支付 · Nexi XPay', prova: '测试环境：不会产生真实扣款。', provaCarte: '测试卡',
    riepilogo: '摘要', proposta: '方案', totaleSoggiorno: '住宿总价', paghiOra: '现在支付', restante: '余款于酒店支付',
    caparra: '订金', totale: '全额', titolare: '持卡人', numero: '卡号', scadenza: '有效期（MM/YY）', cvv: 'CVV',
    paga: '支付', indietro: '返回', verifica: '3-D Secure 验证', verificaTesto: '您的银行要求您在银行应用中或通过短信验证码确认付款。',
    confermaBanca: '我已在银行应用中确认', annulla: '取消', okTitolo: '支付已授权', okTesto: '预订已确认：您将收到包含住宿摘要的确认邮件。',
    codice: '授权码', koTitolo: '支付失败', riprova: '重试', altraCarta: '使用其他卡', tornaProposta: '返回方案',
    vediConferma: '查看确认邮件', errNumero: '卡号无效', errScadenza: '有效期无效', errCvv: 'CVV无效', errTitolare: '请填写持卡人', inElaborazione: '处理中…',
  },
}

/** Motivi di diniego (italiano: vanno nelle notifiche dell'hotel; tradotti per il cliente). */
const MOTIVI: Record<string, Record<Lingua, string>> = {
  fondi: { it: 'Fondi insufficienti', en: 'Insufficient funds', fr: 'Fonds insuffisants', de: 'Unzureichende Deckung', es: 'Fondos insuficientes', zh: '余额不足' },
  scaduta: { it: 'Carta scaduta o bloccata', en: 'Card expired or blocked', fr: 'Carte expirée ou bloquée', de: 'Karte abgelaufen oder gesperrt', es: 'Tarjeta caducada o bloqueada', zh: '卡已过期或被冻结' },
  tds: { it: 'Verifica 3-D Secure non superata', en: '3-D Secure verification failed', fr: 'Échec de la vérification 3-D Secure', de: '3-D-Secure-Prüfung fehlgeschlagen', es: 'Verificación 3-D Secure fallida', zh: '3-D Secure 验证未通过' },
  annullato: { it: 'Pagamento annullato dal cliente', en: 'Payment cancelled by the customer', fr: 'Paiement annulé par le client', de: 'Zahlung vom Kunden abgebrochen', es: 'Pago cancelado por el cliente', zh: '客户取消了支付' },
}
export const motivoIn = (motivoIt: string, lingua: Lingua) =>
  Object.values(MOTIVI).find((m) => m.it === motivoIt)?.[lingua] ?? motivoIt

/** Carte di prova della demo: le ultime 4 cifre decidono l'esito. */
export const CARTE_PROVA: { numero: string; esito: string; motivo?: keyof typeof MOTIVI }[] = [
  { numero: '4242 4242 4242 4242', esito: 'Autorizzata' },
  { numero: '5555 5555 5555 4444', esito: 'Autorizzata (Mastercard)' },
  { numero: '4000 0000 0000 0002', esito: 'Rifiutata: fondi insufficienti', motivo: 'fondi' },
  { numero: '4000 0000 0000 0069', esito: 'Rifiutata: carta scaduta', motivo: 'scaduta' },
  { numero: '4000 0000 0000 0119', esito: '3-D Secure non superato', motivo: 'tds' },
]

const soloCifre = (s: string) => s.replace(/\D/g, '')
const circuito = (n: string) => (/^4/.test(n) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'American Express' : /^6/.test(n) ? 'Maestro' : '')
const luhn = (n: string) => {
  let somma = 0
  n.split('').reverse().forEach((c, i) => { let d = Number(c); if (i % 2) { d *= 2; if (d > 9) d -= 9 } somma += d })
  return n.length >= 13 && somma % 10 === 0
}
const scadenzaOk = (s: string) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(s)
  if (!m) return false
  const mese = Number(m[1]); const anno = 2000 + Number(m[2])
  const oggi = new Date()
  return mese >= 1 && mese <= 12 && (anno > oggi.getFullYear() || (anno === oggi.getFullYear() && mese >= oggi.getMonth() + 1))
}
const uid = () => Math.random().toString(36).slice(2, 10)

export function importiPagamento(template: TemplateSoggiorno, totale: number) {
  const caparra = Math.round(totale * template.pagamento.percentualeCaparra) / 100
  return { caparra, totale }
}

export default function PagamentoNexi({ pr, q, extraScelti, template, onEsito, onIndietro, onVediConferma }: {
  pr: PreventivoSoggiorno; q: PropostaSoggiorno; extraScelti: string[]; template: TemplateSoggiorno
  onEsito: (t: TentativoPagamento) => void; onIndietro: () => void; onVediConferma: () => void
}) {
  const lingua: Lingua = pr.lingua ?? 'it'
  const t = T[lingua]
  const loc = LINGUE[lingua].locale
  const eur = (n: number) => n.toLocaleString(loc, { style: 'currency', currency: 'EUR' })
  const k = conto(q, extraScelti)
  const { caparra } = importiPagamento(template, k.totaleConExtra)
  const P = template.pagamento
  const [tipo, setTipo] = useState<'caparra' | 'totale'>(P.modalita === 'totale' ? 'totale' : 'caparra')
  const importo = tipo === 'caparra' ? caparra : k.totaleConExtra

  const [fase, setFase] = useState<'carta' | 'elaborazione' | 'verifica' | 'esito'>('carta')
  const [titolare, setTitolare] = useState(pr.cliente)
  const [numero, setNumero] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [cvv, setCvv] = useState('')
  const [tentato, setTentato] = useState(false)
  const [esito, setEsito] = useState<TentativoPagamento | null>(null)

  const cifre = soloCifre(numero)
  const brand = circuito(cifre)
  const errori = {
    titolare: !titolare.trim() ? t.errTitolare : undefined,
    numero: !luhn(cifre) ? t.errNumero : undefined,
    scadenza: !scadenzaOk(scadenza) ? t.errScadenza : undefined,
    cvv: !new RegExp(`^\\d{${brand === 'American Express' ? 4 : 3}}$`).test(cvv) ? t.errCvv : undefined,
  }
  const valida = !Object.values(errori).some(Boolean)

  const chiudi = (motivo?: keyof typeof MOTIVI) => {
    const tent: TentativoPagamento = {
      id: uid(), il: new Date().toISOString(), esito: motivo ? 'rifiutato' : 'autorizzato', importo, tipo,
      circuito: brand || 'Carta', ultime4: cifre.slice(-4), titolare: titolare.trim(),
      ...(motivo ? { motivo: MOTIVI[motivo].it } : { codiceAut: String(100000 + Math.floor(Math.random() * 900000)) }),
    }
    setEsito(tent); setFase('esito'); onEsito(tent)
  }
  const esitoProva = () => CARTE_PROVA.find((c) => soloCifre(c.numero).slice(-4) === cifre.slice(-4) && c.motivo)?.motivo

  const paga = () => {
    setTentato(true)
    if (!valida) return
    setFase('elaborazione')
  }
  // Elaborazione: il gateway risponde (carta rifiutata subito, altrimenti 3-D Secure).
  useEffect(() => {
    if (fase !== 'elaborazione') return
    const h = setTimeout(() => {
      const m = esitoProva()
      if (m === 'fondi' || m === 'scaduta') chiudi(m)
      else setFase('verifica')
    }, 1200)
    return () => clearTimeout(h)
  }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps

  const riprova = (nuovaCarta: boolean) => {
    setEsito(null); setFase('carta'); setTentato(false); setCvv('')
    if (nuovaCarta) { setNumero(''); setScadenza('') }
  }

  const fmtNumero = (v: string) => soloCifre(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
  const fmtScadenza = (v: string) => { const d = soloCifre(v).slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }
  const i = pr.proposte.findIndex((x) => x.id === q.id)

  return (
    <div className="pnexi">
      <div className="pnexi__bar">
        <span className="pnexi__secure"><i className="fa-solid fa-lock" aria-hidden="true" /> {t.sicuro}</span>
        <span className="pnexi__sandbox"><i className="fa-solid fa-flask" aria-hidden="true" /> {t.prova}</span>
      </div>

      <div className="pnexi__grid">
        <aside className="pnexi__sum">
          <span className="pnexi__merchant">{pr.struttura}</span>
          <h4>{t.riepilogo}</h4>
          <dl>
            <div><dt>{t.proposta} {LETTERE[i]}</dt><dd>{tr(lingua, q.titolo) || '—'}</dd></div>
            <div><dt>{t.totaleSoggiorno}</dt><dd>{eur(k.totaleConExtra)}</dd></div>
            <div className="is-tot"><dt>{t.paghiOra}</dt><dd>{eur(importo)}</dd></div>
          </dl>
          {tipo === 'caparra' && <p className="pnexi__note">{t.restante}: {eur(k.totaleConExtra - importo)}</p>}
          <span className="pnexi__ref">{pr.codice}</span>
        </aside>

        <section className="pnexi__main">
          {fase === 'carta' && (
            <>
              <h3>{t.titolo}</h3>
              {P.modalita === 'scelta' && (
                <RadioGroup name="pnexi-tipo" value={tipo} onChange={(v) => setTipo(v as 'caparra' | 'totale')}
                  options={[
                    { value: 'caparra', label: `${t.caparra} ${P.percentualeCaparra}% · ${eur(caparra)}` },
                    { value: 'totale', label: `${t.totale} · ${eur(k.totaleConExtra)}` },
                  ]} />
              )}
              <InputField name="pnexi-titolare" label={t.titolare} value={titolare} autoComplete="cc-name"
                onChange={(e) => setTitolare(e.target.value)} error={tentato ? errori.titolare : undefined} />
              <div className="pnexi__num">
                <InputField name="pnexi-numero" label={t.numero} value={numero} autoComplete="cc-number" placeholder="1234 5678 9012 3456"
                  onChange={(e) => setNumero(fmtNumero(e.target.value))} error={tentato ? errori.numero : undefined} />
                {brand && <span className="pnexi__brand">{brand}</span>}
              </div>
              <div className="pnexi__row">
                <InputField name="pnexi-scad" label={t.scadenza} value={scadenza} autoComplete="cc-exp" placeholder="MM/AA"
                  onChange={(e) => setScadenza(fmtScadenza(e.target.value))} error={tentato ? errori.scadenza : undefined} />
                <InputField name="pnexi-cvv" label={t.cvv} type="password" value={cvv} autoComplete="cc-csc" maxLength={4}
                  onChange={(e) => setCvv(soloCifre(e.target.value).slice(0, 4))} error={tentato ? errori.cvv : undefined} />
              </div>
              <div className="pnexi__acts">
                <button type="button" className="sib-btn sib-btn--secondary" onClick={onIndietro}>
                  <i className="fa-regular fa-arrow-left" aria-hidden="true" /> {t.indietro}
                </button>
                <button type="button" className="sib-btn sib-btn--primary" onClick={paga}>
                  <i className="fa-solid fa-lock" aria-hidden="true" /> {t.paga} {eur(importo)}
                </button>
              </div>
              <details className="pnexi__test">
                <summary>{t.provaCarte}</summary>
                <ul>
                  {CARTE_PROVA.map((c) => (
                    <li key={c.numero}>
                      <button type="button" className="pnexi__test-card" onClick={() => { setNumero(c.numero); setScadenza('12/30'); setCvv('123') }}>
                        <code>{c.numero}</code> <span>{c.esito}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}

          {fase === 'elaborazione' && (
            <div className="pnexi__wait"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {t.inElaborazione}</div>
          )}

          {fase === 'verifica' && (
            <div className="pnexi__tds">
              <span className="pnexi__tds-ico"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /></span>
              <h3>{t.verifica}</h3>
              <p>{t.verificaTesto}</p>
              <p className="pnexi__tds-amt">{eur(importo)} · {brand} •••• {cifre.slice(-4)}</p>
              <div className="pnexi__acts">
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => chiudi('annullato')}>{t.annulla}</button>
                <button type="button" className="sib-btn sib-btn--primary" onClick={() => chiudi(esitoProva() === 'tds' ? 'tds' : undefined)}>
                  <i className="fa-solid fa-check" aria-hidden="true" /> {t.confermaBanca}
                </button>
              </div>
            </div>
          )}

          {fase === 'esito' && esito && (
            esito.esito === 'autorizzato' ? (
              <div className="pnexi__esito is-ok">
                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                <h3>{t.okTitolo}</h3>
                <p>{t.okTesto}</p>
                <dl>
                  <div><dt>{t.paghiOra}</dt><dd>{eur(esito.importo)}</dd></div>
                  <div><dt>{esito.circuito}</dt><dd>•••• {esito.ultime4}</dd></div>
                  <div><dt>{t.codice}</dt><dd>{esito.codiceAut}</dd></div>
                </dl>
                <button type="button" className="sib-btn sib-btn--primary" onClick={onVediConferma}>
                  <i className="fa-regular fa-envelope-open" aria-hidden="true" /> {t.vediConferma}
                </button>
              </div>
            ) : (
              <div className="pnexi__esito is-ko">
                <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
                <h3>{t.koTitolo}</h3>
                <p>{motivoIn(esito.motivo ?? '', lingua)}</p>
                <div className="pnexi__acts">
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={onIndietro}>{t.tornaProposta}</button>
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => riprova(true)}>{t.altraCarta}</button>
                  <button type="button" className="sib-btn sib-btn--primary" onClick={() => riprova(false)}>
                    <i className="fa-regular fa-rotate-right" aria-hidden="true" /> {t.riprova}
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  )
}
