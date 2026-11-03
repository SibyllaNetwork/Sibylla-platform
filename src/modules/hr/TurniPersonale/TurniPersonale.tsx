import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { SelectField, SearchField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import {
  DIPENDENTI_HR, REPARTI_HR, isoOf, nomeDipendente, useHrGestioneStore, type Reparto,
} from '../../../store/useHrGestioneStore'
import {
  GIORNI_BREVI, GIORNI_LUNGHI, addGiorni, assenzaDi, bloccaTurno, contrattoDi, etichettaSettimana,
  fabbisogno, fabbisognoReparto, giorniResidui, giorniSettimana, giornoMese, livelloCarico, lunediDi,
  occupazione, suggerisciTurni, useTurniPersonaleStore, type SuggerimentoTurni,
} from '../../../store/useTurniPersonaleStore'
import './TurniPersonale.sass'

/**
 * Turni del personale — HR › Gestione delle presenze.
 * Logica settimanale, impostata come Calendario strategie: a sinistra l'elenco
 * del personale, a destra i 7 giorni della settimana. L'HR o il responsabile di
 * reparto trascina un nome su un giorno (oppure seleziona il dipendente e clicca
 * i giorni); il cerchietto accanto al nome conta i giorni ancora assegnabili
 * secondo il contratto e scala a ogni assegnazione. In alternativa il turno lo
 * propone Sibylla (ferie/permessi/malattie + occupazione della struttura).
 * "Pubblica turno" lo invia ai dipendenti nel Centro notifiche.
 */

type DragData = { id: number; da?: string }
const DND_TYPE = 'application/x-sibylla-turno'

const repIdx = (r: Reparto) => REPARTI_HR.indexOf(r) + 1
const nomeBreve = (id: number) => {
  const d = DIPENDENTI_HR.find(x => x.id === id)
  return d ? `${d.nome.charAt(0)}. ${d.cognome}` : '—'
}
const fmtQuando = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} alle ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
}

export default function TurniPersonale({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const { assegnazioni, settimane, focusLunedi, assegna, rimuovi, sposta, svuota, applicaSuggerimento, salva, pubblica, setFocus } = useTurniPersonaleStore()
  const confirm = useConfirmStore(s => s.confirm)
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()

  const oggi = isoOf(new Date())
  const [lunedi, setLunedi] = useState(() => focusLunedi ?? lunediDi(oggi))
  // Arrivando da una notifica si apre la settimana indicata, poi il focus si azzera.
  useEffect(() => {
    if (focusLunedi) { setLunedi(focusLunedi); setFocus(null) }
  }, [focusLunedi, setFocus])

  const [reparto, setReparto] = useState<Reparto | ''>('')
  const [search, setSearch] = useState('')
  const [selezionato, setSelezionato] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [suggerimento, setSuggerimento] = useState<SuggerimentoTurni | null>(null)

  const giorni = useMemo(() => giorniSettimana(lunedi), [lunedi])
  const stato = settimane[lunedi]
  const turniSettimana = giorni.reduce((s, g) => s + (assegnazioni[g] ?? []).length, 0)

  const personale = useMemo(() => {
    const q = search.trim().toLowerCase()
    return DIPENDENTI_HR
      .filter(d => !reparto || d.reparto === reparto)
      .filter(d => !q || `${d.nome} ${d.cognome}`.toLowerCase().includes(q) || d.reparto.toLowerCase().includes(q))
  }, [reparto, search])

  const sel = selezionato != null ? DIPENDENTI_HR.find(d => d.id === selezionato) ?? null : null

  // ── Assegnazione (drag & drop o click sul giorno col dipendente selezionato) ──
  const prova = (iso: string, id: number, da?: string) => {
    const nome = nomeDipendente(id)
    const a = assenzaDi(richieste, id, iso)
    const giorno = `${GIORNI_LUNGHI[giorni.indexOf(iso)].toLowerCase()} ${giornoMese(iso)}`
    if (bloccaTurno(a)) { toast.warning(`${nome} è in ${a!.tipo.toLowerCase()} ${giorno}.`, 'Turni del personale'); return }
    if ((assegnazioni[iso] ?? []).includes(id)) return
    if (da) { sposta(da, iso, id); return }
    if (giorniResidui(assegnazioni, lunedi, id) <= 0) {
      toast.warning(`${nome} ha già tutti i ${contrattoDi(id).giorni} giorni previsti dal contratto (${contrattoDi(id).tipo}).`, 'Turni del personale')
      return
    }
    assegna(iso, id)
    if (a?.inAttesa) toast.info(`${nome} ha una richiesta di ${a.tipo.toLowerCase()} da approvare per ${giorno}.`, 'Turni del personale')
  }

  const onDragStart = (e: React.DragEvent, data: DragData) => {
    e.dataTransfer.setData(DND_TYPE, JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDrop = (e: React.DragEvent, iso: string) => {
    e.preventDefault()
    setDragOver(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData(DND_TYPE)) as DragData
      prova(iso, data.id, data.da)
    } catch { /* trascinamento non pertinente */ }
  }

  // ── Azioni ──
  const apriSuggerimento = () => setSuggerimento(suggerisciTurni(lunedi, richieste))
  const confermaSuggerimento = () => {
    if (!suggerimento) return
    applicaSuggerimento(suggerimento)
    setSuggerimento(null)
    toast.success(`Turno della settimana ${etichettaSettimana(lunedi)} generato da Sibylla: puoi rifinirlo trascinando i nomi.`, 'Turni del personale')
  }
  const svuotaSettimana = async () => {
    const ok = await confirm({
      title: 'Svuota settimana',
      message: <>Vuoi togliere tutti i turni della settimana <strong>{etichettaSettimana(lunedi)}</strong>?</>,
      confirmLabel: 'Svuota', danger: true,
    })
    if (ok) svuota(lunedi)
  }
  const salvaSettimana = () => { salva(lunedi); toast.success('Turno salvato.', 'Turni del personale') }
  const pubblicaSettimana = async () => {
    if (turniSettimana === 0) { toast.warning('La settimana non ha turni da pubblicare.', 'Turni del personale'); return }
    const ok = await confirm({
      title: 'Pubblica turno',
      message: <>Il turno della settimana <strong>{etichettaSettimana(lunedi)}</strong> arriverà ai dipendenti nel Centro notifiche, con i pulsanti <strong>Scarica PDF</strong> e <strong>Visualizza turno</strong>.</>,
      confirmLabel: 'Pubblica', danger: false,
    })
    if (!ok) return
    const p = pubblica(lunedi)
    toast.success(`Turno inviato a ${p.destinatari} dipendenti nel Centro notifiche.`, 'Turni del personale')
  }

  const settimanaCorrente = lunedi === lunediDi(oggi)

  return (
    <div className="tpe">
      <PageHead
        title="Turni del personale"
        subtitle="Trascina i nomi del personale sui giorni della settimana, oppure fatti proporre il turno da Sibylla"
        actions={
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-piano-ferie')}>
            <i className="fa-solid fa-calendar-days" aria-hidden="true" /> Piano ferie
          </button>
        }
      />

      {/* ── Filtri e azioni ── */}
      <div className="tpe__filters">
        <SelectField name="struttura" label="Struttura" className="tpe__field tpe__field--struttura" value={struttura}
          onChange={e => setStruttura(e.target.value)} options={opzioniStrutture} />
        <SelectField name="reparto" label="Reparto" className="tpe__field" value={reparto}
          onChange={e => { setReparto(e.target.value as Reparto | ''); setSelezionato(null) }}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <div className="tpe__week">
          <span className="tpe__week-label">Settimana</span>
          <div className="tpe__week-nav">
            <Tooltip text="Settimana precedente">
              <button type="button" className="tpe__nav-btn" onClick={() => setLunedi(addGiorni(lunedi, -7))} aria-label="Settimana precedente">
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
            </Tooltip>
            <span className="tpe__week-txt">{etichettaSettimana(lunedi)}</span>
            <Tooltip text="Settimana successiva">
              <button type="button" className="tpe__nav-btn" onClick={() => setLunedi(addGiorni(lunedi, 7))} aria-label="Settimana successiva">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </Tooltip>
            {!settimanaCorrente && (
              <button type="button" className="sib-btn sib-btn--ghost tpe__today" onClick={() => setLunedi(lunediDi(oggi))}>Questa settimana</button>
            )}
          </div>
        </div>

        <div className="tpe__spacer" aria-hidden="true" />

        <button type="button" className="sib-btn sib-btn--secondary tpe__btn" onClick={apriSuggerimento}>
          <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Suggerimento Sibylla
        </button>
        <button type="button" className="sib-btn sib-btn--primary tpe__btn" onClick={pubblicaSettimana}>
          <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Pubblica turno
        </button>
      </div>

      {/* ── Status bar ── */}
      <div className="tpe__statusbar" role="status">
        {sel ? (
          <>
            <span className="tpe__dot" data-rep={repIdx(sel.reparto)} aria-hidden="true" />
            <span>
              Assegnerai <strong>{sel.nome} {sel.cognome}</strong> ai giorni che cliccherai
              <span className="tpe__sep">•</span>
              <span className="tpe__meta">{giorniResidui(assegnazioni, lunedi, sel.id)} giorni su {contrattoDi(sel.id).giorni} ancora da assegnare</span>
            </span>
            <button type="button" className="tpe__statusbar-link" onClick={() => setSelezionato(null)}>Annulla selezione</button>
          </>
        ) : (
          <>
            <i className="fa-solid fa-hand-pointer tpe__statusbar-ico" aria-hidden="true" />
            <span>Trascina un dipendente su un giorno, oppure selezionalo dall'elenco e clicca i giorni</span>
          </>
        )}
        <span className="tpe__statusbar-stato">
          {stato?.pubblicataAt
            ? <>Pubblicato il {fmtQuando(stato.pubblicataAt)}</>
            : stato?.salvataAt ? <>Bozza salvata il {fmtQuando(stato.salvataAt)}, non pubblicata</> : <>Bozza non pubblicata</>}
          {stato?.origine === 'sibylla' && <> · generato da Sibylla{stato.modificata ? ', modificato a mano' : ''}</>}
        </span>
      </div>

      <div className="tpe__layout">
        {/* ── Elenco del personale ── */}
        <aside className="tpe__sidebar" aria-label="Personale">
          <header className="tpe__sidebar-head">
            <div className="tpe__sidebar-title">Personale</div>
            <span className="tpe__sidebar-count">{personale.length}</span>
          </header>
          <div className="tpe__sidebar-search">
            <SearchField name="cercaDipendente" placeholder="Cerca dipendente…" value={search}
              onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
          <div className="tpe__list" role="listbox" aria-label="Dipendenti">
            {personale.length === 0 && <div className="tpe__list-empty">Nessun dipendente trovato.</div>}
            {personale.map(d => {
              const residui = giorniResidui(assegnazioni, lunedi, d.id)
              const c = contrattoDi(d.id)
              const assenze = giorni
                .map(g => ({ g, a: assenzaDi(richieste, d.id, g) }))
                .filter(x => x.a)
              const attivo = selezionato === d.id
              return (
                <div
                  key={d.id}
                  role="option"
                  aria-selected={attivo}
                  tabIndex={0}
                  draggable
                  onDragStart={e => onDragStart(e, { id: d.id })}
                  onClick={() => setSelezionato(attivo ? null : d.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelezionato(attivo ? null : d.id) } }}
                  className={clsx('tpe__emp', attivo && 'tpe__emp--active')}
                  data-rep={repIdx(d.reparto)}
                >
                  <i className="fa-solid fa-grip-dots-vertical tpe__grip" aria-hidden="true" />
                  <span className="tpe__emp-body">
                    <TruncatedText text={`${d.nome} ${d.cognome}`} className="tpe__emp-name" />
                    <TruncatedText text={`${d.reparto} · ${c.tipo}`} className="tpe__emp-sub" />
                  </span>
                  {assenze.length > 0 && (
                    <Tooltip text={assenze.map(x => `${GIORNI_BREVI[giorni.indexOf(x.g)]} ${giornoMese(x.g)}: ${x.a!.tipo}${x.a!.inAttesa ? ' (da approvare)' : ''}`).join(' · ')}>
                      <i className={clsx('fa-solid fa-umbrella-beach tpe__emp-abs', assenze.every(x => x.a!.inAttesa) && 'tpe__emp-abs--attesa')} aria-label="Assenze nella settimana" />
                    </Tooltip>
                  )}
                  <Tooltip text={residui > 0
                    ? `${residui} ${residui === 1 ? 'giorno' : 'giorni'} ancora da assegnare su ${c.giorni} (${c.tipo})`
                    : `Tutti i ${c.giorni} giorni del contratto sono assegnati (${c.tipo})`}>
                    <span className={clsx('tpe__count', residui === 0 && 'tpe__count--done', residui < 0 && 'tpe__count--over')}>{residui}</span>
                  </Tooltip>
                </div>
              )
            })}
          </div>
          <footer className="tpe__sidebar-foot">
            <button type="button" className="tpe__tool" onClick={svuotaSettimana} disabled={turniSettimana === 0}>
              <i className="fa-solid fa-trash-can" aria-hidden="true" /> Svuota settimana
            </button>
            <button type="button" className="sib-btn sib-btn--primary tpe__save" onClick={salvaSettimana}>
              <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Salva
            </button>
          </footer>
        </aside>

        {/* ── Settimana: una riga per giorno ── */}
        <div className="tpe__week-grid">
          <div className="tpe__head">
            <span>Giorno</span>
            <span>Occupazione</span>
            <span>Personale in turno</span>
            <span className="tpe__head-r">Copertura</span>
          </div>
          {giorni.map((g, i) => {
            const occ = occupazione(g)
            const liv = livelloCarico(occ)
            const inTurno = (assegnazioni[g] ?? []).filter(id => !reparto || DIPENDENTI_HR.find(d => d.id === id)?.reparto === reparto)
            const assenti = DIPENDENTI_HR
              .filter(d => (!reparto || d.reparto === reparto) && !inTurno.includes(d.id))
              .map(d => ({ d, a: assenzaDi(richieste, d.id, g) }))
              .filter(x => x.a)
            const serve = fabbisogno(g, reparto)
            const cop = inTurno.length - serve
            const dettaglio = (reparto ? [reparto] : REPARTI_HR)
              .map(r => `${r}: ${(assegnazioni[g] ?? []).filter(id => DIPENDENTI_HR.find(d => d.id === id)?.reparto === r).length}/${fabbisognoReparto(r, g)}`)
              .join(' · ')
            return (
              <div
                key={g}
                className={clsx('tpe__day', g === oggi && 'tpe__day--today', dragOver === g && 'tpe__day--over', sel && 'tpe__day--clickable')}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== g) setDragOver(g) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                onDrop={e => onDrop(e, g)}
                onClick={() => sel && prova(g, sel.id)}
              >
                <span className={clsx('tpe__badge', i >= 5 && 'tpe__badge--we')}>
                  <span className="tpe__badge-wd">{GIORNI_BREVI[i]}</span>
                  <span className="tpe__badge-dm">{giornoMese(g)}</span>
                </span>

                <span className="tpe__occ">
                  <Tooltip text={`Occupazione prevista ${occ}%: carico ${liv}`}>
                    <span className="tpe__occ-val">{occ}%</span>
                  </Tooltip>
                  <span className="tpe__occ-bar"><span className={`tpe__occ-fill tpe__occ-fill--${liv}`} data-occ={Math.round(occ / 5) * 5} /></span>
                </span>

                <div className="tpe__chips">
                  {inTurno.length === 0 && assenti.length === 0 && (
                    <span className="tpe__drop-hint">{sel ? 'Clicca per assegnare' : 'Trascina qui il personale'}</span>
                  )}
                  {inTurno.map(id => {
                    const d = DIPENDENTI_HR.find(x => x.id === id)!
                    const a = assenzaDi(richieste, id, g)
                    return (
                      <span
                        key={id}
                        className={clsx('tpe__chip', a?.inAttesa && 'tpe__chip--attesa')}
                        data-rep={repIdx(d.reparto)}
                        draggable
                        onDragStart={e => { e.stopPropagation(); onDragStart(e, { id, da: g }) }}
                        onClick={e => e.stopPropagation()}
                      >
                        <TruncatedText text={nomeBreve(id)} full={`${d.nome} ${d.cognome} · ${d.reparto}${a?.inAttesa ? ` · ${a.tipo.toLowerCase()} da approvare` : ''}`} className="tpe__chip-name" />
                        <Tooltip text="Togli dal turno">
                          <button type="button" className="tpe__chip-x" aria-label={`Togli ${d.nome} ${d.cognome} dal turno`} onClick={() => rimuovi(g, id)}>
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </span>
                    )
                  })}
                  {assenti.map(({ d, a }) => (
                    <span key={d.id} className={clsx('tpe__chip tpe__chip--assente', a!.inAttesa && 'tpe__chip--assente-attesa')}>
                      <TruncatedText text={`${nomeBreve(d.id)} · ${a!.tipo}`}
                        full={`${d.nome} ${d.cognome}: ${a!.tipo.toLowerCase()}${a!.inAttesa ? ' (richiesta da approvare)' : ''}`} className="tpe__chip-name" />
                    </span>
                  ))}
                </div>

                <Tooltip text={`Fabbisogno sull'occupazione — ${dettaglio}`}>
                  <span className={clsx('tpe__cop', cop < 0 && 'tpe__cop--sotto', cop >= 0 && 'tpe__cop--ok')}>
                    {cop < 0 && <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
                    {inTurno.length}/{serve}
                  </span>
                </Tooltip>
              </div>
            )
          })}
          <ul className="tpe__legend">
            {REPARTI_HR.map(r => <li key={r}><span className="tpe__dot" data-rep={repIdx(r)} />{r}</li>)}
            <li><span className="tpe__sw tpe__sw--assente" />Assente</li>
            <li><span className="tpe__sw tpe__sw--attesa" />Richiesta da approvare</li>
          </ul>
        </div>
      </div>

      {/* ── Suggerimento di Sibylla ── */}
      <Modal open={!!suggerimento} onClose={() => setSuggerimento(null)} title="Suggerimento di Sibylla" size="lg">
        {suggerimento && (
          <div className="tpe-modal">
            <p className="tpe-modal__lead">
              Turno proposto per la settimana <strong>{etichettaSettimana(suggerimento.lunedi)}</strong>, calcolato su
              occupazione della struttura, contratti e richieste di ferie, permessi e malattia.
            </p>
            <dl className="tpe-modal__kpi">
              <div><dt>Occupazione media</dt><dd>{suggerimento.occupazioneMedia}%</dd></div>
              <div><dt>Picco</dt><dd>{GIORNI_BREVI[giorni.indexOf(suggerimento.picco.iso)]} {giornoMese(suggerimento.picco.iso)} · {suggerimento.picco.occ}%</dd></div>
              <div><dt>Turni proposti</dt><dd>{suggerimento.turni} su {suggerimento.fabbisognoTot} necessari</dd></div>
              <div><dt>Assenze considerate</dt><dd>{suggerimento.assenzeConsiderate.length}</dd></div>
            </dl>
            <div className="tpe-modal__days">
              {giorniSettimana(suggerimento.lunedi).map((g, i) => (
                <div key={g} className="tpe-modal__day">
                  <span className="tpe-modal__day-wd">{GIORNI_BREVI[i]}</span>
                  <span className="tpe-modal__day-n">{suggerimento.assegnazioni[g].length}</span>
                  <span className="tpe-modal__day-occ">{occupazione(g)}%</span>
                </div>
              ))}
            </div>
            <ul className="tpe-modal__notes">
              {suggerimento.note.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
            {turniSettimana > 0 && (
              <p className="tpe-modal__warn">
                <i className="fa-solid fa-circle-info" aria-hidden="true" /> Applicando il suggerimento sostituisci i {turniSettimana} turni già inseriti in questa settimana.
              </p>
            )}
            <div className="tpe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSuggerimento(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confermaSuggerimento}>
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Applica suggerimento
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
