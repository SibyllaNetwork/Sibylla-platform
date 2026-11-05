import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Pagination from '../../../core/components/Pagination'
import Ico from '../../../core/icons/Ico'
import { SelectField, DateRangeField, TextareaField, InputField, CheckboxField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import {
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, TIPI_ASSENZA, STATI_RICHIESTA,
  nomeDipendente, repartoDipendente, fmtDataHr, giorniLavorativi, ferieGodute, sovrapposizioni,
  saldoRol, saldoFerie, oreRichiesta, ORE_GIORNO, inAttesaRichiesta,
  type RichiestaAssenza, type TipoAssenza, type StatoRichiesta,
} from '../../../store/useHrGestioneStore'
import { exportXls } from '../hrExport'
import StoricoHr from '../_storico/StoricoHr'
import { usePianiFerieStore, type PianoFerie } from '../../../store/usePianiFerieStore'
import { pianoDi, saldoDopo, verificaRegole } from '../PianoFerie/regolePiano'
import BarraSelezione from '../_selezione/BarraSelezione'
import { useSelezione } from '../_selezione/useSelezione'
import { occupazione, addGiorni } from '../../../store/useTurniPersonaleStore'
import './RichiesteFerie.sass'

/**
 * Richieste — HR › Gestione delle presenze › Gestione ferie e permessi.
 * Le richieste di ferie, permessi, ROL e malattia del personale: chi le gestisce
 * vede le ferie che resterebbero al dipendente e i colleghi dello stesso reparto
 * già assenti negli stessi giorni, poi approva o rifiuta (con motivo).
 * Le richieste arrivano dai dipendenti tramite l'App Op!: l'HR non ne crea di
 * nuove, le gestisce. Su ogni richiesta può modificarne tutti i valori
 * (dipendente, tipo, periodo, ore, note, stato), approvarla, rifiutarla o
 * eliminarla. Le richieste approvate compaiono nel Piano ferie.
 * ROL: si chiedono a ore (o a giornate da 8 h) e scalano dal monte ore annuo
 * maturato secondo il contratto; "Saldo ROL" mostra maturate, godute, in
 * attesa e residue di ogni dipendente; "Saldo ferie" lo stesso in giorni lavorativi.
 */

const PAGE_SIZE = 10
const VISTA_ATTESA = 'attesa'
const VISTA_TUTTE = 'tutte'

/** Ultima correzione dell'HR, se c'è. */
const ultimaModifica = (r: RichiestaAssenza) => [...(r.storico ?? [])].reverse().find(e => e.azione === 'Modificata')

const statoCls = (s: StatoRichiesta) => (s === 'Al responsabile' ? 'info' : s === 'Da approvare' ? 'attesa' : s === 'Approvata' ? 'ok' : 'ko')
const VISTA_RESP = 'Al responsabile'

/** Tipi che si possono chiedere a ore. */
const A_ORE: TipoAssenza[] = ['ROL', 'Permesso']
const fmtOre = (h: number) => `${h.toLocaleString('it-IT', { maximumFractionDigits: 1 })} h`

const durata = (r: Pick<RichiestaAssenza, 'tipo' | 'dal' | 'al' | 'ore'>) => {
  if (r.ore != null) return fmtOre(r.ore)
  const g = Math.max(1, giorniLavorativi(r.dal, r.al))
  return g === 1 ? '1 giorno' : `${g} giorni`
}

/** "09/11 → 15/11/2026": l'anno si ripete solo se cambia. */
const periodo = (dal: string, al: string) => {
  if (dal === al) return fmtDataHr(dal)
  const a = fmtDataHr(dal)
  return `${dal.slice(0, 4) === al.slice(0, 4) ? a.slice(0, 5) : a} → ${fmtDataHr(al)}`
}

// ─── Valutazione di Sibylla sulle richieste da approvare ─────────────────────
type Livello = 'ok' | 'warn' | 'ko'
interface Valutazione { livello: Livello; motivi: { livello: Livello | 'info'; testo: string }[] }
const LIVELLO_LBL: Record<Livello, string> = { ok: 'Approvabile', warn: 'Da valutare', ko: 'Sconsigliata' }
const TIPO_ICO: Record<TipoAssenza, string> = { Ferie: 'fa-umbrella-beach', Permesso: 'fa-clock', ROL: 'fa-hourglass-half', Malattia: 'fa-notes-medical' }
const REP_IDX = (rep: string) => REPARTI_HR.indexOf(rep as typeof REPARTI_HR[number]) + 1
const iniziali = (nome: string) => nome.split(' ').map(x => x.charAt(0)).slice(0, 2).join('')

const giorniA = (iso: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(new Date().toDateString() + ' 12:00').getTime()) / 86400000)

/** Occupazione media prevista della struttura nel periodo richiesto. */
function occupazioneMedia(dal: string, al: string) {
  const out: number[] = []
  for (let g = dal; g <= al && out.length < 60; g = addGiorni(g, 1)) out.push(occupazione(g))
  return out.length ? Math.round(out.reduce((a, b) => a + b, 0) / out.length) : 0
}

function valuta(r: RichiestaAssenza & { residuo: number; conflitti: RichiestaAssenza[]; reparto: string }, richieste: RichiestaAssenza[], piani: PianoFerie[]): Valutazione {
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
function differenze(a: RichiestaAssenza, b: Pick<RichiestaAssenza, 'dipendenteId' | 'tipo' | 'dal' | 'al' | 'note' | 'ore' | 'stato' | 'motivo'>) {
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
function testoIter(r: RichiestaAssenza) {
  const x = r.responsabile
  if (!x) return 'Nessun responsabile di reparto: la richiesta è arrivata direttamente all\'ufficio del personale.'
  if (x.esito === 'In attesa') return `In attesa di ${x.nome}, responsabile ${repartoDipendente(r.dipendenteId)}, nell'App Op!${x.sollecitatoAt ? ` · sollecitato il ${fmtGiorno(x.sollecitatoAt)}` : ''}`
  return `${x.esito === 'Approvata' ? 'Approvata' : 'Rifiutata'} da ${x.nome}, responsabile ${repartoDipendente(r.dipendenteId)}, il ${fmtGiorno(x.at)}${x.motivo ? `: ${x.motivo}` : ''}`
}

/** Icona dell'esito del responsabile di reparto accanto allo stato (solo ferie/ROL con responsabile). */
function IterResponsabile({ r }: { r: RichiestaAssenza }) {
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

// L'HR decide sulle "Da approvare" (già passate dal responsabile); "Al responsabile"
// sono le ferie e i ROL ancora fermi al primo livello dell'iter, nell'App Op!.
const VISTE = [
  { value: 'attesa', label: 'Da approvare' },
  { value: VISTA_RESP, label: 'Al responsabile' },
  { value: 'Approvata', label: 'Approvate' },
  { value: 'Rifiutata', label: 'Rifiutate' },
  { value: 'tutte', label: 'Tutte' },
]

interface Bozza { id: string; dipendenteId: string; tipo: TipoAssenza; dal: string; al: string; note: string; ore: string; stato: StatoRichiesta; motivo: string; messaggio: string }

export default function RichiesteFerie({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const piani = usePianiFerieStore(s => s.piani)
  const decidi = useHrGestioneStore(s => s.decidiRichiesta)
  const sollecitaResp = useHrGestioneStore(s => s.sollecitaResponsabile)
  const modifica = useHrGestioneStore(s => s.modificaRichiesta)
  const elimina = useHrGestioneStore(s => s.eliminaRichiesta)
  const cf = useColFilters()
  const confirm = useConfirmStore(s => s.confirm)
  // Saldo annuo per dipendente: ferie in giorni, ROL in ore.
  const [saldo, setSaldo] = useState<'ferie' | 'rol' | null>(null)

  const [vista, setVista] = useState(VISTA_ATTESA)
  const [reparto, setReparto] = useState('')
  const [page, setPage] = useState(1)
  // Rifiuto di una o più richieste (selezione multipla): un solo motivo per tutte.
  const [rifiuto, setRifiuto] = useState<{ rows: RichiestaAssenza[]; motivo: string } | null>(null)
  const [bozza, setBozza] = useState<Bozza | null>(null)
  const [errori, setErrori] = useState<Record<string, string>>({})

  const rows = useMemo(() => richieste
    .map(r => {
      const d = DIPENDENTI_HR.find(x => x.id === r.dipendenteId)
      const giorni = giorniLavorativi(r.dal, r.al)
      const godute = ferieGodute(richieste, r.dipendenteId)
      // Residuo dopo la richiesta: per una richiesta di ferie ancora in attesa si sottraggono anche i suoi giorni.
      // Per i ROL il residuo è in ore: sul monte ore annuo, togliendo anche questa richiesta se in attesa.
      const rol = r.tipo === 'ROL' ? saldoRol(richieste, r.dipendenteId, Number(r.dal.slice(0, 4))) : null
      const residuo = rol
        ? rol.residue - (inAttesaRichiesta(r.stato) ? oreRichiesta(r) : 0)
        : (d?.ferieAnnue ?? 0) - godute - (r.tipo === 'Ferie' && inAttesaRichiesta(r.stato) ? giorni : 0)
      return {
        ...r,
        dipendente: nomeDipendente(r.dipendenteId),
        reparto: repartoDipendente(r.dipendenteId),
        giorni,
        residuo,
        conflitti: r.stato === 'Rifiutata' ? [] : sovrapposizioni(richieste, r),
      }
    })
    .map(r => ({ ...r, valutazione: r.stato === 'Da approvare' ? valuta(r, richieste, piani) : null, urgente: r.stato === 'Da approvare' && giorniA(r.dal) <= 3 }))
    .filter(r => vista === VISTA_TUTTE || (vista === VISTA_ATTESA ? r.stato === 'Da approvare' : r.stato === vista))
    .filter(r => !reparto || r.reparto === reparto)
    .filter(r => cf.matchText(r.dipendente, 'dipendente') && cf.matchMulti(r.tipo, 'tipo') && cf.matchMulti(r.stato, 'stato')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [richieste, piani, vista, reparto, cf.text, cf.multi])

  const sorted = useMemo(() => cf.sort ? cf.sortRows(rows) : [...rows].sort((a, b) => a.dal.localeCompare(b.dal)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [vista, reparto, cf.text, cf.multi])
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const sel = useSelezione(pageRows.map(r => r.id), [vista, reparto, cf.text, cf.multi])
  const { tieni } = sel
  useEffect(() => { tieni(richieste.map(r => r.id)) }, [richieste, tieni])
  const selezionate = richieste.filter(r => sel.has(r.id))
  // Finché il responsabile non decide, l'HR non approva né rifiuta: può solo sollecitarlo.
  const selDaApprovare = selezionate.filter(r => r.stato !== 'Approvata' && r.stato !== 'Al responsabile')
  const selDaRifiutare = selezionate.filter(r => r.stato !== 'Rifiutata' && r.stato !== 'Al responsabile')
  const selDaSollecitare = selezionate.filter(r => r.stato === 'Al responsabile')
  const inAttesa = richieste.filter(r => r.stato === 'Da approvare').length
  const alResponsabile = richieste.filter(r => r.stato === 'Al responsabile').length
  const contaVista = (v: string) => v === VISTA_TUTTE ? richieste.length : v === VISTA_ATTESA ? inAttesa : richieste.filter(r => r.stato === v).length
  // Richieste da approvare che Sibylla valuta senza problemi (sul filtro reparto attivo).
  const consigliate = rows.filter(r => r.valutazione?.livello === 'ok')

  const approvaConsigliate = async () => {
    const ok = await confirm({
      title: 'Approva le richieste consigliate',
      message: <>Sibylla non vede conflitti in <strong>{consigliate.length === 1 ? '1 richiesta' : `${consigliate.length} richieste`}</strong>: {consigliate.map(r => `${r.dipendente} (${r.tipo.toLowerCase()})`).join(', ')}. Le approvi tutte?</>,
      confirmLabel: 'Approva', danger: false,
    })
    if (!ok) return
    consigliate.forEach(r => decidi(r.id, 'Approvata'))
    toast.success(`${consigliate.length === 1 ? '1 richiesta approvata' : `${consigliate.length} richieste approvate`}: sono nel Piano ferie.`, 'Richieste approvate')
  }

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
    if (rifiuto.rows.length > 1) sel.svuota()
  }

  const apriModifica = (r: RichiestaAssenza) => {
    setErrori({})
    setBozza({
      id: r.id, dipendenteId: String(r.dipendenteId), tipo: r.tipo, dal: r.dal, al: r.al, note: r.note ?? '',
      ore: String(r.ore ?? ORE_GIORNO).replace('.', ','), stato: r.stato, motivo: r.motivo ?? '', messaggio: '',
    })
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

  // ── Azioni sulle righe selezionate ──
  const approvaSelezionate = async () => {
    const xs = selDaApprovare
    // Avvisi: ROL oltre il saldo e valutazione "Sconsigliata" di Sibylla.
    const rolScoperti = xs.filter(r => r.tipo === 'ROL' && oreRichiesta(r) > saldoRol(richieste, r.dipendenteId, Number(r.dal.slice(0, 4))).residue)
    const sconsigliate = rows.filter(r => sel.has(r.id) && r.stato !== 'Approvata' && r.valutazione?.livello === 'ko')
    const avvisi = [
      rolScoperti.length ? `ROL oltre il saldo: ${rolScoperti.map(r => nomeDipendente(r.dipendenteId)).join(', ')}` : '',
      sconsigliate.length ? `sconsigliate da Sibylla: ${sconsigliate.map(r => r.dipendente).join(', ')}` : '',
    ].filter(Boolean)
    const ok = await confirm({
      title: xs.length === 1 ? 'Approva la richiesta' : `Approva ${xs.length} richieste`,
      message: <>Approvi {xs.length === 1 ? 'la richiesta selezionata' : <><strong>{xs.length} richieste</strong> selezionate</>}? Compariranno nel Piano ferie.{avvisi.length > 0 && <> Attenzione, {avvisi.join('; ')}.</>}</>,
      confirmLabel: avvisi.length ? 'Approva comunque' : 'Approva', danger: false,
    })
    if (!ok) return
    const neg = await autorizzaNegativo(xs)
    if (!neg) return
    xs.forEach(r => decidi(r.id, 'Approvata', undefined, neg.get(r.id)))
    toast.success(xs.length === 1 ? '1 richiesta approvata: è nel Piano ferie.' : `${xs.length} richieste approvate: sono nel Piano ferie.`, 'Richieste approvate')
    sel.svuota()
  }
  const eliminaSelezionate = async () => {
    const xs = selezionate
    const approvate = xs.filter(r => r.stato === 'Approvata').length
    const ok = await confirm({
      title: xs.length === 1 ? 'Elimina richiesta' : `Elimina ${xs.length} richieste`,
      message: <>Elimini {xs.length === 1 ? 'la richiesta selezionata' : <><strong>{xs.length} richieste</strong></>}?{approvate > 0 && ` ${approvate === 1 ? 'Una è già approvata e sparirà' : `${approvate} sono già approvate e spariranno`} anche dal Piano ferie.`} L'operazione non si può annullare.</>,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    xs.forEach(r => elimina(r.id))
    toast.info(xs.length === 1 ? 'Richiesta eliminata.' : `${xs.length} richieste eliminate.`, 'Richieste eliminate')
    sel.svuota()
  }

  const sollecita = (xs: RichiestaAssenza[]) => {
    sollecitaResp(xs.map(r => r.id))
    const nomi = Array.from(new Set(xs.map(r => r.responsabile?.nome).filter(Boolean)))
    toast.success(`Promemoria inviato nell'App Op! a ${nomi.join(', ')}.`, xs.length === 1 ? 'Responsabile sollecitato' : 'Responsabili sollecitati')
    if (xs.length > 1) sel.svuota()
  }

  const esporta = () => exportXls('richieste-assenze', ['Richiesta il', 'Dipendente', 'Reparto', 'Tipo', 'Dal', 'Al', 'Durata', 'Residuo', 'Stato', 'Note', 'Motivo rifiuto'],
    sorted.map(r => [fmtDataHr(r.createdAt.slice(0, 10)), r.dipendente, r.reparto, r.tipo, fmtDataHr(r.dal), fmtDataHr(r.al), durata(r),
      r.tipo === 'Ferie' ? `${r.residuo} gg` : r.tipo === 'ROL' ? fmtOre(r.residuo) : '', r.stato, r.note ?? '', r.motivo ?? '']))

  const fmtGg = (g: number) => g === 1 ? '1 g' : `${g} gg`
  const righeSaldo = (k: 'ferie' | 'rol') => DIPENDENTI_HR.map(d => ({ d, s: k === 'rol' ? saldoRol(richieste, d.id) : saldoFerie(richieste, d.id) }))
  const fmtSaldo = (k: 'ferie' | 'rol', n: number) => k === 'rol' ? fmtOre(n) : fmtGg(n)
  const esportaSaldo = (k: 'ferie' | 'rol') => exportXls(k === 'rol' ? 'saldo-rol' : 'saldo-ferie',
    ['Dipendente', 'Reparto', k === 'rol' ? 'Maturate (h)' : 'Maturate (gg)', 'Godute', 'In attesa', 'Residue'],
    righeSaldo(k).map(({ d, s: x }) => [`${d.nome} ${d.cognome}`, d.reparto, x.maturate, x.godute, x.inAttesa, x.residue]))

  const act = (tip: string, ico: string, onClick: () => void) => (
    <Tooltip text={tip}>
      <button type="button" className="rfe__act" onClick={onClick} aria-label={tip}>
        <Ico n={ico} w="solid" s={16} c="currentColor" />
      </button>
    </Tooltip>
  )

  return (
    <div className="rfe">
      <PageHead
        title="Richieste"
        subtitle="Ferie e ROL arrivano qui dopo l'approvazione del responsabile di reparto: l'ufficio del personale dà quella definitiva"
        onBack={() => navigate('home')}
      />

      <div className="rfe__toolbar">
        <div className="rfe__tabs" role="tablist" aria-label="Vista">
          {VISTE.map(v => (
            <button key={v.value} type="button" role="tab" aria-selected={vista === v.value}
              className={`rfe__tab ${vista === v.value ? 'rfe__tab--on' : ''}`} onClick={() => setVista(v.value)}>
              {v.label}<span className={`rfe__tab-n ${v.value === VISTA_ATTESA && inAttesa > 0 ? 'rfe__tab-n--hot' : ''}`}>{contaVista(v.value)}</span>
            </button>
          ))}
        </div>
        <SelectField name="reparto" label="Reparto" className="rfe__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <div className="rfe__push">
          {consigliate.length > 0 && (
            <Tooltip text="Approva in un colpo le richieste senza conflitti nel reparto e con saldo sufficiente">
              <button type="button" className="sib-btn sib-btn--secondary rfe__smart" onClick={approvaConsigliate}>
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Approva consigliate ({consigliate.length})
              </button>
            </Tooltip>
          )}
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSaldo('ferie')}>
            <i className="fa-solid fa-umbrella-beach" aria-hidden="true" /> Saldo ferie
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSaldo('rol')}>
            <i className="fa-solid fa-hourglass-half" aria-hidden="true" /> Saldo ROL
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-piano-ferie')}>
            <Ico n="calendar" s={13} c="currentColor" /> Piano ferie
          </button>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="rfe__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
              <Ico n="excel" w="regular" s={16} c="#fff" />
            </button>
          </Tooltip>
        </div>
      </div>

      <BarraSelezione n={sel.n} nome={['richiesta', 'richieste']} onSvuota={sel.svuota} azioni={[
        { label: 'Approva', icona: 'fa-circle-check', quante: selDaApprovare.length, onClick: approvaSelezionate },
        { label: 'Rifiuta', icona: 'fa-circle-xmark', quante: selDaRifiutare.length, onClick: () => setRifiuto({ rows: selDaRifiutare, motivo: '' }) },
        { label: 'Sollecita responsabili', icona: 'fa-bell', quante: selDaSollecitare.length, onClick: () => sollecita(selDaSollecitare) },
        { label: 'Elimina', icona: 'fa-trash', quante: sel.n, onClick: eliminaSelezionate, pericolo: true },
      ]} />

      <div className="sib-table-wrap rfe__wrap">
        <table className="sib-table rfe__table">
          <colgroup>
            <col className="rfe__col-sel" />
            <col className="rfe__col-data" />
            <col className="rfe__col-dip" />
            <col className="rfe__col-rep" />
            <col className="rfe__col-tipo" />
            <col className="rfe__col-periodo" />
            <col className="rfe__col-giorni" />
            <col className="rfe__col-residuo" />
            <col className="rfe__col-conf" />
            <col className="rfe__col-stato" />
            <col className="rfe__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th className="rfe__c">
                <CheckboxField name="rf-sel-all" ariaLabel="Seleziona le richieste della pagina" className="rfe__check"
                  checked={sel.tutteVisibili} indeterminate={sel.parziale} disabled={!pageRows.length} onChange={sel.toggleVisibili} />
              </th>
              <th><span className="sib-colf-head"><ThLabel full="Richiesta il" short="Rich. il" />{cf.th('createdAt', 'richiesta il', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Dipendente" short="Dip." />{cf.th('dipendente', 'dipendente', { search: true, sort: true })}</span></th>
              <th><ThLabel full="Reparto" /></th>
              <th><span className="sib-colf-head"><ThLabel full="Tipo" />{cf.th('tipo', 'tipo', { options: TIPI_ASSENZA })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Periodo" />{cf.th('dal', 'periodo', { sort: true })}</span></th>
              <th className="rfe__r"><ThLabel full="Durata" /></th>
              <th className="rfe__r"><ThLabel full="Residuo" /></th>
              <th><ThLabel full="Valutazione Sibylla" short="Val." /></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'stato', { options: STATI_RICHIESTA })}</span></th>
              <th className="rfe__c"><ThLabel full="Azioni" /></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} className={[r.urgente && 'rfe__row--urgente', sel.has(r.id) && 'rfe__row--sel'].filter(Boolean).join(' ') || undefined}>
                <td className="rfe__c">
                  <CheckboxField name={`rf-sel-${r.id}`} ariaLabel={`Seleziona la richiesta di ${r.dipendente}`} className="rfe__check"
                    checked={sel.has(r.id)} onChange={() => sel.toggle(r.id)} />
                </td>
                <td><TruncatedText text={fmtDataHr(r.createdAt.slice(0, 10))} /></td>
                <td className="rfe__strong">
                  <span className="rfe__dip">
                    <span className="rfe__avatar" data-rep={REP_IDX(r.reparto)} aria-hidden="true">{iniziali(r.dipendente)}</span>
                    <TruncatedText text={r.dipendente} />
                    {r.note && <Tooltip text={r.note}><span className="rfe__note"><Ico n="info" w="solid" s={12} c="currentColor" /></span></Tooltip>}
                  </span>
                </td>
                <td><TruncatedText text={r.reparto} /></td>
                <td>
                  <span className={`rfe__tipo rfe__tipo--${r.tipo.toLowerCase()}`}>
                    <i className={`fa-solid ${TIPO_ICO[r.tipo]}`} aria-hidden="true" /><TruncatedText text={r.tipo} />
                  </span>
                </td>
                <td><TruncatedText text={periodo(r.dal, r.al)} full={r.dal === r.al ? undefined : `dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`} /></td>
                <td className="rfe__r"><TruncatedText text={durata(r)} /></td>
                <td className={`rfe__r ${r.residuo < 0 ? 'rfe__neg' : ''}`}>
                  {r.tipo === 'Ferie'
                    ? <Tooltip text={inAttesaRichiesta(r.stato) ? 'Giorni di ferie che restano se la richiesta viene approvata' : 'Giorni di ferie ancora disponibili nell\'anno'}><span>{r.residuo} gg</span></Tooltip>
                    : r.tipo === 'ROL'
                      ? <Tooltip text={inAttesaRichiesta(r.stato) ? 'Ore di ROL che restano se la richiesta viene approvata' : 'Ore di ROL ancora disponibili nell\'anno'}><span>{fmtOre(r.residuo)}</span></Tooltip>
                      : <span className="rfe__dash">-</span>}
                </td>
                <td>
                  {r.valutazione
                    ? (
                      <Tooltip content={
                        <span className="rfe-tip">
                          <span className="rfe-tip__title">Valutazione di Sibylla</span>
                          {r.valutazione.motivi.map((m, i) => <span key={i} className={`rfe-tip__row rfe-tip__row--${m.livello}`}>{m.testo}</span>)}
                        </span>
                      }>
                        <span className={`rfe__val rfe__val--${r.valutazione.livello}`}>
                          <i className={`fa-solid ${r.valutazione.livello === 'ok' ? 'fa-circle-check' : r.valutazione.livello === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`} aria-hidden="true" />
                          <span className="rfe__val-txt">{LIVELLO_LBL[r.valutazione.livello]}</span>
                          {r.urgente && <i className="fa-solid fa-bolt rfe__val-urg" aria-label="Urgente" />}
                        </span>
                      </Tooltip>
                    )
                    : r.conflitti.length > 0
                      ? (
                        <Tooltip text={`Assenti nello stesso reparto: ${r.conflitti.map(c => `${nomeDipendente(c.dipendenteId)} (${fmtDataHr(c.dal)} → ${fmtDataHr(c.al)})`).join(', ')}`}>
                          <span className="rfe__conflitto"><Ico n="alert" w="solid" s={14} c="currentColor" /> {r.conflitti.length}<span className="rfe__val-txt"> sovrapp.</span></span>
                        </Tooltip>
                      )
                      : <span className="rfe__dash">-</span>}
                </td>
                <td>
                  <span className="rfe__stato-cell">
                  <span className={`rfe__stato rfe__stato--${statoCls(r.stato)}`}>
                    {r.stato === 'Rifiutata' && r.motivo
                      ? <Tooltip text={r.motivo}><span className="rfe__stato-txt">{r.stato} <Ico n="info" w="solid" s={12} c="currentColor" /></span></Tooltip>
                      : <TruncatedText text={r.stato} />}
                  </span>
                  <IterResponsabile r={r} />
                  {ultimaModifica(r) && (
                    <Tooltip text={`Modificata da ${ultimaModifica(r)!.autore} il ${new Date(ultimaModifica(r)!.at).toLocaleDateString('it-IT')}: ${ultimaModifica(r)!.modifiche?.join('; ') ?? ''}`}>
                      <span className="rfe__mod" aria-label="Modificata dall'HR"><i className="fa-solid fa-pen" aria-hidden="true" /></span>
                    </Tooltip>
                  )}
                  </span>
                </td>
                <td className="rfe__c">
                  <span className="rfe__acts">
                    {act('Modifica', 'edit', () => apriModifica(r))}
                    {r.stato === 'Al responsabile'
                      ? act(`Sollecita ${r.responsabile?.nome ?? 'il responsabile'}: decide prima lui dall'App Op!`, 'bell', () => sollecita([r]))
                      : <>
                          {r.stato !== 'Approvata' && act('Approva', 'circle-check', () => approva(r))}
                          {r.stato !== 'Rifiutata' && act('Rifiuta', 'circle-xmark', () => setRifiuto({ rows: [r], motivo: '' }))}
                        </>}
                    {act('Elimina', 'trash', () => eliminaRow(r))}
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={11} className="rfe__empty">
                {vista === VISTA_ATTESA ? 'Nessuna richiesta da approvare.' : vista === VISTA_RESP ? 'Nessuna richiesta in attesa dei responsabili di reparto.' : 'Nessuna richiesta corrisponde ai filtri impostati.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rfe__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

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
      <Modal open={!!bozza} onClose={() => setBozza(null)} title="Modifica richiesta" size="md">
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
              return r ? <StoricoHr origine={{ at: r.createdAt, autore: nomeDipendente(r.dipendenteId) }} storico={r.storico} /> : null
            })()}
            <div className="rfe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setBozza(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={salvaModifica}>Salva modifiche</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Saldo annuo per dipendente: ferie (giorni) o ROL (ore) ── */}
      <Modal open={!!saldo} onClose={() => setSaldo(null)} title={`${saldo === 'rol' ? 'Saldo ROL' : 'Saldo ferie'} ${new Date().getFullYear()}`} size="lg">
        {saldo && (
          <div className="rfe-modal">
            <p className="rfe-modal__text">
              {saldo === 'rol'
                ? 'Ore di riduzione orario maturate nell\'anno secondo il contratto, godute con le richieste approvate e ancora da approvare.'
                : 'Giorni lavorativi di ferie maturati nell\'anno secondo il contratto, goduti con le richieste approvate e ancora da approvare.'}
            </p>
            <div className="sib-table-wrap rfe__wrap">
              <table className="sib-table rfe__table rfe__saldo">
                <colgroup>
                  <col className="rfe__scol-dip" /><col className="rfe__scol-rep" />
                  <col className="rfe__scol-n" /><col className="rfe__scol-n" /><col className="rfe__scol-n" /><col className="rfe__scol-n" />
                </colgroup>
                <thead>
                  <tr>
                    <th><ThLabel full="Dipendente" /></th>
                    <th><ThLabel full="Reparto" /></th>
                    <th className="rfe__r"><ThLabel full="Maturate" /></th>
                    <th className="rfe__r"><ThLabel full="Godute" /></th>
                    <th className="rfe__r"><ThLabel full="In attesa" /></th>
                    <th className="rfe__r"><ThLabel full="Residue" /></th>
                  </tr>
                </thead>
                <tbody>
                  {righeSaldo(saldo).map(({ d, s: x }) => (
                    <tr key={d.id}>
                      <td className="rfe__strong"><TruncatedText text={`${d.nome} ${d.cognome}`} /></td>
                      <td><TruncatedText text={d.reparto} /></td>
                      <td className="rfe__r">{fmtSaldo(saldo, x.maturate)}</td>
                      <td className="rfe__r">{fmtSaldo(saldo, x.godute)}</td>
                      <td className="rfe__r">{x.inAttesa ? fmtSaldo(saldo, x.inAttesa) : <span className="rfe__dash">-</span>}</td>
                      <td className={`rfe__r rfe__strong ${x.residue < 0 ? 'rfe__neg' : ''}`}>
                        {x.inAttesa && x.residue - x.inAttesa < 0
                          ? <Tooltip text={`Se approvi quelle in attesa restano ${fmtSaldo(saldo, x.residue - x.inAttesa)}`}><span className="rfe__saldo-warn">{fmtSaldo(saldo, x.residue)} <Ico n="alert" w="solid" s={12} c="currentColor" /></span></Tooltip>
                          : fmtSaldo(saldo, x.residue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rfe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => esportaSaldo(saldo)}>
                <i className="fa-regular fa-file-xls" aria-hidden="true" /> Esporta in Excel
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => setSaldo(null)}>Chiudi</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
