import React, { useState } from 'react'
import { DatePickerField, DateRangeField } from '../../core/components/form'
import Tooltip from '../../core/components/Tooltip'
import { OFFERTE, eur, nomeCategoria, oggiIso, rigaDa, trova } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
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
  const versione = useSitoStore(s => s.versione)
  const [fotoSel, setFotoSel] = useState(0)
  const [data, setData] = useState(oggiIso(7))
  const [dataFine, setDataFine] = useState(oggiIso(9))
  const [orario, setOrario] = useState(o?.orari?.[0])
  const [qta, setQta] = useState(o?.unita === 'a persona' ? 2 : 1)
  if (!o) return <div className="snw__wrap"><p>Offerta non trovata.</p></div>

  const sogg = o.cat === 'soggiorni'
  const prodotto = o.cat === 'prodotti'
  const riga = rigaDa(o, { qta, data: prodotto ? undefined : data, dataFine: sogg ? dataFine : undefined, orario: sogg || prodotto ? undefined : orario })
  const totale = riga.prezzo * qta
  const valido = prodotto || (sogg ? !!data && !!dataFine && dataFine > data : !!data)
  const fav = preferiti.includes(o.id)
  const simili = OFFERTE.filter(x => x.cat === o.cat && x.id !== o.id).slice(0, 3)
  const etichettaQta = sogg ? 'Camere' : prodotto ? 'Quantità' : o.unita === 'a persona' ? 'Partecipanti' : 'Quantità'

  return (
    <div className={`snw-sch snw-sch--${versione}`}>
      {versione === 'impatto' ? (
        // A · Impatto: foto a tutta larghezza con titolo sopra
        <section className="snw-sch__hero">
          <SnwFoto key={fotoSel} id={o.foto[fotoSel]} w={2000} h={1000} alt={o.titolo} className="snw-sch__hero-foto" />
          <span className="snw-sch__hero-velo" />
          <div className="snw__wrap snw-sch__hero-in">
            <nav className="snw-cat__briciole" aria-label="Percorso">
        <button type="button" onClick={() => vai({ nome: 'home' })}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" onClick={() => vai({ nome: 'catalogo', cat: o.cat })}>{nomeCategoria(o.cat)}</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{o.titolo}</span>
      </nav>

            <div className="snw-sch__hero-riga">
              <div>
                <SnwEtichetta testo={o.etichetta} />
                <h1>{o.titolo}</h1>
                <span className="snw-sch__sotto">
                  <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {o.citta}, {o.regione}</span>
                  <SnwVoto o={o} />
                  <span><i className="fa-solid fa-handshake" aria-hidden="true" /> Partner {o.partner}</span>
                </span>
              </div>
              {o.foto.length > 1 && <div className="snw-sch__miniature">
            {o.foto.map((f, i) => (
              <button key={f} type="button" className={i === fotoSel ? 'snw-sch__mini snw-sch__mini--on' : 'snw-sch__mini'}
                aria-label={`Foto ${i + 1}`} aria-pressed={i === fotoSel} onClick={() => setFotoSel(i)}>
                <SnwFoto id={f} w={300} h={200} alt="" />
              </button>
            ))}
              </div>}
            </div>
          </div>
        </section>
      ) : (
        <div className="snw__wrap">
      <nav className="snw-cat__briciole" aria-label="Percorso">
        <button type="button" onClick={() => vai({ nome: 'home' })}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" onClick={() => vai({ nome: 'catalogo', cat: o.cat })}>{nomeCategoria(o.cat)}</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{o.titolo}</span>
      </nav>

      <header className="snw-sch__head">
        <div>
          <SnwEtichetta testo={o.etichetta} />
          <h1>{o.titolo}</h1>
          <span className="snw-sch__sotto">
            <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {o.citta}, {o.regione}</span>
            <SnwVoto o={o} />
            <span><i className="fa-solid fa-handshake" aria-hidden="true" /> Partner {o.partner}</span>
          </span>
        </div>
        <button type="button" className="sib-btn sib-btn--secondary" aria-pressed={fav} onClick={() => preferito(o.id)}>
          <i className={`${fav ? 'fa-solid' : 'fa-regular'} fa-heart`} aria-hidden="true" /> {fav ? 'Nei preferiti' : 'Salva'}
        </button>
      </header>

      <div className="snw-sch__galleria">
        <div className="snw-sch__foto-big"><SnwFoto id={o.foto[fotoSel]} w={1400} h={900} alt={o.titolo} /></div>
        {o.foto.length > 1 && (
          <div className="snw-sch__miniature">
            {o.foto.map((f, i) => (
              <button key={f} type="button" className={i === fotoSel ? 'snw-sch__mini snw-sch__mini--on' : 'snw-sch__mini'}
                aria-label={`Foto ${i + 1}`} aria-pressed={i === fotoSel} onClick={() => setFotoSel(i)}>
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
            <h2>{o.formula}</h2>
            <p className="snw-sch__desc">{o.descrizione}</p>
            <ul className="snw-sch__fatti">
              {o.durata && <li><i className="fa-light fa-clock" aria-hidden="true" /><span><b>Durata</b>{o.durata}</span></li>}
              {o.lingue && <li><i className="fa-light fa-language" aria-hidden="true" /><span><b>Lingue</b>{o.lingue.join(', ')}</span></li>}
              {o.incontro && <li><i className="fa-light fa-map-pin" aria-hidden="true" /><span><b>Punto d'incontro</b>{o.incontro}</span></li>}
              <li>
                <i className={`fa-light ${o.cancellazione ? 'fa-calendar-check' : 'fa-calendar-xmark'}`} aria-hidden="true" />
                <span><b>Cancellazione</b>{o.cancellazione ? 'Gratuita fino a 24 ore prima' : 'Non rimborsabile'}</span>
              </li>
              {prodotto && <li><i className="fa-light fa-truck-fast" aria-hidden="true" /><span><b>Spedizione</b>In 48 ore, gratuita sopra 60 €</span></li>}
            </ul>
          </section>

          <section>
            <h2>Cosa è incluso</h2>
            <ul className="snw-sch__include">
              {o.include.map(x => <li key={x}><i className="fa-solid fa-check" aria-hidden="true" />{x}</li>)}
            </ul>
          </section>

          <section>
            <h2>Recensioni</h2>
            <div className="snw-sch__rec">
              <div className="snw-sch__rec-voto">
                <b>{o.voto.toLocaleString('it-IT', { minimumFractionDigits: 1 })}</b>
                <span className="snw-sch__stelle" aria-label={`${o.voto} su 5`}>
                  {[1, 2, 3, 4, 5].map(n => <i key={n} className={`fa-solid ${n <= Math.round(o.voto) ? 'fa-star' : 'fa-star snw-sch__stella-off'}`} aria-hidden="true" />)}
                </span>
                <small>{o.recensioni.toLocaleString('it-IT')} recensioni verificate</small>
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
                  <p>«{r.txt}»</p>
                  <small><b>{r.nome}</b> · {r.paese}</small>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Box di prenotazione ──────────────────────────────────────── */}
        <aside className="snw-sch__box" aria-label="Prenotazione">
          <SnwPrezzo o={o} grande />
          <div className="snw-sch__box-campi">
            {sogg && (
              <DateRangeField label="Check-in e check-out" nameFrom="in" nameTo="out" valueFrom={data} valueTo={dataFine} min={oggiIso()}
                onChangeFrom={e => setData(e.target.value)} onChangeTo={e => setDataFine(e.target.value)} />
            )}
            {!sogg && !prodotto && (
              <DatePickerField label="Data" name="data" value={data} min={oggiIso()} onChange={e => setData(e.target.value)} />
            )}
            {!sogg && !prodotto && o.orari && (
              <div className="snw-sch__orari">
                <span className="snw-sch__lbl">Orario</span>
                <div role="radiogroup" aria-label="Orario">
                  {o.orari.map(h => (
                    <button key={h} type="button" role="radio" aria-checked={orario === h}
                      className={orario === h ? 'snw-sch__ora snw-sch__ora--on' : 'snw-sch__ora'} onClick={() => setOrario(h)}>{h}</button>
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
            <span className="snw-sch__tot-val"><small>Totale</small><b>{eur(totale)}</b></span>
          </div>
          <button type="button" className="sib-btn sib-btn--primary snw-sch__cta" disabled={!valido}
            onClick={() => { aggiungi(riga); vai({ nome: 'carrello' }) }}>
            {prodotto ? 'Acquista ora' : 'Prenota ora'}
          </button>
          <button type="button" className="sib-btn sib-btn--secondary snw-sch__cta" disabled={!valido} onClick={() => aggiungi(riga)}>
            <i className="fa-solid fa-cart-plus" aria-hidden="true" /> Aggiungi al carrello
          </button>
          <ul className="snw-sch__rassicura">
            {o.cancellazione && <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> Cancellazione gratuita</li>}
            <li><i className="fa-solid fa-lock" aria-hidden="true" /> Pagamento protetto</li>
            <li>
              <i className="fa-solid fa-headset" aria-hidden="true" />
              <Tooltip text="Il booking centralizzato Sibylla risponde 7 giorni su 7"><span>Assistenza human touch</span></Tooltip>
            </li>
          </ul>
        </aside>
      </div>

      {simili.length > 0 && (
        <section className="snw-sch__simili">
          <h2>Potrebbe interessarti anche</h2>
          <div className="snw-cat__griglia">{simili.map(x => <SnwCard key={x.id} o={x} />)}</div>
        </section>
      )}
      </div>
    </div>
  )
}
