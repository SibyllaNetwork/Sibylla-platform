import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import AlertBanner from '../../../core/components/AlertBanner'
import Modal from '../../../core/components/Modal'
import { DatePickerField, DateRangeField, InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './RegistroPresenze.sass'

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
  email?: string
  telefono?: string
  indirizzo?: string
  segmenti: SegmentoPresenza[]
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

// Reparti → icona FontAwesome (chiave = nome reparto)
const REPARTO_ICONS: Record<string, string> = {
  'Manutenzione':   'fa-wrench',
  'Pulizie':        'fa-broom',
  'Front Office':   'fa-bell-concierge',
  'Amministrazione':'fa-briefcase',
}
const repartoIcon = (rep: string): string => REPARTO_ICONS[rep] || 'fa-bell-concierge'

const COLORI_TIPO: Record<SegmentoTipo, { bg: string; border: string; label: string }> = {
  presente: { bg: '#5A8A3C26', border: '#5A8A3C', label: 'Presente' },
  pausa:    { bg: '#F5C40026', border: '#F5C400', label: 'Pausa' },
  permesso: { bg: '#5C9CD426', border: '#5C9CD4', label: 'Permesso' },
  ferie:    { bg: '#9B59B626', border: '#9B59B6', label: 'Ferie' },
  assenza:  { bg: '#FF616E26', border: '#FF616E', label: 'Assenza' },
}

const FALLBACK: DipendenteRow[] = [
  {
    id: 1, nome: 'Andrea', cognome: 'G Test', reparto: 'Front Office',
    avatar: 'https://i.pravatar.cc/40?img=12',
    email: 'andrea.gtest@hoteltutorial.it', telefono: '+39 333 1234567', indirizzo: 'Via Roma 12, 96017 Noto SR',
    segmenti: [
      { tipo: 'presente', start_min: 7 * 60,  end_min: 12 * 60 },
      { tipo: 'pausa',    start_min: 12 * 60, end_min: 13 * 60 },
      { tipo: 'presente', start_min: 13 * 60, end_min: 16 * 60 },
    ],
  },
  {
    id: 2, nome: 'Napoleone', cognome: 'Bonaparte', reparto: 'Amministrazione',
    avatar: 'https://i.pravatar.cc/40?img=33',
    email: 'n.bonaparte@hoteltutorial.it', telefono: '+39 348 7654321', indirizzo: 'Corso Vittorio Emanuele 5, 96017 Noto SR',
    segmenti: [{ tipo: 'presente', start_min: 6 * 60, end_min: 14 * 60 }],
  },
  {
    id: 3, nome: 'Francesco', cognome: 'Bufalino', reparto: 'Pulizie',
    email: 'f.bufalino@hoteltutorial.it', telefono: '+39 320 1122334', indirizzo: 'Via Cavour 30, 96100 Siracusa SR',
    segmenti: [{ tipo: 'ferie', start_min: 0, end_min: 24 * 60, note: 'Ferie programmate' }],
  },
  {
    id: 4, nome: 'Marco', cognome: 'Campo', reparto: 'Manutenzione',
    email: 'm.campo@hoteltutorial.it', telefono: '+39 366 9988776', indirizzo: 'Via Etnea 100, 95131 Catania CT',
    segmenti: [
      { tipo: 'presente', start_min: 8 * 60,  end_min: 12 * 60 },
      { tipo: 'permesso', start_min: 12 * 60, end_min: 14 * 60, note: 'Permesso personale' },
      { tipo: 'presente', start_min: 14 * 60, end_min: 17 * 60 },
    ],
  },
]

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function fmtIntestazione(d: Date): string {
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`
}

type TipoAssenza = 'ferie' | 'rol' | 'malattia' | 'straordinario'

const hhmmToMin = (s: string): number => { const [h, m] = s.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const minToHHMM = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// Inserisce un permesso (ROL) nella giornata: la presenza resta, spezzata attorno alla finestra del permesso.
function inserisciPermesso(segmenti: SegmentoPresenza[], start: number, end: number, note?: string): SegmentoPresenza[] {
  const out: SegmentoPresenza[] = []
  for (const s of segmenti) {
    if (s.tipo !== 'presente' || s.end_min <= start || s.start_min >= end) { out.push(s); continue }
    if (s.start_min < start) out.push({ tipo: 'presente', start_min: s.start_min, end_min: start })
    if (s.end_min > end)     out.push({ tipo: 'presente', start_min: end, end_min: s.end_min })
  }
  out.push({ tipo: 'permesso', start_min: start, end_min: end, note: note || 'ROL' })
  return out.sort((a, b) => a.start_min - b.start_min)
}

// Presenze del giorno (mock deterministico per dipendente+data): ogni giorno ha le sue presenze.
function segmentiGiorno(dipId: number, d: Date): SegmentoPresenza[] {
  const dow = d.getDay()
  if (dow === 0) return [{ tipo: 'assenza', start_min: 0, end_min: 24 * 60, note: 'Riposo' }]   // domenica
  const seed = (dipId * 7 + d.getDate() * 3 + d.getMonth()) % 14
  if (seed === 0) return [{ tipo: 'ferie',   start_min: 0, end_min: 24 * 60, note: 'Ferie' }]
  if (seed === 1) return [{ tipo: 'assenza', start_min: 0, end_min: 24 * 60, note: 'Malattia' }]
  const mattina = seed % 2 === 0
  const start = mattina ? 7 : 13          // turno mattina o pomeriggio
  const end   = mattina ? 16 : 22
  const base: SegmentoPresenza[] = [
    { tipo: 'presente', start_min: start * 60,            end_min: (start + 5) * 60 },
    { tipo: 'pausa',    start_min: (start + 5) * 60,      end_min: (start + 5) * 60 + 60 },
    { tipo: 'presente', start_min: (start + 5) * 60 + 60, end_min: end * 60 },
  ]
  if (seed === 4) return inserisciPermesso(base, (start + 7) * 60, (start + 8) * 60, 'ROL')   // un permesso pomeridiano
  return base
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
  const [contact, setContact] = useState<{ dip: DipendenteRow; x: number; y: number } | null>(null)
  const [saved, setSaved] = useState(false)
  // Modifiche manuali per (dipendente|giorno): sovrascrivono le presenze generate
  const [edits, setEdits] = useState<Record<string, SegmentoPresenza[]>>({})
  // Modale modifica presenza (tasto destro su una riga)
  const [editRow, setEditRow] = useState<DipendenteRow | null>(null)
  const [form, setForm] = useState({ entrata: '', uscita: '', tipo: '' as '' | TipoAssenza, dal: '', al: '', puc: '', note: '' })
  const [pucError, setPucError] = useState('')

  // Presenze del giorno selezionato per un dipendente: override manuale oppure generate deterministicamente
  const segGiorno = (d: DipendenteRow): SegmentoPresenza[] =>
    edits[`${d.id}|${dataIso}`] ?? segmentiGiorno(d.id, date)

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

  function openEdit(d: DipendenteRow) {
    const pres = segGiorno(d).filter((s) => s.tipo === 'presente')
    setForm({
      entrata: pres.length ? minToHHMM(Math.min(...pres.map((s) => s.start_min))) : '09:00',
      uscita:  pres.length ? minToHHMM(Math.max(...pres.map((s) => s.end_min)))   : '18:00',
      tipo: '', dal: dataIso, al: dataIso, puc: '', note: '',
    })
    setPucError('')
    setEditRow(d)
  }

  function handleEditSave() {
    if (!editRow) return
    if (form.tipo === 'malattia' && !/^\d{9,10}$/.test(form.puc.trim())) {
      setPucError('Il codice PUC deve avere 9–10 cifre'); return
    }
    const cur = segGiorno(editRow)
    let segmenti = cur
    if (form.tipo === 'ferie')              segmenti = [{ tipo: 'ferie',    start_min: 0, end_min: 24 * 60, note: form.note || 'Ferie' }]
    else if (form.tipo === 'malattia')      segmenti = [{ tipo: 'assenza',  start_min: 0, end_min: 24 * 60, note: `Malattia — PUC ${form.puc.trim()}` }]
    else if (form.tipo === 'rol')           segmenti = inserisciPermesso(cur, hhmmToMin(form.entrata || '09:00'), hhmmToMin(form.uscita || '13:00'), form.note || 'ROL')
    else if (form.tipo === 'straordinario') segmenti = [{ tipo: 'presente', start_min: hhmmToMin(form.entrata || '09:00'), end_min: hhmmToMin(form.uscita || '20:00'), note: 'Straordinario' }]
    else if (form.entrata && form.uscita)   segmenti = [{ tipo: 'presente', start_min: hhmmToMin(form.entrata), end_min: hhmmToMin(form.uscita) }]
    setEdits((prev) => ({ ...prev, [`${editRow.id}|${dataIso}`]: segmenti }))
    setEditRow(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 3000)
  }

  // Scarica un .xls (tabella HTML, apribile da Excel) con le presenze del giorno per il dipendente
  function exportXls(d: DipendenteRow) {
    const righe = segGiorno(d)
      .map((s) => `<tr><td>${COLORI_TIPO[s.tipo].label}</td><td>${minToHHMM(s.start_min)}</td><td>${minToHHMM(s.end_min)}</td><td>${s.note ?? ''}</td></tr>`)
      .join('')
    const html =
      `<html><head><meta charset="utf-8"></head><body>` +
      `<h3>Registro presenze — ${d.nome} ${d.cognome}</h3>` +
      `<p>Reparto: ${d.reparto} — ${fmtIntestazione(date)}</p>` +
      `<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>Stato</th><th>Dalle</th><th>Alle</th><th>Note</th></tr></thead>` +
      `<tbody>${righe}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presenze_${d.cognome}_${dataIso}.xls`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHead
        title="Registro presenze"
        subtitle="Gestione delle presenze del personale in tempo reale. Con tracciamento di ingressi, uscite, assenze, permessi e ferie"
      />

      {saved && <AlertBanner type="success">Presenza aggiornata con successo</AlertBanner>}

      <div className="flex items-end gap-3 flex-wrap mb-6">
        <DatePickerField name="data" label="Data" value={dataIso} onChange={(e) => setDate(new Date(e.target.value))} />
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)}
          options={[{ value: 'Hotel Tutorial', label: 'Hotel Tutorial' }, { value: 'Hotel Noto', label: 'Hotel Noto' }]} />
        <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value)}
          options={[{ value: 'Tutti i reparti', label: 'Tutti i reparti' }, ...reparti.map((r) => ({ value: r, label: r }))]} />
        <InputField name="ricerca" label="Cerca" placeholder="Cerca" value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="ml-auto flex items-center gap-3">
          <button className="sib-btn sib-btn--icon" title="Giorno precedente" onClick={() => nudgeDate(-1)}>
            <i className="fa-duotone fa-angles-left reg-presenze__toolbar-ico" />
          </button>
          <button className="sib-btn sib-btn--ghost" onClick={goToday}>Oggi</button>
          <button className="sib-btn sib-btn--icon" title="Giorno successivo" onClick={() => nudgeDate(1)}>
            <i className="fa-duotone fa-angles-right reg-presenze__toolbar-ico" />
          </button>
          <div className="reg-presenze__legend-pop-wrap">
            <button className="sib-btn sib-btn--icon" aria-label="Legenda">
              <i className="fa-regular fa-circle-info reg-presenze__toolbar-ico" />
            </button>
            <div className="reg-presenze__legend-pop" role="tooltip">
              <div className="reg-presenze__legend-pop-title">Legenda</div>
              <div className="reg-presenze__legend-list">
                {(Object.keys(COLORI_TIPO) as SegmentoTipo[]).map((k) => (
                  <div key={k} className="reg-presenze__legend-item">
                    <span className="reg-presenze__legend-dot" style={{ '--leg-bg': COLORI_TIPO[k].bg, '--leg-border': COLORI_TIPO[k].border } as React.CSSProperties} />
                    <span>{COLORI_TIPO[k].label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-[15px] font-bold font-poppins text-primary mb-4">
        {fmtIntestazione(date)}
      </div>

      <div className="bg-white border border-line rounded-field overflow-hidden">
        <div className="grid items-center text-[12px] font-semibold text-ink-muted bg-canvas px-4 py-2.5 reg-presenze__head-row">
          <div>Nome</div>
          <div className="text-center">Reparto</div>
          <div className="grid reg-presenze__hours-grid">
            {HOURS.map((h) => (
              <div key={h} className="text-[11px] text-center">{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>
        </div>

        {filtered.map((d) => (
          <div key={d.id}
               className="grid items-center px-4 py-3 border-t border-line reg-presenze__row"
               onContextMenu={(e) => { e.preventDefault(); openEdit(d) }}
               title="Tasto destro per modificare la presenza">
            <div className="flex items-center gap-2.5 min-w-0 reg-presenze__name">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 reg-presenze__name-id"
                   onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setContact({ dip: d, x: r.left, y: r.bottom }) }}
                   onMouseLeave={() => setContact(null)}>
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
              </div>
              <div className="reg-presenze__name-actions">
                <button className="reg-presenze__name-action" title="Esporta XLS" aria-label="Esporta XLS" onClick={() => exportXls(d)}>
                  <i className="fa-solid fa-file-excel" />
                </button>
                <button className="reg-presenze__name-action" title="Modifica" aria-label="Modifica" onClick={() => openEdit(d)}>
                  <i className="fa-solid fa-pen" />
                </button>
              </div>
            </div>

            <div className="reg-presenze__reparto" title={d.reparto} aria-label={d.reparto}>
              <i className={`fa-solid ${repartoIcon(d.reparto)} reg-presenze__reparto-ico`} />
            </div>

            <div className="relative h-9 bg-canvas rounded">
              <div className="absolute inset-0 grid pointer-events-none reg-presenze__tl-grid">
                {Array.from({ length: 96 }).map((_, i) => (
                  <div key={i} className={`border-l reg-presenze__tl-tick ${i % 4 === 0 ? 'reg-presenze__tl-tick--major' : ''}`} />
                ))}
              </div>
              {segGiorno(d).map((s, i) => {
                const left  = (s.start_min / (24 * 60)) * 100
                const width = ((s.end_min - s.start_min) / (24 * 60)) * 100
                const c = COLORI_TIPO[s.tipo]
                return (
                  <div key={i}
                       className="absolute top-1.5 bottom-1.5 rounded-sm overflow-hidden reg-presenze__segment"
                       style={{ '--seg-left': `${left}%`, '--seg-width': `${width}%`, '--seg-bg': c.bg, '--seg-border': c.border } as React.CSSProperties}
                       title={`${c.label}${s.note ? ' — ' + s.note : ''}`}>
                    <div className="text-[10px] font-semibold px-1.5 py-0.5 truncate reg-presenze__segment-label">
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

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={editRow ? `Modifica presenza — ${editRow.nome} ${editRow.cognome}` : 'Modifica presenza'}
        size="md"
      >
        {editRow && (
          <div className="presenza-edit">
            {(form.tipo === '' || form.tipo === 'rol' || form.tipo === 'straordinario') && (
              <div className="presenza-edit__section">
                <div className="presenza-edit__label">{form.tipo === 'rol' ? 'Permesso ROL — finestra di assenza' : 'Orario'}</div>
                <div className="presenza-edit__row2">
                  <DatePickerField name="entrata" label={form.tipo === 'rol' ? 'Dalle' : 'Entrata'} type="time" value={form.entrata} onChange={(e) => setForm((f) => ({ ...f, entrata: e.target.value }))} />
                  <DatePickerField name="uscita"  label={form.tipo === 'rol' ? 'Alle'  : 'Uscita'}  type="time" value={form.uscita}  onChange={(e) => setForm((f) => ({ ...f, uscita: e.target.value }))} />
                </div>
                {form.tipo === 'rol' && (
                  <p className="presenza-edit__hint">
                    <i className="fa-light fa-circle-info" aria-hidden="true" />
                    Il ROL si inserisce nella giornata di presenza: il dipendente resta presente e risulta assente solo nella finestra indicata.
                  </p>
                )}
              </div>
            )}

            <div className="presenza-edit__section">
              <div className="presenza-edit__label">Permesso / assenza</div>
              <div className="presenza-edit__cards">
                {([
                  { v: 'ferie',         icon: 'fa-sun',                 t: 'Ferie',                s: 'Uno o più giorni' },
                  { v: 'rol',           icon: 'fa-clock',               t: 'ROL',                  s: 'Permesso retribuito' },
                  { v: 'malattia',      icon: 'fa-circle-exclamation',  t: 'Assenza per malattia', s: 'Uno o più giorni' },
                  { v: 'straordinario', icon: 'fa-triangle-exclamation',t: 'Straordinario',        s: 'Permesso speciale' },
                ] as const).map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    className={`presenza-edit__card ${form.tipo === c.v ? 'presenza-edit__card--on' : ''} ${c.v === 'malattia' ? 'presenza-edit__card--malattia' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, tipo: f.tipo === c.v ? '' : c.v }))}
                  >
                    <i className={`fa-light ${c.icon} presenza-edit__card-ico`} aria-hidden="true" />
                    <span className="presenza-edit__card-t">{c.t}</span>
                    <span className="presenza-edit__card-s">{c.s}</span>
                  </button>
                ))}
              </div>
            </div>

            {(form.tipo === 'ferie' || form.tipo === 'malattia') && (
              <div className="presenza-edit__row2">
                <DateRangeField nameFrom="dal" nameTo="al" label="Periodo" valueFrom={form.dal} valueTo={form.al} onChangeFrom={(e) => setForm((f) => ({ ...f, dal: e.target.value }))} onChangeTo={(e) => setForm((f) => ({ ...f, al: e.target.value }))} />
              </div>
            )}

            {form.tipo === 'malattia' && (
              <div className="presenza-edit__section">
                <InputField
                  name="puc"
                  label="Codice PUC — Protocollo Univoco del Certificato (9–10 cifre)"
                  placeholder="Es. 1234567890"
                  value={form.puc}
                  onChange={(e) => { setForm((f) => ({ ...f, puc: e.target.value })); setPucError('') }}
                  error={pucError || undefined}
                />
                <p className="presenza-edit__hint">
                  <i className="fa-light fa-circle-info" aria-hidden="true" />
                  Il codice PUC verrà comunicato direttamente all'HR e non sarà visibile ai colleghi.
                </p>
              </div>
            )}

            <div className="presenza-edit__section">
              <InputField name="note" label="Note (opzionale)" placeholder="Aggiungi una nota…" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>

            <div className="presenza-edit__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEditRow(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={handleEditSave}>Salva modifiche</button>
            </div>
          </div>
        )}
      </Modal>

      {contact && (
        <div className="reg-presenze__contact"
             style={{ '--cx': `${contact.x}px`, '--cy': `${contact.y + 8}px` } as React.CSSProperties}
             role="tooltip">
          <div className="reg-presenze__contact-name">{contact.dip.nome} {contact.dip.cognome}</div>
          <div className="reg-presenze__contact-row"><i className="fa-light fa-envelope" aria-hidden="true"/><span>{contact.dip.email ?? '—'}</span></div>
          <div className="reg-presenze__contact-row"><i className="fa-light fa-phone" aria-hidden="true"/><span>{contact.dip.telefono ?? '—'}</span></div>
          <div className="reg-presenze__contact-row"><i className="fa-light fa-location-dot" aria-hidden="true"/><span>{contact.dip.indirizzo ?? '—'}</span></div>
        </div>
      )}

    </div>
  )
}
