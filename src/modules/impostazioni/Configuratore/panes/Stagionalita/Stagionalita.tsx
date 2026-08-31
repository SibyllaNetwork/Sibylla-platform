import React, { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CfgTable, CfgToolbar, CfgSaveBar } from '../../../../../core/cfg'
import { SelectField, RadioGroup, DateRangeField } from '../../../../../core/components/form'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore, type CfgCompletion } from '../../../../../store/useConfiguratoreStore'
import { toast } from '../../../../../core/components/Toast/useToast'
import {
  fetchStagioniCatalogo,
  useStagionalitaStore,
  periodsOverlap,
  dayIsTaken,
  periodDays,
  SEGMENTI,
  ANNO_TARIFFARIO,
  type StagioneDef,
  type PeriodoStagione,
  type SegmentoStagionalita,
} from './stagionalitaData'
import './Stagionalita.sass'

// ─── STAGIONALITÀ ─────────────────────────────────────────────────────────────
//  Configurazione dei periodi stagionali per segmento (B2B / Gruppi):
//  range picker standard "Da – A" (due calendari affiancati) + select con le
//  7 stagionalità caricate dal Pannello di Controllo. I giorni già associati
//  a un periodo sono NON selezionabili nel calendario; in basso il riepilogo
//  read-only mostra la relazione periodo ↔ stagionalità.
//
//  Il completamento sblocca Overbooking limit e i due Listini: il registry
//  risolve `requires` su un solo id ('stagionalita'), quindi 'configured'
//  scatta solo quando ENTRAMBI i segmenti hanno almeno un periodo salvato.

const PANE_ID = 'stagionalita'
const ANNO_MIN = `${ANNO_TARIFFARIO}-01-01`
const ANNO_MAX = `${ANNO_TARIFFARIO}-12-31`
const GIORNI_ANNO = 365

const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const fmtGiorno = (iso: string) => format(parseISO(iso), 'dd/MM/yyyy')
const toIso = (d: Date) => format(d, 'yyyy-MM-dd')
const dayOfYear = (iso: string) => Math.round((Date.parse(iso) - Date.parse(ANNO_MIN)) / 86400000)

function completionOf(periodi: Record<SegmentoStagionalita, PeriodoStagione[]>): CfgCompletion {
  const hasB2b = periodi.b2b.length > 0
  const hasGruppi = periodi.gruppi.length > 0
  if (hasB2b && hasGruppi) return 'configured'
  if (hasB2b || hasGruppi) return 'partial'
  return 'empty'
}

export default function Stagionalita() {
  // ── Catalogo dinamico (mock DB, mai hardcodato nella JSX)
  const [catalogo, setCatalogo] = useState<StagioneDef[]>([])
  useEffect(() => {
    let cancelled = false
    fetchStagioniCatalogo().then(list => { if (!cancelled) setCatalogo(list) })
    return () => { cancelled = true }
  }, [])
  const stagioneById = useMemo(
    () => new Map(catalogo.map(s => [s.id, s])),
    [catalogo],
  )

  // ── Stato salvato (store) e bozza di lavoro (entrambi i segmenti)
  const saved      = useStagionalitaStore(s => s.periodi)
  const setPeriodi = useStagionalitaStore(s => s.setPeriodi)
  const [draft, setDraft] = useState<Record<SegmentoStagionalita, PeriodoStagione[]>>(() => ({
    b2b:    saved.b2b.map(p => ({ ...p })),
    gruppi: saved.gruppi.map(p => ({ ...p })),
  }))

  const [segmento, setSegmento] = useState<SegmentoStagionalita>('b2b')
  const periodiSegmento = useMemo(
    () => [...draft[segmento]].sort((a, b) => a.from.localeCompare(b.from)),
    [draft, segmento],
  )

  // ── Builder: periodo Da–A + stagionalità da associare
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [stagioneId, setStagioneId] = useState('')
  const [rangeError, setRangeError] = useState('')

  // I giorni già associati a un periodo del segmento corrente non sono
  // riselezionabili: il calendario li disabilita alla fonte.
  const isDateDisabled = useMemo(() => {
    const periodi = draft[segmento]
    return (d: Date) => dayIsTaken(toIso(d), periodi)
  }, [draft, segmento])

  const aggiungiPeriodo = () => {
    if (!rangeFrom || !rangeTo || !stagioneId) return
    // Il calendario impedisce di partire da un giorno occupato, ma un range
    // può scavalcare un periodo esistente: qui il controllo di sovrapposizione.
    const overlap = draft[segmento].some(p => periodsOverlap(rangeFrom, rangeTo, p.from, p.to))
    if (overlap) {
      setRangeError('Il periodo selezionato si sovrappone a un intervallo già configurato.')
      return
    }
    setRangeError('')
    const nuovo: PeriodoStagione = {
      id: `${segmento}-${Date.now()}`,
      from: rangeFrom,
      to: rangeTo,
      stagioneId,
    }
    setDraft(d => ({ ...d, [segmento]: [...d[segmento], nuovo] }))
    setRangeFrom('')
    setRangeTo('')
    setStagioneId('')
  }

  const confirm = useConfirmStore(s => s.confirm)
  const rimuoviPeriodo = async (p: PeriodoStagione) => {
    const stagione = stagioneById.get(p.stagioneId)?.nome ?? p.stagioneId
    const ok = await confirm({
      title: 'Elimina periodo',
      message: `Eliminare il periodo ${fmtGiorno(p.from)} – ${fmtGiorno(p.to)} (${stagione})? I giorni torneranno selezionabili nel calendario.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setDraft(d => ({ ...d, [segmento]: d[segmento].filter(x => x.id !== p.id) }))
  }

  // ── Dirty state (bozza vs salvato) + save bar
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const dirtyCount = useMemo(() => {
    let count = 0
    for (const seg of ['b2b', 'gruppi'] as SegmentoStagionalita[]) {
      const savedIds = new Set(saved[seg].map(p => p.id))
      const draftIds = new Set(draft[seg].map(p => p.id))
      count += draft[seg].filter(p => !savedIds.has(p.id)).length
      count += saved[seg].filter(p => !draftIds.has(p.id)).length
    }
    return count
  }, [draft, saved])

  useEffect(() => { markDirty(PANE_ID, dirtyCount) }, [dirtyCount, markDirty])

  const salva = async () => {
    // Persistenza mock (demo senza backend): latenza simulata + store persistito.
    await new Promise(resolve => setTimeout(resolve, 450))
    setPeriodi('b2b', draft.b2b)
    setPeriodi('gruppi', draft.gruppi)
    const next = completionOf(draft)
    const prev = completionOf(saved)
    setCompletion(PANE_ID, next)
    resetDirty()
    if (next === 'configured' && prev !== 'configured') {
      toast.info('Overbooking limit, Listini individuali e Listini gruppi sono ora sbloccati.', 'Stagionalità applicata')
    }
  }

  const annulla = () => {
    setDraft({ b2b: saved.b2b.map(p => ({ ...p })), gruppi: saved.gruppi.map(p => ({ ...p })) })
    setRangeError('')
    resetDirty()
  }

  // ── Copertura per segmento (nota inline, MAI stat-card in cima)
  const giorniCoperti = periodiSegmento.reduce((acc, p) => acc + periodDays(p.from, p.to), 0)
  const segLabel = SEGMENTI.find(s => s.value === segmento)?.label ?? segmento

  return (
    <div className="stagionalita">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          value=""
          onChange={() => { /* struttura unica nel profilo demo */ }}
          options={[{ value: '', label: 'Hotel Tutorial' }]}
        />
        <SelectField
          name="anno"
          label="Anno tariffario"
          value={String(ANNO_TARIFFARIO)}
          onChange={() => { /* anno unico nel profilo demo */ }}
          options={[{ value: String(ANNO_TARIFFARIO), label: String(ANNO_TARIFFARIO) }]}
        />
        <RadioGroup
          name="segmento"
          label="Segmento"
          value={segmento}
          onChange={(v) => { setSegmento(v as SegmentoStagionalita); setRangeError('') }}
          options={SEGMENTI.map(s => ({ value: s.value, label: s.label }))}
        />
      </CfgToolbar>

      {/* ── Le 7 stagionalità dal Pannello di Controllo (elenco dinamico) ── */}
      <section className="stagionalita__catalogo" aria-label="Stagionalità disponibili">
        <div className="stagionalita__catalogo-head">
          <span className="stagionalita__catalogo-title">Stagionalità disponibili</span>
          <span className="stagionalita__catalogo-note">
            {catalogo.length > 0
              ? `${catalogo.length} stagionalità caricate dal Pannello di Controllo`
              : 'Caricamento dal Pannello di Controllo…'}
          </span>
        </div>
        <div className="stagionalita__chips">
          {catalogo.map(s => {
            const n = periodiSegmento.filter(p => p.stagioneId === s.id).length
            return (
              <span
                key={s.id}
                className="stagionalita__chip"
                /* --stag-c: colore della stagione (custom property letta dal .sass) */
                style={{ ['--stag-c' as any]: s.colore }}
              >
                <span className="stagionalita__chip-dot" aria-hidden="true" />
                {s.nome}
                {n > 0 && <span className="stagionalita__chip-count">{n}</span>}
              </span>
            )
          })}
        </div>
      </section>

      {/* ── Builder: periodo Da–A + stagionalità da associare ── */}
      <section className="stagionalita__builder" aria-label="Configura un periodo">
        <DateRangeField
          label={`Periodo (da – a) · segmento ${segLabel}`}
          nameFrom="periodo-da"
          nameTo="periodo-a"
          valueFrom={rangeFrom}
          valueTo={rangeTo}
          min={ANNO_MIN}
          max={ANNO_MAX}
          isDateDisabled={isDateDisabled}
          error={rangeError || undefined}
          hint={rangeError ? undefined : 'I giorni già associati a una stagionalità non sono selezionabili.'}
          onChange={(f, t) => {
            setRangeFrom(f ? toIso(f) : '')
            setRangeTo(t ? toIso(t) : '')
            setRangeError('')
          }}
          className="stagionalita__range"
        />
        <SelectField
          name="stagione"
          label="Stagionalità"
          value={stagioneId}
          placeholder={catalogo.length > 0 ? 'Seleziona stagionalità' : 'Caricamento…'}
          disabled={catalogo.length === 0}
          onChange={(e) => setStagioneId(e.target.value)}
          options={catalogo.map(s => ({ value: s.id, label: s.nome }))}
          className="stagionalita__stagione"
        />
        <button
          type="button"
          className="sib-btn sib-btn--primary stagionalita__add"
          disabled={!rangeFrom || !rangeTo || !stagioneId}
          onClick={aggiungiPeriodo}
        >
          <i className="fa-light fa-circle-plus" aria-hidden="true" />
          Associa periodo
        </button>
      </section>

      {/* ── Copertura annuale del segmento corrente ── */}
      <section className="stagionalita__anno" aria-label={`Copertura ${ANNO_TARIFFARIO}`}>
        <div className="stagionalita__anno-bar">
          {periodiSegmento.map(p => {
            const stagione = stagioneById.get(p.stagioneId)
            return (
              <span
                key={p.id}
                className="stagionalita__anno-seg"
                aria-label={`${stagione?.nome ?? ''} · ${fmtGiorno(p.from)} – ${fmtGiorno(p.to)}`}
                /* --seg-l / --seg-w / --stag-c: posizione e colore del periodo */
                style={{
                  ['--seg-l' as any]: `${(dayOfYear(p.from) / GIORNI_ANNO) * 100}%`,
                  ['--seg-w' as any]: `${(periodDays(p.from, p.to) / GIORNI_ANNO) * 100}%`,
                  ['--stag-c' as any]: stagione?.colore ?? 'var(--color-border)',
                }}
              />
            )
          })}
        </div>
        <div className="stagionalita__anno-mesi" aria-hidden="true">
          {MESI_BREVI.map(m => <span key={m}>{m}</span>)}
        </div>
      </section>

      {/* ── Riepilogo read-only: relazione periodo ↔ stagionalità ── */}
      <section className="stagionalita__riepilogo" aria-label="Riepilogo periodi configurati">
        <CfgTable
          columns={[
            { key: 'periodo',  label: 'Periodo',       width: '34%' },
            { key: 'giorni',   label: 'Giorni',        width: '12%', align: 'center' },
            { key: 'stagione', label: 'Stagionalità',  width: '42%' },
            { key: 'azioni',   label: '',              width: '12%', align: 'right' },
          ]}
          empty={
            <span className="stagionalita__empty">
              Nessun periodo configurato per il segmento {segLabel}: seleziona un intervallo dal calendario e associa una stagionalità.
            </span>
          }
        >
          {periodiSegmento.map(p => {
            const stagione = stagioneById.get(p.stagioneId)
            return (
              <tr key={p.id}>
                <td className="stagionalita__td-periodo">
                  {fmtGiorno(p.from)} <span className="stagionalita__sep">–</span> {fmtGiorno(p.to)}
                </td>
                <td className="stagionalita__td-giorni">{periodDays(p.from, p.to)}</td>
                <td>
                  <span
                    className="stagionalita__stag-badge"
                    /* --stag-c: colore della stagione */
                    style={{ ['--stag-c' as any]: stagione?.colore ?? 'var(--color-border)' }}
                  >
                    <span className="stagionalita__chip-dot" aria-hidden="true" />
                    {stagione?.nome ?? p.stagioneId}
                  </span>
                </td>
                <td className="stagionalita__td-azioni">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    aria-label={`Elimina periodo ${fmtGiorno(p.from)} – ${fmtGiorno(p.to)}`}
                    onClick={() => { void rimuoviPeriodo(p) }}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </CfgTable>
        <p className="stagionalita__totale">
          Segmento {segLabel}: {periodiSegmento.length === 1
            ? '1 periodo configurato'
            : `${periodiSegmento.length} periodi configurati`} · {giorniCoperti} giorni su {GIORNI_ANNO}.
          {' '}La configurazione completa di B2B e Gruppi sblocca Overbooking limit e i Listini.
        </p>
      </section>

      <CfgSaveBar
        count={dirtyCount}
        onSave={salva}
        onCancel={annulla}
        saveLabel="Salva e applica"
        successMessage="Stagionalità salvata e applicata"
      />
    </div>
  )
}
