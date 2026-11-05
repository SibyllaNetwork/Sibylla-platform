import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import AlertBanner from '../../../core/components/AlertBanner'
import Modal from '../../../core/components/Modal'
import { DatePickerField, DateRangeField, InputField, SelectField } from '../../../core/components/form'
import VistaSwitch from '../../../core/components/VistaSwitch'
import { apiFetchSibylla } from '../../../services/api'
import './RegistroPresenze.sass'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { DIPENDENTI_PRESENZE, useGiornataPresenze, useRegistroPresenzeStore } from '../../../store/useRegistroPresenzeStore'
import { exportXls as esportaXls } from '../../hr/hrExport'
import RegistroMensile, { type AzioneGiorno, type DipendenteMese } from '../../hr/_presenze/RegistroMensile'
import ModaleTimbrature from '../../hr/_presenze/ModaleTimbrature'
import { esportaPresenzePdf, esportaRegistroXlsx } from '../../hr/_presenze/presenzeExport'
import {
  chiaveGiorno, dataDa, GIORNO_MIN, giornataStandard, hhmmToMin, inserisciPermesso, isoDi, MESI_LUNGHI, minToHHMM, repartoIcon,
  segmentiGiorno, type SegmentoPresenza, type SegmentoTipo,
} from '../../hr/_presenze/presenze.model'

/**
 * Registro presenze — replica `Views/Impostazioni/Presenze.cshtml`.
 *  - Vista giornaliera: timeline orizzontale 24h per dipendente.
 *  - Vista dettagliata: il mese intero, un riquadro per dipendente con tipo di
 *    giornata, ingresso, uscita, ore extra e totali; tasto destro su un giorno
 *    per cambiarlo, gestirne le timbrature o eliminarne l'assegnazione; Excel e
 *    PDF riepilogativi del mese.
 * Presenze e timbrature sono condivise con Timbrature e Cedolini
 * (useRegistroPresenzeStore) e incrociate con le richieste approvate in HR.
 *
 * BE Razor: `OperationController.GetPresenzeGiornaliere` → catch-all
 * `/Sibylla/operation/GetPresenzeGiornaliere`.
 */

interface DipendenteRow {
  id: number
  nome: string
  cognome: string
  reparto: string
  avatar?: string
  email?: string
  telefono?: string
  indirizzo?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const COLORI_TIPO: Record<SegmentoTipo, { bg: string; border: string; label: string }> = {
  presente: { bg: '#5A8A3C26', border: '#5A8A3C', label: 'Presente' },
  pausa:    { bg: '#F5C40026', border: '#F5C400', label: 'Pausa' },
  permesso: { bg: '#5C9CD426', border: '#5C9CD4', label: 'Permesso' },
  ferie:    { bg: '#9B59B626', border: '#9B59B6', label: 'Ferie' },
  assenza:  { bg: '#FF616E26', border: '#FF616E', label: 'Assenza' },
}

const FALLBACK: DipendenteRow[] = DIPENDENTI_PRESENZE

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MESI = MESI_LUNGHI.map((m) => m.toLowerCase())

function fmtIntestazione(d: Date): string {
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`
}

type TipoAssenza = 'ferie' | 'rol' | 'permesso' | 'malattia' | 'assente' | 'straordinario'

const CARDS: { v: TipoAssenza; icon: string; t: string; s: string }[] = [
  { v: 'ferie',         icon: 'fa-sun',                  t: 'Ferie',                s: 'Uno o più giorni' },
  { v: 'rol',           icon: 'fa-clock',                t: 'ROL',                  s: 'Permesso retribuito a ore' },
  { v: 'permesso',      icon: 'fa-hourglass-half',       t: 'Permesso',             s: 'Assenza a ore' },
  { v: 'malattia',      icon: 'fa-circle-exclamation',   t: 'Assenza per malattia', s: 'Uno o più giorni' },
  { v: 'assente',       icon: 'fa-user-slash',           t: 'Assente',              s: 'Nessuna giustifica' },
  { v: 'straordinario', icon: 'fa-triangle-exclamation', t: 'Straordinario',        s: 'Orario oltre il turno' },
]

type Vista = 'giornaliera' | 'dettagliata'
const VISTA_KEY = 'sibylla.registro-presenze.vista'
const leggiVista = (): Vista => { try { return localStorage.getItem(VISTA_KEY) === 'dettagliata' ? 'dettagliata' : 'giornaliera' } catch { return 'giornaliera' } }
const salvaVista = (v: Vista) => { try { localStorage.setItem(VISTA_KEY, v) } catch { /* preferenza non salvata */ } }

/** Giorni dell'intervallo (estremi compresi). */
function giorniTra(dal: string, al: string) {
  const out: string[] = []
  const d = dataDa(dal)
  const fine = dataDa(al < dal ? dal : al)
  while (d <= fine && out.length < 62) { out.push(isoDi(d)); d.setDate(d.getDate() + 1) }
  return out
}

export default function RegistroPresenze({ navigate }: { navigate: (p: string) => void }) {
  const [vista, setVistaState] = useState<Vista>(leggiVista)
  const [date, setDate] = useState<Date>(() => new Date())
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const [reparto, setReparto] = useState('Tutti i reparti')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<DipendenteRow[]>(FALLBACK)
  const [contact, setContact] = useState<{ dip: DipendenteRow; x: number; y: number } | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const confirm = useConfirmStore((s) => s.confirm)
  const giornata = useGiornataPresenze()
  const impostaSegmenti = useRegistroPresenzeStore((s) => s.impostaSegmenti)
  const impostaTimbrature = useRegistroPresenzeStore((s) => s.impostaTimbrature)
  const eliminaGiornata = useRegistroPresenzeStore((s) => s.eliminaGiornata)
  // Modale modifica presenza (tasto destro su una riga o su un giorno)
  const [editRow, setEditRow] = useState<{ dip: DipendenteRow; iso: string } | null>(null)
  const [form, setForm] = useState({ entrata: '', uscita: '', tipo: '' as '' | TipoAssenza, dal: '', al: '', puc: '', note: '' })
  const [pucError, setPucError] = useState('')
  // Modale timbrature del giorno
  const [timbr, setTimbr] = useState<{ dip: DipendenteRow; iso: string } | null>(null)
  const [esportando, setEsportando] = useState(false)

  const dettagliata = vista === 'dettagliata'
  const dataIso = isoDi(date)
  const anno = date.getFullYear()
  const mese = date.getMonth()

  function setVista(v: Vista) { setVistaState(v); salvaVista(v) }

  // Presenze del giorno selezionato: correzioni dell'HR, richieste approvate o turno generato
  const segGiorno = (d: DipendenteRow): SegmentoPresenza[] => giornata(d.id, dataIso).segmenti

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<DipendenteRow[]>('operation/GetPresenzeGiornaliere', {
      method: 'POST',
      body: { data: dataIso, struttura, reparto: reparto === 'Tutti i reparti' ? null : reparto },
    })
      .then((d) => { if (!cancelled) setItems(d?.length ? d : FALLBACK) })
      .catch(() => { if (!cancelled) setItems(FALLBACK) })
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
  function nudgeMese(delta: number) {
    const oggi = new Date()
    const next = new Date(anno, mese + delta, 1)
    // Tornando al mese in corso si riparte da oggi, così la vista giornaliera resta su oggi.
    setDate(next.getFullYear() === oggi.getFullYear() && next.getMonth() === oggi.getMonth() ? oggi : next)
  }
  function goToday() { setDate(new Date()) }

  function conferma(msg: string) {
    setSaved(msg)
    window.setTimeout(() => setSaved(null), 3000)
  }

  function openEdit(d: DipendenteRow, iso = dataIso, tipo: '' | TipoAssenza = '') {
    const pres = giornata(d.id, iso).segmenti.filter((s) => s.tipo === 'presente')
    setForm({
      entrata: tipo === 'rol' || tipo === 'permesso' ? '16:00' : pres.length ? minToHHMM(Math.min(...pres.map((s) => s.start_min))) : '09:00',
      uscita:  tipo === 'rol' || tipo === 'permesso' ? '18:00' : pres.length ? minToHHMM(Math.max(...pres.map((s) => s.end_min)))   : '18:00',
      tipo, dal: iso, al: iso, puc: '', note: '',
    })
    setPucError('')
    setEditRow({ dip: d, iso })
  }

  function handleEditSave() {
    if (!editRow) return
    const { dip, iso } = editRow
    if (form.tipo === 'malattia' && !/^\d{9,10}$/.test(form.puc.trim())) {
      setPucError('Il codice PUC deve avere 9–10 cifre'); return
    }
    // Ferie, malattia e assenza valgono sull'intero periodo (domeniche di riposo escluse).
    if (form.tipo === 'ferie' || form.tipo === 'malattia' || form.tipo === 'assente') {
      const seg: SegmentoPresenza = form.tipo === 'ferie'
        ? { tipo: 'ferie', start_min: 0, end_min: GIORNO_MIN, note: form.note || 'Ferie' }
        : form.tipo === 'malattia'
          ? { tipo: 'assenza', start_min: 0, end_min: GIORNO_MIN, note: `Malattia — PUC ${form.puc.trim()}` }
          : { tipo: 'assenza', start_min: 0, end_min: GIORNO_MIN, note: form.note }
      const giorni = giorniTra(form.dal || iso, form.al || form.dal || iso).filter((g) => dataDa(g).getDay() !== 0)
      giorni.forEach((g) => impostaSegmenti(chiaveGiorno(dip.id, g), [seg]))
      setEditRow(null)
      conferma(giorni.length > 1 ? `Presenza aggiornata su ${giorni.length} giorni` : 'Presenza aggiornata con successo')
      return
    }
    const cur = giornata(dip.id, iso).segmenti
    const presenza = cur.some((s) => s.tipo === 'presente') ? cur : segmentiGiorno(dip.id, dataDa(iso)).filter((s) => s.tipo !== 'assenza')
    let segmenti = cur
    if (form.tipo === 'rol' || form.tipo === 'permesso') {
      const nota = form.tipo === 'rol' ? 'ROL' : 'Permesso'
      segmenti = inserisciPermesso(presenza.length ? presenza : giornataStandard(), hhmmToMin(form.entrata || '16:00'), hhmmToMin(form.uscita || '18:00'), form.note ? `${nota} — ${form.note}` : nota)
    } else if (form.tipo === 'straordinario') {
      segmenti = [{ tipo: 'presente', start_min: hhmmToMin(form.entrata || '09:00'), end_min: hhmmToMin(form.uscita || '20:00'), note: 'Straordinario' }]
    } else if (form.entrata && form.uscita) {
      segmenti = [{ tipo: 'presente', start_min: hhmmToMin(form.entrata), end_min: hhmmToMin(form.uscita) }]
    }
    impostaSegmenti(chiaveGiorno(dip.id, iso), segmenti)
    setEditRow(null)
    conferma('Presenza aggiornata con successo')
  }

  async function azioneGiorno(dip: DipendenteMese, iso: string, azione: AzioneGiorno) {
    const row = items.find((x) => x.id === dip.id) ?? dip
    const k = chiaveGiorno(dip.id, iso)
    if (azione === 'presente') { impostaSegmenti(k, giornataStandard()); conferma('Giornata impostata come presente, 09:00–18:00') }
    else if (azione === 'ferie') { impostaSegmenti(k, [{ tipo: 'ferie', start_min: 0, end_min: GIORNO_MIN, note: 'Ferie' }]); conferma('Giornata impostata come ferie') }
    else if (azione === 'assente') { impostaSegmenti(k, [{ tipo: 'assenza', start_min: 0, end_min: GIORNO_MIN }]); conferma('Giornata impostata come assenza ingiustificata') }
    else if (azione === 'rol' || azione === 'permesso' || azione === 'malattia') openEdit(row, iso, azione)
    else if (azione === 'modifica') openEdit(row, iso)
    else if (azione === 'timbrature') setTimbr({ dip: row, iso })
    else if (azione === 'elimina') {
      const [y, m, g] = iso.split('-').map(Number)
      const ok = await confirm({
        title: 'Elimina assegnazione',
        message: `Eliminare presenze, assenze e timbrature di ${dip.nome} ${dip.cognome} del ${g} ${MESI[m - 1]} ${y}? La giornata resterà vuota.`,
        confirmLabel: 'Elimina',
        danger: true,
      })
      if (ok) { eliminaGiornata(k); conferma('Assegnazione eliminata') }
    }
  }

  // Excel delle presenze del giorno per il dipendente (vista giornaliera)
  function exportXls(d: DipendenteRow) {
    esportaXls(`presenze_${d.cognome}_${dataIso}`, ['Stato', 'Dalle', 'Alle', 'Note'],
      segGiorno(d).map((s) => [COLORI_TIPO[s.tipo].label, minToHHMM(s.start_min), minToHHMM(s.end_min), s.note ?? '']))
  }

  const opzioniExport = () => ({ dipendenti: filtered, anno, mese, giornata, struttura })
  async function scaricaPdf() {
    setEsportando(true)
    try { await esportaPresenzePdf(opzioniExport()) } finally { setEsportando(false) }
  }

  const selettoreVista = (
    <VistaSwitch ariaLabel="Vista del registro" value={vista} onChange={setVista} options={[
      { value: 'giornaliera', label: 'Giornaliera', icon: 'fa-chart-gantt' },
      { value: 'dettagliata', label: 'Dettagliata', icon: 'fa-calendar-days' },
    ]} />
  )

  const timbrGiornata = timbr ? giornata(timbr.dip.id, timbr.iso) : null
  const fmtGiorno = (iso: string) => fmtIntestazione(dataDa(iso))

  return (
    <div>
      <PageHead
        title="Registro presenze"
        subtitle="Gestione delle presenze del personale in tempo reale. Con tracciamento di ingressi, uscite, assenze, permessi e ferie"
      />

      {saved && <AlertBanner type="success">{saved}</AlertBanner>}

      <div className="flex items-end gap-3 flex-wrap mb-6">
        {!dettagliata && <DatePickerField name="data" label="Data" value={dataIso} onChange={(e) => e.target.value && setDate(dataDa(e.target.value))} />}
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)}
          options={opzioniStrutture} />
        <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value)}
          options={[{ value: 'Tutti i reparti', label: 'Tutti i reparti' }, ...reparti.map((r) => ({ value: r, label: r }))]} />
        <InputField name="ricerca" label="Cerca" placeholder="Cerca dipendente" value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="ml-auto flex items-center gap-3">
          <button className="sib-btn sib-btn--icon" title={dettagliata ? 'Mese precedente' : 'Giorno precedente'} onClick={() => (dettagliata ? nudgeMese(-1) : nudgeDate(-1))}>
            <i className="fa-duotone fa-angles-left reg-presenze__toolbar-ico" />
          </button>
          <button className="sib-btn sib-btn--ghost" onClick={goToday}>Oggi</button>
          <button className="sib-btn sib-btn--icon" title={dettagliata ? 'Mese successivo' : 'Giorno successivo'} onClick={() => (dettagliata ? nudgeMese(1) : nudgeDate(1))}>
            <i className="fa-duotone fa-angles-right reg-presenze__toolbar-ico" />
          </button>
          {dettagliata ? (
            <>
              <button className="sib-btn sib-btn--secondary reg-presenze__export" onClick={() => esportaRegistroXlsx(opzioniExport())} disabled={!filtered.length}>
                <i className="fa-regular fa-file-xls" aria-hidden="true" />Registro Excel
              </button>
              <button className="sib-btn sib-btn--secondary reg-presenze__export" onClick={scaricaPdf} disabled={!filtered.length || esportando}>
                <i className={`fa-regular ${esportando ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} aria-hidden="true" />PDF
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>

      <div className="text-center text-[15px] font-bold font-poppins text-primary mb-4">
        {dettagliata ? `${MESI_LUNGHI[mese]} ${anno}` : fmtIntestazione(date)}
      </div>

      {dettagliata && (
        <RegistroMensile dipendenti={filtered} anno={anno} mese={mese} giornata={giornata} repartoIcon={repartoIcon} onAzione={azioneGiorno} legendaExtra={selettoreVista} />
      )}

      {!dettagliata && <div className="reg-presenze__vista-row">{selettoreVista}</div>}

      {!dettagliata && (
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
                  <i className="fa-solid fa-file-xls" />
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
      )}

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={editRow ? `Modifica presenza — ${editRow.dip.nome} ${editRow.dip.cognome}` : 'Modifica presenza'}
        size="md"
      >
        {editRow && (
          <div className="presenza-edit">
            <p className="presenza-edit__giorno">{fmtGiorno(editRow.iso)}</p>
            {(form.tipo === '' || form.tipo === 'rol' || form.tipo === 'permesso' || form.tipo === 'straordinario') && (
              <div className="presenza-edit__section">
                <div className="presenza-edit__label">{form.tipo === 'rol' ? 'Permesso ROL — finestra di assenza' : form.tipo === 'permesso' ? 'Permesso — finestra di assenza' : 'Orario'}</div>
                <div className="presenza-edit__row2">
                  <DatePickerField name="entrata" label={form.tipo === 'rol' || form.tipo === 'permesso' ? 'Dalle' : 'Entrata'} type="time" value={form.entrata} onChange={(e) => setForm((f) => ({ ...f, entrata: e.target.value }))} />
                  <DatePickerField name="uscita"  label={form.tipo === 'rol' || form.tipo === 'permesso' ? 'Alle'  : 'Uscita'}  type="time" value={form.uscita}  onChange={(e) => setForm((f) => ({ ...f, uscita: e.target.value }))} />
                </div>
                {(form.tipo === 'rol' || form.tipo === 'permesso') && (
                  <p className="presenza-edit__hint">
                    <i className="fa-light fa-circle-info" aria-hidden="true" />
                    {form.tipo === 'rol' ? 'Il ROL' : 'Il permesso'} si inserisce nella giornata di presenza: il dipendente resta presente e risulta assente solo nella finestra indicata.
                  </p>
                )}
              </div>
            )}

            <div className="presenza-edit__section">
              <div className="presenza-edit__label">Permesso / assenza</div>
              <div className="presenza-edit__cards">
                {CARDS.map((c) => (
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

            {(form.tipo === 'ferie' || form.tipo === 'malattia' || form.tipo === 'assente') && (
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

      {timbr && timbrGiornata && (
        <ModaleTimbrature
          open
          titolo={`Timbrature di ${timbr.dip.nome} ${timbr.dip.cognome}`}
          sottotitolo={fmtGiorno(timbr.iso)}
          timbrature={timbrGiornata.timbrature}
          onChange={(lista) => impostaTimbrature(chiaveGiorno(timbr.dip.id, timbr.iso), lista)}
          onClose={() => setTimbr(null)}
        />
      )}

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
