import React from 'react'
import { InputField, RadioGroup } from '../core/components/form'
import { Offerta, eur, foto } from './sitoData'
import { useSaldo, useSitoAccountStore } from './useSitoAccountStore'
import { loc, t } from './i18n'
import './SnwUi.sass'

/** Componenti minimi condivisi fra Sito web e Totem. */

export function SnwLogo({ chiaro }: { chiaro?: boolean }) {
  return (
    <span className={`snw-logo ${chiaro ? 'snw-logo--chiaro' : ''}`}>
      <span className="snw-logo__key" aria-hidden="true" />
      <span className="snw-logo__word"><b>Sibylla</b> Network</span>
    </span>
  )
}

export function SnwFoto({ id, w, h, alt, className }: { id: string; w?: number; h?: number; alt: string; className?: string }) {
  return <img src={foto(id, w, h)} alt={alt} loading="lazy" className={`snw-foto ${className ?? ''}`} />
}

export function SnwVoto({ o, compatto }: { o: Pick<Offerta, 'voto' | 'recensioni'>; compatto?: boolean }) {
  return (
    <span className="snw-voto">
      <i className="fa-solid fa-star" aria-hidden="true" />
      <b>{o.voto.toLocaleString(loc(), { minimumFractionDigits: 1 })}</b>
      <span>{compatto ? `(${o.recensioni})` : `· ${t('{n} recensioni', { n: o.recensioni.toLocaleString(loc()) })}`}</span>
    </span>
  )
}

export function SnwPrezzo({ o, grande }: { o: Offerta; grande?: boolean }) {
  return (
    <span className={`snw-prezzo ${grande ? 'snw-prezzo--grande' : ''}`}>
      {o.daPrezzo && <span className="snw-prezzo__da">{t('da')}</span>}
      {o.prezzoPieno && <s className="snw-prezzo__pieno">{eur(o.prezzoPieno)}</s>}
      <b className={o.prezzoPieno ? 'snw-prezzo__val snw-prezzo__val--offerta' : 'snw-prezzo__val'}>{eur(o.prezzo)}</b>
      <span className="snw-prezzo__unita">{t(o.unita)}</span>
    </span>
  )
}

const ICONA_ETICHETTA: Record<string, string> = {
  'Più scelto': 'fa-fire',
  'Novità': 'fa-sparkles',
  'Offerta': 'fa-tag',
  'Solo su Network': 'fa-key',
}

/** Etichetta sulla foto: targhetta squadrata (mai pillola), icona + testo. */
export function SnwEtichetta({ testo }: { testo?: string }) {
  if (!testo) return null
  return (
    <span className={`snw-etichetta snw-etichetta--${testo === 'Offerta' ? 'offerta' : 'std'}`}>
      <i className={`fa-solid ${ICONA_ETICHETTA[testo] ?? 'fa-circle'}`} aria-hidden="true" />{t(testo)}
    </span>
  )
}

export function SnwStepper({ valore, onChange, min = 1, max = 20, etichetta, grande }: {
  valore: number; onChange: (v: number) => void; min?: number; max?: number; etichetta: string; grande?: boolean
}) {
  return (
    <span className={`snw-stepper ${grande ? 'snw-stepper--grande' : ''}`} role="group" aria-label={t(etichetta)}>
      <button type="button" aria-label={t('Diminuisci {cosa}', { cosa: t(etichetta) })} disabled={valore <= min} onClick={() => onChange(valore - 1)}>
        <i className="fa-solid fa-minus" />
      </button>
      <output aria-live="polite">{valore}</output>
      <button type="button" aria-label={t('Aumenta {cosa}', { cosa: t(etichetta) })} disabled={valore >= max} onClick={() => onChange(valore + 1)}>
        <i className="fa-solid fa-plus" />
      </button>
    </span>
  )
}

/**
 * Esito o stato vuoto a centro pagina: icona grande, titolo, testo e azioni.
 * Usato da conferma ordine, carrello vuoto, preventivo, richieste e reset password.
 */
export function SnwEsito({ icona, titolo, livello = 'h2', children, azioni, variante }: {
  icona: string; titolo: string; livello?: 'h1' | 'h2'; children?: React.ReactNode; azioni?: React.ReactNode
  /** riquadro: su scheda bordata; compatto: dentro una scheda già esistente */
  variante?: 'riquadro' | 'compatto'
}) {
  const H = livello
  return (
    <div className={`snw-esito ${variante ? `snw-esito--${variante}` : ''}`}>
      <i className={`fa-light ${icona}`} aria-hidden="true" />
      <H>{titolo}</H>
      {children && <p>{children}</p>}
      {azioni && <div className="snw-esito__azioni">{azioni}</div>}
    </div>
  )
}

/** Riepilogo importi: righe (lo sconto in verde, preceduto dal meno) e totale in evidenza. */
export function SnwTotali({ righe, totale, className }: {
  righe: { tit: string; val: number | string; sconto?: boolean }[]; totale: number; className?: string
}) {
  return (
    <dl className={`snw-totali ${className ?? ''}`}>
      {righe.map(r => (
        <div key={r.tit} className={r.sconto ? 'snw-totali__sconto' : undefined}>
          <dt>{t(r.tit)}</dt><dd>{typeof r.val === 'number' ? `${r.sconto ? '−' : ''}${eur(r.val)}` : t(r.val)}</dd>
        </div>
      ))}
      <div className="snw-totali__totale"><dt>{t('Totale')}</dt><dd>{eur(totale)}</dd></div>
    </dl>
  )
}

/**
 * Metodo di pagamento: carta (con i campi, se richiesti), wallet digitali e,
 * per chi ha fatto l'accesso, i Sibylla Token del portafoglio (disattivati se
 * il saldo non basta).
 */
export function SnwPagamento({ nome, valore, onChange, totale, wallet, campiCarta, intestatario, verticale }: {
  nome: string; valore: string; onChange: (v: string) => void; totale: number
  wallet?: boolean; campiCarta?: boolean; intestatario?: string; verticale?: boolean
}) {
  const utente = useSitoAccountStore(s => s.utente)
  const saldo = useSaldo()
  const options = [
    { value: 'carta', label: t('Carta di credito o debito') },
    ...(wallet ? [{ value: 'paypal', label: 'PayPal' }, { value: 'apple', label: 'Apple Pay' }] : []),
    ...(utente ? [{ value: 'token', label: `${t('Sibylla Token · saldo {saldo}', { saldo: eur(saldo) })}${saldo < totale ? ` ${t('(non sufficiente)')}` : ''}`, disabled: saldo < totale }] : []),
  ]
  return (
    <div className="snw-pag">
      <RadioGroup name={nome} label={t('Metodo di pagamento')} value={valore} onChange={onChange} options={options} verticale={verticale} />
      {campiCarta && valore === 'carta' && (
        <div className="snw-pag__carta">
          <InputField name={`${nome}-intestatario`} label={t('Intestatario')} defaultValue={intestatario} />
          <InputField name={`${nome}-numero`} label={t('Numero carta')} iconLeft="fa-regular fa-credit-card" placeholder="1234 5678 9012 3456" />
          <InputField name={`${nome}-scadenza`} label={t('Scadenza')} placeholder={t('MM/AA')} />
          <InputField name={`${nome}-cvv`} label="CVV" placeholder="123" maxLength={4} />
        </div>
      )}
      <p className="snw-pag__nota"><i className="fa-solid fa-lock" aria-hidden="true" /> {t('Pagamento protetto con 3-D Secure. Demo: nessun addebito reale.')}</p>
    </div>
  )
}

/** Barra a schede con filo colorato sotto la scheda attiva. */
export function SnwSchede<T extends string>({ voci, attiva, onChange, etichetta, piccola }: {
  voci: readonly (readonly [T, string, string?])[]; attiva: T; onChange: (v: T) => void; etichetta: string; piccola?: boolean
}) {
  return (
    <div className={`snw-schede ${piccola ? 'snw-schede--piccola' : ''}`} role="tablist" aria-label={t(etichetta)}>
      {voci.map(([id, nome, icona]) => (
        <button key={id} type="button" role="tab" aria-selected={attiva === id} className={attiva === id ? 'snw-schede__on' : ''} onClick={() => onChange(id)}>
          {icona && <i className={`fa-light ${icona}`} aria-hidden="true" />}{t(nome)}
        </button>
      ))}
    </div>
  )
}
