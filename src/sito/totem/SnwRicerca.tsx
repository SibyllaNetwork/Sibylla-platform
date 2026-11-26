import React, { useState } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { de, enGB, es, fr, it } from 'date-fns/locale'
import 'react-day-picker/dist/style.css'
import { ITALY_VIEWBOX, REGIONS } from '../../modules/purchasing/Agora/data/italyMap'
import { CATEGORIE, Categoria, OFFERTE } from '../sitoData'
import { linguaCorrente, loc, t } from '../i18n'
import './SnwRicerca.sass'

/**
 * Ricerca per parametri del totem (formato Impatto 2): una pillola con tre
 * segmenti — Dove, Quando, Chi — e il pulsante tondo che mostra i risultati.
 * Toccando un segmento si apre sotto il suo pannello: mappa d'Italia con le
 * regioni della rete, calendario a due mesi (intervallo per i soggiorni,
 * giorno per il resto), Individuali/Gruppi con adulti e bambini.
 * Il luogo filtra l'elenco; date e persone precompilano la scheda.
 */
export interface Filtri {
  regione: string
  dal: string
  al: string
  gruppo: boolean
  adulti: number
  bambini: number
  partecipanti: number
}

export const FILTRI_VUOTI: Filtri = { regione: '', dal: '', al: '', gruppo: false, adulti: 2, bambini: 0, partecipanti: 15 }

export const filtra = (cat: Categoria, f?: Filtri) =>
  OFFERTE.filter(o => o.cat === cat && (!f?.regione || o.regione === f.regione || o.regione === 'Italia'))

export const persone = (f: Filtri) => (f.gruppo ? f.partecipanti : f.adulti + f.bambini)

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daIso = (s: string) => { const [y, m, g] = s.split('-').map(Number); return new Date(y, m - 1, g) }
const breve = (s: string) => daIso(s).toLocaleDateString(loc(), { day: 'numeric', month: 'short' })

/** Giorni da oggi e notti, per precompilare la scheda. */
export const arrivoNotti = (f: Filtri) => {
  if (!f.dal) return { arrivo: 0, notti: 2 }
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const g = Math.round((daIso(f.dal).getTime() - oggi.getTime()) / 864e5)
  const notti = f.al ? Math.max(1, Math.round((daIso(f.al).getTime() - daIso(f.dal).getTime()) / 864e5)) : 2
  return { arrivo: Math.max(0, g), notti }
}

/** Riepilogo leggibile dei parametri (sottotitolo dell'elenco). */
export const sintesi = (f?: Filtri) => {
  if (!f) return ''
  const quando = f.dal ? (f.al ? `${breve(f.dal)} → ${breve(f.al)}` : breve(f.dal)) : ''
  const chi = f.gruppo ? t('gruppo di {n}', { n: f.partecipanti }) : t('{n} persone', { n: persone(f) })
  return [f.regione ? t(nomeBreve(f.regione)) : '', quando, (f.regione || quando) ? chi : ''].filter(Boolean).join(' · ')
}

// Regioni con almeno un'offerta della rete: le altre restano spente
const REGIONI_RETE = Array.from(new Set(OFFERTE.map(o => o.regione)))
const nomeBreve = (n: string) => n.split('/')[0]
// Calendario nella lingua del sito
const LOCALI_CAL = { it, en: enGB, de, fr, es }

// In tedesco i nomi restano maiuscoli
const minuscolo = (s: string) => (linguaCorrente() === 'de' ? s : s.toLowerCase())

type Pannello = 'dove' | 'quando' | 'chi' | null

function Passi({ titolo, nota, valore, min, max, onChange }: {
  titolo: string; nota: string; valore: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="snw-ric__riga">
      <span><b>{titolo}</b><small>{nota}</small></span>
      <span className="snw-ric__passi" role="group" aria-label={titolo}>
        <button type="button" aria-label={t('Meno {cosa}', { cosa: minuscolo(titolo) })} disabled={valore <= min} onClick={() => onChange(valore - 1)}>
          <i className="fa-light fa-minus" aria-hidden="true" />
        </button>
        <output aria-live="polite">{valore}</output>
        <button type="button" aria-label={t('Più {cosa}', { cosa: minuscolo(titolo) })} disabled={valore >= max} onClick={() => onChange(valore + 1)}>
          <i className="fa-light fa-plus" aria-hidden="true" />
        </button>
      </span>
    </div>
  )
}

export default function SnwRicerca({ cat, onCat, f, onF, onCerca }: {
  cat: Categoria
  /** Presente nella barra: si sceglie anche la categoria. */
  onCat?: (c: Categoria) => void
  f: Filtri
  onF: (f: Filtri) => void
  /** Pulsante tondo: nella barra apre i risultati, in pagina chiude il pannello. */
  onCerca?: () => void
}) {
  const [aperto, setAperto] = useState<Pannello>(null)
  const set = (p: Partial<Filtri>) => onF({ ...f, ...p })
  const n = filtra(cat, f).length
  const sogg = cat === 'soggiorni'
  const conta = (r: string) => OFFERTE.filter(o => o.cat === cat && o.regione === r).length
  const tocca = (p: Pannello) => setAperto(a => (a === p ? null : p))
  const segmenti: { id: Exclude<Pannello, null>; tit: string; val: string; vuoto: string }[] = [
    { id: 'dove', tit: t('Dove'), val: f.regione ? t(nomeBreve(f.regione)) : '', vuoto: t('ti piacerebbe andare') },
    { id: 'quando', tit: t('Quando'), val: f.dal ? (sogg && f.al ? `${breve(f.dal)} → ${breve(f.al)}` : breve(f.dal)) : '', vuoto: t('vorresti farlo') },
    { id: 'chi', tit: t('Chi'), val: f.gruppo ? t('Gruppo · {n}', { n: f.partecipanti }) : persone(f) === 1 ? t('1 persona') : t('{n} persone', { n: persone(f) }), vuoto: '' },
  ]
  const indice = segmenti.findIndex(s => s.id === aperto)
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const locale = LOCALI_CAL[linguaCorrente()]
  const range: DateRange | undefined = f.dal ? { from: daIso(f.dal), to: f.al ? daIso(f.al) : undefined } : undefined

  return (
    <div className={`snw-ric ${aperto ? 'snw-ric--aperta' : ''}`}>
      {onCat && (
        <div className="snw-ric__cat" role="radiogroup" aria-label={t('Cosa cerchi')}>
          {CATEGORIE.map(c => (
            <button key={c.id} type="button" role="radio" aria-checked={cat === c.id}
              className={cat === c.id ? 'snw-ric__cat-voce snw-ric__cat-voce--on' : 'snw-ric__cat-voce'} onClick={() => onCat(c.id)}>
              <i className={`fa-light ${c.icona}`} aria-hidden="true" />{t(c.nome)}
            </button>
          ))}
        </div>
      )}

      <div className="snw-ric__pillola">
        {indice >= 0 && <span className={`snw-ric__evidenza snw-ric__evidenza--${indice}`} aria-hidden="true" />}
        {segmenti.map(s => (
          <button key={s.id} type="button" aria-expanded={aperto === s.id}
            className={aperto === s.id ? 'snw-ric__seg snw-ric__seg--on' : 'snw-ric__seg'} onClick={() => tocca(s.id)}>
            <b>{s.tit}</b>
            <span className={s.val ? 'snw-ric__val' : 'snw-ric__val snw-ric__val--vuoto'}>{s.val || s.vuoto}</span>
          </button>
        ))}
        <button type="button" className="snw-ric__vai" disabled={!n} aria-label={t('Mostra {n} risultati', { n })}
          onClick={() => { setAperto(null); onCerca?.() }}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <span key={n} className="snw-ric__n">{n}</span>
        </button>
      </div>

      {aperto && (
        <div key={aperto} className={`snw-ric__pannello snw-ric__pannello--${aperto}`}>
          {aperto === 'dove' && (
            <div className="snw-ric__dove">
              <svg className="snw-ric__mappa" viewBox={`0 0 ${ITALY_VIEWBOX.w} ${ITALY_VIEWBOX.h}`} role="group" aria-label={t('Mappa delle regioni')}>
                {REGIONS.map(r => {
                  const attiva = REGIONI_RETE.includes(r.n) && conta(r.n) > 0
                  const cls = f.regione === r.n ? 'snw-ric__reg snw-ric__reg--sel' : attiva ? 'snw-ric__reg snw-ric__reg--rete' : 'snw-ric__reg'
                  return (
                    <path key={r.c} d={r.d} className={cls} aria-label={t(nomeBreve(r.n))}
                      onClick={attiva ? () => set({ regione: f.regione === r.n ? '' : r.n }) : undefined} />
                  )
                })}
              </svg>
              <ul className="snw-ric__regioni">
                <li>
                  <button type="button" className={!f.regione ? 'snw-ric__reg-voce snw-ric__reg-voce--on' : 'snw-ric__reg-voce'} onClick={() => set({ regione: '' })}>
                    <i className="fa-light fa-earth-europe" aria-hidden="true" /><span>{t('Ovunque')}</span><small>{OFFERTE.filter(o => o.cat === cat).length}</small>
                  </button>
                </li>
                {REGIONS.filter(r => conta(r.n) > 0).map(r => (
                  <li key={r.c}>
                    <button type="button" className={f.regione === r.n ? 'snw-ric__reg-voce snw-ric__reg-voce--on' : 'snw-ric__reg-voce'}
                      onClick={() => set({ regione: f.regione === r.n ? '' : r.n })}>
                      <i className="fa-light fa-location-dot" aria-hidden="true" /><span>{t(nomeBreve(r.n))}</span><small>{conta(r.n)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aperto === 'quando' && (
            sogg ? (
              <DayPicker mode="range" numberOfMonths={2} locale={locale} weekStartsOn={1} disabled={{ before: oggi }} className="snw-ric__cal"
                selected={range} onSelect={r => set({ dal: r?.from ? iso(r.from) : '', al: r?.to ? iso(r.to) : '' })} />
            ) : (
              <DayPicker mode="single" numberOfMonths={2} locale={locale} weekStartsOn={1} disabled={{ before: oggi }} className="snw-ric__cal"
                selected={f.dal ? daIso(f.dal) : undefined} onSelect={d => set({ dal: d ? iso(d) : '', al: '' })} />
            )
          )}

          {aperto === 'chi' && (
            <div className="snw-ric__chi">
              <div className="snw-ric__tipo" role="radiogroup" aria-label={t('Tipo di viaggio')}>
                <button type="button" role="radio" aria-checked={!f.gruppo} className={!f.gruppo ? 'snw-ric__tipo-voce snw-ric__tipo-voce--on' : 'snw-ric__tipo-voce'} onClick={() => set({ gruppo: false })}>{t('Individuali')}</button>
                <button type="button" role="radio" aria-checked={f.gruppo} className={f.gruppo ? 'snw-ric__tipo-voce snw-ric__tipo-voce--on' : 'snw-ric__tipo-voce'} onClick={() => set({ gruppo: true })}>{t('Gruppi')}</button>
              </div>
              {f.gruppo ? (
                <Passi titolo={t('Partecipanti')} nota={t('Gruppi da 10 persone in su')} valore={f.partecipanti} min={10} max={80} onChange={v => set({ partecipanti: v })} />
              ) : (
                <>
                  <Passi titolo={t('Adulti')} nota={t('Da 13 anni in su')} valore={f.adulti} min={1} max={12} onChange={v => set({ adulti: v })} />
                  <Passi titolo={t('Bambini')} nota={t('Da 2 a 12 anni')} valore={f.bambini} min={0} max={8} onChange={v => set({ bambini: v })} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
