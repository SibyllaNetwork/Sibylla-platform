import React, { useState } from 'react'
import { CheckboxField, InputField, RadioGroup, TextareaField } from '../../core/components/form'
import { PARTNER } from '../sitoData'
import { FASI_IMT, LEGALE, MISSION, PAGINE_INFO, POSIZIONI, PRODOTTI_ECOSISTEMA, SOCIETA, VALORI } from '../sitoContenuti'
import { PaginaInfo, useSitoStore } from '../useSitoStore'
import { t } from '../i18n'
import SnwTestata from './SnwTestata'
import './SnwInfo.sass'

/**
 * Pagine istituzionali (una per voce, come sul sito attuale): Chi siamo,
 * Partner, Programma I.M.T., Lavora con noi, Contatti, Dati societari,
 * Privacy e Cookie. Intestazione e veste seguono il formato scelto
 * (classi .snw--<versione> sulla radice del sito).
 */
type TipoPartner = keyof typeof PARTNER
const TIPI: { id: TipoPartner; nome: string; icona: string; prod: string }[] = [
  { id: 'hotel', nome: 'Hotel', icona: 'fa-hotel', prod: 'Sibylla Platform' },
  { id: 'to', nome: 'Tour operator', icona: 'fa-route', prod: 'Sibylla Tableau' },
  { id: 'fornitori', nome: 'Fornitori', icona: 'fa-store', prod: 'Sibylla Agorà' },
]

const iniziali = (s: string) => s.replace(/[^A-Za-zÀ-ú ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export default function SnwInfo({ id }: { id: PaginaInfo }) {
  const vai = useSitoStore(s => s.vai)
  const p = PAGINE_INFO[id]
  const legale = id === 'privacy' || id === 'cookie' || id === 'termini'
  return (
    <div className="snw-inf">
      <SnwTestata kicker={t(p.kicker)} titolo={t(p.titolo)} enfasi={p.enfasi && t(p.enfasi)} sotto={t(p.sotto)} foto={p.foto} icona={p.icona}
        briciole={[{ nome: legale ? t('Documenti legali') : t('La rete'), vai: legale ? undefined : { nome: 'rete' } }, { nome: `${t(p.titolo)} ${p.enfasi ? t(p.enfasi) : ''}`.trim() }]}
        extra={id === 'contatti' || id === 'chi-siamo' ? <Diretti /> : undefined} />
      <div className="snw__wrap snw-inf__corpo">
        {id === 'chi-siamo' && <ChiSiamo />}
        {id === 'partner' && <Partner />}
        {id === 'imt' && <Imt />}
        {id === 'lavora' && <Lavora />}
        {id === 'contatti' && <Contatti />}
        {id === 'societa' && <Societa />}
        {id === 'mission' && <Mission />}
        {legale && <Legale id={id} />}

        <nav className="snw-inf__altre" aria-label={t('Altre pagine')}>
          {(Object.keys(PAGINE_INFO) as PaginaInfo[]).filter(k => k !== id).map(k => (
            <button key={k} type="button" onClick={() => vai({ nome: 'info', id: k })}>
              <i className={`fa-light ${PAGINE_INFO[k].icona}`} aria-hidden="true" />
              {PAGINE_INFO[k].kicker === 'Documenti legali' ? `${t(PAGINE_INFO[k].titolo)} ${t(PAGINE_INFO[k].enfasi ?? '')}` : t(PAGINE_INFO[k].kicker)}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Diretti() {
  return (
    <ul className="snw-inf__diretti">
      <li><i className="fa-solid fa-phone" aria-hidden="true" /> +39 06 91714070</li>
      <li><i className="fa-solid fa-envelope" aria-hidden="true" /> info@sibyllanetwork.com</li>
      <li><i className="fa-solid fa-location-dot" aria-hidden="true" /> Via Vicenza 5/A, Roma</li>
    </ul>
  )
}

function ChiSiamo() {
  const vai = useSitoStore(s => s.vai)
  return (
    <>
      <section className="snw-inf__sez snw-inf__due snw-reveal">
        <h2>{t('Non un semplice portale turistico')}</h2>
        <div>
          <p>{t("Attraverso il nostro marketplace puoi prenotare soggiorni selezionati, vivere esperienze autentiche e acquistare prodotti locali ovunque tu sia. Ma dietro ogni clic c'è molto di più: un progetto umano, collaborativo e guidato da una visione sistemica del turismo.")}</p>
          <p>{t("Sibylla Network è una rete diffusa di esperienze, persone e servizi che lavora insieme per offrire valore reale, condiviso e tracciabile. Ogni acquisto che fai supporta un'economia più locale, più umana, più intelligente.")}</p>
        </div>
      </section>
      <section className="snw-inf__sez snw-reveal">
        <h2>{t('Perché Sibylla Network è diverso')}</h2>
        <div className="snw-inf__card4">
          {VALORI.map((v, i) => (
            <article key={v.tit} className="snw-inf__card">
              <span className="snw-inf__n">0{i + 1}</span>
              <i className={`fa-light ${v.icona}`} aria-hidden="true" />
              <h3>{t(v.tit)}</h3>
              <p>{t(v.txt)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="snw-inf__banda snw-reveal">
        <div>
          <h2>{t('Partecipa anche tu')}</h2>
          <p>{t('Gestisci una struttura, offri esperienze o sei un fornitore? Entra nella rete Sibylla.')}</p>
        </div>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'info', id: 'contatti' })}>{t('Diventa partner')} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
      </section>
    </>
  )
}

function Partner() {
  const [tipo, setTipo] = useState<TipoPartner>('hotel')
  const sel = TIPI.find(x => x.id === tipo)!
  return (
    <section className="snw-inf__sez snw-inf__partner snw-reveal">
      <div className="snw-inf__tipi" role="tablist" aria-label={t('Categoria partner')}>
        {TIPI.map(x => (
          <button key={x.id} type="button" role="tab" aria-selected={tipo === x.id}
            className={tipo === x.id ? 'snw-inf__tipo snw-inf__tipo--on' : 'snw-inf__tipo'} onClick={() => setTipo(x.id)}>
            <i className={`fa-light ${x.icona}`} aria-hidden="true" />
            <b>{t(x.nome)}</b>
            <small>{t('{n} aziende', { n: PARTNER[x.id].length })} · {x.prod}</small>
          </button>
        ))}
      </div>
      <div>
        <h2>{t('{tipo}: aziende associate', { tipo: t(sel.nome) })}</h2>
        <ul className="snw-inf__aziende" key={tipo}>
          {PARTNER[tipo].map(a => <li key={a}><span className="snw-inf__iniz">{iniziali(a)}</span>{a}</li>)}
        </ul>
      </div>
    </section>
  )
}

function Imt() {
  const [fase, setFase] = useState(1)
  const f = FASI_IMT.find(x => x.fase === fase)!
  return (
    <>
      <section className="snw-inf__sez snw-reveal">
        <div className="snw-inf__fasi" role="tablist" aria-label={t('Fasi del programma')}>
          {FASI_IMT.map(x => (
            <button key={x.fase} type="button" role="tab" aria-selected={fase === x.fase}
              className={fase === x.fase ? 'snw-inf__fase snw-inf__fase--on' : 'snw-inf__fase'} onClick={() => setFase(x.fase)}>
              <b>{t('Fase {n}', { n: x.fase })}</b><small>{t(x.stato)}</small>
            </button>
          ))}
        </div>
        {f.obiettivi.length ? (
          <div className="snw-inf__card3" key={fase}>
            {f.obiettivi.map((o, i) => (
              <article key={o.tit} className="snw-inf__card">
                <span className="snw-inf__n">0{i + 1}</span>
                <h3>{t(o.tit)}</h3>
                <p>{t(o.txt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="snw-inf__vuoto"><i className="fa-light fa-hourglass-half" aria-hidden="true" /> {t("Gli obiettivi della fase {n} saranno pubblicati all'avvio della fase.", { n: fase })}</p>
        )}
      </section>
      <section className="snw-inf__sez snw-reveal">
        <h2>{t('Documenti')}</h2>
        <div className="snw-inf__doc">
          {['Regolamento decoro urbano', 'Contratto di rete I.M.T.'].map(d => (
            <button key={d} type="button"><i className="fa-regular fa-file-pdf" aria-hidden="true" /><span><b>{t(d)}</b><small>{t('PDF · scarica')}</small></span></button>
          ))}
        </div>
      </section>
    </>
  )
}

function Lavora() {
  const [pos, setPos] = useState(POSIZIONI[0].id)
  const [privacy, setPrivacy] = useState(false)
  const [inviato, setInviato] = useState(false)
  const [cv, setCv] = useState('')
  return (
    <section className="snw-inf__sez snw-inf__lavora snw-reveal">
      <div>
        <h2>{t('Posizioni aperte')} <small>{t('{n} ruoli', { n: POSIZIONI.length })}</small></h2>
        <ul className="snw-inf__pos">
          {POSIZIONI.map(x => (
            <li key={x.id}>
              <button type="button" className={pos === x.id ? 'snw-inf__ruolo snw-inf__ruolo--on' : 'snw-inf__ruolo'} onClick={() => setPos(x.id)}>
                <b>{x.tit}</b>
                <small><i className="fa-solid fa-location-dot" aria-hidden="true" /> {t(x.luogo)}</small>
                <span>{t(x.txt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="snw-inf__form-box">
        {inviato ? (
          <div className="snw-inf__grazie">
            <i className="fa-light fa-paper-plane" aria-hidden="true" />
            <b>{t('Candidatura inviata')}</b>
            <span>{t('Grazie! Il team HR ti risponderà entro due settimane.')}</span>
          </div>
        ) : (
          <form className="snw-inf__form" onSubmit={e => { e.preventDefault(); if (privacy) setInviato(true) }}>
            <h2>{t('Candidati')}</h2>
            <div className="snw-inf__form2">
              <InputField name="c-nome" label={t('Nome')} required />
              <InputField name="c-cognome" label={t('Cognome')} required />
              <InputField name="c-mail" type="email" label={t('E-mail')} required />
              <InputField name="c-tel" type="tel" label={t('Telefono')} />
            </div>
            <RadioGroup name="c-pos" label={t('Posizione')} value={pos} onChange={setPos} options={POSIZIONI.map(x => ({ value: x.id, label: x.tit }))} />
            <label className="snw-inf__file">
              <i className="fa-light fa-file-arrow-up" aria-hidden="true" />
              <span><b>{cv || t('Carica il tuo CV')}</b><small>pdf, doc, docx</small></span>
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setCv(e.target.files?.[0]?.name ?? '')} />
            </label>
            <TextareaField name="c-msg" label={t('Messaggio')} rows={4} />
            <CheckboxField name="c-privacy" label={t('Accetto le condizioni di privacy')} checked={privacy} onChange={e => setPrivacy(e.target.checked)} />
            <button type="submit" className="sib-btn sib-btn--primary" disabled={!privacy}>{t('Invia la candidatura')}</button>
          </form>
        )}
      </div>
    </section>
  )
}

function Contatti() {
  const [privacy, setPrivacy] = useState(false)
  const [inviato, setInviato] = useState(false)
  const [chi, setChi] = useState('viaggiatore')
  return (
    <section className="snw-inf__sez snw-inf__contatti snw-reveal">
      <div className="snw-inf__pro">
        <h2>{t('Sei un professionista del settore?')}</h2>
        <p>{t("Se gestisci strutture ricettive, offri esperienze sul territorio o sei un fornitore, puoi entrare nell'ecosistema Sibylla. Compila il modulo: ti contatteremo per costruire insieme nuove opportunità di visibilità, vendita e crescita.")}</p>
        <ul>
          <li><i className="fa-solid fa-check" aria-hidden="true" /> {t('Vetrina sul sito e sui totem della rete')}</li>
          <li><i className="fa-solid fa-check" aria-hidden="true" /> {t('Booking centralizzato human touch')}</li>
          <li><i className="fa-solid fa-check" aria-hidden="true" /> {t('Acquisti condivisi con Sibylla Agorà')}</li>
        </ul>
      </div>
      <div className="snw-inf__form-box">
        {inviato ? (
          <div className="snw-inf__grazie">
            <i className="fa-light fa-paper-plane" aria-hidden="true" />
            <b>{t('Messaggio inviato')}</b>
            <span>{t('Ti risponderemo entro un giorno lavorativo.')}</span>
          </div>
        ) : (
          <form className="snw-inf__form" onSubmit={e => { e.preventDefault(); if (privacy) setInviato(true) }}>
            <RadioGroup name="m-chi" label={t('Scrivi come')} value={chi} onChange={setChi}
              options={[{ value: 'viaggiatore', label: t('Viaggiatore') }, { value: 'struttura', label: t('Struttura') }, { value: 'fornitore', label: t('Fornitore') }]} />
            <InputField name="m-nome" label={t('Nominativo')} required />
            <InputField name="m-mail" type="email" label={t('E-mail')} required />
            <TextareaField name="m-msg" label={t('Messaggio')} rows={5} />
            <CheckboxField name="m-privacy" label={t('Accetto le condizioni di privacy')} checked={privacy} onChange={e => setPrivacy(e.target.checked)} />
            <button type="submit" className="sib-btn sib-btn--primary" disabled={!privacy}>{t('Invia')}</button>
          </form>
        )}
      </div>
    </section>
  )
}

function Mission() {
  return (
    <section className="snw-inf__sez snw-inf__mission snw-reveal">
      <div>{MISSION.map(p => <p key={p.slice(0, 24)}>{t(p)}</p>)}</div>
      <div className="snw-inf__eco">
        {PRODOTTI_ECOSISTEMA.map(x => (
          <article key={x.nome}>
            <i className={`fa-light ${x.icona}`} aria-hidden="true" />
            <span><b>{x.nome}</b><small>{t(x.per)}</small></span>
            <a className="sib-btn sib-btn--primary" href={x.url} target="_blank" rel="noreferrer">{t('Vai al sito')} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></a>
          </article>
        ))}
      </div>
    </section>
  )
}

function Societa() {
  return (
    <section className="snw-inf__sez snw-reveal">
      <dl className="snw-inf__societa">
        {SOCIETA.map(x => <div key={x.k}><dt>{t(x.k)}</dt><dd>{x.v}</dd></div>)}
      </dl>
    </section>
  )
}

function Legale({ id }: { id: 'privacy' | 'cookie' | 'termini' }) {
  return (
    <section className="snw-inf__sez snw-inf__legale snw-reveal">
      <nav aria-label={t('Indice')}>
        <b>{t('Indice')}</b>
        <ol>{LEGALE[id].map((v, i) => <li key={v}><a href={`#snw-leg-${i}`}>{t(v)}</a></li>)}</ol>
      </nav>
      <div>
        <p className="snw-inf__avviso"><i className="fa-solid fa-circle-info" aria-hidden="true" /> {t("Struttura del documento: il testo legale definitivo va fornito dall'ufficio legale di Sibylla S.r.l.")}</p>
        {LEGALE[id].map((v, i) => (
          <article key={v} id={`snw-leg-${i}`}>
            <h3>{i + 1}. {t(v)}</h3>
            <p className="snw-inf__segnaposto">{t('Testo da inserire.')}</p>
          </article>
        ))}
        <p className="snw-inf__agg">{t('Ultimo aggiornamento: da definire')}</p>
      </div>
    </section>
  )
}
