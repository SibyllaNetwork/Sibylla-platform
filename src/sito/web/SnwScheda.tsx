import React, { useState } from 'react'
import { DatePickerField, DateRangeField } from '../../core/components/form'
import Tooltip from '../../core/components/Tooltip'
import { OFFERTE, eur, nomeCategoria, oggiIso, rigaDa, trova } from '../sitoData'
import { useSitoStore, versioneWeb } from '../useSitoStore'
import { loc, t, linguaCorrente } from '../i18n'
import { SnwEtichetta, SnwFoto, SnwPrezzo, SnwStepper, SnwVoto } from '../SnwUi'
import SnwCard from './SnwCard'
import './SnwScheda.sass'

/**
 * Scheda di un'offerta: galleria, descrizione, cosa include, informazioni
 * pratiche, recensioni e box di prenotazione (date/orario/quantità secondo la
 * categoria) con totale. Sotto, offerte simili.
 */
const RECENSIONI = [
  { nome: 'Giulia', paese: 'Milano', voto: 5, txt: 'Organizzazione impeccabile e una guida che ci ha fatto vedere Roma con altri occhi. Da rifare.' },
  { nome: 'Thomas', paese: 'Monaco di Baviera', voto: 5, txt: 'Puntuali, gentili e tutto esattamente come descritto. Il booking ci ha risposto in pochi minuti.' },
  { nome: 'Chiara', paese: 'Torino', voto: 4, txt: 'Bellissima esperienza, unico appunto: avrei voluto qualche minuto in più nelle soste.' },
]

export default function SnwScheda({ id }: { id: string }) {
  const o = trova(id)
  const vai = useSitoStore(s => s.vai)
  const aggiungi = useSitoStore(s => s.aggiungi)
  const preferiti = useSitoStore(s => s.preferiti)
  const preferito = useSitoStore(s => s.preferito)
  const versione = versioneWeb(useSitoStore(s => s.versione))
  const [fotoSel, setFotoSel] = useState(0)
  const ricerca = useSitoStore(s => s.ricerca)
  const daRicerca = o?.cat === 'soggiorni' && ricerca.dal >= oggiIso()
  const [data, setData] = useState(daRicerca ? ricerca.dal : oggiIso(7))
  const [dataFine, setDataFine] = useState(daRicerca ? ricerca.al : oggiIso(9))
  const [orario, setOrario] = useState(o?.orari?.[0])
  const [qta, setQta] = useState(daRicerca ? ricerca.camere : o?.unita === 'a persona' ? 2 : 1)
  if (!o) return <div className="snw__wrap"><p>{t('Offerta non trovata.')}</p></div>

  const sogg = o.cat === 'soggiorni'
  const prodotto = o.cat === 'prodotti'
  const riga = rigaDa(o, { qta, data: prodotto ? undefined : data, dataFine: sogg ? dataFine : undefined, orario: sogg || prodotto ? undefined : orario })
  const totale = riga.prezzo * qta
  const valido = prodotto || (sogg ? !!data && !!dataFine && dataFine > data : !!data)
  const fav = preferiti.includes(o.id)
  const simili = OFFERTE.filter(x => x.cat === o.cat && x.id !== o.id).slice(0, 3)
  const etichettaQta = t(sogg ? 'Camere' : prodotto ? 'Quantità' : o.unita === 'a persona' ? 'Partecipanti' : 'Quantità')

  return (
    <div className={`snw-sch snw-sch--${versione}`}>
      {versione === 'impatto' ? (
        // A · Impatto: foto a tutta larghezza con titolo sopra
        <section className="snw-sch__hero">
          <SnwFoto key={fotoSel} id={o.foto[fotoSel]} w={2000} h={1000} alt={t(o.titolo)} className="snw-sch__hero-foto" />
          <span className="snw-sch__hero-velo" />
          <div className="snw__wrap snw-sch__hero-in">
            <nav className="snw-cat__briciole" aria-label={t('Percorso')}>
        <button type="button" onClick={() => vai({ nome: 'home' })}>{t('Home')}</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" onClick={() => vai({ nome: 'catalogo', cat: o.cat })}>{t(nomeCategoria(o.cat))}</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{t(o.titolo)}</span>
      </nav>

            <div className="snw-sch__hero-riga">
              <div>
                <SnwEtichetta testo={o.etichetta} />
                <h1>{t(o.titolo)}</h1>
                <span className="snw-sch__sotto">
                  <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {t(o.citta)}, {t(o.regione)}</span>
                  <SnwVoto o={o} />
                  <span><i className="fa-solid fa-handshake" aria-hidden="true" /> {t('Partner')} {o.partner}</span>
                </span>
              </div>
              {o.foto.length > 1 && <div className="snw-sch__miniature">
            {o.foto.map((f, i) => (
              <button key={f} type="button" className={i === fotoSel ? 'snw-sch__mini snw-sch__mini--on' : 'snw-sch__mini'}
                aria-label={t('Foto {n}', { n: i + 1 })} aria-pressed={i === fotoSel} onClick={() => setFotoSel(i)}>
                <SnwFoto id={f} w={300} h={200} alt="" />
              </button>
            ))}
              </div>}
            </div>
          </div>
        </section>
      ) : (
        <div className="snw__wrap">
      <nav className="snw-cat__briciole" aria-label={t('Percorso')}>
        <button type="button" onClick={() => vai({ nome: 'home' })}>{t('Home')}</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" onClick={() => vai({ nome: 'catalogo', cat: o.cat })}>{t(nomeCategoria(o.cat))}</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{t(o.titolo)}</span>
      </nav>

      <header className="snw-sch__head">
        <div>
          <SnwEtichetta testo={o.etichetta} />
          <h1>{t(o.titolo)}</h1>
          <span className="snw-sch__sotto">
            <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {t(o.citta)}, {t(o.regione)}</span>
            <SnwVoto o={o} />
            <span><i className="fa-solid fa-handshake" aria-hidden="true" /> {t('Partner')} {o.partner}</span>
          </span>
        </div>
        <button type="button" className="sib-btn sib-btn--secondary" aria-pressed={fav} onClick={() => preferito(o.id)}>
          <i className={`${fav ? 'fa-solid' : 'fa-regular'} fa-heart`} aria-hidden="true" /> {fav ? t('Nei preferiti') : t('Salva')}
        </button>
      </header>

      <div className="snw-sch__galleria">
        <div className="snw-sch__foto-big"><SnwFoto id={o.foto[fotoSel]} w={1400} h={900} alt={t(o.titolo)} /></div>
        {o.foto.length > 1 && (
          <div className="snw-sch__miniature">
            {o.foto.map((f, i) => (
              <button key={f} type="button" className={i === fotoSel ? 'snw-sch__mini snw-sch__mini--on' : 'snw-sch__mini'}
                aria-label={t('Foto {n}', { n: i + 1 })} aria-pressed={i === fotoSel} onClick={() => setFotoSel(i)}>
                <SnwFoto id={f} w={300} h={200} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

        </div>
      )}

      <div className="snw__wrap">
      <div className="snw-sch__layout">
        <div className="snw-sch__testo">
          <section>
            <h2>{t(o.formula)}</h2>
            <p className="snw-sch__desc">{t(o.descrizione)}</p>
            <ul className="snw-sch__fatti">
              {o.durata && <li><i className="fa-light fa-clock" aria-hidden="true" /><span><b>{t('Durata')}</b>{t(o.durata)}</span></li>}
              {o.lingue && <li><i className="fa-light fa-language" aria-hidden="true" /><span><b>{t('Lingue')}</b>{o.lingue.map(l => t(l)).join(', ')}</span></li>}
              {o.incontro && <li><i className="fa-light fa-map-pin" aria-hidden="true" /><span><b>{t('Punto d\'incontro')}</b>{t(o.incontro)}</span></li>}
              <li>
                <i className={`fa-light ${o.cancellazione ? 'fa-calendar-check' : 'fa-calendar-xmark'}`} aria-hidden="true" />
                <span><b>{t('Cancellazione')}</b>{o.cancellazione ? t('Gratuita fino a 24 ore prima') : t('Non rimborsabile')}</span>
              </li>
              {prodotto && <li><i className="fa-light fa-truck-fast" aria-hidden="true" /><span><b>{t('Spedizione')}</b>{t('In 48 ore, gratuita sopra {soglia}', { soglia: eur(60) })}</span></li>}
            </ul>
          </section>

          <section>
            <h2>{t('Cosa è incluso')}</h2>
            <ul className="snw-sch__include">
              {o.include.map(x => <li key={x}><i className="fa-solid fa-check" aria-hidden="true" />{t(x)}</li>)}
            </ul>
          </section>

          <section>
            <h2>{t('Recensioni')}</h2>
            <div className="snw-sch__rec">
              <div className="snw-sch__rec-voto">
                <b>{o.voto.toLocaleString(loc(), { minimumFractionDigits: 1 })}</b>
                <span className="snw-sch__stelle" aria-label={t('{voto} su 5', { voto: o.voto.toLocaleString(loc()) })}>
                  {[1, 2, 3, 4, 5].map(n => <i key={n} className={`fa-solid ${n <= Math.round(o.voto) ? 'fa-star' : 'fa-star snw-sch__stella-off'}`} aria-hidden="true" />)}
                </span>
                <small>{t('{n} recensioni verificate', { n: o.recensioni.toLocaleString(loc()) })}</small>
              </div>
              <ul className="snw-sch__rec-barre">
                {[5, 4, 3, 2, 1].map(n => {
                  const q = n === 5 ? 78 : n === 4 ? 16 : n === 3 ? 4 : n === 2 ? 1 : 1
                  return (
                    <li key={n}>
                      <span>{n} <i className="fa-solid fa-star" aria-hidden="true" /></span>
                      <span className="snw-sch__barra"><span className={`snw-sch__fill snw-sch__w${Math.round(q / 5)}`} /></span>
                      <span>{q}%</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <ul className="snw-sch__citazioni">
              {RECENSIONI.map(r => (
                <li key={r.nome}>
                  <span className="snw-sch__stelle">{Array.from({ length: r.voto }, (_, i) => <i key={i} className="fa-solid fa-star" aria-hidden="true" />)}</span>
                  <p>«{t(r.txt)}»</p>
                  <small><b>{r.nome}</b> · {t(r.paese)}</small>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Box di prenotazione ──────────────────────────────────────── */}
        <aside className="snw-sch__box" aria-label={t('Prenotazione')}>
          <SnwPrezzo o={o} grande />
          <div className="snw-sch__box-campi">
            {sogg && (
              <DateRangeField lingua={linguaCorrente()} placeholder={t('Seleziona periodo')} label={t('Check-in e check-out')} nameFrom="in" nameTo="out" valueFrom={data} valueTo={dataFine} min={oggiIso()}
                onChangeFrom={e => setData(e.target.value)} onChangeTo={e => setDataFine(e.target.value)} />
            )}
            {!sogg && !prodotto && (
              <DatePickerField label={t('Data')} name="data" value={data} min={oggiIso()} onChange={e => setData(e.target.value)} />
            )}
            {!sogg && !prodotto && o.orari && (
              <div className="snw-sch__orari">
                <span className="snw-sch__lbl">{t('Orario')}</span>
                <div role="radiogroup" aria-label={t('Orario')}>
                  {o.orari.map(h => (
                    <button key={h} type="button" role="radio" aria-checked={orario === h}
                      className={orario === h ? 'snw-sch__ora snw-sch__ora--on' : 'snw-sch__ora'} onClick={() => setOrario(h)}>{t(h)}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="snw-sch__qta">
              <span className="snw-sch__lbl">{etichettaQta}</span>
              <SnwStepper valore={qta} onChange={setQta} etichetta={etichettaQta.toLowerCase()} max={prodotto ? 50 : 12} />
            </div>
          </div>
          <div className="snw-sch__tot">
            <span>{riga.dettaglio}</span>
            <span className="snw-sch__tot-val"><small>{t('Totale')}</small><b>{eur(totale)}</b></span>
          </div>
          <button type="button" className="sib-btn sib-btn--primary snw-sch__cta" disabled={!valido}
            onClick={() => { aggiungi(riga); vai({ nome: 'carrello' }) }}>
            {prodotto ? t('Acquista ora') : t('Prenota ora')}
          </button>
          <button type="button" className="sib-btn sib-btn--secondary snw-sch__cta" disabled={!valido} onClick={() => aggiungi(riga)}>
            <i className="fa-solid fa-cart-plus" aria-hidden="true" /> {t('Aggiungi al carrello')}
          </button>
          <ul className="snw-sch__rassicura">
            {o.cancellazione && <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> {t('Cancellazione gratuita')}</li>}
            <li><i className="fa-solid fa-lock" aria-hidden="true" /> {t('Pagamento protetto')}</li>
            <li>
              <i className="fa-solid fa-headset" aria-hidden="true" />
              <Tooltip text={t('Il booking centralizzato Sibylla risponde 7 giorni su 7')}><span>{t('Assistenza human touch')}</span></Tooltip>
            </li>
          </ul>
        </aside>
      </div>

      {simili.length > 0 && (
        <section className="snw-sch__simili">
          <h2>{t('Potrebbe interessarti anche')}</h2>
          <div className="snw-cat__griglia">{simili.map(x => <SnwCard key={x.id} o={x} />)}</div>
        </section>
      )}
      </div>
    </div>
  )
}
