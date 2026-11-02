import FlagCircle from '../../../../core/components/FlagCircle'
import { pagamentoOk, type CameraProposta, type PreventivoSoggiorno, type TentativoPagamento } from '../../../../store/usePreventiviSoggiornoStore'
import { useTemplate } from '../../../../store/useTemplatePreventivoStore'
import { LINGUE } from '../CreaPreventivo/lingue'
import { LETTERE, SERVIZI, UNITA, conto, costoExtra, eur, fotoCamera, nottiDate, ospitiLabel, periodo, tariffa } from '../CreaPreventivo/soggiorno'
import { chiaveStato, iconaStato, scadenzaSoggiorno, type StatoDettaglio } from './statoPreventivo'
import './DettaglioSoggiorno.sass'

// ─── Dettaglio di un preventivo di soggiorno (riga espansa di I miei preventivi) ─
//  Tutto quello che si è inserito in Crea preventivo, in sola lettura: stato
//  con il perché, passaggi (creato → inviato → risposta → pagamento), cliente,
//  invio, proposte con camere, servizi, extra e conto, tentativi di pagamento.

const giornoLungo = (d: Date) => d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const dataOraIso = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const iconaServizio = (s: string) => SERVIZI.find(([n]) => n === s)?.[1] ?? 'fa-check'

/** Prezzo a notte della camera: unico, o "da… a…" con le tariffe giorno per giorno. */
function prezzoNotte(c: CameraProposta, date: string[]) {
  const prezzi = date.length ? date.map((d) => tariffa(c, d)) : [c.prezzoNotte]
  const min = Math.min(...prezzi); const max = Math.max(...prezzi)
  return min === max ? `${eur(min)} a notte` : `da ${eur(min)} a ${eur(max)} a notte`
}

function frase(p: PreventivoSoggiorno, s: StatoDettaglio, scadenza: Date) {
  const i = p.proposte.findIndex((q) => q.id === p.accettata)
  const q = p.proposte[i]
  const extra = q?.extra.filter((e) => p.extraScelti?.includes(e.id)) ?? []
  const ok = pagamentoOk(p)
  const scelta = q && (
    <>
      <strong>{p.cliente}</strong> ha scelto la proposta {LETTERE[i]}{q.titolo ? ` "${q.titolo}"` : ''}{p.rispostaIl ? ` il ${p.rispostaIl}` : ''}
      {extra.length > 0 && <>, aggiungendo {extra.map((e) => e.nome).join(', ')}</>}. Totale <strong>{eur(conto(q, p.extraScelti).totaleConExtra)}</strong>.
    </>
  )
  switch (s.stato) {
    case 'Bozza':
      return <>Bozza creata il {p.creato}: non è ancora stata inviata{p.cliente ? <> a <strong>{p.cliente}</strong></> : ''}.</>
    case 'Inviato':
      return <>Inviato a <strong>{p.email}</strong>{p.inviatoIl ? ` il ${p.inviatoIl}` : ''}: in attesa della scelta del cliente. Scade il {giornoLungo(scadenza)}.</>
    case 'Letto':
      return <><strong>{p.cliente}</strong> ha aperto la mail{p.inviatoIl ? ` inviata il ${p.inviatoIl}` : ''}, ma non ha ancora scelto. Scade il {giornoLungo(scadenza)}.</>
    case 'Accettato':
      return <>{scelta}{p.terminiAccettati && <> Ha accettato i {p.terminiAccettati}.</>}</>
    case 'Confermato':
      return <>{scelta} Pagamento autorizzato: <strong>{eur(ok!.importo)}</strong> ({ok!.tipo === 'caparra' ? 'caparra' : 'intero importo'}) con {ok!.circuito} •••• {ok!.ultime4}.</>
    case 'Rifiutato':
      return <><strong>{p.cliente}</strong> ha rifiutato il preventivo{p.rispostaIl ? ` il ${p.rispostaIl}` : ''}.</>
    case 'Scaduto':
      return <>Scaduto il {giornoLungo(scadenza)} senza una risposta di <strong>{p.cliente}</strong>{p.inviatoIl ? ` (inviato il ${p.inviatoIl})` : ''}.</>
  }
}

interface Passo { label: string; quando?: string; stato: 'fatto' | 'ko' | 'attesa' | 'saltato'; icona: string }

function passi(p: PreventivoSoggiorno, s: StatoDettaglio, scadenza: Date): Passo[] {
  const ok = pagamentoOk(p)
  const ko = (p.pagamenti ?? []).filter((t) => t.esito === 'rifiutato')
  const risposta: Passo = p.stato === 'Accettato'
    ? { label: 'Proposta scelta', quando: p.rispostaIl, stato: 'fatto', icona: 'fa-circle-check' }
    : p.stato === 'Rifiutato'
      ? { label: 'Rifiutato', quando: p.rispostaIl, stato: 'ko', icona: 'fa-circle-xmark' }
      : s.stato === 'Scaduto'
        ? { label: 'Scaduto', quando: scadenza.toLocaleDateString('it-IT'), stato: 'ko', icona: 'fa-hourglass-end' }
        : { label: 'Risposta del cliente', quando: s.stato === 'Bozza' ? undefined : `entro il ${scadenza.toLocaleDateString('it-IT')}`, stato: 'attesa', icona: 'fa-reply' }
  const lista: Passo[] = [
    { label: 'Creato', quando: p.creato, stato: 'fatto', icona: 'fa-file-pen' },
    p.inviatoIl
      ? { label: p.stato === 'Letto' ? 'Inviato e letto' : 'Inviato', quando: p.inviatoIl, stato: 'fatto', icona: p.stato === 'Letto' ? 'fa-envelope-open' : 'fa-paper-plane' }
      : { label: 'Da inviare', stato: 'attesa', icona: 'fa-paper-plane' },
    risposta,
  ]
  if (ok) lista.push({ label: 'Pagato', quando: dataOraIso(ok.il), stato: 'fatto', icona: 'fa-credit-card' })
  else if (ko.length) lista.push({ label: 'Pagamento non riuscito', quando: dataOraIso(ko[ko.length - 1].il), stato: 'ko', icona: 'fa-credit-card' })
  return lista
}

function Pagamento({ t }: { t: TentativoPagamento }) {
  const ok = t.esito === 'autorizzato'
  return (
    <li className={`dprev__pag ${ok ? 'is-ok' : 'is-ko'}`}>
      <i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} aria-hidden="true" />
      <span className="dprev__pag-txt">
        <strong>{eur(t.importo)} · {t.tipo === 'caparra' ? 'caparra' : 'intero importo'}</strong>
        <small>{dataOraIso(t.il)} · {t.circuito} •••• {t.ultime4}{t.titolare ? ` · ${t.titolare}` : ''}</small>
      </span>
      <span className="dprev__pag-esito">{ok ? `Autorizzato · cod. ${t.codiceAut ?? '—'}` : t.motivo ?? 'Rifiutato'}</span>
    </li>
  )
}

export default function DettaglioSoggiorno({ p, stato }: { p: PreventivoSoggiorno; stato: StatoDettaglio }) {
  const template = useTemplate(p.templateId)
  const scadenza = scadenzaSoggiorno(p)
  const lingua = LINGUE[p.lingua ?? 'it']
  const chiusa = p.stato === 'Accettato'
  const pagamenti = [...(p.pagamenti ?? [])].reverse()

  return (
    <div className="dprev">
      <div className={`dprev__banner dprev__banner--${chiaveStato(stato.stato)}`}>
        <i className={`fa-solid ${iconaStato(stato.stato)}`} aria-hidden="true" />
        <span>{frase(p, stato, scadenza)}</span>
      </div>
      {stato.avviso === 'pagamento-ko' && (
        <div className="dprev__banner dprev__banner--avviso">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <span>Il cliente ha provato a pagare ma il pagamento è stato rifiutato: la proposta resta in attesa di pagamento.</span>
        </div>
      )}

      <ol className="dprev__passi">
        {passi(p, stato, scadenza).map((x) => (
          <li key={x.label} className={`is-${x.stato}`}>
            <span className="dprev__passo-ico"><i className={`fa-solid ${x.icona}`} aria-hidden="true" /></span>
            <span className="dprev__passo-txt"><strong>{x.label}</strong>{x.quando && <small>{x.quando}</small>}</span>
          </li>
        ))}
      </ol>

      <div className="dprev__layout">
        <div className="dprev__proposte">
          {p.proposte.map((q, i) => {
            const scelta = p.accettata === q.id
            const k = conto(q, scelta ? p.extraScelti : [])
            const date = nottiDate(q)
            return (
              <section key={q.id} className={`dprev__prop${scelta ? ' is-scelta' : chiusa ? ' is-scartata' : ''}`}>
                <header className="dprev__prop-head">
                  <span className="dprev__lettera">{LETTERE[i]}</span>
                  <span className="dprev__prop-tit">
                    <strong>{q.titolo || `Proposta ${LETTERE[i]}`}</strong>
                    <small>{periodo(q)} · {k.notti} {k.notti === 1 ? 'notte' : 'notti'} · {ospitiLabel(q)}</small>
                  </span>
                  {scelta && <span className="dprev__tag dprev__tag--ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Scelta dal cliente</span>}
                  {!scelta && chiusa && <span className="dprev__tag">Non scelta</span>}
                  <span className="dprev__prop-tot">{eur(k.totaleConExtra)}</span>
                </header>

                <ul className="dprev__camere">
                  {q.camere.map((c) => (
                    <li key={c.id}>
                      <img src={fotoCamera(c)} alt="" className="dprev__foto" />
                      <span className="dprev__camera-txt">
                        <strong>{c.quantita}× {c.tipologia}</strong>
                        <small>{c.numeri.length > 0 ? `Camere ${c.numeri.join(', ')} · ` : ''}{prezzoNotte(c, date)}</small>
                        {c.descrizione && <small className="dprev__desc">{c.descrizione}</small>}
                      </span>
                    </li>
                  ))}
                  {q.camere.length === 0 && <li className="dprev__vuoto">Nessuna camera assegnata</li>}
                </ul>

                <div className="dprev__chips">
                  <span className="dprev__chip dprev__chip--forte"><i className="fa-solid fa-utensils" aria-hidden="true" /> {q.trattamento}</span>
                  {q.servizi.map((s) => <span key={s} className="dprev__chip"><i className={`fa-solid ${iconaServizio(s)}`} aria-hidden="true" /> {s}</span>)}
                  <span className="dprev__chip dprev__chip--tenue">
                    <i className="fa-solid fa-bed" aria-hidden="true" /> Camere {q.assegnazione === 'automatica' ? 'assegnate in automatico' : 'scelte a mano'}
                  </span>
                </div>

                {q.extra.length > 0 && (
                  <div className="dprev__extra">
                    <span className="dprev__sotto">Servizi aggiuntivi proposti</span>
                    <ul>
                      {q.extra.map((e) => {
                        const preso = scelta && !!p.extraScelti?.includes(e.id)
                        return (
                          <li key={e.id} className={preso ? 'is-preso' : ''}>
                            <i className={`fa-solid ${preso ? 'fa-square-check' : 'fa-square-plus'}`} aria-hidden="true" />
                            <span>{e.nome} · {eur(e.prezzo)} {UNITA[e.unita]}</span>
                            <span className="dprev__extra-tot">{preso ? `aggiunto · ${eur(costoExtra(e, q))}` : 'facoltativo'}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                <dl className="dprev__conto">
                  <div><dt>Camere</dt><dd>{eur(k.camere)}</dd></div>
                  {k.trattamento > 0 && <div><dt>{q.trattamento}</dt><dd>{eur(k.trattamento)}</dd></div>}
                  {k.sconto > 0 && <div className="is-sconto"><dt>Sconto {q.scontoPct}%</dt><dd>−{eur(k.sconto)}</dd></div>}
                  {k.tassa > 0 && (
                    <div><dt>Tassa di soggiorno <small>{eur(q.tassaImporto)} a persona per notte, max {q.tassaMaxNotti} notti{q.tassaEsentiMinori ? ', minori esenti' : ''}</small></dt><dd>{eur(k.tassa)}</dd></div>
                  )}
                  {k.extra > 0 && <div><dt>Servizi aggiuntivi</dt><dd>{eur(k.extra)}</dd></div>}
                  <div className="is-totale"><dt>Totale</dt><dd>{eur(k.totaleConExtra)}</dd></div>
                </dl>
              </section>
            )
          })}
        </div>

        <aside className="dprev__aside">
          <section className="dprev__box">
            <h4><i className="fa-solid fa-user" aria-hidden="true" /> Cliente</h4>
            <dl>
              <div><dt>Nome</dt><dd>{p.cliente || '—'}</dd></div>
              <div><dt>Email</dt><dd>{p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : '—'}</dd></div>
              <div><dt>Telefono</dt><dd>{p.telefono ? <a href={`tel:${p.telefono.replace(/\s/g, '')}`}>{p.telefono}</a> : '—'}</dd></div>
              <div><dt>Lingua</dt><dd className="dprev__lingua"><FlagCircle code={lingua.bandiera} size={16} /> {lingua.label}</dd></div>
            </dl>
          </section>

          <section className="dprev__box">
            <h4><i className="fa-solid fa-envelope" aria-hidden="true" /> Preventivo</h4>
            <dl>
              <div><dt>Struttura</dt><dd>{p.struttura}</dd></div>
              <div><dt>Template mail</dt><dd>{template.nome}</dd></div>
              <div><dt>Validità</dt><dd>{p.validita} giorni · fino al {scadenza.toLocaleDateString('it-IT')}</dd></div>
              <div><dt>Pagamento con carta</dt><dd>{template.pagamento.attivo
                ? (template.pagamento.modalita === 'totale' ? 'Attivo · intero importo' : template.pagamento.modalita === 'caparra'
                  ? `Attivo · caparra ${template.pagamento.percentualeCaparra}%` : `Attivo · caparra ${template.pagamento.percentualeCaparra}% o intero, a scelta`)
                : 'Non attivo'}</dd></div>
              {p.terminiAccettati && <div><dt>Termini accettati</dt><dd>{p.terminiAccettati}</dd></div>}
            </dl>
            {p.messaggio && (
              <details className="dprev__messaggio">
                <summary>Messaggio al cliente</summary>
                <p>{p.messaggio}</p>
              </details>
            )}
          </section>

          {pagamenti.length > 0 && (
            <section className="dprev__box">
              <h4><i className="fa-solid fa-credit-card" aria-hidden="true" /> Pagamenti</h4>
              <ul className="dprev__pagamenti">{pagamenti.map((t) => <Pagamento key={t.id} t={t} />)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
