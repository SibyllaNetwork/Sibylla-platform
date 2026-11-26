import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CheckboxField, DateRangeField, InputField, RadioGroup, RangeField, SelectField, ToggleSwitch } from '../../core/components/form'
import Tooltip from '../../core/components/Tooltip'
import {
  DESTINAZIONI, FOTO, OFFERTE, Offerta, SERVIZI_ALLOGGIO, ServizioAlloggio, TIPI_ALLOGGIO, TRATTAMENTI, eur, oggiIso,
} from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { loc, t, linguaCorrente } from '../i18n'
import { SnwEtichetta, SnwFoto, SnwStepper } from '../SnwUi'
import SnwTestata from './SnwTestata'
import './SnwSoggiorni.sass'

/**
 * Ricerca soggiorni, come sui grandi siti di booking:
 *  - barra di ricerca al centro (destinazione con suggerimenti, check-in e
 *    check-out, ospiti e camere) che decide le notti e il prezzo mostrato;
 *  - filtri rapidi sotto la barra;
 *  - filtri di dettaglio a sinistra: destinazione per regione → località →
 *    zona, distanza dal centro, prezzo a notte, tipo di struttura, stelle,
 *    punteggio, trattamento, servizi, politiche;
 *  - risultati in lista orizzontale con prezzo totale del soggiorno.
 * La ricerca resta nello store: la scheda parte dalle stesse date e camere.
 */
type Ordine = 'consigliati' | 'prezzo-su' | 'prezzo-giu' | 'voto' | 'distanza' | 'stelle'

const SOGGIORNI = OFFERTE.filter(o => o.cat === 'soggiorni' && o.alloggio)
const TETTO = Math.ceil(Math.max(...SOGGIORNI.map(o => o.prezzo)) / 50) * 50
const REGIONI = Array.from(new Set(SOGGIORNI.map(o => o.regione)))
const ORDINE_SERVIZI = Object.keys(SERVIZI_ALLOGGIO) as ServizioAlloggio[]

const giudizio = (v: number) => t(v >= 4.8 ? 'Eccezionale' : v >= 4.6 ? 'Ottimo' : v >= 4.4 ? 'Molto buono' : 'Buono')
const notti = (dal: string, al: string) => Math.max(1, Math.round((+new Date(al) - +new Date(dal)) / 86400000))
const kmTesto = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString(loc())} km`)

/** Una ricerca per «dove» vale per città, regione o destinazione della rete. */
/** Notti, adulti, bambini e camere con singolare e plurale. */
const nNotti = (n: number) => (n === 1 ? t('{n} notte', { n }) : t('{n} notti', { n }))
const nAdulti = (n: number) => (n === 1 ? t('{n} adulto', { n }) : t('{n} adulti', { n }))
const nBambini = (n: number) => (n === 1 ? t('{n} bambino', { n }) : t('{n} bambini', { n }))
const nCamere = (n: number) => (n === 1 ? t('{n} camera', { n }) : t('{n} camere', { n }))

const inDove = (o: Offerta, dove: string) => {
  if (!dove) return true
  const d = DESTINAZIONI.find(x => x.nome === dove)
  return o.citta === dove || o.regione === dove || !!d?.citta.includes(o.citta)
}

interface Suggerimento { nome: string; tipo: 'Destinazione' | 'Località' | 'Regione'; icona: string; n: number }
const SUGGERIMENTI: Suggerimento[] = [
  ...DESTINAZIONI.map(d => ({ nome: d.nome, tipo: 'Destinazione' as const, icona: 'fa-map-location-dot' })),
  ...Array.from(new Set(SOGGIORNI.map(o => o.citta))).filter(c => !DESTINAZIONI.some(d => d.nome === c)).map(c => ({ nome: c, tipo: 'Località' as const, icona: 'fa-location-dot' })),
  ...REGIONI.map(r => ({ nome: r, tipo: 'Regione' as const, icona: 'fa-map' })),
].map(s => ({ ...s, n: SOGGIORNI.filter(o => inDove(o, s.nome)).length })).filter(s => s.n > 0)

export default function SnwSoggiorni({ dove: doveIniziale }: { dove?: string }) {
  const ricerca = useSitoStore(s => s.ricerca)
  const setRicerca = useSitoStore(s => s.setRicerca)
  const preferiti = useSitoStore(s => s.preferiti)

  // Bozza della barra: si applica con «Cerca»
  const [bozza, setBozza] = useState(() => ({ ...ricerca, dove: doveIniziale ?? ricerca.dove }))
  useEffect(() => { if (doveIniziale !== undefined) setRicerca({ dove: doveIniziale }) }, [doveIniziale, setRicerca])
  const cerca = () => { setRicerca(bozza); azzera() }

  // Filtri di dettaglio
  const [citta, setCitta] = useState<string[]>([])
  const [zone, setZone] = useState<string[]>([])
  const [km, setKm] = useState('0')
  const [maxPrezzo, setMaxPrezzo] = useState(TETTO)
  const [tipi, setTipi] = useState<string[]>([])
  const [stelle, setStelle] = useState<number[]>([])
  const [votoMin, setVotoMin] = useState('0')
  const [tratt, setTratt] = useState<string[]>([])
  const [servizi, setServizi] = useState<ServizioAlloggio[]>([])
  const [soloCanc, setSoloCanc] = useState(false)
  const [soloStruttura, setSoloStruttura] = useState(false)
  const [soloPref, setSoloPref] = useState(false)
  const [nome, setNome] = useState('')
  const [ordine, setOrdine] = useState<Ordine>('consigliati')

  const azzera = () => {
    setCitta([]); setZone([]); setKm('0'); setMaxPrezzo(TETTO); setTipi([]); setStelle([]); setVotoMin('0')
    setTratt([]); setServizi([]); setSoloCanc(false); setSoloStruttura(false); setSoloPref(false); setNome('')
  }
  const alterna = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v])

  const n = notti(ricerca.dal, ricerca.al)
  const ospiti = ricerca.adulti + ricerca.bambini
  const perCamera = Math.ceil(ospiti / ricerca.camere)

  // Base = dove + capienza; i conteggi dei filtri si calcolano su questa
  const base = useMemo(() => SOGGIORNI.filter(o => inDove(o, ricerca.dove) && o.alloggio!.ospiti >= perCamera), [ricerca.dove, perCamera])
  const esclusiPerCapienza = SOGGIORNI.filter(o => inDove(o, ricerca.dove)).length - base.length

  const risultati = useMemo(() => {
    const r = base.filter(o => {
      const a = o.alloggio!
      const luogoOk = (!citta.length && !zone.length) || citta.includes(o.citta) || zone.includes(`${o.citta}|${a.zona}`)
      return luogoOk
        && (km === '0' || a.km <= Number(km))
        && o.prezzo <= maxPrezzo
        && (!tipi.length || tipi.includes(a.tipo))
        && (!stelle.length || (a.stelle !== undefined && stelle.includes(a.stelle)))
        && o.voto >= Number(votoMin)
        && (!tratt.length || tratt.includes(a.trattamento))
        && servizi.every(s => a.servizi.includes(s))
        && (!soloCanc || o.cancellazione)
        && (!soloStruttura || a.pagaInStruttura)
        && (!soloPref || preferiti.includes(o.id))
        && (!nome.trim() || o.titolo.toLowerCase().includes(nome.trim().toLowerCase()))
    })
    if (ordine === 'prezzo-su') r.sort((a, b) => a.prezzo - b.prezzo)
    if (ordine === 'prezzo-giu') r.sort((a, b) => b.prezzo - a.prezzo)
    if (ordine === 'voto') r.sort((a, b) => b.voto - a.voto)
    if (ordine === 'distanza') r.sort((a, b) => a.alloggio!.km - b.alloggio!.km)
    if (ordine === 'stelle') r.sort((a, b) => (b.alloggio!.stelle ?? 0) - (a.alloggio!.stelle ?? 0))
    return r
  }, [base, citta, zone, km, maxPrezzo, tipi, stelle, votoMin, tratt, servizi, soloCanc, soloStruttura, soloPref, nome, ordine, preferiti])

  const conta = (f: (o: Offerta) => boolean) => base.filter(f).length

  // Filtri attivi, ciascuno rimovibile
  const attivi: { nome: string; via: () => void }[] = [
    ...citta.map(c => ({ nome: t(c), via: () => setCitta(l => l.filter(x => x !== c)) })),
    ...zone.map(z => ({ nome: z.split('|').map(x => t(x)).join(' · '), via: () => setZone(l => l.filter(x => x !== z)) })),
    ...(km !== '0' ? [{ nome: t('Entro {km} km dal centro', { km }), via: () => setKm('0') }] : []),
    ...(maxPrezzo < TETTO ? [{ nome: t('Fino a {prezzo} a notte', { prezzo: eur(maxPrezzo) }), via: () => setMaxPrezzo(TETTO) }] : []),
    ...tipi.map(v => ({ nome: t(v), via: () => setTipi(l => l.filter(x => x !== v)) })),
    ...stelle.map(s => ({ nome: t('{n} stelle', { n: s }), via: () => setStelle(l => l.filter(x => x !== s)) })),
    ...(votoMin !== '0' ? [{ nome: t('Punteggio {voto}+', { voto: Number(votoMin).toLocaleString(loc()) }), via: () => setVotoMin('0') }] : []),
    ...tratt.map(v => ({ nome: t(v), via: () => setTratt(l => l.filter(x => x !== v)) })),
    ...servizi.map(s => ({ nome: t(SERVIZI_ALLOGGIO[s].nome), via: () => setServizi(l => l.filter(x => x !== s)) })),
    ...(soloCanc ? [{ nome: t('Cancellazione gratuita'), via: () => setSoloCanc(false) }] : []),
    ...(soloStruttura ? [{ nome: t('Paghi in struttura'), via: () => setSoloStruttura(false) }] : []),
    ...(soloPref ? [{ nome: t('Preferiti'), via: () => setSoloPref(false) }] : []),
    ...(nome.trim() ? [{ nome: `«${nome.trim()}»`, via: () => setNome('') }] : []),
  ]

  // Filtri rapidi sotto la barra
  const rapidi: { nome: string; icona: string; on: boolean; via: () => void }[] = [
    { nome: t('Colazione inclusa'), icona: 'fa-mug-saucer', on: tratt.includes('Colazione inclusa'), via: () => setTratt(l => alterna(l, 'Colazione inclusa')) },
    { nome: t('Cancellazione gratuita'), icona: 'fa-calendar-xmark', on: soloCanc, via: () => setSoloCanc(v => !v) },
    { nome: t('Piscina'), icona: 'fa-person-swimming', on: servizi.includes('piscina'), via: () => setServizi(l => alterna(l, 'piscina')) },
    { nome: t('Animali ammessi'), icona: 'fa-paw', on: servizi.includes('animali'), via: () => setServizi(l => alterna(l, 'animali')) },
    { nome: t('Entro {km} km dal centro', { km: 1 }), icona: 'fa-location-crosshairs', on: km === '1', via: () => setKm(k => (k === '1' ? '0' : '1')) },
    { nome: t('Punteggio {voto}+', { voto: (4.7).toLocaleString(loc()) }), icona: 'fa-star', on: votoMin === '4.7', via: () => setVotoMin(v => (v === '4.7' ? '0' : '4.7')) },
  ]

  const cittaRegione = (r: string) => Array.from(new Set(base.filter(o => o.regione === r).map(o => o.citta)))
  const zoneCitta = (c: string) => Array.from(new Set(base.filter(o => o.citta === c).map(o => o.alloggio!.zona)))
  const mappa = ricerca.dove || 'Italia'

  return (
    <div className="snw-cat snw-sog">
      <SnwTestata kicker={ricerca.dove ? `${t('Soggiorni')} · ${t(ricerca.dove)}` : t('Soggiorni')} titolo={t('Trova il tuo')} enfasi={t('soggiorno')}
        sotto={t('Hotel, B&B, dimore storiche, ville e agriturismi selezionati dalla rete Sibylla')} foto={FOTO.cameraClassica} icona="fa-bed-front"
        briciole={[{ nome: t('Catalogo'), vai: { nome: 'catalogo' } }, { nome: t('Soggiorni') }]} />

      <div className="snw__wrap">
        <CercaSoggiorni bozza={bozza} setBozza={setBozza} onCerca={cerca} />

        <div className="snw-sog__rapidi" role="group" aria-label={t('Filtri più usati')}>
          <span>{t('Più usati:')}</span>
          {rapidi.map(f => (
            <button key={f.nome} type="button" aria-pressed={f.on} className={f.on ? 'snw-sog__rapido snw-sog__rapido--on' : 'snw-sog__rapido'} onClick={f.via}>
              <i className={`fa-light ${f.icona}`} aria-hidden="true" />{f.nome}
            </button>
          ))}
        </div>

        <div className="snw-cat__layout">
          <aside className="snw-cat__filtri snw-sog__filtri" aria-label={t('Filtri')}>
            <div className="snw-sog__mappa">
              <iframe title={t('Mappa: {luogo}', { luogo: t(mappa) })} src={`https://maps.google.com/maps?q=${encodeURIComponent(mappa + ', Italia')}&z=${ricerca.dove ? 11 : 5}&output=embed`} loading="lazy" />
              <span><i className="fa-solid fa-map-location-dot" aria-hidden="true" /> {ricerca.dove ? t(ricerca.dove) : t('Tutta Italia')}</span>
            </div>

            <div className="snw-cat__filtri-head">
              <h2><i className="fa-solid fa-sliders" aria-hidden="true" /> {t('Filtra per')}</h2>
              <button type="button" className="sib-btn sib-btn--ghost" onClick={azzera} disabled={!attivi.length}>{t('Azzera')}</button>
            </div>

            <fieldset>
              <InputField name="nome-struttura" label={t('Nome della struttura')} value={nome} onChange={e => setNome(e.target.value)}
                placeholder={t('Es. Palazzo Esquilino')} iconLeft="fa-light fa-magnifying-glass" />
            </fieldset>

            <fieldset>
              <legend>{t('Destinazione')}</legend>
              {REGIONI.filter(r => cittaRegione(r).length).map(r => (
                <div key={r} className="snw-sog__regione">
                  <span className="snw-sog__reg-nome">{t(r)}</span>
                  {cittaRegione(r).map(c => {
                    const zz = zoneCitta(c)
                    return (
                      <div key={c} className="snw-sog__citta">
                        <CheckboxField name={`citta-${c}`} label={`${t(c)} (${conta(o => o.citta === c)})`} checked={citta.includes(c)}
                          onChange={() => { setCitta(l => alterna(l, c)); setZone(l => l.filter(z => !z.startsWith(`${c}|`))) }} />
                        {zz.length > 1 && (
                          <div className="snw-sog__zone">
                            {zz.map(z => (
                              <CheckboxField key={z} name={`zona-${c}-${z}`} label={`${t(z)} (${conta(o => o.citta === c && o.alloggio!.zona === z)})`}
                                checked={citta.includes(c) || zone.includes(`${c}|${z}`)} disabled={citta.includes(c)}
                                onChange={() => setZone(l => alterna(l, `${c}|${z}`))} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </fieldset>

            <fieldset>
              <RadioGroup className="snw-sog__radio" label={t('Distanza dal centro')} name="km" value={km} onChange={setKm}
                options={[{ value: '0', label: t('Qualsiasi') }, ...[1, 3, 5].map(k => ({ value: String(k), label: t('Meno di {km} km', { km: k }) }))]} />
            </fieldset>

            <fieldset>
              <RangeField label={t('Prezzo a notte')} name="prezzo" value={maxPrezzo} onChange={setMaxPrezzo} min={50} max={TETTO} step={10}
                valueLabel={maxPrezzo >= TETTO ? t('Qualsiasi') : eur(maxPrezzo)} resetTo={TETTO} />
              <span className="snw-sog__nota">{t('Per {notti}: fino a {prezzo} in totale', { notti: nNotti(n), prezzo: eur(maxPrezzo * n * ricerca.camere) })}</span>
            </fieldset>

            <fieldset>
              <legend>{t('Tipo di struttura')}</legend>
              {TIPI_ALLOGGIO.filter(v => conta(o => o.alloggio!.tipo === v)).map(v => (
                <CheckboxField key={v} name={`tipo-${v}`} label={`${t(v)} (${conta(o => o.alloggio!.tipo === v)})`} checked={tipi.includes(v)}
                  onChange={() => setTipi(l => alterna(l, v))} />
              ))}
            </fieldset>

            <fieldset>
              <legend>{t('Stelle')}</legend>
              <div className="snw-sog__stelle">
                {[3, 4, 5].map(s => (
                  <button key={s} type="button" aria-pressed={stelle.includes(s)} disabled={!stelle.includes(s) && !conta(o => o.alloggio!.stelle === s)} className={stelle.includes(s) ? 'snw-sog__stella snw-sog__stella--on' : 'snw-sog__stella'}
                    onClick={() => setStelle(l => alterna(l, s))}>
                    {s} <i className="fa-solid fa-star" aria-hidden="true" /><small>({conta(o => o.alloggio!.stelle === s)})</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <RadioGroup className="snw-sog__radio" label={t('Punteggio degli ospiti')} name="voto" value={votoMin} onChange={setVotoMin}
                options={[{ value: '0', label: t('Tutti') }, ...[4.8, 4.6, 4.4].map(v => ({ value: String(v), label: `${giudizio(v)}: ${v.toLocaleString(loc())}+` }))]} />
            </fieldset>

            <fieldset>
              <legend>{t('Trattamento')}</legend>
              {TRATTAMENTI.map(v => (
                <CheckboxField key={v} name={`tratt-${v}`} label={`${t(v)} (${conta(o => o.alloggio!.trattamento === v)})`} checked={tratt.includes(v)}
                  onChange={() => setTratt(l => alterna(l, v))} />
              ))}
            </fieldset>

            <fieldset>
              <legend>{t('Servizi')}</legend>
              {ORDINE_SERVIZI.map(s => (
                <CheckboxField key={s} name={`serv-${s}`} label={`${t(SERVIZI_ALLOGGIO[s].nome)} (${conta(o => o.alloggio!.servizi.includes(s))})`}
                  checked={servizi.includes(s)} onChange={() => setServizi(l => alterna(l, s))} />
              ))}
            </fieldset>

            <fieldset>
              <legend>{t('Politiche')}</legend>
              <ToggleSwitch label={t('Cancellazione gratuita')} checked={soloCanc} onChange={setSoloCanc} />
              <ToggleSwitch label={t('Paghi in struttura')} checked={soloStruttura} onChange={setSoloStruttura} />
              <ToggleSwitch label={t('Solo preferiti')} checked={soloPref} onChange={setSoloPref} />
            </fieldset>
          </aside>

          <section className="snw-cat__ris">
            <div className="snw-cat__barra">
              <span>
                <b>{risultati.length}</b> {risultati.length === 1 ? t('struttura trovata') : t('strutture trovate')}{ricerca.dove ? ` ${t('a {luogo}', { luogo: t(ricerca.dove) })}` : ''}
                <small className="snw-sog__per">{nNotti(n)} · {nAdulti(ricerca.adulti)}{ricerca.bambini ? ` · ${nBambini(ricerca.bambini)}` : ''} · {nCamere(ricerca.camere)}</small>
              </span>
              <SelectField name="ordine" label={t('Ordina per')} value={ordine} onChange={e => setOrdine(e.target.value as Ordine)} className="snw-cat__ordine"
                options={[
                  { value: 'consigliati', label: t('I nostri consigli') },
                  { value: 'prezzo-su', label: t('Prezzo: dal più basso') },
                  { value: 'prezzo-giu', label: t('Prezzo: dal più alto') },
                  { value: 'voto', label: t('Punteggio degli ospiti') },
                  { value: 'distanza', label: t('Distanza dal centro') },
                  { value: 'stelle', label: t('Stelle') },
                ]} />
            </div>

            {attivi.length > 0 && (
              <div className="snw-sog__attivi" aria-label={t('Filtri attivi')}>
                {attivi.map(f => (
                  <button key={f.nome} type="button" className="snw-sog__attivo" onClick={f.via} aria-label={t('Togli il filtro {nome}', { nome: f.nome })}>
                    {f.nome}<i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                ))}
                <button type="button" className="sib-btn sib-btn--ghost" onClick={azzera}>{t('Togli tutti')}</button>
              </div>
            )}

            {esclusiPerCapienza > 0 && (
              <p className="snw-sog__avviso">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                {esclusiPerCapienza === 1
                  ? t('1 struttura non ospita {persone} persone in una camera: aggiungi una camera per vederla.', { persone: perCamera })
                  : t('{n} strutture non ospitano {persone} persone in una camera: aggiungi una camera per vederle.', { n: esclusiPerCapienza, persone: perCamera })}
              </p>
            )}

            {risultati.length ? (
              <div className="snw-sog__lista">
                {risultati.map(o => <RigaAlloggio key={o.id} o={o} notti={n} />)}
              </div>
            ) : (
              <div className="snw-cat__vuoto">
                <i className="fa-light fa-bed-empty" aria-hidden="true" />
                <b>{t('Nessuna struttura con questi filtri')}</b>
                <button type="button" className="sib-btn sib-btn--secondary" onClick={azzera}>{t('Azzera i filtri')}</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Barra di ricerca ─────────────────────────────────────────────────────
type Bozza = ReturnType<typeof useSitoStore.getState>['ricerca']

function CercaSoggiorni({ bozza, setBozza, onCerca }: { bozza: Bozza; setBozza: React.Dispatch<React.SetStateAction<Bozza>>; onCerca: () => void }) {
  const [suggOn, setSuggOn] = useState(false)
  const [ospitiOn, setOspitiOn] = useState(false)
  const rif = useRef<HTMLFormElement>(null)
  const set = (r: Partial<Bozza>) => setBozza(b => ({ ...b, ...r }))

  useEffect(() => {
    const fuori = (e: PointerEvent) => { if (!rif.current?.contains(e.target as Node)) { setSuggOn(false); setOspitiOn(false) } }
    document.addEventListener('pointerdown', fuori)
    return () => document.removeEventListener('pointerdown', fuori)
  }, [])

  const q = bozza.dove.trim().toLowerCase()
  const sugg = SUGGERIMENTI.filter(s => !q || s.nome.toLowerCase().includes(q) || t(s.nome).toLowerCase().includes(q))
  const nn = notti(bozza.dal, bozza.al)
  const ospiti = `${nAdulti(bozza.adulti)} · ${nBambini(bozza.bambini)} · ${nCamere(bozza.camere)}`

  return (
    <form ref={rif} className="snw-sog__cerca" role="search" onSubmit={e => { e.preventDefault(); setSuggOn(false); setOspitiOn(false); onCerca() }}>
      <div className="snw-sog__campo snw-sog__campo--dove">
        <InputField name="dove" label={t('Dove vuoi andare?')} value={bozza.dove} placeholder={t('Città, regione o destinazione')} iconLeft="fa-light fa-location-dot"
          autoComplete="off" onFocus={() => { setSuggOn(true); setOspitiOn(false) }} onChange={e => { set({ dove: e.target.value }); setSuggOn(true) }} />
        {suggOn && (
          <ul className="snw-sog__sugg" role="listbox" aria-label={t('Destinazioni suggerite')}>
            {bozza.dove && (
              <li><button type="button" onClick={() => { set({ dove: '' }); setSuggOn(false) }}><i className="fa-light fa-globe" aria-hidden="true" /><span><b>{t('Ovunque')}</b><small>{t('Tutte le strutture')}</small></span></button></li>
            )}
            {sugg.map(s => (
              <li key={`${s.tipo}-${s.nome}`}>
                <button type="button" role="option" aria-selected={bozza.dove === s.nome} onClick={() => { set({ dove: s.nome }); setSuggOn(false) }}>
                  <i className={`fa-light ${s.icona}`} aria-hidden="true" />
                  <span><b>{t(s.nome)}</b><small>{t(s.tipo)} · {s.n === 1 ? t('{n} struttura', { n: s.n }) : t('{n} strutture', { n: s.n })}</small></span>
                </button>
              </li>
            ))}
            {!sugg.length && <li className="snw-sog__sugg-vuoto">{t('Nessuna destinazione della rete con questo nome')}</li>}
          </ul>
        )}
      </div>

      <div className="snw-sog__campo snw-sog__campo--date">
        <DateRangeField lingua={linguaCorrente()} placeholder={t('Seleziona periodo')} label={`${t('Check-in e check-out')} · ${nNotti(nn)}`} nameFrom="dal" nameTo="al" valueFrom={bozza.dal} valueTo={bozza.al} min={oggiIso()}
          onChangeFrom={e => set({ dal: e.target.value })} onChangeTo={e => set({ al: e.target.value })} />
      </div>

      <div className="snw-sog__campo snw-sog__campo--ospiti">
        <span className="snw-sog__lbl" id="snw-sog-ospiti">{t('Ospiti e camere')}</span>
        <button type="button" className="snw-sog__ospiti-btn" aria-labelledby="snw-sog-ospiti" aria-expanded={ospitiOn}
          onClick={() => { setOspitiOn(v => !v); setSuggOn(false) }}>
          <i className="fa-light fa-user-group" aria-hidden="true" /><span>{ospiti}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
        </button>
        {ospitiOn && (
          <div className="snw-sog__ospiti" role="dialog" aria-label={t('Ospiti e camere')}>
            <Contatore nome={t('Adulti')} nota={t('Dai 18 anni')} valore={bozza.adulti} min={1} max={16} onChange={v => set({ adulti: v, camere: Math.min(bozza.camere, v) })} />
            <Contatore nome={t('Bambini')} nota={t('Da 0 a 17 anni')} valore={bozza.bambini} min={0} max={8} onChange={v => set({ bambini: v })} />
            <Contatore nome={t('Camere')} nota={t('Almeno un adulto per camera')} valore={bozza.camere} min={1} max={bozza.adulti} onChange={v => set({ camere: v })} />
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => setOspitiOn(false)}>{t('Fatto')}</button>
          </div>
        )}
      </div>

      <button type="submit" className="snw-sog__vai"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> {t('Cerca')}</button>
    </form>
  )
}

function Contatore({ nome, nota, valore, min, max, onChange }: { nome: string; nota: string; valore: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="snw-sog__cont">
      <span><b>{nome}</b><small>{nota}</small></span>
      <SnwStepper valore={valore} min={min} max={max} onChange={onChange} etichetta={nome.toLowerCase()} />
    </div>
  )
}

// ── Risultato in lista ───────────────────────────────────────────────────
function RigaAlloggio({ o, notti: nn }: { o: Offerta; notti: number }) {
  const vai = useSitoStore(s => s.vai)
  const camere = useSitoStore(s => s.ricerca.camere)
  const preferiti = useSitoStore(s => s.preferiti)
  const preferito = useSitoStore(s => s.preferito)
  const a = o.alloggio!
  const fav = preferiti.includes(o.id)
  const apri = () => vai({ nome: 'scheda', id: o.id })
  const totale = o.prezzo * nn * camere

  return (
    <article className="snw-sog__riga">
      <div className="snw-sog__foto">
        <button type="button" onClick={apri} aria-label={t('Apri {nome}', { nome: t(o.titolo) })}><SnwFoto id={o.foto[0]} w={640} h={520} alt={t(o.titolo)} /></button>
        <span className="snw-sog__tag"><SnwEtichetta testo={o.etichetta} /></span>
        <Tooltip text={fav ? t('Togli dai preferiti') : t('Aggiungi ai preferiti')}>
          <button type="button" className={`snw-card__fav ${fav ? 'snw-card__fav--on' : ''}`} aria-pressed={fav}
            aria-label={fav ? t('Togli dai preferiti') : t('Aggiungi ai preferiti')} onClick={() => preferito(o.id)}>
            <i className={`${fav ? 'fa-solid' : 'fa-regular'} fa-heart`} />
          </button>
        </Tooltip>
      </div>

      <div className="snw-sog__corpo">
        <span className="snw-sog__tipo">
          {t(a.tipo)}
          {a.stelle && <span className="snw-sog__stars" aria-label={t('{n} stelle', { n: a.stelle })}>{Array.from({ length: a.stelle }, (_, i) => <i key={i} className="fa-solid fa-star" aria-hidden="true" />)}</span>}
        </span>
        <h3><button type="button" onClick={apri}>{t(o.titolo)}</button></h3>
        <span className="snw-sog__dove">
          <i className="fa-solid fa-location-dot" aria-hidden="true" />{t(o.citta)} · {t(a.zona)} · <b>{t('{distanza} dal centro', { distanza: kmTesto(a.km) })}</b>
        </span>
        <span className="snw-sog__formula">{t(o.formula)}</span>
        <ul className="snw-sog__servizi" aria-label={t('Servizi')}>
          {a.servizi.slice(0, 6).map(s => (
            <li key={s}><Tooltip text={t(SERVIZI_ALLOGGIO[s].nome)}><i className={`fa-light ${SERVIZI_ALLOGGIO[s].icona}`} aria-label={t(SERVIZI_ALLOGGIO[s].nome)} /></Tooltip></li>
          ))}
          {a.servizi.length > 6 && <li className="snw-sog__piu">+{a.servizi.length - 6}</li>}
        </ul>
        <span className="snw-sog__pol">
          <span className="snw-sog__tratt"><i className="fa-solid fa-mug-saucer" aria-hidden="true" />{t(a.trattamento)}</span>
          {o.cancellazione && <span className="snw-sog__ok"><i className="fa-solid fa-check" aria-hidden="true" />{t('Cancellazione gratuita')}</span>}
          {a.pagaInStruttura && <span className="snw-sog__ok"><i className="fa-solid fa-check" aria-hidden="true" />{t('Nessun pagamento anticipato')}</span>}
        </span>
      </div>

      <div className="snw-sog__lato">
        <span className="snw-sog__voto">
          <span><b>{giudizio(o.voto)}</b><small>{t('{n} recensioni', { n: o.recensioni.toLocaleString(loc()) })}</small></span>
          <span className="snw-sog__punti">{o.voto.toLocaleString(loc(), { minimumFractionDigits: 1 })}</span>
        </span>
        <span className="snw-sog__prezzo">
          <small>{nNotti(nn)} · {nCamere(camere)}</small>
          {o.prezzoPieno && <s>{eur(o.prezzoPieno * nn * camere)}</s>}
          <b>{eur(totale)}</b>
          <small>{t('{prezzo} a notte · tasse incluse', { prezzo: eur(o.prezzo) })}</small>
        </span>
        <button type="button" className="sib-btn sib-btn--primary snw-sog__cta" onClick={apri}>
          {t('Vedi disponibilità')} <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
