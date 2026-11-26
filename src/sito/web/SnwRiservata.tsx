import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../../core/components/Modal'
import Tooltip from '../../core/components/Tooltip'
import TruncatedText from '../../core/components/TruncatedText'
import BonificoIstruzioni from '../../core/components/BonificoIstruzioni'
import { DatePickerField, InputField, RadioGroup, SelectField } from '../../core/components/form'
import { useConfirmStore } from '../../store/useConfirmStore'
import { CATEGORIE, Categoria, OFFERTE, Offerta, eur, nomeCategoria, oggiIso, rigaDa, testoRiga, trova } from '../sitoData'
import { PROMO_B2B, SCONTO_OPERATORE, SOGGIORNI_RISERVATI, SoggiornoRiservato, prezzoOperatore } from '../sitoContenuti'
import { SezioneAccount, useSitoStore } from '../useSitoStore'
import { Ordine, RigaOrdine, STATI_RIGA, TIPI_AZIENDA, TipoAzienda, UtenteSito, statoRiga, useSaldo, useSitoAccountStore } from '../useSitoAccountStore'
import { SnwFoto, SnwSchede } from '../SnwUi'
import SnwCard from './SnwCard'
import SnwAvatarCampo from './SnwAvatarCampo'
import { NAZIONALITA } from './snwNazionalita'
import { loc, t } from '../i18n'
import './SnwRiservata.sass'

/**
 * Area riservata (utente collegato), con le voci del menu utente di
 * sibyllanetwork.com — Gestisci profilo, Ordini effettuati, Preferiti,
 * Portafoglio — più «Riservato operatori» per gli account Business:
 * tariffe nette, promozioni e soggiorni riservati (fam trip, educational,
 * site inspection), prenotabili a tariffa operatore.
 */
const VOCI: { id: SezioneAccount; nome: string; icona: string; soloBiz?: boolean }[] = [
  { id: 'operatori', nome: 'Riservato operatori', icona: 'fa-briefcase', soloBiz: true },
  { id: 'ordini', nome: 'Ordini effettuati', icona: 'fa-bag-shopping' },
  { id: 'portafoglio', nome: 'Portafoglio', icona: 'fa-wallet' },
  { id: 'preferiti', nome: 'Preferiti', icona: 'fa-heart' },
  { id: 'profilo', nome: 'Gestisci profilo', icona: 'fa-user-gear' },
]

/** Dettaglio di un movimento del portafoglio nella lingua corrente («Ordine SN-…», «Preventivo PRV-…», «Ricarica · …»). */
function dettaglioMov(d: string) {
  const m = /^(Ordine|Preventivo) (.+)$/.exec(d)
  if (m) return t(m[1] === 'Ordine' ? 'Ordine {n}' : 'Preventivo {n}', { n: m[2] })
  return t(d)
}

export const iniziali = (u: Pick<UtenteSito, 'nome' | 'cognome'>) => `${u.nome.charAt(0)}${u.cognome.charAt(0)}`.toUpperCase()

export default function SnwRiservata({ sez }: { sez?: SezioneAccount }) {
  const utente = useSitoAccountStore(s => s.utente)
  const esci = useSitoAccountStore(s => s.esci)
  const vai = useSitoStore(s => s.vai)
  const confirm = useConfirmStore(s => s.confirm)
  const biz = utente?.tipo === 'business'
  const attiva: SezioneAccount = sez ?? (biz ? 'operatori' : 'ordini')

  // Senza utente: all'accesso, poi di nuovo qui
  useEffect(() => { if (!utente) vai({ nome: 'accesso', poi: { nome: 'account', sez } }) }, [utente, vai, sez])
  if (!utente) return null

  async function logout() {
    if (await confirm({ title: t('Uscire dall\'area riservata?'), message: t('Il carrello resta salvato su questo dispositivo.'), confirmLabel: t('Esci'), cancelLabel: t('Annulla'), danger: false })) {
      esci()
      vai({ nome: 'home' })
    }
  }

  return (
    <div className="snw-ris">
      <header className="snw-ris__testa">
        <div className="snw__wrap snw-ris__testa-in">
          <span className="snw-ris__av">{utente.avatar ? <img src={utente.avatar} alt="" /> : iniziali(utente)}</span>
          <span className="snw-ris__saluto">
            <small>{t('Utente loggato')} · {biz ? `Business · ${utente.azienda ? t(utente.azienda.tipo) : ''}` : t('Privato')}</small>
            <b>{t('Ciao {nome} {cognome}', { nome: utente.nome, cognome: utente.cognome })}</b>
            {biz && utente.azienda && <span><i className="fa-solid fa-building" aria-hidden="true" /> {utente.azienda.ragione} · {t(utente.azienda.ruolo)}</span>}
          </span>
        </div>
      </header>

      <div className="snw__wrap snw-ris__layout">
        <nav className="snw-ris__menu" aria-label={t('Area riservata')}>
          {VOCI.filter(v => !v.soloBiz || biz).map(v => (
            <button key={v.id} type="button" aria-current={attiva === v.id ? 'page' : undefined}
              className={attiva === v.id ? 'snw-ris__voce snw-ris__voce--on' : 'snw-ris__voce'} onClick={() => vai({ nome: 'account', sez: v.id })}>
              <i className={`fa-light ${v.icona}`} aria-hidden="true" />{t(v.nome)}
            </button>
          ))}
          <span className="snw-ris__sep" />
          <button type="button" className="snw-ris__voce" onClick={() => vai({ nome: 'carrello' })}><i className="fa-light fa-cart-shopping" aria-hidden="true" />{t('Carrello')}</button>
          <button type="button" className="snw-ris__voce" onClick={() => vai({ nome: 'info', id: 'mission' })}><i className="fa-light fa-compass" aria-hidden="true" />{t('Mission')}</button>
          <button type="button" className="snw-ris__voce" onClick={() => vai({ nome: 'info', id: 'partner' })}><i className="fa-light fa-handshake" aria-hidden="true" />{t('Partner')}</button>
          <button type="button" className="snw-ris__voce snw-ris__voce--esci" onClick={logout}><i className="fa-light fa-right-from-bracket" aria-hidden="true" />{t('Esci')}</button>
        </nav>

        <section className="snw-ris__corpo">
          {attiva === 'operatori' && (biz ? <Operatori /> : <InvitoBusiness />)}
          {attiva === 'ordini' && <Ordini />}
          {attiva === 'portafoglio' && <Portafoglio />}
          {attiva === 'preferiti' && <Preferiti />}
          {attiva === 'profilo' && <Profilo />}
        </section>
      </div>
    </div>
  )
}

function Titolo({ tit, sotto, children }: { tit: string; sotto: string; children?: React.ReactNode }) {
  return (
    <header className="snw-ris__tit">
      <div><h1>{tit}</h1><p>{sotto}</p></div>
      {children}
    </header>
  )
}

// ═══ Riservato operatori ═══════════════════════════════════════════════════
type TabOp = 'tariffe' | 'promo' | 'soggiorni'

function Operatori() {
  const [tab, setTab] = useState<TabOp>('tariffe')
  const [promo, setPromo] = useState<string>('')
  const usa = (id: string) => { setPromo(id); setTab('tariffe') }
  return (
    <>
      <Titolo tit={t('Riservato operatori')} sotto={t('Tariffe nette, promozioni e soggiorni riservati agli operatori del settore della rete Sibylla.')} />
      <SnwSchede etichetta={t('Riservato operatori')} attiva={tab} onChange={setTab}
        voci={[['tariffe', t('Tariffe nette'), 'fa-tags'], ['promo', t('Promozioni'), 'fa-badge-percent'], ['soggiorni', t('Soggiorni riservati'), 'fa-hotel']] as const} />
      {tab === 'tariffe' && <Tariffe promo={promo} setPromo={setPromo} />}
      {tab === 'promo' && <Promozioni usa={usa} />}
      {tab === 'soggiorni' && <SoggiorniRiservati />}
    </>
  )
}

function Tariffe({ promo, setPromo }: { promo: string; setPromo: (v: string) => void }) {
  const [cat, setCat] = useState<Categoria | ''>('')
  const [scelta, setScelta] = useState<Offerta | null>(null)
  const p = PROMO_B2B.find(x => x.id === promo)
  const lista = OFFERTE.filter(o => (!cat || o.cat === cat) && (!p || p.offerte.includes(o.id)))
  return (
    <>
      <div className="snw-ris__filtri">
        <div className="snw-ris__chip" role="group" aria-label={t('Categoria')}>
          <button type="button" aria-pressed={!cat} className={!cat ? 'snw-ris__chip-on' : ''} onClick={() => setCat('')}>{t('Tutte')}</button>
          {CATEGORIE.map(c => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} className={cat === c.id ? 'snw-ris__chip-on' : ''} onClick={() => setCat(c.id)}>{t(c.nome)}</button>
          ))}
        </div>
        <SelectField name="b2b-promo" label={t('Promozione')} value={promo} onChange={e => setPromo(e.target.value)}
          options={[{ value: '', label: t('Nessuna') }, ...PROMO_B2B.map(x => ({ value: x.id, label: `${t(x.tit)} (−${x.extra}%)` }))]} />
      </div>
      <p className="snw-ris__nota"><i className="fa-solid fa-circle-info" aria-hidden="true" /> {t('Tariffa operatore = prezzo pubblico −{s}% soggiorni, −{e}% esperienze, −{p}% prodotti, −{v}% servizi', { s: SCONTO_OPERATORE.soggiorni, e: SCONTO_OPERATORE.esperienze, p: SCONTO_OPERATORE.prodotti, v: SCONTO_OPERATORE.servizi })}{p ? t(', più il {extra}% di «{tit}» (codice {codice})', { extra: p.extra, tit: t(p.tit), codice: p.codice }) : ''}.</p>
      <div className="sib-table-wrap snw-ris__tabella">
        <table className="sib-table">
          <colgroup><col className="snw-ris__c-off" /><col className="snw-ris__c-dove" /><col className="snw-ris__c-eur" /><col className="snw-ris__c-eur" /><col className="snw-ris__c-sc" /><col className="snw-ris__c-az" /></colgroup>
          <thead><tr><th>{t('Offerta')}</th><th>{t('Località')}</th><th className="snw-ris__num">{t('Pubblico')}</th><th className="snw-ris__num">{t('Operatore')}</th><th className="snw-ris__num">{t('Sconto')}</th><th /></tr></thead>
          <tbody>
            {lista.map(o => {
              const netto = prezzoOperatore(o, p?.extra ?? 0)
              return (
                <tr key={o.id}>
                  <td>
                    <span className="snw-ris__off">
                      <span className="snw-ris__mini"><SnwFoto id={o.foto[0]} w={120} h={120} alt="" /></span>
                      <span className="snw-ris__off-txt"><TruncatedText text={t(o.titolo)} /><small><TruncatedText text={`${t(nomeCategoria(o.cat))} · ${t(o.formula)}`} /></small></span>
                    </span>
                  </td>
                  <td><TruncatedText text={t(o.citta)} /></td>
                  <td className="snw-ris__num"><s>{eur(o.prezzo)}</s></td>
                  <td className="snw-ris__num"><b>{eur(netto)}</b><small> {t(o.unita)}</small></td>
                  <td className="snw-ris__num snw-ris__sconto">−{Math.round((1 - netto / o.prezzo) * 100)}%</td>
                  <td className="snw-ris__az">
                    <Tooltip text={t('Prenota a tariffa operatore')}>
                      <button type="button" className="sib-btn sib-btn--icon snw-ris__ico" aria-label={t('Prenota {titolo} a tariffa operatore', { titolo: t(o.titolo) })} onClick={() => setScelta(o)}>
                        <i className="fa-solid fa-cart-plus" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {scelta && <PrenotaB2B o={scelta} extra={p?.extra ?? 0} codice={p?.codice} onClose={() => setScelta(null)} />}
    </>
  )
}

function PrenotaB2B({ o, extra, codice, onClose }: { o: Offerta; extra: number; codice?: string; onClose: () => void }) {
  const aggiungi = useSitoStore(s => s.aggiungi)
  const soggiorno = o.cat === 'soggiorni'
  const prodotto = o.cat === 'prodotti'
  const [dal, setDal] = useState(oggiIso(30))
  const [al, setAl] = useState(oggiIso(33))
  const [orario, setOrario] = useState(o.orari?.[0] ?? '')
  const [qta, setQta] = useState(soggiorno ? 5 : prodotto ? 20 : 10)
  const netto = prezzoOperatore(o, extra)
  const ok = qta > 0 && (prodotto || (dal && (!soggiorno || al > dal)))

  function conferma() {
    const r = rigaDa(o, { qta, data: prodotto ? undefined : dal, dataFine: soggiorno ? al : undefined, orario: soggiorno || prodotto ? undefined : orario || undefined })
    const notti = soggiorno ? Math.max(1, Math.round((+new Date(al) - +new Date(dal)) / 86400000)) : 1
    aggiungi({ ...r, prezzo: netto * notti, b2b: true, codice: codice || undefined, dettaglio: codice ? t('{dettaglio} · tariffa operatore {codice}', { dettaglio: r.dettaglio, codice }) : t('{dettaglio} · tariffa operatore', { dettaglio: r.dettaglio }) })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={t('Prenota a tariffa operatore')} size="md">
      <div className="snw-ris__modale">
        <div className="snw-ris__modale-off">
          <span className="snw-ris__mini snw-ris__mini--grande"><SnwFoto id={o.foto[0]} w={200} h={200} alt="" /></span>
          <span><b>{t(o.titolo)}</b><small>{t(o.formula)} · {t(o.citta)}</small><span className="snw-ris__modale-eur"><s>{eur(o.prezzo)}</s> <b>{eur(netto)}</b> {t(o.unita)}</span></span>
        </div>
        <div className="snw-ris__modale-campi">
          {!prodotto && <DatePickerField name="b2b-dal" label={soggiorno ? t('Check-in') : t('Data')} value={dal} min={oggiIso(1)} onChange={e => setDal(e.target.value)} />}
          {soggiorno && <DatePickerField name="b2b-al" label={t('Check-out')} value={al} onChange={e => setAl(e.target.value)} error={al <= dal ? t('Dopo il check-in') : undefined} />}
          {!soggiorno && !prodotto && o.orari && (
            <SelectField name="b2b-ora" label={t('Orario')} value={orario} onChange={e => setOrario(e.target.value)} options={o.orari.map(h => ({ value: h, label: h }))} />
          )}
          <InputField name="b2b-qta" type="number" min={1} label={soggiorno ? t('Camere') : prodotto ? t('Pezzi') : o.unita === 'a persona' ? t('Persone') : t('Quantità')}
            value={qta} onChange={e => setQta(Math.max(0, Number(e.target.value) || 0))} />
        </div>
      </div>
      <div className="snw-ris__azioni">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>{t('Annulla')}</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!ok} onClick={conferma}><i className="fa-solid fa-cart-plus" aria-hidden="true" /> {t('Aggiungi al carrello')}</button>
      </div>
    </Modal>
  )
}

function Promozioni({ usa }: { usa: (id: string) => void }) {
  const giorni = (d: string) => Math.max(0, Math.round((+new Date(`${d}T12:00:00`) - Date.now()) / 86400000))
  return (
    <div className="snw-ris__promo">
      {PROMO_B2B.map(p => (
        <article key={p.id} className="snw-ris__promo-card">
          <header>
            <i className={`fa-light ${p.icona}`} aria-hidden="true" />
            <span><b>{t(p.tit)}</b><small>{t('Ancora {n} giorni · fino al {data}', { n: giorni(p.scadenza), data: new Date(`${p.scadenza}T12:00:00`).toLocaleDateString(loc(), { day: 'numeric', month: 'long' }) })}</small></span>
            <strong>−{p.extra}%</strong>
          </header>
          <p>{t(p.txt)}</p>
          <ul>{p.condizioni.map(c => <li key={c}><i className="fa-solid fa-check" aria-hidden="true" />{t(c)}</li>)}</ul>
          <footer>
            <span className="snw-ris__codice"><i className="fa-solid fa-ticket" aria-hidden="true" /> {p.codice}</span>
            <span className="snw-ris__promo-n">{t('{n} offerte', { n: p.offerte.length })}</span>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => usa(p.id)}>{t('Vedi le tariffe')} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
          </footer>
        </article>
      ))}
    </div>
  )
}

function SoggiorniRiservati() {
  const aggiungi = useSitoStore(s => s.aggiungi)
  const [presi, setPresi] = useState<string[]>([])
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(loc(), { day: 'numeric', month: 'short' })
  function prenota(s: SoggiornoRiservato) {
    aggiungi({ id: s.offerta, qta: 1, data: s.dal, dataFine: s.al, prezzo: s.prezzo, b2b: true, riservato: s.tipo, dettaglio: t('{tipo} · {dal} → {al} · 1 posto · riservato operatori', { tipo: t(s.tipo), dal: fmt(s.dal), al: fmt(s.al) }) })
    setPresi(x => [...x, s.id])
  }
  return (
    <div className="snw-ris__sogg">
      {SOGGIORNI_RISERVATI.map(s => {
        const o = trova(s.offerta)!
        const preso = presi.includes(s.id)
        return (
          <article key={s.id} className="snw-ris__sogg-card">
            <span className="snw-ris__sogg-foto">
              <SnwFoto id={o.foto[0]} w={700} h={460} alt="" />
              <span className="snw-ris__sogg-tipo"><i className="fa-solid fa-key" aria-hidden="true" /> {t(s.tipo)}</span>
            </span>
            <div className="snw-ris__sogg-txt">
              <small><i className="fa-solid fa-location-dot" aria-hidden="true" /> {t(s.luogo)}</small>
              <h3>{t(s.tit)}</h3>
              <span className="snw-ris__sogg-date"><i className="fa-regular fa-calendar" aria-hidden="true" /> {fmt(s.dal)} → {fmt(s.al)} · <b>{t('{n} posti', { n: s.posti - (preso ? 1 : 0) })}</b> {t('rimasti')}</span>
              <p>{t(s.txt)}</p>
              <ul>{s.include.map(i => <li key={i}><i className="fa-solid fa-check" aria-hidden="true" />{t(i)}</li>)}</ul>
              <footer>
                <span className="snw-ris__sogg-eur">{s.prezzo ? <><b>{eur(s.prezzo)}</b> {t('a persona')}</> : <b>{t('Gratuito')}</b>}</span>
                <button type="button" className="sib-btn sib-btn--primary" disabled={preso} onClick={() => prenota(s)}>
                  {preso ? <><i className="fa-solid fa-check" aria-hidden="true" /> {t('Nel carrello')}</> : t('Prenota il posto')}
                </button>
              </footer>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function InvitoBusiness() {
  const vai = useSitoStore(s => s.vai)
  return (
    <div className="snw-ris__vuoto">
      <i className="fa-light fa-briefcase" aria-hidden="true" />
      <b>{t('Riservato agli operatori del settore')}</b>
      <span>{t('Tariffe nette, promozioni e soggiorni riservati sono per hotel, tour operator, fornitori e ristoranti con un account Business.')}</span>
      <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'accesso', modo: 'registrati' })}>{t('Crea un account Business')}</button>
    </div>
  )
}

// ═══ Ordini effettuati ═════════════════════════════════════════════════════
const VUOTI: Record<Categoria, string> = {
  soggiorni: 'Non risultano soggiorni acquistati.',
  esperienze: 'Non risultano esperienze acquistate.',
  prodotti: 'Non risultano prodotti acquistati.',
  servizi: 'Non risultano servizi acquistati.',
}

function Ordini() {
  const utente = useSitoAccountStore(s => s.utente)!
  const tutti = useSitoAccountStore(s => s.ordini)
  const annulla = useSitoAccountStore(s => s.annullaRiga)
  const confirm = useConfirmStore(s => s.confirm)
  const vai = useSitoStore(s => s.vai)
  const [filtro, setFiltro] = useState<Categoria | ''>('')
  const [voucher, setVoucher] = useState<{ o: Ordine; r: RigaOrdine } | null>(null)
  const voci = useMemo(() => tutti.filter(o => o.email === utente.email)
    .flatMap(o => o.righe.map(r => ({ o, r, off: trova(r.id) })))
    .filter(x => x.off), [tutti, utente.email])

  async function annullaVoce(o: Ordine, r: RigaOrdine, titolo: string) {
    if (await confirm({ title: t('Annullare la prenotazione?'), message: t('«{titolo}» dell\'ordine {ordine}: il rimborso di {importo} torna sul metodo di pagamento entro 5-10 giorni lavorativi.', { titolo, ordine: o.id, importo: eur(r.prezzo * r.qta) }), confirmLabel: t('Annulla prenotazione'), cancelLabel: t('Mantieni'), danger: true })) {
      annulla(o.id, r.key)
    }
  }

  return (
    <>
      <Titolo tit={t('Ordini effettuati')} sotto={t('Ripercorri le tue emozioni di ieri, oggi e domani')} />
      <span className="snw-ris__etichetta">{t('Filtro ordini')}</span>
      <div className="snw-ris__chip" role="group" aria-label={t('Filtro ordini')}>
        <button type="button" aria-pressed={!filtro} className={!filtro ? 'snw-ris__chip-on' : ''} onClick={() => setFiltro('')}>{t('Tutti')}</button>
        {CATEGORIE.map(c => (
          <button key={c.id} type="button" aria-pressed={filtro === c.id} className={filtro === c.id ? 'snw-ris__chip-on' : ''} onClick={() => setFiltro(c.id)}>{t(c.nome)}</button>
        ))}
      </div>

      {CATEGORIE.filter(c => !filtro || c.id === filtro).map(c => {
        const lista = voci.filter(x => x.off!.cat === c.id)
        return (
          <section key={c.id} className="snw-ris__gruppo">
            <h2><i className={`fa-light ${c.icona}`} aria-hidden="true" />{t(c.nome)} <small>{t(lista.length === 1 ? '{n} elemento' : '{n} elementi', { n: lista.length })}</small></h2>
            {lista.length ? (
              <ul className="snw-ris__righe">
                {lista.map(({ o, r, off }) => {
                  const st = statoRiga(r, o.data)
                  const annullabile = st === 'in-programma' && off!.cancellazione
                  return (
                    <li key={r.key} className={st === 'annullato' ? 'snw-ris__riga snw-ris__riga--annullata' : 'snw-ris__riga'}>
                      <button type="button" className="snw-ris__riga-foto" onClick={() => vai({ nome: 'scheda', id: off!.id })} aria-label={t('Apri {titolo}', { titolo: t(off!.titolo) })}>
                        <SnwFoto id={off!.foto[0]} w={200} h={200} alt="" />
                      </button>
                      <span className="snw-ris__riga-txt">
                        <b>{t(off!.titolo)}</b>
                        <small>{testoRiga(r)}</small>
                        <span className="snw-ris__riga-meta">
                          <span className={`snw-ris__stato snw-ris__stato--${st}`}><i className={`fa-solid ${STATI_RIGA[st].icona}`} aria-hidden="true" /> {t(STATI_RIGA[st].nome)}</span>
                          <span>{t('Ordine {n}', { n: o.id })} · {new Date(`${o.data}T12:00:00`).toLocaleDateString(loc())}</span>
                          {r.b2b && <span className="snw-ris__b2b"><i className="fa-solid fa-briefcase" aria-hidden="true" /> {t('Tariffa operatore')}</span>}
                        </span>
                      </span>
                      <b className="snw-ris__riga-eur">{eur(r.prezzo * r.qta)}</b>
                      <span className="snw-ris__riga-az">
                        {c.id !== 'prodotti' && st !== 'annullato' && (
                          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setVoucher({ o, r })}><i className="fa-solid fa-qrcode" aria-hidden="true" /> {t('Voucher')}</button>
                        )}
                        {annullabile && (
                          <button type="button" className="sib-btn sib-btn--ghost snw-ris__annulla" onClick={() => annullaVoce(o, r, t(off!.titolo))}>{t('Annulla')}</button>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="snw-ris__nessuno">{t(VUOTI[c.id])}</p>}
          </section>
        )
      })}
      {voucher && <Voucher o={voucher.o} r={voucher.r} onClose={() => setVoucher(null)} />}
    </>
  )
}

/** QR dimostrativo: griglia deterministica dal codice (non leggibile da uno scanner). */
function QrFinto({ seme }: { seme: string }) {
  const n = 25
  let h = 0
  for (const ch of seme) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const celle: [number, number][] = []
  const angolo = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (angolo(x, y)) continue
    h = (h * 1103515245 + 12345) >>> 0
    if ((h >>> 16) & 1) celle.push([x, y])
  }
  const occhio = (x: number, y: number) => (
    <g key={`${x}-${y}`}><rect x={x} y={y} width={7} height={7} /><rect x={x + 1} y={y + 1} width={5} height={5} className="snw-ris__qr-bianco" /><rect x={x + 2} y={y + 2} width={3} height={3} /></g>
  )
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="snw-ris__qr" role="img" aria-label={t('Codice QR del voucher')}>
      <rect x={-1} y={-1} width={n + 2} height={n + 2} className="snw-ris__qr-bianco" />
      {celle.map(([x, y]) => <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} />)}
      {occhio(0, 0)}{occhio(n - 7, 0)}{occhio(0, n - 7)}
    </svg>
  )
}

function Voucher({ o, r, onClose }: { o: Ordine; r: RigaOrdine; onClose: () => void }) {
  const off = trova(r.id)!
  const codice = `${o.id}-${r.key.slice(0, 4).toUpperCase()}`
  return (
    <Modal open onClose={onClose} title={t('Voucher')} size="sm">
      <div className="snw-ris__voucher">
        <QrFinto seme={codice} />
        <b>{t(off.titolo)}</b>
        <span>{testoRiga(r)}</span>
        <dl>
          <div><dt>{t('Codice')}</dt><dd>{codice}</dd></div>
          <div><dt>{t('Partner')}</dt><dd>{off.partner}</dd></div>
          {off.incontro && <div><dt>{t('Punto d\'incontro')}</dt><dd>{t(off.incontro)}</dd></div>}
        </dl>
        <small>{t('Mostra il QR all\'arrivo. Il booking Sibylla risponde al +39 06 91714070.')}</small>
      </div>
      <div className="snw-ris__azioni">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}><i className="fa-solid fa-print" aria-hidden="true" /> {t('Stampa')}</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>{t('Chiudi')}</button>
      </div>
    </Modal>
  )
}

// ═══ Portafoglio ══════════════════════════════════════════════════════════
const IMPORTI = [10, 20, 50, 100, 150]

function Portafoglio() {
  const utente = useSitoAccountStore(s => s.utente)!
  const tutti = useSitoAccountStore(s => s.movimenti)
  const ricarica = useSitoAccountStore(s => s.ricarica)
  const saldo = useSaldo()
  const [importo, setImporto] = useState<number | 'altro'>(50)
  const [altro, setAltro] = useState('')
  const [metodo, setMetodo] = useState('carta')
  const [bonifico, setBonifico] = useState<{ codice: string; importo: number } | null>(null)
  const [aperto, setAperto] = useState<string | null>(null)
  const movimenti = tutti.filter(m => m.email === utente.email)
  const valore = importo === 'altro' ? Number(altro.replace(',', '.')) || 0 : importo

  function vai() {
    if (valore < 5) return
    if (metodo === 'carta') { ricarica(valore, 'Ricarica · carta di credito'); return }
    setBonifico({ codice: `WLT-${Math.floor(Math.random() * 900000 + 100000)}`, importo: valore })
  }
  const giorniFa = (d: string) => Math.round((Date.now() - +new Date(`${d}T12:00:00`)) / 86400000)

  return (
    <>
      <Titolo tit={t('Il tuo portafoglio digitale')} sotto={t('Ricarica, utilizza, controlla')} />
      <p className="snw-ris__intro">{t('Con il tuo Sibylla Wallet puoi ricaricare il portafoglio digitale, usare i token per acquistare servizi e prodotti nel network e tenere traccia in tempo reale del saldo e delle transazioni.')}</p>
      <div className="snw-ris__wallet">
        <div className="snw-ris__box">
          <h2>{t('Ricarica il tuo account')}</h2>
          <p className="snw-ris__box-sotto">{t('Scegli l\'importo e il metodo di pagamento.')}</p>
          <span className="snw-ris__etichetta">{t('Scegli l\'importo da ricaricare')}</span>
          <div className="snw-ris__importi" role="radiogroup" aria-label={t('Importo')}>
            {IMPORTI.map(i => (
              <button key={i} type="button" role="radio" aria-checked={importo === i} className={importo === i ? 'snw-ris__importo-on' : ''} onClick={() => setImporto(i)}>{i}€</button>
            ))}
            <button type="button" role="radio" aria-checked={importo === 'altro'} className={importo === 'altro' ? 'snw-ris__importo-on' : ''} onClick={() => setImporto('altro')}>{t('Altro')}</button>
          </div>
          {importo === 'altro' && (
            <InputField name="w-altro" type="number" min={5} label={t('Importo (€)')} value={altro} onChange={e => setAltro(e.target.value)}
              error={altro && valore < 5 ? t('Minimo 5 €') : undefined} />
          )}
          <RadioGroup name="w-metodo" label={t('Metodo di pagamento')} value={metodo} onChange={setMetodo}
            options={[{ value: 'carta', label: t('Carta di credito · pagamento immediato') }, { value: 'bonifico', label: t('Bonifico · istruzioni via e-mail') }]} />
          <button type="button" className="sib-btn sib-btn--primary snw-ris__largo" disabled={valore < 5} onClick={vai}>{t('Ricarica')} {valore >= 5 ? eur(valore) : ''}</button>
        </div>
        <div className="snw-ris__box">
          <div className="snw-ris__saldo">
            <span className="snw-ris__etichetta">{t('Saldo attuale')}</span>
            <b>{eur(saldo)}</b>
            <span>{t('Hai {importo} in Sibylla Token', { importo: eur(saldo) })}</span>
            <small>1 token = 1 €</small>
          </div>
          <h3 className="snw-ris__mov-tit">{t('Storico dei movimenti')} <small>{t(movimenti.length === 1 ? '{n} movimento' : '{n} movimenti', { n: movimenti.length })}</small></h3>
          <ul className="snw-ris__mov">
            {movimenti.map(m => (
              <li key={m.id}>
                <button type="button" aria-expanded={aperto === m.id} onClick={() => setAperto(aperto === m.id ? null : m.id)}>
                  <span><b>{new Date(`${m.data}T12:00:00`).toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric' })}</b><small> · {giorniFa(m.data) === 0 ? t('oggi') : t('{n} giorni fa', { n: giorniFa(m.data) })}</small></span>
                  <b className={m.importo >= 0 ? 'snw-ris__piu' : 'snw-ris__meno'}>{m.importo >= 0 ? '+' : '−'}{eur(Math.abs(m.importo))}</b>
                  <i className={`fa-solid fa-chevron-${aperto === m.id ? 'up' : 'down'}`} aria-hidden="true" />
                </button>
                {aperto === m.id && <p>{t('Dettagli operazione: {dettaglio}', { dettaglio: dettaglioMov(m.dettaglio) })}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {bonifico && (
        <Modal open onClose={() => setBonifico(null)} title={t('Ricarica con bonifico')} size="md">
          <div className="snw-ris__modale">
            <BonificoIstruzioni codice={bonifico.codice} importo={eur(bonifico.importo)} tr={s => t(s)} />
            <p className="snw-ris__nota">{t('I token arrivano sul portafoglio quando il bonifico è accreditato (1-2 giorni lavorativi). Ti abbiamo mandato le stesse istruzioni via e-mail.')}</p>
          </div>
          <div className="snw-ris__azioni"><button type="button" className="sib-btn sib-btn--primary" onClick={() => setBonifico(null)}>{t('Ho capito')}</button></div>
        </Modal>
      )}
    </>
  )
}

// ═══ Preferiti ════════════════════════════════════════════════════════════
function Preferiti() {
  const preferiti = useSitoStore(s => s.preferiti)
  const vai = useSitoStore(s => s.vai)
  const lista = OFFERTE.filter(o => preferiti.includes(o.id))
  return (
    <>
      <Titolo tit={t('Preferiti')} sotto={lista.length ? t(lista.length === 1 ? '{n} offerta salvata' : '{n} offerte salvate', { n: lista.length }) : t('Tocca il cuore su una card per salvarla qui.')} />
      {lista.length ? <div className="snw-ris__pref">{lista.map(o => <SnwCard key={o.id} o={o} />)}</div> : (
        <div className="snw-ris__vuoto">
          <i className="fa-light fa-heart" aria-hidden="true" />
          <b>{t('Ancora nessun preferito')}</b>
          <span>{t('Salva soggiorni, esperienze e prodotti per ritrovarli e prenotarli quando vuoi.')}</span>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'catalogo' })}>{t('Esplora le offerte')}</button>
        </div>
      )}
    </>
  )
}

// ═══ Gestisci profilo ═════════════════════════════════════════════════════
function Profilo() {
  const utente = useSitoAccountStore(s => s.utente)!
  const salva = useSitoAccountStore(s => s.salvaUtente)
  const biz = utente.tipo === 'business'
  const [tab, setTab] = useState<'account' | 'azienda'>('account')
  const [u, setU] = useState(utente)
  const [salvato, setSalvato] = useState(false)
  const set = (k: keyof UtenteSito, v: string) => { setU(x => ({ ...x, [k]: v })); setSalvato(false) }
  const setAz = (k: string, v: string) => { setU(x => ({ ...x, azienda: { ...x.azienda!, [k]: v } })); setSalvato(false) }
  const modificato = JSON.stringify(u) !== JSON.stringify(utente)

  return (
    <>
      <Titolo tit={t('Gestione profilo')} sotto={t('Aggiorna i tuoi dati personali')} />
      <div className="snw-ris__profilo">
        <div className="snw-ris__box snw-ris__box--avatar">
          <SnwAvatarCampo compatto valore={u.avatar} onChange={v => { setU(x => ({ ...x, avatar: v })); salva({ avatar: v }) }} />
        </div>
        <form className="snw-ris__box" onSubmit={e => { e.preventDefault(); salva(u); setSalvato(true) }}>
          <SnwSchede piccola etichetta={t('Profilo')} attiva={tab} onChange={setTab}
            voci={[['account', t('Impostazioni account')] as const, ...(biz ? [['azienda', t('Dati aziendali')] as const] : [])]} />
          {tab === 'account' ? (
            <div className="snw-ris__griglia">
              <InputField name="p-nome" label={t('Nome')} value={u.nome} onChange={e => set('nome', e.target.value)} />
              <InputField name="p-cognome" label={t('Cognome')} value={u.cognome} onChange={e => set('cognome', e.target.value)} />
              <InputField name="p-mail" type="email" label={t('E-mail')} value={u.email} readOnly hint={t('Per cambiarla scrivi al booking')} />
              <InputField name="p-tel" type="tel" label={t('Telefono')} value={u.tel} onChange={e => set('tel', e.target.value)} />
              <DatePickerField name="p-nascita" label={t('Data di nascita')} value={u.nascita} onChange={e => set('nascita', e.target.value)} />
              <SelectField name="p-naz" label={t('Nazionalità')} value={u.nazionalita} placeholder={t('Seleziona nazionalità')} onChange={e => set('nazionalita', e.target.value)}
                options={NAZIONALITA.map(n => ({ value: n, label: t(n) }))} />
              <div className="snw-ris__largo"><InputField name="p-ind" label={t('Indirizzo')} value={u.indirizzo} onChange={e => set('indirizzo', e.target.value)} /></div>
            </div>
          ) : u.azienda && (
            <div className="snw-ris__griglia">
              <InputField name="z-rag" label={t('Ragione Sociale')} value={u.azienda.ragione} onChange={e => setAz('ragione', e.target.value)} />
              <InputField name="z-piva" label={t('Partita IVA')} value={u.azienda.piva} readOnly hint={t('Per cambiarla scrivi al booking')} />
              <InputField name="z-cf" label={t('Codice Fiscale Aziendale')} value={u.azienda.cf} onChange={e => setAz('cf', e.target.value)} />
              <SelectField name="z-tipo" label={t('Tipo di azienda')} value={u.azienda.tipo} onChange={e => setAz('tipo', e.target.value as TipoAzienda)}
                options={TIPI_AZIENDA.map(x => ({ value: x, label: t(x) }))} />
              <InputField name="z-tel" type="tel" label={t('Telefono aziendale')} value={u.azienda.tel} onChange={e => setAz('tel', e.target.value)} />
              <InputField name="z-mail" type="email" label={t('Email aziendale')} value={u.azienda.email} onChange={e => setAz('email', e.target.value)} />
              <InputField name="z-ind" label={t('Indirizzo aziendale')} value={u.azienda.indirizzo} onChange={e => setAz('indirizzo', e.target.value)} />
              <InputField name="z-ruolo" label={t('Ruolo aziendale')} value={u.azienda.ruolo} onChange={e => setAz('ruolo', e.target.value)} />
            </div>
          )}
          <footer className="snw-ris__salva">
            {salvato && <span><i className="fa-solid fa-circle-check" aria-hidden="true" /> {t('Modifiche salvate')}</span>}
            <button type="submit" className="sib-btn sib-btn--primary" disabled={!modificato}>{t('Modifica')}</button>
          </footer>
        </form>
      </div>
    </>
  )
}
