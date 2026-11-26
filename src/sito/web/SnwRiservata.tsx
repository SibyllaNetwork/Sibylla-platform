import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../../core/components/Modal'
import Tooltip from '../../core/components/Tooltip'
import TruncatedText from '../../core/components/TruncatedText'
import BonificoIstruzioni from '../../core/components/BonificoIstruzioni'
import { DatePickerField, InputField, RadioGroup, SelectField } from '../../core/components/form'
import { useConfirmStore } from '../../store/useConfirmStore'
import { CATEGORIE, Categoria, OFFERTE, Offerta, eur, nomeCategoria, oggiIso, rigaDa, trova } from '../sitoData'
import { PROMO_B2B, SCONTO_OPERATORE, SOGGIORNI_RISERVATI, SoggiornoRiservato, prezzoOperatore } from '../sitoContenuti'
import { SezioneAccount, useSitoStore } from '../useSitoStore'
import { Ordine, RigaOrdine, STATI_RIGA, TIPI_AZIENDA, TipoAzienda, UtenteSito, statoRiga, useSaldo, useSitoAccountStore } from '../useSitoAccountStore'
import { SnwFoto } from '../SnwUi'
import SnwCard from './SnwCard'
import SnwAvatarCampo from './SnwAvatarCampo'
import { NAZIONALITA } from './snwNazionalita'
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
    if (await confirm({ title: 'Uscire dall\'area riservata?', message: 'Il carrello resta salvato su questo dispositivo.', confirmLabel: 'Esci', danger: false })) {
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
            <small>Utente loggato · {biz ? `Business · ${utente.azienda?.tipo ?? ''}` : 'Privato'}</small>
            <b>Ciao {utente.nome} {utente.cognome}</b>
            {biz && utente.azienda && <span><i className="fa-solid fa-building" aria-hidden="true" /> {utente.azienda.ragione} · {utente.azienda.ruolo}</span>}
          </span>
        </div>
      </header>

      <div className="snw__wrap snw-ris__layout">
        <nav className="snw-ris__menu" aria-label="Area riservata">
          {VOCI.filter(v => !v.soloBiz || biz).map(v => (
            <button key={v.id} type="button" aria-current={attiva === v.id ? 'page' : undefined}
              className={attiva === v.id ? 'snw-ris__voce snw-ris__voce--on' : 'snw-ris__voce'} onClick={() => vai({ nome: 'account', sez: v.id })}>
              <i className={`fa-light ${v.icona}`} aria-hidden="true" />{v.nome}
            </button>
          ))}
          <span className="snw-ris__sep" />
          <button type="button" className="snw-ris__voce" onClick={() => vai({ nome: 'carrello' })}><i className="fa-light fa-cart-shopping" aria-hidden="true" />Carrello</button>
          <button type="button" className="snw-ris__voce" onClick={() => vai({ nome: 'info', id: 'mission' })}><i className="fa-light fa-compass" aria-hidden="true" />Mission</button>
          <button type="button" className="snw-ris__voce" onClick={() => vai({ nome: 'info', id: 'partner' })}><i className="fa-light fa-handshake" aria-hidden="true" />Partner</button>
          <button type="button" className="snw-ris__voce snw-ris__voce--esci" onClick={logout}><i className="fa-light fa-right-from-bracket" aria-hidden="true" />Esci</button>
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
      <Titolo tit="Riservato operatori" sotto="Tariffe nette, promozioni e soggiorni riservati agli operatori del settore della rete Sibylla." />
      <div className="snw-ris__tab" role="tablist" aria-label="Riservato operatori">
        {([['tariffe', 'Tariffe nette', 'fa-tags'], ['promo', 'Promozioni', 'fa-badge-percent'], ['soggiorni', 'Soggiorni riservati', 'fa-hotel']] as const).map(([id, nome, ic]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'snw-ris__tab-on' : ''} onClick={() => setTab(id)}>
            <i className={`fa-light ${ic}`} aria-hidden="true" />{nome}
          </button>
        ))}
      </div>
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
        <div className="snw-ris__chip" role="group" aria-label="Categoria">
          <button type="button" aria-pressed={!cat} className={!cat ? 'snw-ris__chip-on' : ''} onClick={() => setCat('')}>Tutte</button>
          {CATEGORIE.map(c => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} className={cat === c.id ? 'snw-ris__chip-on' : ''} onClick={() => setCat(c.id)}>{c.nome}</button>
          ))}
        </div>
        <SelectField name="b2b-promo" label="Promozione" value={promo} onChange={e => setPromo(e.target.value)}
          options={[{ value: '', label: 'Nessuna' }, ...PROMO_B2B.map(x => ({ value: x.id, label: `${x.tit} (−${x.extra}%)` }))]} />
      </div>
      <p className="snw-ris__nota"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Tariffa operatore = prezzo pubblico −{SCONTO_OPERATORE.soggiorni}% soggiorni, −{SCONTO_OPERATORE.esperienze}% esperienze, −{SCONTO_OPERATORE.prodotti}% prodotti, −{SCONTO_OPERATORE.servizi}% servizi{p ? `, più il ${p.extra}% di «${p.tit}» (codice ${p.codice})` : ''}.</p>
      <div className="sib-table-wrap snw-ris__tabella">
        <table className="sib-table">
          <colgroup><col className="snw-ris__c-off" /><col className="snw-ris__c-dove" /><col className="snw-ris__c-eur" /><col className="snw-ris__c-eur" /><col className="snw-ris__c-sc" /><col className="snw-ris__c-az" /></colgroup>
          <thead><tr><th>Offerta</th><th>Località</th><th className="snw-ris__num">Pubblico</th><th className="snw-ris__num">Operatore</th><th className="snw-ris__num">Sconto</th><th /></tr></thead>
          <tbody>
            {lista.map(o => {
              const netto = prezzoOperatore(o, p?.extra ?? 0)
              return (
                <tr key={o.id}>
                  <td>
                    <span className="snw-ris__off">
                      <span className="snw-ris__mini"><SnwFoto id={o.foto[0]} w={120} h={120} alt="" /></span>
                      <span className="snw-ris__off-txt"><TruncatedText text={o.titolo} /><small><TruncatedText text={`${nomeCategoria(o.cat)} · ${o.formula}`} /></small></span>
                    </span>
                  </td>
                  <td><TruncatedText text={o.citta} /></td>
                  <td className="snw-ris__num"><s>{eur(o.prezzo)}</s></td>
                  <td className="snw-ris__num"><b>{eur(netto)}</b><small> {o.unita}</small></td>
                  <td className="snw-ris__num snw-ris__sconto">−{Math.round((1 - netto / o.prezzo) * 100)}%</td>
                  <td className="snw-ris__az">
                    <Tooltip text="Prenota a tariffa operatore">
                      <button type="button" className="sib-btn sib-btn--icon snw-ris__ico" aria-label={`Prenota ${o.titolo} a tariffa operatore`} onClick={() => setScelta(o)}>
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
    aggiungi({ ...r, prezzo: netto * notti, b2b: true, dettaglio: `${r.dettaglio} · tariffa operatore${codice ? ` ${codice}` : ''}` })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Prenota a tariffa operatore" size="md">
      <div className="snw-ris__modale">
        <div className="snw-ris__modale-off">
          <span className="snw-ris__mini snw-ris__mini--grande"><SnwFoto id={o.foto[0]} w={200} h={200} alt="" /></span>
          <span><b>{o.titolo}</b><small>{o.formula} · {o.citta}</small><span className="snw-ris__modale-eur"><s>{eur(o.prezzo)}</s> <b>{eur(netto)}</b> {o.unita}</span></span>
        </div>
        <div className="snw-ris__modale-campi">
          {!prodotto && <DatePickerField name="b2b-dal" label={soggiorno ? 'Check-in' : 'Data'} value={dal} min={oggiIso(1)} onChange={e => setDal(e.target.value)} />}
          {soggiorno && <DatePickerField name="b2b-al" label="Check-out" value={al} onChange={e => setAl(e.target.value)} error={al <= dal ? 'Dopo il check-in' : undefined} />}
          {!soggiorno && !prodotto && o.orari && (
            <SelectField name="b2b-ora" label="Orario" value={orario} onChange={e => setOrario(e.target.value)} options={o.orari.map(h => ({ value: h, label: h }))} />
          )}
          <InputField name="b2b-qta" type="number" min={1} label={soggiorno ? 'Camere' : prodotto ? 'Pezzi' : o.unita === 'a persona' ? 'Persone' : 'Quantità'}
            value={qta} onChange={e => setQta(Math.max(0, Number(e.target.value) || 0))} />
        </div>
      </div>
      <div className="snw-ris__azioni">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!ok} onClick={conferma}><i className="fa-solid fa-cart-plus" aria-hidden="true" /> Aggiungi al carrello</button>
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
            <span><b>{p.tit}</b><small>Ancora {giorni(p.scadenza)} giorni · fino al {new Date(`${p.scadenza}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</small></span>
            <strong>−{p.extra}%</strong>
          </header>
          <p>{p.txt}</p>
          <ul>{p.condizioni.map(c => <li key={c}><i className="fa-solid fa-check" aria-hidden="true" />{c}</li>)}</ul>
          <footer>
            <span className="snw-ris__codice"><i className="fa-solid fa-ticket" aria-hidden="true" /> {p.codice}</span>
            <span className="snw-ris__promo-n">{p.offerte.length} offerte</span>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => usa(p.id)}>Vedi le tariffe <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
          </footer>
        </article>
      ))}
    </div>
  )
}

function SoggiorniRiservati() {
  const aggiungi = useSitoStore(s => s.aggiungi)
  const [presi, setPresi] = useState<string[]>([])
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  function prenota(s: SoggiornoRiservato) {
    aggiungi({ id: s.offerta, qta: 1, data: s.dal, dataFine: s.al, prezzo: s.prezzo, b2b: true, dettaglio: `${s.tipo} · ${fmt(s.dal)} → ${fmt(s.al)} · 1 posto · riservato operatori` })
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
              <span className="snw-ris__sogg-tipo"><i className="fa-solid fa-key" aria-hidden="true" /> {s.tipo}</span>
            </span>
            <div className="snw-ris__sogg-txt">
              <small><i className="fa-solid fa-location-dot" aria-hidden="true" /> {s.luogo}</small>
              <h3>{s.tit}</h3>
              <span className="snw-ris__sogg-date"><i className="fa-regular fa-calendar" aria-hidden="true" /> {fmt(s.dal)} → {fmt(s.al)} · <b>{s.posti - (preso ? 1 : 0)} posti</b> rimasti</span>
              <p>{s.txt}</p>
              <ul>{s.include.map(i => <li key={i}><i className="fa-solid fa-check" aria-hidden="true" />{i}</li>)}</ul>
              <footer>
                <span className="snw-ris__sogg-eur">{s.prezzo ? <><b>{eur(s.prezzo)}</b> a persona</> : <b>Gratuito</b>}</span>
                <button type="button" className="sib-btn sib-btn--primary" disabled={preso} onClick={() => prenota(s)}>
                  {preso ? <><i className="fa-solid fa-check" aria-hidden="true" /> Nel carrello</> : 'Prenota il posto'}
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
      <b>Riservato agli operatori del settore</b>
      <span>Tariffe nette, promozioni e soggiorni riservati sono per hotel, tour operator, fornitori e ristoranti con un account Business.</span>
      <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'accesso', modo: 'registrati' })}>Crea un account Business</button>
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
    if (await confirm({ title: 'Annullare la prenotazione?', message: `«${titolo}» dell'ordine ${o.id}: il rimborso di ${eur(r.prezzo * r.qta)} torna sul metodo di pagamento entro 5-10 giorni lavorativi.`, confirmLabel: 'Annulla prenotazione', cancelLabel: 'Mantieni', danger: true })) {
      annulla(o.id, r.key)
    }
  }

  return (
    <>
      <Titolo tit="Ordini effettuati" sotto="Ripercorri le tue emozioni di ieri, oggi e domani" />
      <span className="snw-ris__etichetta">Filtro ordini</span>
      <div className="snw-ris__chip" role="group" aria-label="Filtro ordini">
        <button type="button" aria-pressed={!filtro} className={!filtro ? 'snw-ris__chip-on' : ''} onClick={() => setFiltro('')}>Tutti</button>
        {CATEGORIE.map(c => (
          <button key={c.id} type="button" aria-pressed={filtro === c.id} className={filtro === c.id ? 'snw-ris__chip-on' : ''} onClick={() => setFiltro(c.id)}>{c.nome}</button>
        ))}
      </div>

      {CATEGORIE.filter(c => !filtro || c.id === filtro).map(c => {
        const lista = voci.filter(x => x.off!.cat === c.id)
        return (
          <section key={c.id} className="snw-ris__gruppo">
            <h2><i className={`fa-light ${c.icona}`} aria-hidden="true" />{c.nome} <small>{lista.length} {lista.length === 1 ? 'elemento' : 'elementi'}</small></h2>
            {lista.length ? (
              <ul className="snw-ris__righe">
                {lista.map(({ o, r, off }) => {
                  const st = statoRiga(r, o.data)
                  const annullabile = st === 'in-programma' && off!.cancellazione
                  return (
                    <li key={r.key} className={st === 'annullato' ? 'snw-ris__riga snw-ris__riga--annullata' : 'snw-ris__riga'}>
                      <button type="button" className="snw-ris__riga-foto" onClick={() => vai({ nome: 'scheda', id: off!.id })} aria-label={`Apri ${off!.titolo}`}>
                        <SnwFoto id={off!.foto[0]} w={200} h={200} alt="" />
                      </button>
                      <span className="snw-ris__riga-txt">
                        <b>{off!.titolo}</b>
                        <small>{r.dettaglio}</small>
                        <span className="snw-ris__riga-meta">
                          <span className={`snw-ris__stato snw-ris__stato--${st}`}><i className={`fa-solid ${STATI_RIGA[st].icona}`} aria-hidden="true" /> {STATI_RIGA[st].nome}</span>
                          <span>Ordine {o.id} · {new Date(`${o.data}T12:00:00`).toLocaleDateString('it-IT')}</span>
                          {r.b2b && <span className="snw-ris__b2b"><i className="fa-solid fa-briefcase" aria-hidden="true" /> Tariffa operatore</span>}
                        </span>
                      </span>
                      <b className="snw-ris__riga-eur">{eur(r.prezzo * r.qta)}</b>
                      <span className="snw-ris__riga-az">
                        {c.id !== 'prodotti' && st !== 'annullato' && (
                          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setVoucher({ o, r })}><i className="fa-solid fa-qrcode" aria-hidden="true" /> Voucher</button>
                        )}
                        {annullabile && (
                          <button type="button" className="sib-btn sib-btn--ghost snw-ris__annulla" onClick={() => annullaVoce(o, r, off!.titolo)}>Annulla</button>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="snw-ris__nessuno">{VUOTI[c.id]}</p>}
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
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="snw-ris__qr" role="img" aria-label="Codice QR del voucher">
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
    <Modal open onClose={onClose} title="Voucher" size="sm">
      <div className="snw-ris__voucher">
        <QrFinto seme={codice} />
        <b>{off.titolo}</b>
        <span>{r.dettaglio}</span>
        <dl>
          <div><dt>Codice</dt><dd>{codice}</dd></div>
          <div><dt>Partner</dt><dd>{off.partner}</dd></div>
          {off.incontro && <div><dt>Punto d'incontro</dt><dd>{off.incontro}</dd></div>}
        </dl>
        <small>Mostra il QR all'arrivo. Il booking Sibylla risponde al +39 06 91714070.</small>
      </div>
      <div className="snw-ris__azioni">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}><i className="fa-solid fa-print" aria-hidden="true" /> Stampa</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Chiudi</button>
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
      <Titolo tit="Il tuo portafoglio digitale" sotto="Ricarica, utilizza, controlla" />
      <p className="snw-ris__intro">Con il tuo Sibylla Wallet puoi ricaricare il portafoglio digitale, usare i token per acquistare servizi e prodotti nel network e tenere traccia in tempo reale del saldo e delle transazioni.</p>
      <div className="snw-ris__wallet">
        <div className="snw-ris__box">
          <h2>Ricarica il tuo account</h2>
          <p className="snw-ris__box-sotto">Scegli l'importo e il metodo di pagamento.</p>
          <span className="snw-ris__etichetta">Scegli l'importo da ricaricare</span>
          <div className="snw-ris__importi" role="radiogroup" aria-label="Importo">
            {IMPORTI.map(i => (
              <button key={i} type="button" role="radio" aria-checked={importo === i} className={importo === i ? 'snw-ris__importo-on' : ''} onClick={() => setImporto(i)}>{i}€</button>
            ))}
            <button type="button" role="radio" aria-checked={importo === 'altro'} className={importo === 'altro' ? 'snw-ris__importo-on' : ''} onClick={() => setImporto('altro')}>Altro</button>
          </div>
          {importo === 'altro' && (
            <InputField name="w-altro" type="number" min={5} label="Importo (€)" value={altro} onChange={e => setAltro(e.target.value)}
              error={altro && valore < 5 ? 'Minimo 5 €' : undefined} />
          )}
          <RadioGroup name="w-metodo" label="Metodo di pagamento" value={metodo} onChange={setMetodo}
            options={[{ value: 'carta', label: 'Carta di credito · pagamento immediato' }, { value: 'bonifico', label: 'Bonifico · istruzioni via e-mail' }]} />
          <button type="button" className="sib-btn sib-btn--primary snw-ris__largo" disabled={valore < 5} onClick={vai}>Ricarica {valore >= 5 ? eur(valore) : ''}</button>
        </div>
        <div className="snw-ris__box">
          <div className="snw-ris__saldo">
            <span className="snw-ris__etichetta">Saldo attuale</span>
            <b>{eur(saldo)}</b>
            <span>Hai {eur(saldo)} in Sibylla Token</span>
            <small>1 token = 1 €</small>
          </div>
          <h3 className="snw-ris__mov-tit">Storico dei movimenti <small>{movimenti.length} movimenti</small></h3>
          <ul className="snw-ris__mov">
            {movimenti.map(m => (
              <li key={m.id}>
                <button type="button" aria-expanded={aperto === m.id} onClick={() => setAperto(aperto === m.id ? null : m.id)}>
                  <span><b>{new Date(`${m.data}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</b><small> · {giorniFa(m.data) === 0 ? 'oggi' : `${giorniFa(m.data)} giorni fa`}</small></span>
                  <b className={m.importo >= 0 ? 'snw-ris__piu' : 'snw-ris__meno'}>{m.importo >= 0 ? '+' : '−'}{eur(Math.abs(m.importo))}</b>
                  <i className={`fa-solid fa-chevron-${aperto === m.id ? 'up' : 'down'}`} aria-hidden="true" />
                </button>
                {aperto === m.id && <p>Dettagli operazione: {m.dettaglio}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {bonifico && (
        <Modal open onClose={() => setBonifico(null)} title="Ricarica con bonifico" size="md">
          <div className="snw-ris__modale">
            <BonificoIstruzioni codice={bonifico.codice} importo={eur(bonifico.importo)} />
            <p className="snw-ris__nota">I token arrivano sul portafoglio quando il bonifico è accreditato (1-2 giorni lavorativi). Ti abbiamo mandato le stesse istruzioni via e-mail.</p>
          </div>
          <div className="snw-ris__azioni"><button type="button" className="sib-btn sib-btn--primary" onClick={() => setBonifico(null)}>Ho capito</button></div>
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
      <Titolo tit="Preferiti" sotto={lista.length ? `${lista.length} ${lista.length === 1 ? 'offerta salvata' : 'offerte salvate'}` : 'Tocca il cuore su una card per salvarla qui.'} />
      {lista.length ? <div className="snw-ris__pref">{lista.map(o => <SnwCard key={o.id} o={o} />)}</div> : (
        <div className="snw-ris__vuoto">
          <i className="fa-light fa-heart" aria-hidden="true" />
          <b>Ancora nessun preferito</b>
          <span>Salva soggiorni, esperienze e prodotti per ritrovarli e prenotarli quando vuoi.</span>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'catalogo' })}>Esplora le offerte</button>
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
      <Titolo tit="Gestione profilo" sotto="Aggiorna i tuoi dati personali" />
      <div className="snw-ris__profilo">
        <div className="snw-ris__box snw-ris__box--avatar">
          <SnwAvatarCampo compatto valore={u.avatar} onChange={v => { setU(x => ({ ...x, avatar: v })); salva({ avatar: v }) }} />
        </div>
        <form className="snw-ris__box" onSubmit={e => { e.preventDefault(); salva(u); setSalvato(true) }}>
          <div className="snw-ris__tab snw-ris__tab--piccolo" role="tablist" aria-label="Profilo">
            <button type="button" role="tab" aria-selected={tab === 'account'} className={tab === 'account' ? 'snw-ris__tab-on' : ''} onClick={() => setTab('account')}>Impostazioni account</button>
            {biz && <button type="button" role="tab" aria-selected={tab === 'azienda'} className={tab === 'azienda' ? 'snw-ris__tab-on' : ''} onClick={() => setTab('azienda')}>Dati aziendali</button>}
          </div>
          {tab === 'account' ? (
            <div className="snw-ris__griglia">
              <InputField name="p-nome" label="Nome" value={u.nome} onChange={e => set('nome', e.target.value)} />
              <InputField name="p-cognome" label="Cognome" value={u.cognome} onChange={e => set('cognome', e.target.value)} />
              <InputField name="p-mail" type="email" label="E-mail" value={u.email} readOnly hint="Per cambiarla scrivi al booking" />
              <InputField name="p-tel" type="tel" label="Telefono" value={u.tel} onChange={e => set('tel', e.target.value)} />
              <DatePickerField name="p-nascita" label="Data di nascita" value={u.nascita} onChange={e => set('nascita', e.target.value)} />
              <SelectField name="p-naz" label="Nazionalità" value={u.nazionalita} placeholder="Seleziona nazionalità" onChange={e => set('nazionalita', e.target.value)}
                options={NAZIONALITA.map(n => ({ value: n, label: n }))} />
              <div className="snw-ris__largo"><InputField name="p-ind" label="Indirizzo" value={u.indirizzo} onChange={e => set('indirizzo', e.target.value)} /></div>
            </div>
          ) : u.azienda && (
            <div className="snw-ris__griglia">
              <InputField name="z-rag" label="Ragione Sociale" value={u.azienda.ragione} onChange={e => setAz('ragione', e.target.value)} />
              <InputField name="z-piva" label="Partita IVA" value={u.azienda.piva} readOnly hint="Per cambiarla scrivi al booking" />
              <InputField name="z-cf" label="Codice Fiscale Aziendale" value={u.azienda.cf} onChange={e => setAz('cf', e.target.value)} />
              <SelectField name="z-tipo" label="Tipo di azienda" value={u.azienda.tipo} onChange={e => setAz('tipo', e.target.value as TipoAzienda)}
                options={TIPI_AZIENDA.map(t => ({ value: t, label: t }))} />
              <InputField name="z-tel" type="tel" label="Telefono aziendale" value={u.azienda.tel} onChange={e => setAz('tel', e.target.value)} />
              <InputField name="z-mail" type="email" label="Email aziendale" value={u.azienda.email} onChange={e => setAz('email', e.target.value)} />
              <InputField name="z-ind" label="Indirizzo aziendale" value={u.azienda.indirizzo} onChange={e => setAz('indirizzo', e.target.value)} />
              <InputField name="z-ruolo" label="Ruolo aziendale" value={u.azienda.ruolo} onChange={e => setAz('ruolo', e.target.value)} />
            </div>
          )}
          <footer className="snw-ris__salva">
            {salvato && <span><i className="fa-solid fa-circle-check" aria-hidden="true" /> Modifiche salvate</span>}
            <button type="submit" className="sib-btn sib-btn--primary" disabled={!modificato}>Modifica</button>
          </footer>
        </form>
      </div>
    </>
  )
}
