import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import Modal from '../../../core/components/Modal'
import { InputField, SelectField, DatePickerField, CheckboxField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './TurniPersonale.sass'

/**
 * Turni del personale — replica `Views/HumanResource/Turnazione.cshtml`.
 * Calendario settimanale/mensile dei turni per dipendente, con
 * supporto a turni multi-struttura e assenze (ferie/permesso/malattia).
 *
 * BE: `OperationController.GetTurniPersonale` → catch-all
 * `/Sibylla/operation/GetTurniPersonale`.
 */

// ──────────────────────────────────────────────────────────────────────
// Tipi
// ──────────────────────────────────────────────────────────────────────

type ViewMode = 'settimana' | 'mese'
type FasciaTurno = 'mattina' | 'pomeriggio' | 'notte'
type TipoAssenza = 'ferie' | 'permesso' | 'malattia'

interface Dipendente {
  id: number
  nome: string
  cognome: string
  reparto: string
  avatar?: string
}

interface Turno {
  id: number
  id_dipendente: number
  data: string             // 'YYYY-MM-DD'
  fascia: FasciaTurno
  strutture: string[]      // 1+ strutture (se >1 → multi)
}

interface Assenza {
  id: number
  id_dipendente: number
  data: string             // 'YYYY-MM-DD'
  tipo: TipoAssenza
  ora_da?: string          // 'HH:mm' (solo permesso)
  ora_a?: string           // 'HH:mm' (solo permesso)
}

// ──────────────────────────────────────────────────────────────────────
// Costanti
// ──────────────────────────────────────────────────────────────────────

const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']
const REPARTI   = ['Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Cucina', 'Amministrazione']
const FASCE: Record<FasciaTurno, { label: string; range: string; bg: string; bd: string }> = {
  mattina:    { label: 'Mattina',    range: '07–13', bg: '#FBE5E5', bd: '#E94B4B' },
  pomeriggio: { label: 'Pomeriggio', range: '13–22', bg: '#E5EDF8', bd: '#2D70B8' },
  notte:      { label: 'Notte',      range: '22–07', bg: '#E1EFE1', bd: '#2EB85C' },
}
const ASSENZE: Record<TipoAssenza, { label: string; bg: string; bd: string; icon: string }> = {
  ferie:    { label: 'Ferie',    bg: '#F1E7FB', bd: '#9C5BD2', icon: 'fa-umbrella-beach' },
  permesso: { label: 'Permesso', bg: '#FFF5DA', bd: '#F1B33F', icon: 'fa-clock' },
  malattia: { label: 'Malattia', bg: '#FBE5E5', bd: '#E94B4B', icon: 'fa-thermometer' },
}

const GIORNI_SETT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI_LABEL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

// ──────────────────────────────────────────────────────────────────────
// Mock data
// ──────────────────────────────────────────────────────────────────────

const FALLBACK_DIPENDENTI: Dipendente[] = [
  { id: 1,  nome: 'Andrea',    cognome: 'Grimaudo',  reparto: 'Front office' },
  { id: 2,  nome: 'Giulia',    cognome: 'Conti',     reparto: 'Front office' },
  { id: 3,  nome: 'Marco',     cognome: 'Esposito',  reparto: 'Cucina' },
  { id: 4,  nome: 'Sara',      cognome: 'Romano',    reparto: 'Housekeeping' },
  { id: 5,  nome: 'Davide',    cognome: 'Marini',    reparto: 'Front office' },
  { id: 6,  nome: 'Sergio',    cognome: 'Benvenuti', reparto: 'Manutenzione' },
  { id: 7,  nome: 'Manuel',    cognome: 'Fantoni',   reparto: 'Manutenzione' },
  { id: 8,  nome: 'Oscar',     cognome: 'Pettinari', reparto: 'Housekeeping' },
  { id: 9,  nome: 'Luca',      cognome: 'Hambelli',  reparto: 'Amministrazione' },
  { id: 10, nome: 'Elena',     cognome: 'Bianchi',   reparto: 'F&B' },
]

function buildFallbackTurni(rangeStart: Date, rangeEnd: Date): Turno[] {
  const turni: Turno[] = []
  let id = 1
  // Distribuisce turni e qualche multi-struttura in modo deterministico
  const days: string[] = []
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10))
  }
  const fasce: FasciaTurno[] = ['mattina', 'pomeriggio', 'notte']
  for (const dip of FALLBACK_DIPENDENTI) {
    days.forEach((g, i) => {
      const dayIdx = (i + dip.id) % 7
      if (dayIdx === 6) return // domenica = riposo
      const fascia = fasce[(i + dip.id) % 3]
      const isMulti = ((i + dip.id) % 5) === 0
      turni.push({
        id: id++,
        id_dipendente: dip.id,
        data: g,
        fascia,
        strutture: isMulti ? ['Hotel Tutorial', 'Hotel Archimede'] : [STRUTTURE[(dip.id) % STRUTTURE.length]],
      })
    })
  }
  return turni
}

function buildFallbackAssenze(rangeStart: Date): Assenza[] {
  const base = new Date(rangeStart)
  const iso = (offset: number) => {
    const d = new Date(base); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10)
  }
  return [
    { id: 1, id_dipendente: 4, data: iso(1), tipo: 'ferie' },
    { id: 2, id_dipendente: 4, data: iso(2), tipo: 'ferie' },
    { id: 3, id_dipendente: 9, data: iso(3), tipo: 'malattia' },
    { id: 4, id_dipendente: 2, data: iso(4), tipo: 'permesso', ora_da: '10:00', ora_a: '12:00' },
  ]
}

// ──────────────────────────────────────────────────────────────────────
// Date helpers
// ──────────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  // Local timezone (no UTC drift): a fine giornata l'ora UTC scivolerebbe al giorno seguente.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // 0 = lunedì
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}
function startOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function range(start: Date, end: Date): Date[] {
  const out: Date[] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d))
  return out
}

function fmtRangeLabel(start: Date, end: Date, view: ViewMode): string {
  if (view === 'mese') {
    return `${MESI_LABEL[start.getMonth()]} ${start.getFullYear()}`
  }
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MESI_LABEL[start.getMonth()]} ${start.getFullYear()}`
  }
  return `${start.getDate()} ${MESI_LABEL[start.getMonth()]} – ${end.getDate()} ${MESI_LABEL[end.getMonth()]} ${end.getFullYear()}`
}

// ──────────────────────────────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────────────────────────────

export default function TurniPersonale({ navigate }: { navigate: (p: string) => void }) {
  const [view, setView] = useState<ViewMode>('settimana')
  const [cursor, setCursor] = useState<Date>(new Date(2026, 3, 27)) // 27 aprile 2026 (lunedì)
  const [filterStruttura, setFilterStruttura] = useState<string>('Tutte')
  const [filterReparto,   setFilterReparto]   = useState<string>('Tutti')
  const [filterFascia,    setFilterFascia]    = useState<string>('Tutte')
  const [filterAssenza,   setFilterAssenza]   = useState<string>('Tutte')
  const [search,          setSearch]          = useState('')

  // Range date corrente
  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === 'settimana') {
      const s = startOfWeek(cursor)
      const e = new Date(s); e.setDate(e.getDate() + 6)
      return { rangeStart: s, rangeEnd: e, days: range(s, e) }
    }
    const s = startOfMonth(cursor)
    const e = endOfMonth(cursor)
    return { rangeStart: s, rangeEnd: e, days: range(s, e) }
  }, [view, cursor])

  const [dipendenti, setDipendenti] = useState<Dipendente[]>(FALLBACK_DIPENDENTI)
  const [turni,      setTurni]      = useState<Turno[]>(() => buildFallbackTurni(rangeStart, rangeEnd))
  const [assenze,    setAssenze]    = useState<Assenza[]>(() => buildFallbackAssenze(rangeStart))
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ dipendenti: Dipendente[]; turni: Turno[]; assenze: Assenza[] }>('operation/GetTurniPersonale', {
      method: 'POST',
      body: { dataDa: isoDate(rangeStart), dataA: isoDate(rangeEnd), view },
    })
      .then((d) => {
        if (cancelled) return
        if (d?.dipendenti?.length) setDipendenti(d.dipendenti)
        setTurni(d?.turni?.length ? d.turni : buildFallbackTurni(rangeStart, rangeEnd))
        setAssenze(d?.assenze?.length ? d.assenze : buildFallbackAssenze(rangeStart))
        setLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? 'Errore')
        setTurni(buildFallbackTurni(rangeStart, rangeEnd))
        setAssenze(buildFallbackAssenze(rangeStart))
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [rangeStart.getTime(), rangeEnd.getTime(), view])

  // Filtri
  const dipendentiFiltered = useMemo(() => dipendenti.filter((d) => {
    if (filterReparto !== 'Tutti' && d.reparto !== filterReparto) return false
    if (search && !`${d.nome} ${d.cognome} ${d.reparto}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStruttura !== 'Tutte') {
      // Mostra solo dipendenti che almeno una volta lavorano in quella struttura nel range
      const lavoraIn = turni.some((t) => t.id_dipendente === d.id && t.strutture.includes(filterStruttura))
      if (!lavoraIn) return false
    }
    return true
  }), [dipendenti, filterReparto, search, filterStruttura, turni])

  function turniDelGiorno(idDip: number, giorno: string): Turno[] {
    return turni.filter((t) => {
      if (t.id_dipendente !== idDip || t.data !== giorno) return false
      if (filterFascia   !== 'Tutte' && t.fascia !== filterFascia) return false
      if (filterStruttura !== 'Tutte' && !t.strutture.includes(filterStruttura)) return false
      return true
    })
  }
  function assenzeDelGiorno(idDip: number, giorno: string): Assenza[] {
    return assenze.filter((a) => {
      if (a.id_dipendente !== idDip || a.data !== giorno) return false
      if (filterAssenza !== 'Tutte' && a.tipo !== filterAssenza) return false
      return true
    })
  }

  function shiftCursor(direction: 1 | -1) {
    const next = new Date(cursor)
    if (view === 'settimana') next.setDate(next.getDate() + 7 * direction)
    else                       next.setMonth(next.getMonth() + direction)
    setCursor(next)
  }
  function goToday() { setCursor(new Date()) }

  // Modali create
  const [openTurno, setOpenTurno] = useState(false)
  const [openAssenza, setOpenAssenza] = useState(false)
  // Modale modifica blocco (tasto destro su turno/assenza)
  const [editing, setEditing] = useState<{ kind: 'turno'; data: Turno } | { kind: 'assenza'; data: Assenza } | null>(null)

  function salvaTurnoMod(t: Turno)   { setTurni((prev) => prev.map((x) => (x.id === t.id ? t : x))); setEditing(null) }
  function salvaAssenzaMod(a: Assenza) { setAssenze((prev) => prev.map((x) => (x.id === a.id ? a : x))); setEditing(null) }
  function eliminaBlocco() {
    if (!editing) return
    if (editing.kind === 'turno') setTurni((prev) => prev.filter((x) => x.id !== editing.data.id))
    else                          setAssenze((prev) => prev.filter((x) => x.id !== editing.data.id))
    setEditing(null)
  }

  async function creaTurno(input: { id_dipendente: number; data: string; fascia: FasciaTurno; strutture: string[] }) {
    const newTurno: Turno = { id: Date.now(), ...input }
    setTurni((prev) => [...prev, newTurno])
    setOpenTurno(false)
    try { await apiFetchSibylla('operation/InsertTurno', { method: 'POST', body: input }) } catch { /* fallback locale */ }
  }
  async function creaAssenza(input: { id_dipendente: number; data_da: string; data_a: string; tipo: TipoAssenza; ora_da?: string; ora_a?: string }) {
    // espande il range in giorni
    const giorni: string[] = []
    for (const d = new Date(input.data_da); d <= new Date(input.data_a); d.setDate(d.getDate() + 1)) giorni.push(isoDate(new Date(d)))
    const nuove: Assenza[] = giorni.map((g, i) => ({
      id: Date.now() + i,
      id_dipendente: input.id_dipendente,
      data: g,
      tipo: input.tipo,
      ora_da: input.tipo === 'permesso' ? input.ora_da : undefined,
      ora_a:  input.tipo === 'permesso' ? input.ora_a  : undefined,
    }))
    setAssenze((prev) => [...prev, ...nuove])
    setOpenAssenza(false)
    try { await apiFetchSibylla('operation/InsertAssenza', { method: 'POST', body: input }) } catch { /* fallback locale */ }
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Turni del personale" subtitle="Pianificazione settimanale e mensile dei turni, con gestione assenze e turni multi-struttura" />

      {/* Toolbar filtri */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
        <SelectField name="struttura" label="Struttura" value={filterStruttura} onChange={(e) => setFilterStruttura(e.target.value)}
          options={[{ value: 'Tutte', label: 'Tutte' }, ...STRUTTURE.map((s) => ({ value: s, label: s }))]}
        />
        <SelectField name="reparto" label="Reparto" value={filterReparto} onChange={(e) => setFilterReparto(e.target.value)}
          options={[{ value: 'Tutti', label: 'Tutti' }, ...REPARTI.map((r) => ({ value: r, label: r }))]}
        />
        <SelectField name="fascia" label="Fascia turno" value={filterFascia} onChange={(e) => setFilterFascia(e.target.value)}
          options={[
            { value: 'Tutte',      label: 'Tutte' },
            { value: 'mattina',    label: 'Mattina (07–13)' },
            { value: 'pomeriggio', label: 'Pomeriggio (13–22)' },
            { value: 'notte',      label: 'Notte (22–07)' },
          ]}
        />
        <SelectField name="assenza" label="Assenza" value={filterAssenza} onChange={(e) => setFilterAssenza(e.target.value)}
          options={[
            { value: 'Tutte',    label: 'Tutte' },
            { value: 'ferie',    label: 'Ferie' },
            { value: 'permesso', label: 'Permesso' },
            { value: 'malattia', label: 'Malattia' },
          ]}
        />
        <InputField name="ricerca" label="Ricerca dipendente" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, cognome, reparto" />

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold font-opensans text-ink">Vista</label>
          <div className="flex h-9 rounded-field overflow-hidden border border-line">
            <button type="button" className={`flex-1 text-[12px] font-semibold ${view === 'settimana' ? 'bg-primary text-white' : 'bg-white text-ink hover:bg-canvas'}`} onClick={() => setView('settimana')}>Settimana</button>
            <button type="button" className={`flex-1 text-[12px] font-semibold ${view === 'mese'      ? 'bg-primary text-white' : 'bg-white text-ink hover:bg-canvas'}`} onClick={() => setView('mese')}>Mese</button>
          </div>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button className="sib-btn sib-btn--icon" title="Periodo precedente" onClick={() => shiftCursor(-1)}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button className="sib-btn sib-btn--ghost" onClick={goToday}>Oggi</button>
          <button className="sib-btn sib-btn--icon" title="Periodo successivo" onClick={() => shiftCursor(1)}>
            <i className="fa-solid fa-chevron-right" />
          </button>
          <span className="text-[15px] font-bold font-poppins text-primary ml-2">{fmtRangeLabel(rangeStart, rangeEnd, view)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="sib-btn sib-btn--secondary" onClick={() => setOpenAssenza(true)}>
            <i className="fa-duotone fa-umbrella-beach" /> Crea assenza
          </button>
          <button className="sib-btn sib-btn--primary" onClick={() => setOpenTurno(true)}>
            <i className="fa-duotone fa-plus" /> Crea turno
          </button>
        </div>
      </div>

      {/* Calendario */}
      {view === 'settimana'
        ? <WeekGrid days={days} dipendenti={dipendentiFiltered} turniDelGiorno={turniDelGiorno} assenzeDelGiorno={assenzeDelGiorno}
            onEditTurno={(t) => setEditing({ kind: 'turno', data: t })} onEditAssenza={(a) => setEditing({ kind: 'assenza', data: a })} />
        : <MonthGrid days={days} dipendenti={dipendentiFiltered} turniDelGiorno={turniDelGiorno} assenzeDelGiorno={assenzeDelGiorno}
            onEditTurno={(t) => setEditing({ kind: 'turno', data: t })} onEditAssenza={(a) => setEditing({ kind: 'assenza', data: a })} />}

      {/* Legenda */}
      <Legend />

      {/* Modali create */}
      <CreaTurnoModal open={openTurno} onClose={() => setOpenTurno(false)} dipendenti={dipendenti} defaultData={isoDate(rangeStart)} onSave={creaTurno} />
      <CreaAssenzaModal open={openAssenza} onClose={() => setOpenAssenza(false)} dipendenti={dipendenti} defaultData={isoDate(rangeStart)} onSave={creaAssenza} />
      <ModificaBloccoModal editing={editing} dipendenti={dipendenti} onClose={() => setEditing(null)} onSaveTurno={salvaTurnoMod} onSaveAssenza={salvaAssenzaMod} onDelete={eliminaBlocco} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Modale Crea turno
// ──────────────────────────────────────────────────────────────────────

function CreaTurnoModal({
  open, onClose, dipendenti, defaultData, onSave,
}: {
  open: boolean
  onClose: () => void
  dipendenti: Dipendente[]
  defaultData: string
  onSave: (input: { id_dipendente: number; data: string; fascia: FasciaTurno; strutture: string[] }) => void
}) {
  const [idDip, setIdDip] = useState<number>(dipendenti[0]?.id ?? 0)
  const [data, setData] = useState(defaultData)
  const [fascia, setFascia] = useState<FasciaTurno>('mattina')
  const [strutture, setStrutture] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (open) { setIdDip(dipendenti[0]?.id ?? 0); setData(defaultData); setFascia('mattina'); setStrutture({}); setError(null) } }, [open, defaultData, dipendenti])

  const struttureSel = Object.entries(strutture).filter(([, v]) => v).map(([k]) => k)
  const isMulti = struttureSel.length > 1

  function handleSave() {
    if (!idDip) { setError('Seleziona un dipendente'); return }
    if (!struttureSel.length) { setError('Seleziona almeno una struttura'); return }
    onSave({ id_dipendente: idDip, data, fascia, strutture: struttureSel })
  }

  return (
    <Modal open={open} onClose={onClose} title="Crea turno" size="md">
      <div className="p-5 flex flex-col gap-4">
        {error && <AlertBanner type="error">{error}</AlertBanner>}

        <SelectField name="dipendente" label="Dipendente" value={String(idDip)} onChange={(e) => setIdDip(Number(e.target.value))}
          options={dipendenti.map((d) => ({ value: String(d.id), label: `${d.cognome} ${d.nome} — ${d.reparto}` }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />
          <SelectField name="fascia" label="Fascia turno" value={fascia} onChange={(e) => setFascia(e.target.value as FasciaTurno)}
            options={[
              { value: 'mattina',    label: 'Mattina (07–13)' },
              { value: 'pomeriggio', label: 'Pomeriggio (13–22)' },
              { value: 'notte',      label: 'Notte (22–07)' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold font-opensans text-ink">
            Strutture {isMulti && <span className="text-link ml-1">(turno multi-struttura)</span>}
          </label>
          <div className="grid grid-cols-2 gap-2 border border-line rounded-field p-3">
            {STRUTTURE.map((s) => (
              <CheckboxField key={s} name={`s-${s}`} label={s} checked={!!strutture[s]} onChange={(e) => setStrutture((prev) => ({ ...prev, [s]: e.target.checked }))} />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button className="sib-btn sib-btn--primary" onClick={handleSave}>Salva turno</button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Modale Crea assenza
// ──────────────────────────────────────────────────────────────────────

function CreaAssenzaModal({
  open, onClose, dipendenti, defaultData, onSave,
}: {
  open: boolean
  onClose: () => void
  dipendenti: Dipendente[]
  defaultData: string
  onSave: (input: { id_dipendente: number; data_da: string; data_a: string; tipo: TipoAssenza; ora_da?: string; ora_a?: string }) => void
}) {
  const [idDip, setIdDip] = useState<number>(dipendenti[0]?.id ?? 0)
  const [tipo, setTipo] = useState<TipoAssenza>('ferie')
  const [dataDa, setDataDa] = useState(defaultData)
  const [dataA,  setDataA]  = useState(defaultData)
  const [oraDa, setOraDa]  = useState('09:00')
  const [oraA,  setOraA]   = useState('13:00')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setIdDip(dipendenti[0]?.id ?? 0); setTipo('ferie')
      setDataDa(defaultData); setDataA(defaultData); setOraDa('09:00'); setOraA('13:00'); setError(null)
    }
  }, [open, defaultData, dipendenti])

  function handleSave() {
    if (!idDip) { setError('Seleziona un dipendente'); return }
    if (new Date(dataA) < new Date(dataDa)) { setError('Data fine antecedente alla data inizio'); return }
    if (tipo === 'permesso' && (!oraDa || !oraA)) { setError('Specifica l’intervallo orario del permesso'); return }
    onSave({ id_dipendente: idDip, data_da: dataDa, data_a: dataA, tipo, ora_da: oraDa, ora_a: oraA })
  }

  return (
    <Modal open={open} onClose={onClose} title="Crea assenza" size="md">
      <div className="p-5 flex flex-col gap-4">
        {error && <AlertBanner type="error">{error}</AlertBanner>}

        <SelectField name="dipendente" label="Dipendente" value={String(idDip)} onChange={(e) => setIdDip(Number(e.target.value))}
          options={dipendenti.map((d) => ({ value: String(d.id), label: `${d.cognome} ${d.nome} — ${d.reparto}` }))}
        />

        <SelectField name="tipo" label="Tipo assenza" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAssenza)}
          options={[
            { value: 'ferie',    label: 'Ferie' },
            { value: 'permesso', label: 'Permesso' },
            { value: 'malattia', label: 'Malattia' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <DatePickerField name="dataDa" label="Data inizio" value={dataDa} onChange={(e) => setDataDa(e.target.value)} />
          <DatePickerField name="dataA"  label="Data fine"   value={dataA}  onChange={(e) => setDataA(e.target.value)} />
        </div>

        {tipo === 'permesso' && (
          <div className="grid grid-cols-2 gap-3">
            <InputField name="oraDa" label="Ora inizio" type="text" value={oraDa} onChange={(e) => setOraDa(e.target.value)} placeholder="HH:mm" />
            <InputField name="oraA"  label="Ora fine"   type="text" value={oraA}  onChange={(e) => setOraA(e.target.value)}  placeholder="HH:mm" />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <button className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button className="sib-btn sib-btn--primary" onClick={handleSave}>Salva assenza</button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Modale Modifica blocco (turno o assenza) — tasto destro su un blocco
// ──────────────────────────────────────────────────────────────────────

function ModificaBloccoModal({
  editing, dipendenti, onClose, onSaveTurno, onSaveAssenza, onDelete,
}: {
  editing: { kind: 'turno'; data: Turno } | { kind: 'assenza'; data: Assenza } | null
  dipendenti: Dipendente[]
  onClose: () => void
  onSaveTurno: (t: Turno) => void
  onSaveAssenza: (a: Assenza) => void
  onDelete: () => void
}) {
  const [data, setData] = useState('')
  const [fascia, setFascia] = useState<FasciaTurno>('mattina')
  const [strutture, setStrutture] = useState<Record<string, boolean>>({})
  const [tipo, setTipo] = useState<TipoAssenza>('ferie')
  const [oraDa, setOraDa] = useState('09:00')
  const [oraA, setOraA] = useState('13:00')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) return
    setData(editing.data.data)
    setError(null)
    if (editing.kind === 'turno') {
      setFascia(editing.data.fascia)
      setStrutture(Object.fromEntries(editing.data.strutture.map((s) => [s, true])))
    } else {
      setTipo(editing.data.tipo)
      setOraDa(editing.data.ora_da ?? '09:00')
      setOraA(editing.data.ora_a ?? '13:00')
    }
  }, [editing])

  const dip = editing ? dipendenti.find((d) => d.id === editing.data.id_dipendente) : undefined

  function handleSave() {
    if (!editing) return
    if (editing.kind === 'turno') {
      const sel = Object.entries(strutture).filter(([, v]) => v).map(([k]) => k)
      if (!sel.length) { setError('Seleziona almeno una struttura'); return }
      onSaveTurno({ ...editing.data, data, fascia, strutture: sel })
    } else {
      if (tipo === 'permesso' && (!oraDa || !oraA)) { setError('Specifica l’intervallo orario del permesso'); return }
      onSaveAssenza({ ...editing.data, data, tipo, ora_da: tipo === 'permesso' ? oraDa : undefined, ora_a: tipo === 'permesso' ? oraA : undefined })
    }
  }

  const isTurno = editing?.kind === 'turno'

  return (
    <Modal open={!!editing} onClose={onClose} title={isTurno ? 'Modifica turno' : 'Modifica assenza'} size="md">
      {editing && (
        <div className="p-5 flex flex-col gap-4">
          {error && <AlertBanner type="error">{error}</AlertBanner>}

          {dip && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                {dip.nome[0]}{dip.cognome[0]}
              </div>
              <div className="text-[13px] font-semibold text-ink">{dip.cognome} {dip.nome} <span className="text-ink-muted font-normal">— {dip.reparto}</span></div>
            </div>
          )}

          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />

          {isTurno ? (
            <>
              <SelectField name="fascia" label="Fascia turno" value={fascia} onChange={(e) => setFascia(e.target.value as FasciaTurno)}
                options={[
                  { value: 'mattina',    label: 'Mattina (07–13)' },
                  { value: 'pomeriggio', label: 'Pomeriggio (13–22)' },
                  { value: 'notte',      label: 'Notte (22–07)' },
                ]}
              />
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold font-opensans text-ink-muted">Strutture</label>
                <div className="grid grid-cols-2 gap-2 border border-line rounded-field p-3">
                  {STRUTTURE.map((s) => (
                    <CheckboxField key={s} name={`ms-${s}`} label={s} checked={!!strutture[s]} onChange={(e) => setStrutture((prev) => ({ ...prev, [s]: e.target.checked }))} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <SelectField name="tipoMod" label="Tipo assenza" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAssenza)}
                options={[
                  { value: 'ferie',    label: 'Ferie' },
                  { value: 'permesso', label: 'Permesso' },
                  { value: 'malattia', label: 'Malattia' },
                ]}
              />
              {tipo === 'permesso' && (
                <div className="grid grid-cols-2 gap-3">
                  <InputField name="oraDaMod" label="Ora inizio" type="text" value={oraDa} onChange={(e) => setOraDa(e.target.value)} placeholder="HH:mm" />
                  <InputField name="oraAMod"  label="Ora fine"   type="text" value={oraA}  onChange={(e) => setOraA(e.target.value)}  placeholder="HH:mm" />
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between mt-2 pt-4 border-t border-line">
            <button className="sib-btn sib-btn--danger-outline" onClick={onDelete}>
              <i className="fa-light fa-trash" /> Elimina
            </button>
            <div className="flex gap-3">
              <button className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
              <button className="sib-btn sib-btn--primary" onClick={handleSave}>Salva modifiche</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Vista Settimana — riga per dipendente, 7 colonne giorno
// ──────────────────────────────────────────────────────────────────────

function WeekGrid({
  days, dipendenti, turniDelGiorno, assenzeDelGiorno, onEditTurno, onEditAssenza,
}: {
  days: Date[]
  dipendenti: Dipendente[]
  turniDelGiorno: (idDip: number, giorno: string) => Turno[]
  assenzeDelGiorno: (idDip: number, giorno: string) => Assenza[]
  onEditTurno: (t: Turno) => void
  onEditAssenza: (a: Assenza) => void
}) {
  const todayIso = isoDate(new Date())
  return (
    <div className="bg-white border border-line rounded-field overflow-hidden">
      {/* header giorni */}
      <div className="grid border-b border-line bg-canvas turni__week-grid" >
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">Dipendente</div>
        {days.map((d, i) => {
          const isToday = isoDate(d) === todayIso
          return (
            <div key={i}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-center border-l border-line ${isToday ? 'text-primary turni__day-head--today' : 'text-ink-muted'}`}
            >
              {GIORNI_SETT[i]} {d.getDate()}/{String(d.getMonth() + 1).padStart(2, '0')}
              {isToday && <span className="ml-1 text-[9px] uppercase">• Oggi</span>}
            </div>
          )
        })}
      </div>

      {/* righe dipendenti */}
      {dipendenti.map((dip) => (
        <div key={dip.id} className="grid border-b border-line last:border-b-0 turni__week-grid">
          <DipendenteCell dip={dip} />
          {days.map((d, i) => {
            const giorno = isoDate(d)
            const isToday = giorno === todayIso
            const trni = turniDelGiorno(dip.id, giorno)
            const ass  = assenzeDelGiorno(dip.id, giorno)
            return (
              <div key={i}
                className={`px-1.5 py-1.5 border-l border-line min-h-[60px] flex flex-col gap-1 ${isToday ? 'turni__cell--today' : ''}`}
              >
                {trni.map((t) => <TurnoBadge key={t.id} turno={t} onEdit={onEditTurno} />)}
                {ass.map((a) => <AssenzaBadge key={a.id} assenza={a} onEdit={onEditAssenza} />)}
              </div>
            )
          })}
        </div>
      ))}

      {dipendenti.length === 0 && (
        <div className="px-4 py-10 text-center text-ink-muted text-[13px]">Nessun dipendente per i filtri selezionati.</div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Vista Mese — calendario classico 7 colonne, righe dipendenti compatte
// ──────────────────────────────────────────────────────────────────────

function MonthGrid({
  days, dipendenti, turniDelGiorno, assenzeDelGiorno, onEditTurno, onEditAssenza,
}: {
  days: Date[]
  dipendenti: Dipendente[]
  turniDelGiorno: (idDip: number, giorno: string) => Turno[]
  assenzeDelGiorno: (idDip: number, giorno: string) => Assenza[]
  onEditTurno: (t: Turno) => void
  onEditAssenza: (a: Assenza) => void
}) {
  const todayIso = isoDate(new Date())
  // Pad iniziale per allineare col lunedì
  const firstDow = (days[0].getDay() + 6) % 7
  const blanks = Array.from({ length: firstDow })

  return (
    <div className="bg-white border border-line rounded-field overflow-hidden">
      {/* header giorni settimana */}
      <div className="grid border-b border-line bg-canvas turni__month-grid">
        {GIORNI_SETT.map((g) => (
          <div key={g} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted text-center border-l border-line first:border-l-0">{g}</div>
        ))}
      </div>

      <div className="grid turni__month-grid">
        {blanks.map((_, i) => <div key={`b-${i}`} className="min-h-[120px] border-r border-b border-line bg-canvas/40" />)}
        {days.map((d, i) => {
          const giorno = isoDate(d)
          const isToday = giorno === todayIso
          const dow = (d.getDay() + 6) % 7
          return (
            <div key={i}
              className={`min-h-[120px] p-2 border-r border-b border-line text-[11px] flex flex-col gap-1 ${dow === 6 ? 'bg-canvas/30' : ''} ${isToday ? 'turni__month-cell--today' : ''}`}
            >
              <div className={`mb-1 flex items-center gap-1 ${isToday ? 'font-bold text-primary' : 'font-bold text-ink'}`}>
                {isToday && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">
                    {d.getDate()}
                  </span>
                )}
                {!isToday && <span>{d.getDate()}</span>}
                {isToday && <span className="text-[9px] uppercase tracking-wide">Oggi</span>}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                {dipendenti.map((dip) => {
                  const trni = turniDelGiorno(dip.id, giorno)
                  const ass  = assenzeDelGiorno(dip.id, giorno)
                  if (!trni.length && !ass.length) return null
                  return (
                    <div key={dip.id} className="flex flex-col gap-0.5">
                      {trni.map((t) => <TurnoBadge key={t.id} turno={t} compact dipNome={`${dip.cognome} ${dip.nome[0]}.`} onEdit={onEditTurno} />)}
                      {ass.map((a) => <AssenzaBadge key={a.id} assenza={a} compact dipNome={`${dip.cognome} ${dip.nome[0]}.`} onEdit={onEditAssenza} />)}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {dipendenti.length === 0 && (
        <div className="px-4 py-10 text-center text-ink-muted text-[13px]">Nessun dipendente per i filtri selezionati.</div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────

function DipendenteCell({ dip }: { dip: Dipendente }) {
  return (
    <div className="px-3 py-2 flex items-center gap-2 min-w-0">
      {dip.avatar
        ? <img src={dip.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        : <div className="w-8 h-8 rounded-full bg-primary-100 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
            {dip.nome[0]}{dip.cognome[0]}
          </div>}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink truncate">{dip.cognome} {dip.nome}</div>
        <div className="text-[11px] text-ink-muted truncate">{dip.reparto}</div>
      </div>
    </div>
  )
}

function TurnoBadge({ turno, compact, dipNome, onEdit }: { turno: Turno; compact?: boolean; dipNome?: string; onEdit?: (t: Turno) => void }) {
  const f = FASCE[turno.fascia]
  const isMulti = turno.strutture.length > 1

  return (
    <div
      className={`rounded text-[11px] px-1.5 py-1 leading-tight turni__badge ${isMulti ? 'turni__badge--multi' : ''}`}
      style={{ '--badge-bg': f.bg, '--badge-bd': f.bd } as React.CSSProperties}
      title={`${f.label} ${f.range} — ${turno.strutture.join(' + ')}${isMulti ? ' (multi-struttura)' : ''} · tasto destro per modificare`}
      onContextMenu={(e) => { e.preventDefault(); onEdit?.(turno) }}
    >
      <div className="font-bold text-ink flex items-center gap-1">
        {isMulti && <i className="fa-solid fa-link text-[9px] turni__badge-ico" />}
        {compact ? `${dipNome ?? ''} ${f.label.slice(0, 3)}.` : `${f.label} ${f.range}`}
      </div>
      <div className="text-[10px] text-ink-muted truncate">
        {turno.strutture.join(isMulti ? ' ⇄ ' : '')}
      </div>
    </div>
  )
}

function AssenzaBadge({ assenza, compact, dipNome, onEdit }: { assenza: Assenza; compact?: boolean; dipNome?: string; onEdit?: (a: Assenza) => void }) {
  const a = ASSENZE[assenza.tipo]
  return (
    <div
      className="rounded text-[11px] px-1.5 py-1 leading-tight turni__badge"
      style={{ '--badge-bg': a.bg, '--badge-bd': a.bd } as React.CSSProperties}
      title={`${a.label}${assenza.tipo === 'permesso' ? ` ${assenza.ora_da ?? ''}–${assenza.ora_a ?? ''}` : ''} · tasto destro per modificare`}
      onContextMenu={(e) => { e.preventDefault(); onEdit?.(assenza) }}
    >
      <div className="font-bold text-ink flex items-center gap-1">
        <i className={`fa-duotone ${a.icon} text-[10px] turni__badge-ico`} />
        {compact ? `${dipNome ?? ''} ${a.label.slice(0, 3)}.` : a.label}
        {assenza.tipo === 'permesso' && (
          <span className="text-[10px] text-ink-muted ml-1">{assenza.ora_da}–{assenza.ora_a}</span>
        )}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-ink-muted">
      <span className="font-bold text-ink uppercase tracking-wide">Legenda</span>
      {(Object.keys(FASCE) as FasciaTurno[]).map((k) => (
        <div key={k} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm turni__legend-sw" style={{ '--badge-bg': FASCE[k].bg, '--badge-bd': FASCE[k].bd } as React.CSSProperties} />
          {FASCE[k].label} ({FASCE[k].range})
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm turni__legend-sw turni__legend-sw--multi" />
        Multi-struttura
      </div>
      {(Object.keys(ASSENZE) as TipoAssenza[]).map((k) => (
        <div key={k} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm turni__legend-sw" style={{ '--badge-bg': ASSENZE[k].bg, '--badge-bd': ASSENZE[k].bd } as React.CSSProperties} />
          {ASSENZE[k].label}
        </div>
      ))}
    </div>
  )
}
