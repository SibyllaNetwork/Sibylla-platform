import React, { useEffect, useMemo, useState } from 'react'
import T from '../../../core/tokens'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import { DatePickerField, InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Registro presenze — replica `Views/Impostazioni/Presenze.cshtml`.
 * Layout timeline orizzontale 24h per dipendente.
 *
 * BE Razor: `OperationController.GetPresenzeGiornaliere` → catch-all
 * `/Sibylla/operation/GetPresenzeGiornaliere`.
 */

type SegmentoTipo = 'presente' | 'assenza' | 'permesso' | 'ferie' | 'pausa'

interface SegmentoPresenza {
  tipo: SegmentoTipo
  start_min: number
  end_min: number
  note?: string
}

interface DipendenteRow {
  id: number
  nome: string
  cognome: string
  reparto: string
  reparto_codice?: string
  reparto_icon?: 'reparto' | 'concierge' | 'cuoco' | 'manutentore' | string
  avatar?: string
  segmenti: SegmentoPresenza[]
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const COLORI_TIPO: Record<SegmentoTipo, { bg: string; border: string; label: string }> = {
  presente: { bg: '#5A8A3C26', border: '#5A8A3C', label: 'Presente' },
  pausa:    { bg: '#F5C40026', border: '#F5C400', label: 'Pausa' },
  permesso: { bg: '#5C9CD426', border: '#5C9CD4', label: 'Permesso' },
  ferie:    { bg: '#9B59B626', border: '#9B59B6', label: 'Ferie' },
  assenza:  { bg: '#FF616E26', border: '#FF616E', label: 'Assenza' },
}

const FALLBACK: DipendenteRow[] = [
  {
    id: 1, nome: 'Andrea', cognome: 'G Test', reparto: 'Concierge', reparto_icon: 'concierge',
    avatar: 'https://i.pravatar.cc/40?img=12',
    segmenti: [
      { tipo: 'presente', start_min: 7 * 60,  end_min: 12 * 60 },
      { tipo: 'pausa',    start_min: 12 * 60, end_min: 13 * 60 },
      { tipo: 'presente', start_min: 13 * 60, end_min: 16 * 60 },
    ],
  },
  {
    id: 2, nome: 'Napoleone', cognome: 'Bonaparte', reparto: 'Concierge', reparto_icon: 'concierge',
    avatar: 'https://i.pravatar.cc/40?img=33',
    segmenti: [{ tipo: 'presente', start_min: 6 * 60, end_min: 14 * 60 }],
  },
  {
    id: 3, nome: 'Francesco', cognome: 'Bufalino', reparto: 'Cucina', reparto_icon: 'cuoco',
    segmenti: [{ tipo: 'ferie', start_min: 0, end_min: 24 * 60, note: 'Ferie programmate' }],
  },
]

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function fmtIntestazione(d: Date): string {
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`
}

export default function RegistroPresenze({ navigate }: { navigate: (p: string) => void }) {
  const today = new Date()
  const [date, setDate] = useState<Date>(today)
  const [struttura, setStruttura] = useState('Hotel Tutorial')
  const [reparto, setReparto] = useState('Tutti i reparti')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<DipendenteRow[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dataIso = date.toISOString().slice(0, 10)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<DipendenteRow[]>('operation/GetPresenzeGiornaliere', {
      method: 'POST',
      body: { data: dataIso, struttura, reparto: reparto === 'Tutti i reparti' ? null : reparto },
    })
      .then((d) => { if (!cancelled) { setItems(d?.length ? d : FALLBACK); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [dataIso, struttura, reparto])

  const filtered = useMemo(() => items.filter((d) => {
    const matchSearch = !search ||
      `${d.nome} ${d.cognome} ${d.reparto}`.toLowerCase().includes(search.toLowerCase())
    const matchReparto = reparto === 'Tutti i reparti' || d.reparto === reparto
    return matchSearch && matchReparto
  }), [items, search, reparto])

  const reparti = Array.from(new Set(items.map((i) => i.reparto)))

  function nudgeDate(deltaDays: number) {
    const next = new Date(date)
    next.setDate(next.getDate() + deltaDays)
    setDate(next)
  }
  function goToday() { setDate(new Date()) }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader
        title="Registro presenze"
        subtitle="Gestione delle presenze del personale in tempo reale. Con tracciamento di ingressi, uscite, assenze, permessi e ferie"
      />

      {error && loaded && (
        <AlertBanner type="warning">
          Backend non raggiungibile — mostro dati di esempio. ({error})
        </AlertBanner>
      )}

      <div className="flex items-end gap-3 flex-wrap mb-6">
        <DatePickerField name="data" label="Data" value={dataIso} onChange={(e) => setDate(new Date(e.target.value))} />
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)}
          options={[{ value: 'Hotel Tutorial', label: 'Hotel Tutorial' }, { value: 'Hotel Noto', label: 'Hotel Noto' }]} />
        <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value)}
          options={[{ value: 'Tutti i reparti', label: 'Tutti i reparti' }, ...reparti.map((r) => ({ value: r, label: r }))]} />
        <InputField name="ricerca" label="Ricerca" placeholder="Cerca" value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="ml-auto flex items-center gap-3">
          <button className="sib-btn sib-btn--icon" title="Giorno precedente" onClick={() => nudgeDate(-1)}>
            <i className="fa-duotone fa-angles-left" style={{ fontSize: 13, color: T.textActive }} />
          </button>
          <button className="sib-btn sib-btn--ghost" onClick={goToday}>Oggi</button>
          <button className="sib-btn sib-btn--icon" title="Giorno successivo" onClick={() => nudgeDate(1)}>
            <i className="fa-duotone fa-angles-right" style={{ fontSize: 13, color: T.textActive }} />
          </button>
          <button className="sib-btn sib-btn--icon" title="Legenda">
            <i className="fa-duotone fa-circle-info" style={{ fontSize: 14, color: T.blue }} />
          </button>
        </div>
      </div>

      <div className="text-center text-[15px] font-bold font-poppins text-primary mb-4">
        {fmtIntestazione(date)}
      </div>

      <div className="bg-white border border-line rounded-field overflow-hidden">
        <div className="grid items-center text-[11px] font-bold uppercase tracking-wide text-ink-muted bg-canvas px-4 py-2"
             style={{ gridTemplateColumns: '220px 60px 1fr' }}>
          <div>Nome</div>
          <div>Reparto</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
            {HOURS.map((h) => (
              <div key={h} className="text-[11px] text-center">{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>
        </div>

        {filtered.map((d) => (
          <div key={d.id}
               className="grid items-center px-4 py-3 border-t border-line"
               style={{ gridTemplateColumns: '220px 60px 1fr', minHeight: 64 }}>
            <div className="flex items-center gap-2.5 min-w-0">
              {d.avatar ? (
                <img src={d.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                  {d.nome[0]}{d.cognome[0]}
                </div>
              )}
              <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                {d.nome} {d.cognome}
              </div>
              <button className="text-ink-muted hover:text-primary" title="Esporta XLS">
                <i className="fa-duotone fa-file-excel" style={{ fontSize: 13 }} />
              </button>
              <button className="text-ink-muted hover:text-primary" title="Modifica">
                <i className="fa-duotone fa-pen" style={{ fontSize: 12 }} />
              </button>
            </div>

            <div className="text-primary" title={d.reparto}>
              <i className={`fa-duotone ${d.reparto_icon === 'cuoco' ? 'fa-utensils' : d.reparto_icon === 'manutentore' ? 'fa-screwdriver-wrench' : 'fa-bell-concierge'}`} style={{ fontSize: 18 }} />
            </div>

            <div className="relative h-9 bg-canvas rounded">
              <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: 'repeat(96, 1fr)' }}>
                {Array.from({ length: 96 }).map((_, i) => (
                  <div key={i} className="border-l" style={{ borderColor: i % 4 === 0 ? '#DBDBDB' : '#F0F0F0' }} />
                ))}
              </div>
              {d.segmenti.map((s, i) => {
                const left  = (s.start_min / (24 * 60)) * 100
                const width = ((s.end_min - s.start_min) / (24 * 60)) * 100
                const c = COLORI_TIPO[s.tipo]
                return (
                  <div key={i}
                       className="absolute top-1.5 bottom-1.5 rounded-sm overflow-hidden"
                       style={{ left: `${left}%`, width: `${width}%`, background: c.bg, borderLeft: `3px solid ${c.border}` }}
                       title={`${c.label}${s.note ? ' — ' + s.note : ''}`}>
                    <div className="text-[10px] font-semibold px-1.5 py-0.5 truncate" style={{ color: c.border }}>
                      {c.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-ink-muted text-[13px]">
            Nessun dipendente per i filtri selezionati.
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[12px] text-ink-muted">
        {(Object.keys(COLORI_TIPO) as SegmentoTipo[]).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLORI_TIPO[k].bg, borderLeft: `3px solid ${COLORI_TIPO[k].border}` }} />
            {COLORI_TIPO[k].label}
          </div>
        ))}
      </div>
    </div>
  )
}
