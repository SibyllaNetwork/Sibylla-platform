import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import VistaSwitch from '../../../core/components/VistaSwitch'
import { SelectField, SearchField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import {
  DIPENDENTI_HR, REPARTI_HR, isoOf, nomeDipendente, useHrGestioneStore, type DipendenteHr, type Reparto,
} from '../../../store/useHrGestioneStore'
import { oreTurno, useHrConfigStore, type TurnoHr } from '../../../store/useHrConfigStore'
import {
  GIORNI_BREVI, addGiorni, fasceCopertura, riposoMinOre, assenzaDi, bloccaTurno, coinvoltiDaRipubblicare, coperturaReparto,
  etichettaSettimana, fabbisognoAOccupazione, fmtOre, giornoLungo, giornoMese, giorniSettimana, livelloCarico, lunediDi,
  occupazione, orarioTurno, repartoHr, riepilogoSettimana, riposoDopo, riposoPrima, statoSettimana, suggerisciTurni,
  turnoDel, turnoPredefinito, turniValidi, useTurniPersonaleStore,
  type CoperturaReparto, type RiepilogoSettimana, type SuggerimentoTurni,
} from '../../../store/useTurniPersonaleStore'
import './TurniPersonale.sass'

/**
 * Turni del personale — HR › Gestione delle presenze.
 * Due viste sugli stessi dati:
 *  - Per giorno: a sinistra l'elenco del personale, a destra i 7 giorni. Si
 *    trascina un nome su un giorno e si sceglie il turno (Mattina, Spezzato…)
 *    fra quelli validi per il reparto; un clic sul chip cambia il turno.
 *  - Per dipendente: griglia classica dipendenti × giorni, per leggere la
 *    settimana di una persona.
 * Il turno dà le ore: accanto a ogni nome ore assegnate / ore da contratto e
 * riposi; la copertura si legge per reparto e per fascia. I giorni passati
 * hanno già timbrature: si modificano solo dopo conferma.
 * Stato: Bozza → Pubblicato → Modificato dopo la pubblicazione (si ripubblica
 * e la notifica arriva solo ai dipendenti coinvolti).
 */

type DragData = { id: number; da?: string }
const DND_TYPE = 'application/x-sibylla-turno'
type Vista = 'giorni' | 'dipendenti'
type Picker = { iso: string; id: number; modo: 'nuovo' | 'cambia'; dove: 'giorno' | 'chip' | 'cella' }

const repIdx = (r: Reparto) => REPARTI_HR.indexOf(r) + 1
const dip = (id: number) => DIPENDENTI_HR.find(x => x.id === id)
const nomeBreve = (id: number) => {
  const d = dip(id)
  return d ? `${d.nome.charAt(0)}. ${d.cognome}` : '—'
}
const fmtQuando = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} alle ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
}
const fmtH = (h: number) => `${fmtOre(Math.round(h * 10) / 10)}`

/** Sigla colorata del turno (palette --chart-*, come in Configuratore › Turnistica). */
function Sigla({ t, size = 'md' }: { t?: TurnoHr; size?: 'sm' | 'md' }) {
  return <span className={clsx('tpe__sigla', size === 'sm' && 'tpe__sigla--sm')} data-col={t?.colore ?? 0}>{t?.sigla ?? '?'}</span>
}

// ── Menu di scelta del turno (al rilascio, al clic sul chip o sulla cella) ──
interface OpzioneTurno { t: TurnoHr; avvisi: string[] }
function MenuTurno({ titolo, opzioni, corrente, onScegli, onTogli, onChiudi }: {
  titolo: string
  opzioni: OpzioneTurno[]
  corrente?: string
  onScegli: (t: TurnoHr) => void
  onTogli?: () => void
  onChiudi: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fuori = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onChiudi() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi() }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [onChiudi])
  return (
    <div ref={ref} className="tpe__menu" role="menu" aria-label={titolo}
      onClick={e => e.stopPropagation()} onDragOver={e => e.stopPropagation()}>
      <div className="tpe__menu-title">{titolo}</div>
      {opzioni.map(({ t, avvisi }) => (
        <button key={t.id} type="button" role="menuitemradio" aria-checked={t.id === corrente}
          className={clsx('tpe__menu-opt', t.id === corrente && 'tpe__menu-opt--on')} onClick={() => onScegli(t)}>
          <Sigla t={t} />
          <span className="tpe__menu-body">
            <span className="tpe__menu-name">{t.nome}</span>
            <span className="tpe__menu-orario">{orarioTurno(t)} · {fmtH(oreTurno(t))} h</span>
            {avvisi.map(a => <span key={a} className="tpe__menu-warn"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {a}</span>)}
          </span>
          {t.id === corrente && <i className="fa-solid fa-check tpe__menu-check" aria-hidden="true" />}
        </button>
      ))}
      {opzioni.length === 0 && <div className="tpe__menu-empty">Nessun turno valido per il reparto in Configuratore › Turnistica.</div>}
      {onTogli && (
        <button type="button" className="tpe__menu-remove" onClick={onTogli}>
          <i className="fa-solid fa-xmark" aria-hidden="true" /> Togli dal turno (riposo)
        </button>
      )}
    </div>
  )
}

// ── Copertura del giorno ──
function testoCopertura(c: CoperturaReparto) {
  if (c.chiuso) return `${c.reparto}: nessun fabbisogno`
  return `${c.reparto}: ${c.fasce.map(f => `${f.fascia} ${f.ha}/${f.serve}`).join(' · ')}${fabbisognoAOccupazione(c.reparto) ? ' (segue l\'occupazione)' : ' (minimo fisso)'}`
}
/** "M = Mattina 07:00–15:00, P = …" dalle fasce di Configurazione HR › Turnistica. */
function legendaFasce() {
  const hh = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return fasceCopertura().map(f => `${f.id} = ${f.nome.toLowerCase()} ${hh(f.da)}–${hh(f.a)}`).join(', ')
}
function Copertura({ coperture, reparto, onReparto }: { coperture: CoperturaReparto[]; reparto: Reparto | ''; onReparto: (r: Reparto) => void }) {
  if (reparto) {
    const c = coperture[0]
    if (c.chiuso) return <span className="tpe__cop tpe__cop--chiuso">Nessun fabbisogno</span>
    return (
      <Tooltip text={`${testoCopertura(c)}. ${legendaFasce()}.`}>
        <span className="tpe__cop">
          {c.fasce.map(f => (
            <span key={f.fascia} className={clsx('tpe__cop-f', f.ha < f.serve ? 'tpe__cop-f--sotto' : 'tpe__cop-f--ok')}>
              {f.ha < f.serve && <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
              <span className="tpe__cop-k">{f.fascia}</span> {f.ha}/{f.serve}
            </span>
          ))}
        </span>
      </Tooltip>
    )
  }
  return (
    <span className="tpe__cop-reparti">
      {coperture.map(c => (
        <Tooltip key={c.reparto} text={`${testoCopertura(c)}. Clicca per il dettaglio del reparto.`}>
          <button type="button" className={clsx('tpe__cop-rep', c.chiuso ? 'tpe__cop-rep--chiuso' : c.ok ? 'tpe__cop-rep--ok' : 'tpe__cop-rep--sotto')}
            onClick={e => { e.stopPropagation(); onReparto(c.reparto) }}>
            <i className={clsx('fa-solid', c.chiuso ? 'fa-minus' : c.ok ? 'fa-check' : 'fa-triangle-exclamation')} aria-hidden="true" />
            {repartoHr(c.reparto)?.codice ?? c.reparto.slice(0, 3).toUpperCase()}
          </button>
        </Tooltip>
      ))}
    </span>
  )
}

// ── Ore assegnate / contratto ──
function OreDip({ r, onScheda }: { r: RiepilogoSettimana; onScheda: () => void }) {
  const righe = [
    r.contratto
      ? `${fmtH(r.ore)} h assegnate su ${fmtH(r.oreAttese!)} h attese (${r.contratto.tipo}, ${r.contratto.ore} h${r.assenze ? ` meno ${r.assenze} ${r.assenze === 1 ? 'giornata' : 'giornate'} di assenza` : ''})`
      : `${fmtH(r.ore)} h assegnate · contratto non indicato: ore non controllabili. Clicca per aprire l'Archivio del personale`,
    r.stato === 'sopra' ? `${fmtH(r.ore - r.oreAttese!)} h oltre il contratto (straordinario)` : '',
    r.stato === 'sotto' ? `${fmtH(r.oreAttese! - r.ore)} h ancora da assegnare` : '',
    `${r.giorni} ${r.giorni === 1 ? 'giorno' : 'giorni'} in turno · ${r.riposi} ${r.riposi === 1 ? 'riposo' : 'riposi'}${r.assenze ? ` · ${r.assenze} di assenza` : ''}`,
    r.riposi < 1 ? 'Nessun giorno di riposo nella settimana' : '',
    r.riposoBreve.length ? `Meno di ${riposoMinOre()} h di riposo prima di ${r.riposoBreve.map(giornoLungo).join(', ')}` : '',
  ].filter(Boolean)
  const allarme = r.riposi < 1 || r.riposoBreve.length > 0
  return (
    <Tooltip content={<>{righe.map(x => <div key={x}>{x}</div>)}</>}>
      <span className="tpe__ore-box" onClick={r.stato === 'senza-contratto' ? (e) => { e.stopPropagation(); onScheda() } : undefined}>
        <span className={`tpe__ore tpe__ore--${r.stato}`}>
          {allarme && <i className="fa-solid fa-triangle-exclamation tpe__ore-alarm" aria-hidden="true" />}
          {fmtH(r.ore)}{r.oreAttese != null ? `/${fmtH(r.oreAttese)}` : ''} h
        </span>
        <span className={clsx('tpe__riposi', r.riposi < 1 && 'tpe__riposi--zero')}>
          {r.riposi} {r.riposi === 1 ? 'riposo' : 'riposi'}{r.assenze ? ` · ${r.assenze} ass.` : ''}
        </span>
      </span>
    </Tooltip>
  )
}

export default function TurniPersonale({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const catalogo = useHrConfigStore(s => s.turni)
  const store = useTurniPersonaleStore()
  const { assegnazioni, turni, settimane, pubblicazioni, focusLunedi, assegna, setTurno, rimuovi, sposta, svuota, applicaSuggerimento, pubblica, setFocus } = store
  const confirm = useConfirmStore(s => s.confirm)
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()

  const oggi = isoOf(new Date())
  const [lunedi, setLunedi] = useState(() => focusLunedi ?? lunediDi(oggi))
  // Arrivando da una notifica si apre la settimana indicata, poi il focus si azzera.
  useEffect(() => {
    if (focusLunedi) { setLunedi(focusLunedi); setFocus(null) }
  }, [focusLunedi, setFocus])

  const [vista, setVista] = useState<Vista>('giorni')
  const [reparto, setReparto] = useState<Reparto | ''>('')
  const [search, setSearch] = useState('')
  const [selezionato, setSelezionato] = useState<number | null>(null)
  const [turnoSel, setTurnoSel] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [picker, setPicker] = useState<Picker | null>(null)
  const [suggerimento, setSuggerimento] = useState<SuggerimentoTurni | null>(null)
  // Giorni passati sbloccati in questa sessione (dopo la conferma).
  const [sbloccati, setSbloccati] = useState<Set<string>>(() => new Set())

  const giorni = useMemo(() => giorniSettimana(lunedi), [lunedi])
  const stato = settimane[lunedi]
  const statoPubbl = statoSettimana(stato)
  const coinvolti = useMemo(() => statoPubbl === 'da-ripubblicare' ? coinvoltiDaRipubblicare(store, lunedi) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statoPubbl, assegnazioni, turni, pubblicazioni, lunedi])
  const giorniFuturi = giorni.filter(g => g >= oggi)
  const turniFuturi = giorniFuturi.reduce((s, g) => s + (assegnazioni[g] ?? []).length, 0)
  const turniSettimana = giorni.reduce((s, g) => s + (assegnazioni[g] ?? []).length, 0)

  const personale = useMemo(() => {
    const q = search.trim().toLowerCase()
    return DIPENDENTI_HR
      .filter(d => !reparto || d.reparto === reparto)
      .filter(d => !q || `${d.nome} ${d.cognome}`.toLowerCase().includes(q) || d.reparto.toLowerCase().includes(q))
  }, [reparto, search])

  const riepiloghi = useMemo(() => new Map(DIPENDENTI_HR.map(d => [d.id, riepilogoSettimana(assegnazioni, turni, lunedi, d.id, richieste, catalogo)])),
    [assegnazioni, turni, lunedi, richieste, catalogo])

  const sel = selezionato != null ? dip(selezionato) ?? null : null
  const turniSel = sel ? turniValidi(sel.reparto, catalogo) : []
  const turnoAttivoSel = sel ? (turniSel.find(t => t.id === turnoSel) ?? turnoPredefinito(sel.reparto, catalogo)) : undefined
  const turnoDi = (iso: string, id: number) => turnoDel(assegnazioni, turni, iso, id, catalogo)

  // ── Avvisi per la scelta di un turno ──
  const avvisiTurno = (iso: string, id: number, t: TurnoHr): string[] => {
    const out: string[] = []
    const prima = riposoPrima(assegnazioni, turni, iso, id, t, catalogo)
    const dopo = riposoDopo(assegnazioni, turni, iso, id, t, catalogo)
    if (prima != null && prima < riposoMinOre()) out.push(`Solo ${fmtH(prima)} h di riposo dal turno del giorno prima`)
    if (dopo != null && dopo < riposoMinOre()) out.push(`Solo ${fmtH(dopo)} h di riposo prima del turno del giorno dopo`)
    const r = riepiloghi.get(id)
    if (r && r.oreAttese != null) {
      const attuale = turnoDi(iso, id)
      const ore = r.ore - (attuale ? oreTurno(attuale) : 0) + oreTurno(t)
      if (ore > r.oreAttese) out.push(`Porta la settimana a ${fmtH(ore)} h su ${fmtH(r.oreAttese)} attese`)
    }
    return out
  }
  const opzioniPer = (iso: string, id: number): OpzioneTurno[] => {
    const r = dip(id)?.reparto
    return r ? turniValidi(r, catalogo).map(t => ({ t, avvisi: avvisiTurno(iso, id, t) })) : []
  }

  // ── Giorni passati: modificabili solo dopo conferma ──
  const okPassato = async (iso: string) => {
    if (iso >= oggi || sbloccati.has(iso)) return true
    const ok = await confirm({
      title: 'Giorno già passato',
      message: <><strong>{giornoLungo(iso)}</strong> è già passato e ha timbrature collegate al turno: cambiandolo, presenze e ritardi di quel giorno verranno ricalcolati. Vuoi modificarlo comunque?</>,
      confirmLabel: 'Modifica', danger: false,
    })
    if (ok) setSbloccati(s => new Set(s).add(iso))
    return ok
  }

  // ── Assegnazione ──
  const assegnaCon = (iso: string, id: number, t: TurnoHr) => {
    const avvisi = avvisiTurno(iso, id, t)
    assegna(iso, id, t.id)
    const a = assenzaDi(richieste, id, iso)
    const nome = nomeDipendente(id)
    if (avvisi.length) toast.warning(`${nome}, ${giornoLungo(iso)} (${t.sigla}): ${avvisi.join('; ').toLowerCase()}.`, 'Turni del personale')
    else if (a?.inAttesa) toast.info(`${nome} ha una richiesta di ${a.tipo.toLowerCase()} da approvare per ${giornoLungo(iso)}.`, 'Turni del personale')
  }
  const prova = async (iso: string, id: number, da?: string) => {
    const nome = nomeDipendente(id)
    const a = assenzaDi(richieste, id, iso)
    if (bloccaTurno(a)) { toast.warning(`${nome} è in ${a!.tipo.toLowerCase()} ${giornoLungo(iso)}.`, 'Turni del personale'); return }
    if ((assegnazioni[iso] ?? []).includes(id)) return
    if (da && !(await okPassato(da))) return
    if (!(await okPassato(iso))) return
    if (da) {
      sposta(da, iso, id)
      const t = turnoDi(da, id)
      const avvisi = t ? avvisiTurno(iso, id, t) : []
      if (avvisi.length) toast.warning(`${nome}, ${giornoLungo(iso)}: ${avvisi.join('; ').toLowerCase()}.`, 'Turni del personale')
      return
    }
    const r = dip(id)!.reparto
    const validi = turniValidi(r, catalogo)
    if (!validi.length) { toast.warning(`Nessun turno valido per ${r}: definiscilo in Configuratore › Turnistica.`, 'Turni del personale'); return }
    if (validi.length === 1) { assegnaCon(iso, id, validi[0]); return }
    setPicker({ iso, id, modo: 'nuovo', dove: 'giorno' })
  }
  const clicGiorno = async (iso: string) => {
    if (!sel || !turnoAttivoSel) return
    const a = assenzaDi(richieste, sel.id, iso)
    if (bloccaTurno(a)) { toast.warning(`${sel.nome} ${sel.cognome} è in ${a!.tipo.toLowerCase()} ${giornoLungo(iso)}.`, 'Turni del personale'); return }
    if ((assegnazioni[iso] ?? []).includes(sel.id)) return
    if (!(await okPassato(iso))) return
    assegnaCon(iso, sel.id, turnoAttivoSel)
  }
  const apriCambio = async (iso: string, id: number, dove: Picker['dove']) => {
    if (!(await okPassato(iso))) return
    setPicker({ iso, id, modo: (assegnazioni[iso] ?? []).includes(id) ? 'cambia' : 'nuovo', dove })
  }
  const togli = async (iso: string, id: number) => {
    if (!(await okPassato(iso))) return
    rimuovi(iso, id)
  }

  const scegliDalMenu = (t: TurnoHr) => {
    if (!picker) return
    const { iso, id, modo } = picker
    setPicker(null)
    if (modo === 'cambia') {
      const avvisi = avvisiTurno(iso, id, t)
      setTurno(iso, id, t.id)
      if (avvisi.length) toast.warning(`${nomeDipendente(id)}, ${giornoLungo(iso)} (${t.sigla}): ${avvisi.join('; ').toLowerCase()}.`, 'Turni del personale')
    } else assegnaCon(iso, id, t)
  }
  const menuPer = (p: Picker) => {
    const d = dip(p.id)!
    return (
      <MenuTurno
        titolo={`${p.modo === 'cambia' ? 'Cambia turno' : 'Turno'} di ${d.nome} ${d.cognome} · ${giornoLungo(p.iso)}`}
        opzioni={opzioniPer(p.iso, p.id)}
        corrente={p.modo === 'cambia' ? turnoDi(p.iso, p.id)?.id : undefined}
        onScegli={scegliDalMenu}
        onTogli={p.modo === 'cambia' ? () => { setPicker(null); rimuovi(p.iso, p.id) } : undefined}
        onChiudi={() => setPicker(null)}
      />
    )
  }

  const onDragStart = (e: React.DragEvent, data: DragData) => {
    e.dataTransfer.setData(DND_TYPE, JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'move'
    setPicker(null)
  }
  const onDrop = (e: React.DragEvent, iso: string) => {
    e.preventDefault()
    setDragOver(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData(DND_TYPE)) as DragData
      void prova(iso, data.id, data.da)
    } catch { /* trascinamento non pertinente */ }
  }

  // ── Azioni ──
  const apriSuggerimento = () => {
    if (!giorniFuturi.length) { toast.info('La settimana è già passata: il suggerimento vale per i giorni a venire.', 'Turni del personale'); return }
    setSuggerimento(suggerisciTurni(lunedi, richieste, { esistenti: { assegnazioni, turni }, daGiorno: oggi }))
  }
  const confermaSuggerimento = () => {
    if (!suggerimento) return
    applicaSuggerimento(suggerimento)
    setSuggerimento(null)
    toast.success(`Turno della settimana ${etichettaSettimana(lunedi)} proposto da Sibylla: puoi rifinirlo trascinando i nomi o cambiando i turni.`, 'Turni del personale')
  }
  const svuotaSettimana = async () => {
    const ok = await confirm({
      title: 'Svuota settimana',
      message: <>Vuoi togliere i {turniFuturi} turni dei giorni a venire della settimana <strong>{etichettaSettimana(lunedi)}</strong>? I giorni già passati restano come sono.</>,
      confirmLabel: 'Svuota', danger: true,
    })
    if (ok) svuota(lunedi, giorniFuturi)
  }
  const pubblicaSettimana = async () => {
    if (turniSettimana === 0) { toast.warning('La settimana non ha turni da pubblicare.', 'Turni del personale'); return }
    const ripubblica = statoPubbl === 'da-ripubblicare'
    const ok = await confirm({
      title: ripubblica ? 'Ripubblica turno' : 'Pubblica turno',
      message: ripubblica
        ? (coinvolti.length
          ? <>Il turno aggiornato della settimana <strong>{etichettaSettimana(lunedi)}</strong> arriverà nel Centro notifiche ai <strong>{coinvolti.length} dipendenti coinvolti</strong> dalle modifiche: {coinvolti.map(nomeDipendente).join(', ')}.</>
          : <>Le modifiche hanno riportato il turno com'era alla pubblicazione: nessun dipendente riceverà notifiche.</>)
        : <>Il turno della settimana <strong>{etichettaSettimana(lunedi)}</strong> arriverà ai dipendenti nel Centro notifiche, con i pulsanti <strong>Scarica PDF</strong> e <strong>Visualizza turno</strong>. Le modifiche successive andranno ripubblicate.</>,
      confirmLabel: ripubblica ? 'Ripubblica' : 'Pubblica', danger: false,
    })
    if (!ok) return
    const p = pubblica(lunedi)
    toast.success(p.aggiornamento
      ? (p.destinatari ? `Turno aggiornato: notificato a ${p.destinatari} ${p.destinatari === 1 ? 'dipendente coinvolto' : 'dipendenti coinvolti'}.` : 'Turno ripubblicato senza variazioni per i dipendenti.')
      : `Turno inviato a ${p.destinatari} dipendenti nel Centro notifiche.`, 'Turni del personale')
  }

  const settimanaCorrente = lunedi === lunediDi(oggi)
  const coperturaDi = (g: string) => (reparto ? [reparto] : REPARTI_HR).map(r => coperturaReparto(r, g, assegnazioni, turni, richieste, catalogo))
  const turniLegenda = reparto ? turniValidi(reparto, catalogo) : catalogo
  const vaiScheda = () => navigate('archivio-personale')

  // ── Chip di un dipendente in turno ──
  const chip = (g: string, id: number) => {
    const d = dip(id)!
    const t = turnoDi(g, id)
    const a = assenzaDi(richieste, id, g)
    const conflitto = bloccaTurno(a)
    const prima = t ? riposoPrima(assegnazioni, turni, g, id, t, catalogo) : null
    const breve = prima != null && prima < riposoMinOre()
    const full = [
      `${d.nome} ${d.cognome} · ${d.reparto}`,
      t ? `${t.nome} ${orarioTurno(t)} (${fmtH(oreTurno(t))} h)` : '',
      a?.inAttesa ? `${a.tipo.toLowerCase()} da approvare` : '',
      conflitto ? `in ${a!.tipo.toLowerCase()}: non conta nella copertura, toglilo dal turno` : '',
      breve ? `solo ${fmtH(prima!)} h di riposo dal turno precedente` : '',
      'clic per cambiare turno',
    ].filter(Boolean).join(' · ')
    const aperto = picker?.dove === 'chip' && picker.iso === g && picker.id === id
    return (
      <span key={id} className="tpe__chip-wrap">
        <span
          className={clsx('tpe__chip', a?.inAttesa && 'tpe__chip--attesa', conflitto && 'tpe__chip--conflitto', aperto && 'tpe__chip--open')}
          data-rep={repIdx(d.reparto)}
          draggable
          tabIndex={0}
          role="button"
          aria-label={`${d.nome} ${d.cognome}, turno ${t?.nome ?? 'non indicato'}: cambia turno`}
          onDragStart={e => { e.stopPropagation(); onDragStart(e, { id, da: g }) }}
          onClick={e => { e.stopPropagation(); void apriCambio(g, id, 'chip') }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void apriCambio(g, id, 'chip') } }}
        >
          <Sigla t={t} />
          <TruncatedText text={nomeBreve(id)} full={full} className="tpe__chip-name" />
          {(breve || conflitto) && <i className="fa-solid fa-triangle-exclamation tpe__chip-warn" aria-hidden="true" />}
          <Tooltip text="Togli dal turno">
            <button type="button" className="tpe__chip-x" aria-label={`Togli ${d.nome} ${d.cognome} dal turno`}
              onClick={e => { e.stopPropagation(); void togli(g, id) }}>
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </Tooltip>
        </span>
        {aperto && menuPer(picker!)}
      </span>
    )
  }

  // ── Stato della settimana ──
  const statoEl = (
    <Tooltip text="Le modifiche si salvano da sole; i dipendenti le ricevono solo quando pubblichi (o ripubblichi) il turno.">
      <span className={`tpe__stato tpe__stato--${statoPubbl}`}>
        <i className={clsx('fa-solid', statoPubbl === 'bozza' ? 'fa-pen-ruler' : statoPubbl === 'pubblicato' ? 'fa-circle-check' : 'fa-triangle-exclamation')} aria-hidden="true" />
        {statoPubbl === 'bozza' && <>Bozza · non ancora inviata ai dipendenti</>}
        {statoPubbl === 'pubblicato' && <>Pubblicato il {fmtQuando(stato!.pubblicataAt!)}</>}
        {statoPubbl === 'da-ripubblicare' && <>Modificato dopo la pubblicazione del {fmtQuando(stato!.pubblicataAt!)} · da ripubblicare{coinvolti.length ? ` (${coinvolti.length} ${coinvolti.length === 1 ? 'dipendente coinvolto' : 'dipendenti coinvolti'})` : ''}</>}
        {stato?.origine === 'sibylla' && <span className="tpe__stato-orig"> · proposto da Sibylla{stato.modificata ? ', ritoccato a mano' : ''}</span>}
      </span>
    </Tooltip>
  )

  const legenda = (
    <ul className="tpe__legend">
      {turniLegenda.map(t => <li key={t.id}><Sigla t={t} size="sm" />{t.nome} {orarioTurno(t)}</li>)}
      <li className="tpe__legend-sep" aria-hidden="true" />
      {(reparto ? [reparto] : REPARTI_HR).map(r => <li key={r}><span className="tpe__dot" data-rep={repIdx(r)} />{r}</li>)}
      <li className="tpe__legend-sep" aria-hidden="true" />
      <li><span className="tpe__sw tpe__sw--assente" />Assente (non conta in copertura)</li>
      <li><span className="tpe__sw tpe__sw--attesa" />Richiesta da approvare</li>
      <li><i className="fa-solid fa-lock tpe__legend-ico" aria-hidden="true" />Giorno passato</li>
      <li>
        <Tooltip text="La barra indica il carico di lavoro che l'occupazione prevista porta ai reparti, non un giudizio sull'occupazione: un'occupazione alta è positiva, ma richiede più personale.">
          <span className="tpe__legend-carico">
            Carico di lavoro
            <span className="tpe__occ-fill tpe__occ-fill--basso tpe__legend-bar" />basso
            <span className="tpe__occ-fill tpe__occ-fill--medio tpe__legend-bar" />medio
            <span className="tpe__occ-fill tpe__occ-fill--alto tpe__legend-bar" />alto
          </span>
        </Tooltip>
      </li>
    </ul>
  )

  const badgeGiorno = (g: string, i: number) => (
    <span className={clsx('tpe__badge', i >= 5 && 'tpe__badge--we', g < oggi && 'tpe__badge--past')}>
      <span className="tpe__badge-wd">{g < oggi && <i className="fa-solid fa-lock" aria-hidden="true" />} {GIORNI_BREVI[i]}</span>
      <span className="tpe__badge-dm">{giornoMese(g)}</span>
    </span>
  )

  // ── Riga dipendente dell'elenco ──
  const rigaDip = (d: DipendenteHr) => {
    const r = riepiloghi.get(d.id)!
    const assenze = giorni.map(g => ({ g, a: assenzaDi(richieste, d.id, g) })).filter(x => x.a)
    const attivo = selezionato === d.id
    return (
      <div
        key={d.id}
        role="option"
        aria-selected={attivo}
        tabIndex={0}
        draggable
        onDragStart={e => onDragStart(e, { id: d.id })}
        onClick={() => { setSelezionato(attivo ? null : d.id); setTurnoSel(null) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelezionato(attivo ? null : d.id); setTurnoSel(null) } }}
        className={clsx('tpe__emp', attivo && 'tpe__emp--active')}
        data-rep={repIdx(d.reparto)}
      >
        <i className="fa-solid fa-grip-dots-vertical tpe__grip" aria-hidden="true" />
        <span className="tpe__emp-body">
          <TruncatedText text={`${d.nome} ${d.cognome}`} className="tpe__emp-name" />
          {r.contratto
            ? <TruncatedText text={`${d.reparto} · ${r.contratto.tipo}`} className="tpe__emp-sub" />
            : (
              <Tooltip text="Senza contratto in anagrafica le ore non si possono controllare. Apri l'Archivio del personale per indicarlo.">
                <button type="button" className="tpe__emp-nocontr" onClick={e => { e.stopPropagation(); vaiScheda() }}>
                  <i className="fa-solid fa-file-circle-exclamation" aria-hidden="true" /> Contratto non indicato
                </button>
              </Tooltip>
            )}
        </span>
        {assenze.length > 0 && (
          <Tooltip text={assenze.map(x => `${GIORNI_BREVI[giorni.indexOf(x.g)]} ${giornoMese(x.g)}: ${x.a!.tipo}${x.a!.inAttesa ? ' (da approvare)' : ''}`).join(' · ')}>
            <i className={clsx('fa-solid fa-umbrella-beach tpe__emp-abs', assenze.every(x => x.a!.inAttesa) && 'tpe__emp-abs--attesa')} aria-label="Assenze nella settimana" />
          </Tooltip>
        )}
        <OreDip r={r} onScheda={vaiScheda} />
      </div>
    )
  }

  return (
    <div className="tpe">
      <PageHead
        title="Turni del personale"
        subtitle="Assegna a ogni dipendente il turno di ogni giorno, oppure fatti proporre la settimana da Sibylla"
      />

      {/* ── Filtri e azioni ── */}
      <div className="tpe__filters">
        <SelectField name="struttura" label="Struttura" className="tpe__field tpe__field--struttura" value={struttura}
          onChange={e => setStruttura(e.target.value)} options={opzioniStrutture} />
        <SelectField name="reparto" label="Reparto" className="tpe__field" value={reparto}
          onChange={e => { setReparto(e.target.value as Reparto | ''); setSelezionato(null); setPicker(null) }}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <div className="tpe__week">
          <span className="tpe__week-label">Settimana</span>
          <div className="tpe__week-nav">
            <Tooltip text="Settimana precedente">
              <button type="button" className="tpe__nav-btn" onClick={() => { setLunedi(addGiorni(lunedi, -7)); setPicker(null) }} aria-label="Settimana precedente">
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
            </Tooltip>
            <span className="tpe__week-txt">{etichettaSettimana(lunedi)}</span>
            <Tooltip text="Settimana successiva">
              <button type="button" className="tpe__nav-btn" onClick={() => { setLunedi(addGiorni(lunedi, 7)); setPicker(null) }} aria-label="Settimana successiva">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </Tooltip>
            {!settimanaCorrente && (
              <button type="button" className="sib-btn sib-btn--ghost tpe__today" onClick={() => setLunedi(lunediDi(oggi))}>Questa settimana</button>
            )}
          </div>
        </div>
        {vista === 'dipendenti' && (
          <div className="tpe__week tpe__field tpe__field--search">
            <span className="tpe__week-label">Dipendente</span>
            <SearchField name="cercaDipendenteGriglia" placeholder="Cerca dipendente…" value={search}
              onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
        )}

        <div className="tpe__spacer" aria-hidden="true" />

        <div className="tpe__actions">
        <Tooltip text="Apri il Piano ferie">
          <button type="button" className="sib-btn sib-btn--secondary tpe__btn tpe__btn--ferie" onClick={() => navigate('hr-piano-ferie')} aria-label="Piano ferie">
            <i className="fa-solid fa-calendar-days" aria-hidden="true" /><span className="tpe__btn-txt">Piano ferie</span>
          </button>
        </Tooltip>
        <span className="tpe__actions-sep" aria-hidden="true" />
        <button type="button" className="sib-btn sib-btn--secondary tpe__btn" onClick={apriSuggerimento}>
          <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Suggerimento Sibylla
        </button>
        {statoPubbl === 'pubblicato' ? (
          <Tooltip text="Nessuna modifica dall'ultima pubblicazione">
            <button type="button" className="sib-btn sib-btn--primary tpe__btn" disabled>
              <i className="fa-solid fa-circle-check" aria-hidden="true" /> Pubblicato
            </button>
          </Tooltip>
        ) : (
          <button type="button" className="sib-btn sib-btn--primary tpe__btn" onClick={pubblicaSettimana}>
            <i className={clsx('fa-solid', statoPubbl === 'da-ripubblicare' ? 'fa-arrows-rotate' : 'fa-paper-plane')} aria-hidden="true" />
            {statoPubbl === 'da-ripubblicare' ? ' Ripubblica turno' : ' Pubblica turno'}
          </button>
        )}
        </div>
      </div>

      {/* ── Vista + status bar ── */}
      <div className="tpe__bar">
      <VistaSwitch ariaLabel="Vista dei turni" value={vista} onChange={v => { setVista(v); setPicker(null) }} options={[
        { value: 'giorni', label: 'Per giorno', icon: 'fa-calendar-week' },
        { value: 'dipendenti', label: 'Per dipendente', icon: 'fa-table-cells' },
      ]} />
      <div className={clsx('tpe__statusbar', statoPubbl === 'da-ripubblicare' && 'tpe__statusbar--warn')} role="status">
        {sel && vista === 'giorni' ? (
          <>
            <span className="tpe__dot" data-rep={repIdx(sel.reparto)} aria-hidden="true" />
            <span className="tpe__statusbar-txt">
              Clicca i giorni per assegnare <strong>{sel.nome} {sel.cognome}</strong> con il turno
            </span>
            <span className="tpe__statusbar-turni" role="radiogroup" aria-label="Turno da assegnare">
              {turniSel.map(t => (
                <Tooltip key={t.id} text={`${t.nome} ${orarioTurno(t)} · ${fmtH(oreTurno(t))} h`}>
                  <button type="button" role="radio" aria-checked={t.id === turnoAttivoSel?.id}
                    className={clsx('tpe__turno-opt', t.id === turnoAttivoSel?.id && 'tpe__turno-opt--on')} onClick={() => setTurnoSel(t.id)}>
                    <Sigla t={t} size="sm" /> {t.nome}
                  </button>
                </Tooltip>
              ))}
            </span>
            <button type="button" className="tpe__statusbar-link" onClick={() => setSelezionato(null)}>Annulla selezione</button>
          </>
        ) : (
          <>
            <i className="fa-solid fa-hand-pointer tpe__statusbar-ico" aria-hidden="true" />
            <span className="tpe__statusbar-txt">
              {vista === 'giorni'
                ? 'Trascina un dipendente su un giorno e scegli il turno; clicca un chip per cambiarlo'
                : 'Clicca una casella per assegnare, cambiare o togliere il turno'}
            </span>
          </>
        )}
        {statoEl}
      </div>
      </div>

      {vista === 'giorni' ? (
        <div className="tpe__layout">
          {/* ── Elenco del personale ── */}
          <aside className="tpe__sidebar" aria-label="Personale">
            <header className="tpe__sidebar-head">
              <div className="tpe__sidebar-title">Personale</div>
              <Tooltip text="Ore assegnate nella settimana / ore da contratto, e giorni di riposo">
                <span className="tpe__sidebar-hint">Ore · riposi</span>
              </Tooltip>
            </header>
            <div className="tpe__sidebar-search">
              <SearchField name="cercaDipendente" placeholder="Cerca dipendente…" value={search}
                onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
            </div>
            <div className="tpe__list" role="listbox" aria-label="Dipendenti">
              {personale.length === 0 && <div className="tpe__list-empty">Nessun dipendente trovato.</div>}
              {personale.map(rigaDip)}
            </div>
            <footer className="tpe__sidebar-foot">
              <button type="button" className="tpe__tool" onClick={svuotaSettimana} disabled={turniFuturi === 0}>
                <i className="fa-solid fa-trash-can" aria-hidden="true" /> Svuota i giorni a venire
              </button>
            </footer>
          </aside>

          {/* ── Settimana: una riga per giorno ── */}
          <div className="tpe__week-grid">
            <div className="tpe__head">
              <span>Giorno</span>
              <Tooltip text="Occupazione prevista della struttura e carico di lavoro che comporta">
                <span className="tpe__head-help">Occupazione</span>
              </Tooltip>
              <span>Personale in turno</span>
              <span className="tpe__head-r">{reparto ? 'Copertura per fascia' : 'Copertura per reparto'}</span>
            </div>
            {giorni.map((g, i) => {
              const occ = occupazione(g)
              const liv = livelloCarico(occ)
              const inTurno = (assegnazioni[g] ?? []).filter(id => !reparto || dip(id)?.reparto === reparto)
                .sort((a, b) => repIdx(dip(a)!.reparto) - repIdx(dip(b)!.reparto) || (inizioOrd(turnoDi(g, a)) - inizioOrd(turnoDi(g, b))))
              const assenti = DIPENDENTI_HR
                .filter(d => (!reparto || d.reparto === reparto) && !inTurno.includes(d.id))
                .map(d => ({ d, a: assenzaDi(richieste, d.id, g) }))
                .filter(x => x.a)
              const nuovoQui = picker?.dove === 'giorno' && picker.iso === g
              return (
                <div
                  key={g}
                  className={clsx('tpe__day', g === oggi && 'tpe__day--today', g < oggi && 'tpe__day--past', dragOver === g && 'tpe__day--over', sel && 'tpe__day--clickable')}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== g) setDragOver(g) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                  onDrop={e => onDrop(e, g)}
                  onClick={() => { if (sel) void clicGiorno(g) }}
                >
                  {g < oggi
                    ? <Tooltip text="Giorno passato: ha timbrature collegate, si modifica solo dopo conferma">{badgeGiorno(g, i)}</Tooltip>
                    : badgeGiorno(g, i)}

                  <span className="tpe__occ">
                    <Tooltip text={`Occupazione prevista ${occ}%: carico di lavoro ${liv}${liv === 'alto' ? ', servono più persone nei reparti che seguono l\'occupazione' : ''}`}>
                      <span className="tpe__occ-val">{occ}%</span>
                    </Tooltip>
                    <span className="tpe__occ-bar"><span className={`tpe__occ-fill tpe__occ-fill--${liv}`} data-occ={Math.round(occ / 5) * 5} /></span>
                  </span>

                  <div className="tpe__chips">
                    {inTurno.length === 0 && assenti.length === 0 && (
                      <span className="tpe__drop-hint">{sel ? 'Clicca per assegnare' : 'Trascina qui il personale'}</span>
                    )}
                    {inTurno.map(id => chip(g, id))}
                    {assenti.map(({ d, a }) => (
                      <span key={d.id} className={clsx('tpe__chip tpe__chip--assente', a!.inAttesa && 'tpe__chip--assente-attesa')}>
                        <TruncatedText text={`${nomeBreve(d.id)} · ${a!.tipo}`}
                          full={`${d.nome} ${d.cognome}: ${a!.tipo.toLowerCase()}${a!.inAttesa ? ' (richiesta da approvare)' : ''}, dal modulo Gestione ferie e permessi`} className="tpe__chip-name" />
                      </span>
                    ))}
                    {nuovoQui && <span className="tpe__chip-wrap tpe__chip-wrap--nuovo">{menuPer(picker!)}</span>}
                  </div>

                  <Copertura coperture={coperturaDi(g)} reparto={reparto} onReparto={r => { setReparto(r); setSelezionato(null) }} />
                </div>
              )
            })}
            {legenda}
          </div>
        </div>
      ) : (
        /* ── Griglia dipendenti × giorni ── */
        <div className="tpe__grid">
          <table className="sib-table tpe__tab">
            <colgroup>
              <col className="tpe__col-dip" />
              {giorni.map(g => <col key={g} className="tpe__col-day" />)}
              <col className="tpe__col-ore" />
            </colgroup>
            <thead>
              <tr>
                <th>Dipendente</th>
                {giorni.map((g, i) => (
                  <th key={g} className={clsx('tpe__th-day', g === oggi && 'tpe__th-day--today', g < oggi && 'tpe__th-day--past')}>
                    <span className="tpe__th-wd">{g < oggi && <i className="fa-solid fa-lock" aria-hidden="true" />} {GIORNI_BREVI[i]} {giornoMese(g)}</span>
                    <Tooltip text={`Occupazione prevista ${occupazione(g)}%: carico di lavoro ${livelloCarico(occupazione(g))}`}>
                      <span className="tpe__th-occ">{occupazione(g)}%</span>
                    </Tooltip>
                  </th>
                ))}
                <th className="tpe__th-ore">Ore · riposi</th>
              </tr>
            </thead>
            <tbody>
              {(reparto ? [reparto] : REPARTI_HR).map(rep => {
                const staff = personale.filter(d => d.reparto === rep)
                if (!staff.length) return null
                return (
                  <React.Fragment key={rep}>
                    <tr className="tpe__tab-group">
                      <td colSpan={9}>
                        <span className="tpe__dot" data-rep={repIdx(rep)} aria-hidden="true" /> {rep}
                        <span className="tpe__tab-group-meta">{fabbisognoAOccupazione(rep) ? 'Fabbisogno sull\'occupazione' : 'Minimo fisso'}</span>
                      </td>
                    </tr>
                    {staff.map(d => {
                      const r = riepiloghi.get(d.id)!
                      return (
                        <tr key={d.id} data-rep={repIdx(d.reparto)}>
                          <td className="tpe__tab-dip">
                            <TruncatedText text={`${d.nome} ${d.cognome}`} className="tpe__emp-name" />
                            {r.contratto
                              ? <TruncatedText text={r.contratto.tipo} className="tpe__emp-sub" />
                              : <button type="button" className="tpe__emp-nocontr" onClick={vaiScheda}><i className="fa-solid fa-file-circle-exclamation" aria-hidden="true" /> Contratto non indicato</button>}
                          </td>
                          {giorni.map(g => {
                            const t = turnoDi(g, d.id)
                            const a = assenzaDi(richieste, d.id, g)
                            const blocca = bloccaTurno(a)
                            const prima = t ? riposoPrima(assegnazioni, turni, g, d.id, t, catalogo) : null
                            const breve = prima != null && prima < riposoMinOre()
                            const aperto = picker?.dove === 'cella' && picker.iso === g && picker.id === d.id
                            const label = t ? `${t.nome} ${orarioTurno(t)}${breve ? ` · solo ${fmtH(prima!)} h di riposo dal turno precedente` : ''}${blocca ? ` · in ${a!.tipo.toLowerCase()}` : ''}`
                              : blocca ? `${a!.tipo} (dal modulo Gestione ferie e permessi)` : `Riposo${a?.inAttesa ? ` · ${a.tipo.toLowerCase()} da approvare` : ''} · clic per assegnare`
                            return (
                              <td key={g} className={clsx('tpe__cell', g < oggi && 'tpe__cell--past', g === oggi && 'tpe__cell--today')}>
                                {blocca && !t ? (
                                  <Tooltip text={label}><span className="tpe__cell-abs">{a!.tipo}</span></Tooltip>
                                ) : (
                                  <Tooltip text={label}>
                                    <button type="button" className={clsx('tpe__cell-btn', !t && 'tpe__cell-btn--vuota', (breve || blocca) && 'tpe__cell-btn--warn', a?.inAttesa && 'tpe__cell-btn--attesa', aperto && 'tpe__cell-btn--open')}
                                      onClick={() => void apriCambio(g, d.id, 'cella')}>
                                      {t ? <><Sigla t={t} size="sm" /><span className="tpe__cell-orario">{orarioBreve(t)}</span></> : <span className="tpe__cell-r">R</span>}
                                      {(breve || blocca) && <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
                                    </button>
                                  </Tooltip>
                                )}
                                {aperto && menuPer(picker!)}
                              </td>
                            )
                          })}
                          <td className="tpe__tab-ore"><OreDip r={r} onScheda={vaiScheda} /></td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="tpe__tab-foot-lbl">{reparto ? 'Copertura per fascia' : 'Copertura per reparto'}</td>
                {giorni.map(g => (
                  <td key={g} className="tpe__tab-foot">
                    <Copertura coperture={coperturaDi(g)} reparto={reparto} onReparto={r => setReparto(r)} />
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
          {legenda}
        </div>
      )}

      {/* ── Suggerimento di Sibylla ── */}
      <Modal open={!!suggerimento} onClose={() => setSuggerimento(null)} title="Suggerimento di Sibylla" size="xl">
        {suggerimento && (
          <div className="tpe-modal">
            <p className="tpe-modal__lead">
              Turno proposto per la settimana <strong>{etichettaSettimana(suggerimento.lunedi)}</strong>: per ogni persona il giorno e il turno,
              calcolati su occupazione, fabbisogno per fascia di ciascun reparto, ore da contratto, riposo di {riposoMinOre()} ore e richieste di ferie, permessi e malattia.
            </p>
            <dl className="tpe-modal__kpi">
              <div><dt>Occupazione media</dt><dd>{suggerimento.occupazioneMedia}%</dd></div>
              <div><dt>Picco</dt><dd>{GIORNI_BREVI[giorni.indexOf(suggerimento.picco.iso)]} {giornoMese(suggerimento.picco.iso)} · {suggerimento.picco.occ}%</dd></div>
              <div><dt>Fasce coperte</dt><dd>{suggerimento.fasceCoperte} su {suggerimento.fasceTot}</dd></div>
              <div><dt>Assenze considerate</dt><dd>{suggerimento.assenzeConsiderate.length}</dd></div>
            </dl>
            <div className="tpe-modal__days">
              {giorniSettimana(suggerimento.lunedi).map((g, i) => {
                const bloccato = suggerimento.giorniBloccati.includes(g)
                const ids = (suggerimento.assegnazioni[g] ?? []).filter(id => !reparto || dip(id)?.reparto === reparto)
                  .sort((a, b) => repIdx(dip(a)!.reparto) - repIdx(dip(b)!.reparto))
                return (
                  <div key={g} className={clsx('tpe-modal__day', bloccato && 'tpe-modal__day--past')}>
                    <span className="tpe-modal__day-wd">{bloccato && <i className="fa-solid fa-lock" aria-hidden="true" />} {GIORNI_BREVI[i]} {giornoMese(g)}</span>
                    <span className="tpe-modal__day-occ">{occupazione(g)}% · {ids.length} in turno</span>
                    <span className="tpe-modal__day-list">
                      {ids.map(id => {
                        const t = turnoDel(suggerimento.assegnazioni, suggerimento.turniAssegnati, g, id, catalogo)
                        return (
                          <span key={id} className="tpe-modal__pers" data-rep={repIdx(dip(id)!.reparto)}>
                            <Sigla t={t} size="sm" />
                            <TruncatedText text={dip(id)!.cognome} full={`${nomeDipendente(id)} · ${dip(id)!.reparto}${t ? ` · ${t.nome} ${orarioTurno(t)}` : ''}`} className="tpe-modal__pers-name" />
                          </span>
                        )
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
            <ul className="tpe-modal__notes">
              {suggerimento.note.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
            {turniFuturi > 0 && (
              <p className="tpe-modal__warn">
                <i className="fa-solid fa-circle-info" aria-hidden="true" /> Applicando il suggerimento sostituisci i {turniFuturi} turni già inseriti nei giorni a venire{statoPubbl !== 'bozza' ? ': il turno andrà ripubblicato' : ''}.
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

/** "07–15" o, per lo spezzato, "10–14/18–22". */
function orarioBreve(t: TurnoHr) {
  const h = (x?: string) => (x ?? '').replace(/:00$/, '')
  return t.inizio2 && t.fine2 ? `${h(t.inizio)}–${h(t.fine)}/${h(t.inizio2)}–${h(t.fine2)}` : `${h(t.inizio)}–${h(t.fine)}`
}

/** Ordine dei chip nel giorno: per orario di inizio del turno. */
function inizioOrd(t?: TurnoHr) {
  if (!t) return 9999
  const m = t.inizio.match(/^(\d{1,2}):(\d{2})$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9999
}
