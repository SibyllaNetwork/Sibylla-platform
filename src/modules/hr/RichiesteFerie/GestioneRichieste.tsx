import React, { useState } from 'react'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import Ico from '../../../core/icons/Ico'
import { SelectField, DateRangeField, TextareaField, InputField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { toast } from '../../../core/components/Toast/useToast'
import {
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, TIPI_ASSENZA, STATI_RICHIESTA,
  nomeDipendente, repartoDipendente, fmtDataHr, giorniLavorativi, ferieGodute, sovrapposizioni,
  saldoRol, oreRichiesta, ORE_GIORNO, inAttesaRichiesta,
  type RichiestaAssenza, type TipoAssenza, type StatoRichiesta,
} from '../../../store/useHrGestioneStore'
import StoricoHr from '../_storico/StoricoHr'
import { usePianiFerieStore, type PianoFerie } from '../../../store/usePianiFerieStore'
import { pianoDi, saldoDopo, verificaRegole } from '../PianoFerie/regolePiano'
import { occupazione, addGiorni } from '../../../store/useTurniPersonaleStore'
import RichiesteCalendario, { type CalendarioOpzioni } from './RichiesteCalendario'
import './RichiesteFerie.sass'

// ─── GESTIONE DELLE RICHIESTE A CALENDARIO ────────────────────────────────────
//  Calendario delle richieste con tutto quello che l'ufficio del personale ci
//  fa sopra: dettaglio (clic), modifica (tasto destro), spostamento
//  (trascinamento), nuova richiesta (tasto destro su una casella vuota),
//  approvazione con le verifiche di saldo, rifiuto con motivo, sollecito al
//  responsabile ed eliminazione. Lo usano Richieste e Piano ferie.

/** Ultima correzione dell'HR, se c'è. */
/** Richiesta inserita dall'ufficio del personale invece che inviata dall'App Op!. */
export const inseritaDaHr = (r: RichiestaAssenza) => !!r.storico?.[0]?.azione.startsWith('Inserita')
export const ultimaModifica = (r: RichiestaAssenza) => [...(r.storico ?? [])].reverse().find(e => e.azione === 'Modificata')

export const statoCls = (s: StatoRichiesta) => (s === 'Al responsabile' ? 'info' : s === 'Da approvare' ? 'attesa' : s === 'Approvata' ? 'ok' : 'ko')
export const VISTA_RESP = 'Al responsabile'

/** Tipi che si possono chiedere a ore. */
const A_ORE: TipoAssenza[] = ['ROL', 'Permesso']
export const fmtOre = (h: number) => `${h.toLocaleString('it-IT', { maximumFractionDigits: 1 })} h`

export const durata = (r: Pick<RichiestaAssenza, 'tipo' | 'dal' | 'al' | 'ore'>) => {
  if (r.ore != null) return fmtOre(r.ore)
  const g = Math.max(1, giorniLavorativi(r.dal, r.al))
  return g === 1 ? '1 giorno' : `${g} giorni`
}

/** "09/11 → 15/11/2026": l'anno si ripete solo se cambia. */
export const periodo = (dal: string, al: string) => {
  if (dal === al) return fmtDataHr(dal)
  const a = fmtDataHr(dal)
  return `${dal.slice(0, 4) === al.slice(0, 4) ? a.slice(0, 5) : a} → ${fmtDataHr(al)}`
}

// ─── Valutazione di Sibylla sulle richieste da approvare ─────────────────────
type Livello = 'ok' | 'warn' | 'ko'
interface Valutazione { livello: Livello; motivi: { livello: Livello | 'info'; testo: string }[] }
const LIVELLO_LBL: Record<Livello, string> = { ok: 'Approvabile', warn: 'Da valutare', ko: 'Sconsigliata' }
const TIPO_ICO: Record<TipoAssenza, string> = { Ferie: 'fa-umbrella-beach', Permesso: 'fa-clock', ROL: 'fa-hourglass-half', Malattia: 'fa-notes-medical' }
export const REP_IDX = (rep: string) => REPARTI_HR.indexOf(rep as typeof REPARTI_HR[number]) + 1
export const iniziali = (nome: string) => nome.split(' ').map(x => x.charAt(0)).slice(0, 2).join('')

export const giorniA = (iso: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(new Date().toDateString() + ' 12:00').getTime()) / 86400000)

/** Occupazione media prevista della struttura nel periodo richiesto. */
function occupazioneMedia(dal: string, al: string) {
  const out: number[] = []
  for (let g = dal; g <= al && out.length < 60; g = addGiorni(g, 1)) out.push(occupazione(g))
  return out.length ? Math.round(out.reduce((a, b) => a + b, 0) / out.length) : 0
}

export function valuta(r: RichiestaAssenza & { residuo: number; conflitti: RichiestaAssenza[]; reparto: string }, richieste: RichiestaAssenza[], piani: PianoFerie[]): Valutazione {
  const motivi: Valutazione['motivi'] = []
  if (r.tipo === 'Malattia') return { livello: 'ok', motivi: [{ livello: 'ok', testo: 'Malattia: va registrata con il certificato.' }] }
  const colleghi = DIPENDENTI_HR.filter(d => d.reparto === r.reparto && d.id !== r.dipendenteId).length
  const assenti = new Set(r.conflitti.map(c => c.dipendenteId)).size
  if (assenti > 0 && assenti >= colleghi) motivi.push({ livello: 'ko', testo: `${r.reparto} resterebbe scoperto: tutti i colleghi sono già assenti.` })
  else if (assenti > 0) motivi.push({ livello: 'warn', testo: `Nel reparto è già assente ${r.conflitti.map(c => nomeDipendente(c.dipendenteId)).join(', ')}.` })
  // Ferie in un piano aperto: valgono le sue regole (giorni consecutivi, presenza del reparto, residui e negativo).
  const piano = pianoDi(r, piani)
  if (piano) motivi.push(...verificaRegole(r, richieste, piano))
  else if (r.tipo === 'Ferie' && r.residuo < 0) motivi.push({ livello: 'warn', testo: `Saldo a ${r.residuo} gg: il negativo è consentito solo con l'autorizzazione dell'ufficio del personale.` })
  if (r.tipo === 'ROL' && r.residuo < 0) motivi.push({ livello: 'ko', testo: `ROL insufficienti: mancano ${fmtOre(-r.residuo)}.` })
  const occ = occupazioneMedia(r.dal, r.al)
  if (occ >= 85) motivi.push({ livello: 'warn', testo: `Periodo di alta occupazione (${occ}% in media).` })
  else motivi.push({ livello: 'ok', testo: `Occupazione prevista nel periodo: ${occ}%.` })
  const tra = giorniA(r.dal)
  if (tra >= 0 && tra <= 3) motivi.push({ livello: 'info', testo: tra === 0 ? 'Inizia oggi: decidi subito.' : `Inizia tra ${tra === 1 ? '1 giorno' : `${tra} giorni`}: decidi presto.` })
  const livello: Livello = motivi.some(m => m.livello === 'ko') ? 'ko' : motivi.some(m => m.livello === 'warn') ? 'warn' : 'ok'
  if (livello === 'ok' && !motivi.some(m => m.livello === 'info')) motivi.unshift({ livello: 'ok', testo: 'Nessun conflitto nel reparto e saldo sufficiente.' })
  return { livello, motivi }
}

/** Campi cambiati dall'HR, in parole: finiscono nello storico e nella notifica al dipendente. */
export function differenze(a: RichiestaAssenza, b: Pick<RichiestaAssenza, 'dipendenteId' | 'tipo' | 'dal' | 'al' | 'note' | 'ore' | 'stato' | 'motivo'>) {
  const out: string[] = []
  if (a.dipendenteId !== b.dipendenteId) out.push(`Dipendente: ${nomeDipendente(a.dipendenteId)} → ${nomeDipendente(b.dipendenteId)}`)
  if (a.tipo !== b.tipo) out.push(`Tipo: ${a.tipo} → ${b.tipo}`)
  if (a.dal !== b.dal || a.al !== b.al) out.push(`Periodo: ${periodo(a.dal, a.al)} → ${periodo(b.dal, b.al)}`)
  if ((a.ore ?? null) !== (b.ore ?? null)) out.push(`Durata: ${durata(a)} → ${durata(b)}`)
  if ((a.note ?? '') !== (b.note ?? '')) out.push(b.note ? `Note: «${b.note}»` : 'Note rimosse')
  if (a.stato !== b.stato) out.push(`Stato: ${a.stato} → ${b.stato}`)
  else if (b.stato === 'Rifiutata' && (a.motivo ?? '') !== (b.motivo ?? '')) out.push('Motivo del rifiuto aggiornato')
  return out
}

const fmtGiorno = (iso?: string) => iso ? new Date(iso).toLocaleDateString('it-IT') : ''

/** Primo livello dell'iter in parole, per tooltip e modale. */
export function testoIter(r: RichiestaAssenza) {
  const x = r.responsabile
  if (!x) return 'Nessun responsabile di reparto: la richiesta è arrivata direttamente all\'ufficio del personale.'
  if (x.esito === 'In attesa') return `In attesa di ${x.nome}, responsabile ${repartoDipendente(r.dipendenteId)}, nell'App Op!${x.sollecitatoAt ? ` · sollecitato il ${fmtGiorno(x.sollecitatoAt)}` : ''}`
  return `${x.esito === 'Approvata' ? 'Approvata' : 'Rifiutata'} da ${x.nome}, responsabile ${repartoDipendente(r.dipendenteId)}, il ${fmtGiorno(x.at)}${x.motivo ? `: ${x.motivo}` : ''}`
}

/** Icona dell'esito del responsabile di reparto accanto allo stato (solo ferie/ROL con responsabile). */
export function IterResponsabile({ r }: { r: RichiestaAssenza }) {
  const x = r.responsabile
  if (!x) return null
  const k = x.esito === 'Approvata' ? 'ok' : x.esito === 'Rifiutata' ? 'ko' : 'attesa'
  const ico = k === 'ok' ? 'fa-user-check' : k === 'ko' ? 'fa-user-xmark' : 'fa-user-clock'
  return (
    <Tooltip text={testoIter(r)}>
      <span className={`rfe__iter rfe__iter--${k}`} aria-label={testoIter(r)}><i className={`fa-solid ${ico}`} aria-hidden="true" /></span>
    </Tooltip>
  )
}

interface Bozza { id: string; dipendenteId: string; tipo: TipoAssenza; dal: string; al: string; note: string; ore: string; stato: StatoRichiesta; motivo: string; messaggio: string }

/** Richiesta con i dati che servono a calendario e dettaglio: residuo, sovrapposizioni, valutazione di Sibylla. */
export function arricchisciRichiesta(r: RichiestaAssenza, richieste: RichiestaAssenza[], piani: PianoFerie[]) {
      const d = DIPENDENTI_HR.find(x => x.id === r.dipendenteId)
      const giorni = giorniLavorativi(r.dal, r.al)
      const godute = ferieGodute(richieste, r.dipendenteId)
      // Residuo dopo la richiesta: per una richiesta di ferie ancora in attesa si sottraggono anche i suoi giorni.
      // Per i ROL il residuo è in ore: sul monte ore annuo, togliendo anche questa richiesta se in attesa.
      const rol = r.tipo === 'ROL' ? saldoRol(richieste, r.dipendenteId, Number(r.dal.slice(0, 4))) : null
      const residuo = rol
        ? rol.residue - (inAttesaRichiesta(r.stato) ? oreRichiesta(r) : 0)
        : (d?.ferieAnnue ?? 0) - godute - (r.tipo === 'Ferie' && inAttesaRichiesta(r.stato) ? giorni : 0)
      const base = {
        ...r,
        dipendente: nomeDipendente(r.dipendenteId),
        reparto: repartoDipendente(r.dipendenteId),
        giorni,
        residuo,
        conflitti: r.stato === 'Rifiutata' ? [] : sovrapposizioni(richieste, r),
      }
    return { ...base, valutazione: r.stato === 'Da approvare' ? valuta(base, richieste, piani) : null, urgente: r.stato === 'Da approvare' && giorniA(r.dal) <= 3 }
  }

interface Props extends CalendarioOpzioni {
  /** Richieste da mostrare (già filtrate dalla pagina). */
  richieste: RichiestaAssenza[]
  reparto: string
  /** Strumenti a destra della legenda. */
  azioni?: React.ReactNode
  /** Solo consultazione (es. piano archiviato): niente dettaglio, spostamenti né inserimenti. */
  solaLettura?: boolean
}

export default function GestioneRichieste({ richieste: visibili, reparto, azioni, solaLettura, ...calendario }: Props) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const piani = usePianiFerieStore(s => s.piani)
  const decidi = useHrGestioneStore(s => s.decidiRichiesta)
  const sollecitaResp = useHrGestioneStore(s => s.sollecitaResponsabile)
  const modifica = useHrGestioneStore(s => s.modificaRichiesta)
  const elimina = useHrGestioneStore(s => s.eliminaRichiesta)
  const inserisci = useHrGestioneStore(s => s.inserisciRichiestaHr)
  const confirm = useConfirmStore(s => s.confirm)
  // Rifiuto di una o più richieste (selezione multipla): un solo motivo per tutte.
  const [rifiuto, setRifiuto] = useState<{ rows: RichiestaAssenza[]; motivo: string } | null>(null)
  const [bozza, setBozza] = useState<Bozza | null>(null)
  const [errori, setErrori] = useState<Record<string, string>>({})

  const [dettaglioId, setDettaglioId] = useState<string | null>(null)
  const arricchisci = (r: RichiestaAssenza) => arricchisciRichiesta(r, richieste, piani)

  /**
   * Ferie oltre i giorni residui: il saldo va in negativo solo se l'HR lo autorizza
   * esplicitamente. Ritorna la nota per lo storico, null se l'HR non autorizza,
   * '' se il saldo resta positivo.
   */
  const autorizzaNegativo = async (xs: RichiestaAssenza[]): Promise<Map<string, string> | null> => {
    const neg = xs.filter(r => r.tipo === 'Ferie' && saldoDopo(r, richieste) < 0)
    const note = new Map<string, string>()
    if (!neg.length) return note
    const righe = neg.map(r => {
      const dopo = saldoDopo(r, richieste)
      const piano = pianoDi(r, piani)
      const oltre = piano && (!piano.regole.entroResidui ? false : -dopo > piano.regole.negativoMax)
      note.set(r.id, `Saldo negativo autorizzato: ${dopo} gg`)
      return { r, dopo, piano, oltre }
    })
    const ok = await confirm({
      title: neg.length === 1 ? 'Autorizza il saldo negativo' : `Autorizza ${neg.length} saldi negativi`,
      message: <>
        {righe.map(({ r, dopo, piano, oltre }) => (
          <span key={r.id} className="rfe-neg__riga">
            <strong>{nomeDipendente(r.dipendenteId)}</strong>: con queste ferie il saldo va a <strong>{dopo} gg</strong>
            {piano && (oltre
              ? <> · oltre il negativo consentito da «{piano.nome}» ({piano.regole.negativoMax} gg)</>
              : <> · entro il limite di «{piano.nome}»</>)}.
          </span>
        ))}
        <span className="rfe-neg__riga">Il negativo richiede la tua autorizzazione: verrà recuperato con le ferie che maturano e resta nello storico della richiesta.</span>
      </>,
      confirmLabel: 'Autorizza e approva', danger: righe.some(x => x.oltre),
    })
    return ok ? note : null
  }

  const approva = async (r: RichiestaAssenza) => {
    const neg = await autorizzaNegativo([r])
    if (!neg) return
    if (r.tipo === 'ROL') {
      const saldo = saldoRol(richieste, r.dipendenteId, Number(r.dal.slice(0, 4)))
      const ore = oreRichiesta(r)
      if (ore > saldo.residue) {
        const ok = await confirm({
          title: 'ROL insufficienti',
          message: <>{nomeDipendente(r.dipendenteId)} ha <strong>{fmtOre(Math.max(0, saldo.residue))}</strong> di ROL residui e ne chiede <strong>{fmtOre(ore)}</strong>. Le ore mancanti andranno recuperate o tolte dalle ferie. Approvi comunque?</>,
          confirmLabel: 'Approva comunque', danger: false,
        })
        if (!ok) return
      }
    }
    decidi(r.id, 'Approvata', undefined, neg.get(r.id))
    toast.success(`${r.tipo} di ${nomeDipendente(r.dipendenteId)} dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)} approvata: è nel Piano ferie.`, 'Richiesta approvata')
  }
  const confermaRifiuto = () => {
    if (!rifiuto || !rifiuto.motivo.trim()) return
    rifiuto.rows.forEach(r => decidi(r.id, 'Rifiutata', rifiuto.motivo.trim()))
    toast.info(rifiuto.rows.length === 1
      ? `Richiesta di ${nomeDipendente(rifiuto.rows[0].dipendenteId)} rifiutata.`
      : `${rifiuto.rows.length} richieste rifiutate.`, rifiuto.rows.length === 1 ? 'Richiesta rifiutata' : 'Richieste rifiutate')
    setRifiuto(null)
  }

  const apriModifica = (r: RichiestaAssenza) => {
    setErrori({})
    setBozza({
      id: r.id, dipendenteId: String(r.dipendenteId), tipo: r.tipo, dal: r.dal, al: r.al, note: r.note ?? '',
      ore: String(r.ore ?? ORE_GIORNO).replace('.', ','), stato: r.stato, motivo: r.motivo ?? '', messaggio: '',
    })
  }

  /** Nuova richiesta dal calendario (tasto destro su una casella): l'ufficio del personale la inserisce già decisa. */
  const nuovaRichiesta = (dipendenteId: number, iso: string, tipo: TipoAssenza) => {
    setErrori({})
    setBozza({ id: '', dipendenteId: String(dipendenteId), tipo, dal: iso, al: iso, note: '', ore: String(A_ORE.includes(tipo) ? 2 : ORE_GIORNO), stato: 'Approvata', motivo: '', messaggio: '' })
  }

  /** Richiesta trascinata su altri giorni o su un altro dipendente. */
  const spostaRichiesta = async (r: RichiestaAssenza, dipendenteId: number, dal: string, al: string) => {
    const dopo = { dipendenteId, tipo: r.tipo, dal, al, note: r.note, ore: dal === al ? r.ore : undefined, stato: r.stato, motivo: r.motivo }
    const modifiche = differenze(r, dopo)
    if (!modifiche.length) return
    const altro = dipendenteId !== r.dipendenteId
    const conflitti = sovrapposizioni(richieste, { id: r.id, dipendenteId, dal, al })
    const ok = await confirm({
      title: 'Sposta richiesta',
      message: <>
        Sposti {r.tipo.toLowerCase()} di <strong>{nomeDipendente(r.dipendenteId)}</strong>
        {altro && <> a <strong>{nomeDipendente(dipendenteId)}</strong></>} {dal === al ? <>al <strong>{fmtDataHr(dal)}</strong></> : <>dal <strong>{fmtDataHr(dal)}</strong> al <strong>{fmtDataHr(al)}</strong></>}?
        {r.stato === 'Approvata' && ' Resta approvata e si aggiorna anche nel Piano ferie.'}
        {conflitti.length > 0 && <> Attenzione: in quei giorni nel reparto sono già assenti {conflitti.map(c => nomeDipendente(c.dipendenteId)).join(', ')}.</>}
        {' '}Il dipendente riceve la notifica nell'App Op!.
      </>,
      confirmLabel: 'Sposta', danger: false,
    })
    if (!ok) return
    modifica(r.id, dopo, [...modifiche, 'Spostata dal calendario'])
    toast.success(`${r.tipo} di ${nomeDipendente(dipendenteId)} spostata ${dal === al ? `al ${fmtDataHr(dal)}` : `dal ${fmtDataHr(dal)} al ${fmtDataHr(al)}`}.`, 'Richiesta spostata')
  }

  const salvaModifica = async () => {
    if (!bozza) return
    const e: Record<string, string> = {}
    if (!bozza.dipendenteId) e.dipendenteId = 'Scegli il dipendente'
    if (!bozza.dal || !bozza.al) e.periodo = 'Indica il periodo'
    else if (bozza.al < bozza.dal) e.periodo = 'La data di fine precede quella di inizio'
    const aOre = A_ORE.includes(bozza.tipo) && !!bozza.dal && bozza.dal === bozza.al
    const ore = aOre ? Number(bozza.ore.replace(',', '.')) : undefined
    if (aOre && (!ore || ore <= 0 || ore > ORE_GIORNO)) e.ore = `Indica le ore (da 0,5 a ${ORE_GIORNO})`
    if (bozza.stato === 'Rifiutata' && !bozza.motivo.trim()) e.motivo = 'Indica il motivo del rifiuto'
    setErrori(e)
    if (Object.keys(e).length) return
    if (!bozza.id) {
      const nuova = {
        dipendenteId: Number(bozza.dipendenteId), tipo: bozza.tipo, dal: bozza.dal, al: bozza.al,
        note: bozza.note.trim() || undefined, ore: ore && ore < ORE_GIORNO ? ore : undefined,
        stato: bozza.stato, motivo: bozza.stato === 'Rifiutata' ? bozza.motivo.trim() : undefined,
      }
      if (nuova.stato === 'Approvata') {
        const neg = await autorizzaNegativo([{ ...nuova, id: 'nuova', createdAt: new Date().toISOString() }])
        if (!neg) return
      }
      inserisci(nuova, bozza.messaggio.trim() || undefined)
      toast.success(`${nuova.tipo} di ${nomeDipendente(nuova.dipendenteId)} ${nuova.dal === nuova.al ? `del ${fmtDataHr(nuova.dal)}` : `dal ${fmtDataHr(nuova.dal)} al ${fmtDataHr(nuova.al)}`} inserita (${nuova.stato.toLowerCase()}).`, 'Richiesta inserita')
      setBozza(null)
      return
    }
    const prima = richieste.find(x => x.id === bozza.id)
    if (!prima) return
    const dopo = {
      dipendenteId: Number(bozza.dipendenteId), tipo: bozza.tipo, dal: bozza.dal, al: bozza.al,
      note: bozza.note.trim() || undefined, ore: ore && ore < ORE_GIORNO ? ore : undefined,
      stato: bozza.stato, motivo: bozza.stato === 'Rifiutata' ? bozza.motivo.trim() : undefined,
    }
    const modifiche = differenze(prima, dopo)
    if (!modifiche.length) { toast.info('Non hai cambiato nessun valore.', 'Nessuna modifica'); return }
    // Approvata dalla modale con ferie oltre i residui: serve la stessa autorizzazione esplicita.
    if (dopo.stato === 'Approvata' && prima.stato !== 'Approvata') {
      const neg = await autorizzaNegativo([{ ...prima, ...dopo, stato: prima.stato }])
      if (!neg) return
      const n = neg.get(prima.id)
      if (n) modifiche.push(n)
    }
    modifica(bozza.id, dopo, modifiche, bozza.messaggio.trim() || dopo.motivo)
    toast.success(`Richiesta di ${nomeDipendente(Number(bozza.dipendenteId))} aggiornata.`, 'Richiesta modificata')
    setBozza(null)
  }

  const eliminaRow = async (r: RichiestaAssenza) => {
    const ok = await confirm({
      title: 'Elimina richiesta',
      message: <>Elimini la richiesta di <strong>{r.tipo.toLowerCase()}</strong> di <strong>{nomeDipendente(r.dipendenteId)}</strong> {r.dal === r.al ? `del ${fmtDataHr(r.dal)}` : `dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`}?{r.stato === 'Approvata' ? ' È già approvata: sparirà anche dal Piano ferie.' : ''} L'operazione non si può annullare.</>,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    elimina(r.id)
    toast.info(`Richiesta di ${nomeDipendente(r.dipendenteId)} eliminata.`, 'Richiesta eliminata')
  }

  // Anteprima mentre si modifica: giorni, saldo ROL e sovrapposizioni nel reparto.
  const bozzaAOre = !!bozza && A_ORE.includes(bozza.tipo) && !!bozza.dal && bozza.dal === bozza.al
  const bozzaInfo = bozza && bozza.dipendenteId && bozza.dal && bozza.al && bozza.al >= bozza.dal ? {
    giorni: giorniLavorativi(bozza.dal, bozza.al),
    rol: bozza.tipo === 'ROL' ? (() => {
      const altre = richieste.filter(x => x.id !== bozza.id)
      const s = saldoRol(altre, Number(bozza.dipendenteId), Number(bozza.dal.slice(0, 4)))
      const ore = bozzaAOre ? (Number(bozza.ore.replace(',', '.')) || 0) : giorniLavorativi(bozza.dal, bozza.al) * ORE_GIORNO
      return { residue: s.residue, ore, dopo: s.residue - ore }
    })() : null,
    conflitti: sovrapposizioni(richieste, { id: bozza.id, dipendenteId: Number(bozza.dipendenteId), dal: bozza.dal, al: bozza.al }),
  } : null


  const sollecita = (xs: RichiestaAssenza[]) => {
    sollecitaResp(xs.map(r => r.id))
    const nomi = Array.from(new Set(xs.map(r => r.responsabile?.nome).filter(Boolean)))
    toast.success(`Promemoria inviato nell'App Op! a ${nomi.join(', ')}.`, xs.length === 1 ? 'Responsabile sollecitato' : 'Responsabili sollecitati')
  }

  return (
    <>
      {solaLettura
        ? <RichiesteCalendario {...calendario} azioni={azioni} richieste={visibili} reparto={reparto} onApri={() => undefined} />
        : <RichiesteCalendario {...calendario} azioni={azioni} richieste={visibili} reparto={reparto} onApri={(x) => setDettaglioId(x.id)}
        onNuova={nuovaRichiesta} onSposta={spostaRichiesta}
        onAzione={(x, a) => { if (a === 'modifica') apriModifica(x); else setDettaglioId(x.id) }} />}


      {/* ── Dettaglio richiesta (dal calendario): tutti i dati e tutte le azioni ── */}
      {(() => {
        const base = dettaglioId ? richieste.find(x => x.id === dettaglioId) : undefined
        if (!base) return null
        const r = arricchisci(base)
        const chiudi = () => setDettaglioId(null)
        const poi = (f: () => void) => () => { chiudi(); f() }
        const ultima = ultimaModifica(r)
        return (
          <Modal open onClose={chiudi} title="Dettaglio richiesta" size="md">
            <div className="rfe-modal rfe-det">
              <div className="rfe-det__head">
                <span className="rfe__avatar" data-rep={REP_IDX(r.reparto)} aria-hidden="true">{iniziali(r.dipendente)}</span>
                <span className="rfe-det__who">
                  <span className="rfe-det__nome">{r.dipendente}</span>
                  <span className="rfe-det__rep">{r.reparto}</span>
                </span>
                <span className={`rfe__tipo rfe__tipo--${r.tipo.toLowerCase()} rfe-det__tipo`}>
                  <i className={`fa-solid ${TIPO_ICO[r.tipo]}`} aria-hidden="true" />{r.tipo}
                </span>
              </div>

              <dl className="rfe-det__facts">
                <div><dt>Periodo</dt><dd>{r.dal === r.al ? fmtDataHr(r.dal) : `dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`}</dd></div>
                <div><dt>Durata</dt><dd>{durata(r)}</dd></div>
                <div><dt>{inAttesaRichiesta(r.stato) ? 'Residuo se approvata' : 'Residuo'}</dt>
                  <dd className={r.residuo < 0 ? 'rfe__neg' : undefined}>{r.tipo === 'Ferie' ? `${r.residuo} gg` : r.tipo === 'ROL' ? fmtOre(r.residuo) : '-'}</dd></div>
                <div><dt>Richiesta il</dt><dd>{fmtDataHr(r.createdAt.slice(0, 10))}</dd></div>
                <div><dt>Stato</dt><dd>
                  <span className="rfe__stato-cell">
                    <span className={`rfe__stato rfe__stato--${statoCls(r.stato)}`}>{r.stato}</span>
                    <IterResponsabile r={r} />
                    {ultima && <Tooltip text={`Modificata da ${ultima.autore}`}><span className="rfe__mod" aria-label="Modificata dall'HR"><i className="fa-solid fa-pen" aria-hidden="true" /></span></Tooltip>}
                  </span>
                </dd></div>
                <div><dt>Note del dipendente</dt><dd>{r.note || '—'}</dd></div>
              </dl>

              {r.responsabile && (
                <p className={`rfe-modal__iter rfe-modal__iter--${r.responsabile.esito === 'Approvata' ? 'ok' : r.responsabile.esito === 'Rifiutata' ? 'ko' : 'attesa'}`}>
                  <i className={`fa-solid ${r.responsabile.esito === 'Approvata' ? 'fa-user-check' : r.responsabile.esito === 'Rifiutata' ? 'fa-user-xmark' : 'fa-user-clock'}`} aria-hidden="true" />
                  {testoIter(r)}
                </p>
              )}
              {r.stato === 'Rifiutata' && r.motivo && (
                <p className="rfe-det__motivo"><i className="fa-solid fa-circle-xmark" aria-hidden="true" />Motivo del rifiuto: {r.motivo}</p>
              )}
              {r.valutazione && (
                <div className="rfe-det__val">
                  <span className={`rfe__val rfe__val--${r.valutazione.livello}`}>
                    <i className={`fa-solid ${r.valutazione.livello === 'ok' ? 'fa-circle-check' : r.valutazione.livello === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`} aria-hidden="true" />
                    Valutazione di Sibylla: {LIVELLO_LBL[r.valutazione.livello]}
                  </span>
                  <ul className="rfe-det__motivi">
                    {r.valutazione.motivi.map((m, i) => <li key={i} className={`rfe-tip__row rfe-tip__row--${m.livello}`}>{m.testo}</li>)}
                  </ul>
                </div>
              )}
              {!r.valutazione && r.conflitti.length > 0 && (
                <p className="rfe-det__motivo rfe-det__motivo--warn">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  Assenti nello stesso reparto: {r.conflitti.map(c => `${nomeDipendente(c.dipendenteId)} (${fmtDataHr(c.dal)} → ${fmtDataHr(c.al)})`).join(', ')}
                </p>
              )}

              <StoricoHr origine={inseritaDaHr(r) ? undefined : { at: r.createdAt, autore: nomeDipendente(r.dipendenteId) }} storico={r.storico} />

              <div className="rfe-modal__actions rfe-det__actions">
                <button type="button" className="sib-btn sib-btn--ghost rfe-det__del" onClick={poi(() => eliminaRow(r))}>
                  <i className="fa-solid fa-trash" aria-hidden="true" />Elimina
                </button>
                <button type="button" className="sib-btn sib-btn--secondary" onClick={poi(() => apriModifica(r))}>
                  <i className="fa-solid fa-pen" aria-hidden="true" />Modifica
                </button>
                {r.stato === 'Al responsabile' ? (
                  <button type="button" className="sib-btn sib-btn--primary" onClick={poi(() => sollecita([r]))}>
                    <i className="fa-solid fa-bell" aria-hidden="true" />Sollecita {r.responsabile?.nome ?? 'il responsabile'}
                  </button>
                ) : (
                  <>
                    {r.stato !== 'Rifiutata' && (
                      <button type="button" className="sib-btn sib-btn--secondary" onClick={poi(() => setRifiuto({ rows: [r], motivo: '' }))}>
                        <i className="fa-solid fa-circle-xmark" aria-hidden="true" />Rifiuta
                      </button>
                    )}
                    {r.stato !== 'Approvata' && (
                      <button type="button" className="sib-btn sib-btn--primary" onClick={poi(() => approva(r))}>
                        <i className="fa-solid fa-circle-check" aria-hidden="true" />Approva
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* ── Rifiuto ── */}
      <Modal open={!!rifiuto} onClose={() => setRifiuto(null)} title={rifiuto && rifiuto.rows.length > 1 ? `Rifiuta ${rifiuto.rows.length} richieste` : 'Rifiuta richiesta'} size="sm">
        {rifiuto && (
          <div className="rfe-modal">
            {rifiuto.rows.length === 1
              ? <p className="rfe-modal__text">
                  {nomeDipendente(rifiuto.rows[0].dipendenteId)} · {rifiuto.rows[0].tipo} dal {fmtDataHr(rifiuto.rows[0].dal)} al {fmtDataHr(rifiuto.rows[0].al)}
                </p>
              : <ul className="rfe-modal__lista">
                  {rifiuto.rows.map(r => <li key={r.id}>{nomeDipendente(r.dipendenteId)} · {r.tipo} · {periodo(r.dal, r.al)}</li>)}
                </ul>}
            <TextareaField name="rf-motivo" label="Motivo del rifiuto" required rows={3} value={rifiuto.motivo}
              hint={rifiuto.rows.length > 1 ? 'Lo stesso motivo va a tutti i dipendenti selezionati' : 'Il dipendente lo vedrà nella sua richiesta'}
              onChange={e => setRifiuto({ ...rifiuto, motivo: e.target.value })} />
            <div className="rfe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setRifiuto(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--danger" disabled={!rifiuto.motivo.trim()} onClick={confermaRifiuto}>Rifiuta</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modifica richiesta: l'HR può correggerne ogni valore ── */}
      <Modal open={!!bozza} onClose={() => setBozza(null)} title={bozza && !bozza.id ? 'Nuova richiesta' : 'Modifica richiesta'} size="md">
        {bozza && (
          <div className="rfe-modal">
            <div className="rfe-modal__grid">
              <SelectField name="rf-dip" label="Dipendente" required value={bozza.dipendenteId} error={errori.dipendenteId}
                onChange={e => setBozza({ ...bozza, dipendenteId: e.target.value })}
                options={[{ value: '', label: 'Seleziona…' }, ...DIPENDENTI_HR.map(d => ({ value: String(d.id), label: `${d.nome} ${d.cognome}` }))]} />
              <SelectField name="rf-tipo" label="Tipo" value={bozza.tipo}
                onChange={e => setBozza({ ...bozza, tipo: e.target.value as TipoAssenza })}
                options={TIPI_ASSENZA.map(t => ({ value: t, label: t }))} />
            </div>
            <DateRangeField label="Periodo" nameFrom="rf-dal" nameTo="rf-al" required error={errori.periodo}
              valueFrom={bozza.dal} valueTo={bozza.al}
              onChangeFrom={e => setBozza(b => b && ({ ...b, dal: e.target.value }))}
              onChangeTo={e => setBozza(b => b && ({ ...b, al: e.target.value }))} />
            {bozzaAOre && (
              <InputField name="rf-ore" label="Ore" type="number" required value={bozza.ore} error={errori.ore}
                hint={`Su una giornata di ${ORE_GIORNO} h: con ${ORE_GIORNO} vale la giornata intera`}
                onChange={e => setBozza({ ...bozza, ore: e.target.value })} className="rfe-modal__ore" />
            )}
            {bozzaInfo && (
              <p className={`rfe-modal__info ${bozzaInfo.conflitti.length || (bozzaInfo.rol && bozzaInfo.rol.dopo < 0) ? 'rfe-modal__info--warn' : ''}`}>
                <Ico n={bozzaInfo.conflitti.length || (bozzaInfo.rol && bozzaInfo.rol.dopo < 0) ? 'alert' : 'info'} w="solid" s={13} c="currentColor" />
                {bozzaAOre ? `${fmtOre(Number(bozza.ore.replace(',', '.')) || 0)} il ${fmtDataHr(bozza.dal)}` : bozzaInfo.giorni === 1 ? '1 giorno lavorativo' : `${bozzaInfo.giorni} giorni lavorativi`}
                {bozzaInfo.rol && ` · ROL residui ${fmtOre(bozzaInfo.rol.residue)}, dopo la richiesta ${fmtOre(bozzaInfo.rol.dopo)}`}
                {bozzaInfo.conflitti.length > 0 && ` · già assenti nel reparto: ${bozzaInfo.conflitti.map(c => nomeDipendente(c.dipendenteId)).join(', ')}`}
              </p>
            )}
            <TextareaField name="rf-note" label="Note" rows={2} value={bozza.note} onChange={e => setBozza({ ...bozza, note: e.target.value })} />
            {(() => {
              const r = richieste.find(x => x.id === bozza.id)
              const fermaAlResp = r?.stato === 'Al responsabile'
              return (
                <>
                  {r?.responsabile && (
                    <p className={`rfe-modal__iter rfe-modal__iter--${r.responsabile.esito === 'Approvata' ? 'ok' : r.responsabile.esito === 'Rifiutata' ? 'ko' : 'attesa'}`}>
                      <i className={`fa-solid ${r.responsabile.esito === 'Approvata' ? 'fa-user-check' : r.responsabile.esito === 'Rifiutata' ? 'fa-user-xmark' : 'fa-user-clock'}`} aria-hidden="true" />
                      {testoIter(r)}
                    </p>
                  )}
                  <SelectField name="rf-stato" label="Stato" value={bozza.stato} disabled={fermaAlResp}
                    hint={fermaAlResp ? `Decide prima ${r?.responsabile?.nome} dall'App Op!: poi la richiesta passa a te` : undefined}
                    onChange={e => setBozza({ ...bozza, stato: e.target.value as StatoRichiesta })}
                    options={(fermaAlResp ? STATI_RICHIESTA : STATI_RICHIESTA.filter(t => t !== 'Al responsabile')).map(t => ({ value: t, label: t }))} />
                </>
              )
            })()}
            {bozza.stato === 'Rifiutata' && (
              <TextareaField name="rf-motivo-mod" label="Motivo del rifiuto" required rows={2} value={bozza.motivo} error={errori.motivo}
                hint="Il dipendente lo vedrà nella sua richiesta"
                onChange={e => setBozza({ ...bozza, motivo: e.target.value })} />
            )}
            <TextareaField name="rf-messaggio" label="Messaggio al dipendente" rows={2} value={bozza.messaggio}
              hint="Facoltativo: spiega la correzione. Il dipendente riceve la notifica nell'App Op! con le modifiche"
              onChange={e => setBozza({ ...bozza, messaggio: e.target.value })} />
            {(() => {
              const r = richieste.find(x => x.id === bozza.id)
              return r ? <StoricoHr origine={inseritaDaHr(r) ? undefined : { at: r.createdAt, autore: nomeDipendente(r.dipendenteId) }} storico={r.storico} /> : null
            })()}
            <div className="rfe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setBozza(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={salvaModifica}>Salva modifiche</button>
            </div>
          </div>
        )}
      </Modal>

    </>
  )
}
