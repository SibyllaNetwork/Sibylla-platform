import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, ToggleSwitch } from '../../../../../core/components/form'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import Tooltip from '../../../../../core/components/Tooltip'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './LottiMapping.sass'

// ─── LOTTI MAPPING (§4.15) — rifatto da zero ──────────────────────────────────
//  Lotti e contingenti in DUE AREE distinte:
//   • GRUPPI — configurazione per aggregazione: tabella editabile
//     Nome camera · Tipologia (es. «Base doppia | Superior») · N. camere ·
//     Stato · Richiesta di consulenza;
//   • B2B — attivazione delle tipologie camera via MULTISELECT («Tipologia
//     camere», una o più tipologie insieme) con le stesse colonne.
//  Campanella: con lo stato ATTIVO è grigia e non cliccabile; disattivando lo
//  stato diventa blu con un'animazione in movimento (rispetta prefers-reduced-
//  motion); al tap l'animazione si ferma e una conferma chiede l'invio della
//  richiesta di consulenza via e-mail al commerciale Sibylla.
//  A destra il RECAP della configurazione (dagli schizzi del PDF).

const PANE_ID = 'lotti-mapping'
const EMAIL_COMMERCIALE = 'commerciale@sibyllanetwork.com'

type Consulenza = 'idle' | 'ferma' | 'inviata'

interface RigaGruppi {
  id: number
  nome: string
  tipologia: string
  camere: number
  attivo: boolean
  consulenza: Consulenza
}

interface RigaB2B {
  tipologia: string
  camere: number
  attivo: boolean
  consulenza: Consulenza
}

interface Struttura { Id: number; nome: string }

interface Data {
  Strutture: Struttura[]
  StrutturaId: number | null
  tipologie: string[]
  gruppi: RigaGruppi[]
  b2b: RigaB2B[]
}

// Aggregazioni «base | tipologia» selezionabili nell'area Gruppi
const TIPOLOGIE_AGGREGATE = [
  'Base doppia | Superior',
  'Base doppia | Classic',
  'Base doppia | Executive',
  'Base multipla | Superior',
  'Base multipla | Classic',
  'Mista | Superior',
  'Mista | Classic',
]

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  tipologie: ['Superior', 'Classic', 'Executive', 'Junior suite', 'Suite'],
  gruppi: [
    { id: 1, nome: 'Vista mare',    tipologia: 'Base doppia | Superior',   camere: 25, attivo: true,  consulenza: 'idle' },
    { id: 2, nome: 'Vista giardino', tipologia: 'Base doppia | Classic',   camere: 25, attivo: true,  consulenza: 'idle' },
    { id: 3, nome: 'Family',        tipologia: 'Base multipla | Classic',  camere: 13, attivo: true,  consulenza: 'idle' },
    { id: 4, nome: 'Panoramica',    tipologia: 'Mista | Superior',         camere: 13, attivo: false, consulenza: 'idle' },
  ],
  b2b: [
    { tipologia: 'Superior', camere: 12, attivo: true, consulenza: 'idle' },
    { tipologia: 'Classic',  camere: 18, attivo: true, consulenza: 'idle' },
  ],
}

interface Snapshot { gruppi: RigaGruppi[]; b2b: RigaB2B[] }

function countChanges(saved: Snapshot, draft: Snapshot): number {
  let n = Math.abs(saved.gruppi.length - draft.gruppi.length)
    + Math.abs(saved.b2b.length - draft.b2b.length)
  const lg = Math.min(saved.gruppi.length, draft.gruppi.length)
  for (let i = 0; i < lg; i++) {
    const a = saved.gruppi[i]; const b = draft.gruppi[i]
    if (a.nome !== b.nome || a.tipologia !== b.tipologia || a.camere !== b.camere || a.attivo !== b.attivo) n++
  }
  const lb = Math.min(saved.b2b.length, draft.b2b.length)
  for (let i = 0; i < lb; i++) {
    const a = saved.b2b[i]; const b = draft.b2b[i]
    if (a.tipologia !== b.tipologia || a.camere !== b.camere || a.attivo !== b.attivo) n++
  }
  return n
}

export default function LottiMapping() {
  const confirm       = useConfirmStore(s => s.confirm)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture]     = useState<Struttura[]>([])
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [tipologie, setTipologie]     = useState<string[]>(FALLBACK.tipologie)

  const initialSnap: Snapshot = { gruppi: FALLBACK.gruppi, b2b: FALLBACK.b2b }
  const [saved, setSaved] = useState<Snapshot>(initialSnap)
  const [draft, setDraft] = useState<Snapshot>(initialSnap)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetLottiMapping', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.gruppi)) return
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        if (Array.isArray(d.tipologie) && d.tipologie.length > 0) setTipologie(d.tipologie)
        const snap: Snapshot = { gruppi: d.gruppi, b2b: d.b2b ?? [] }
        setSaved(snap)
        setDraft(snap)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, draft), [saved, draft])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  // ── Gruppi ────────────────────────────────────────────────────────────────
  const updateGruppo = (id: number, patch: Partial<RigaGruppi>) =>
    setDraft(d => ({ ...d, gruppi: d.gruppi.map(r => r.id === id ? { ...r, ...patch } : r) }))

  // ── B2B: attivazione tipologie via multiselect ────────────────────────────
  const b2bSelezione = draft.b2b.map(r => r.tipologia)
  const setB2bSelezione = (next: string[]) =>
    setDraft(d => ({
      ...d,
      b2b: next.map(t =>
        d.b2b.find(r => r.tipologia === t)
        ?? { tipologia: t, camere: 10, attivo: true, consulenza: 'idle' as Consulenza },
      ),
    }))

  const updateB2b = (tipologia: string, patch: Partial<RigaB2B>) =>
    setDraft(d => ({ ...d, b2b: d.b2b.map(r => r.tipologia === tipologia ? { ...r, ...patch } : r) }))

  // ── Richiesta di consulenza (campanella) ──────────────────────────────────
  const richiediConsulenza = async (
    label: string,
    setConsulenza: (value: Consulenza) => void,
  ) => {
    // Al tap l'animazione si ferma...
    setConsulenza('ferma')
    // ...e il sistema chiede conferma dell'invio via e-mail
    const ok = await confirm({
      title: 'Richiesta di consulenza',
      message: `Inviare la richiesta di consulenza per «${label}» via e-mail al commerciale Sibylla (${EMAIL_COMMERCIALE})?`,
      confirmLabel: 'Invia richiesta',
      cancelLabel: 'Annulla',
    })
    if (ok) {
      setConsulenza('inviata')
      toast.success(`Richiesta di consulenza inviata a ${EMAIL_COMMERCIALE}`)
    }
  }

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetLottiMapping', {
        method: 'POST',
        body: { StrutturaId: strutturaId, ...draft },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[LottiMapping] persistenza remota non disponibile:', err)
    }
    setSaved(draft)
    setCompletion(PANE_ID, draft.gruppi.length > 0 || draft.b2b.length > 0 ? 'configured' : 'empty')
    resetDirty()
  }

  // ── Recap laterale ─────────────────────────────────────────────────────────
  const recap = useMemo(() => {
    const gAttive = draft.gruppi.filter(r => r.attivo)
    const bAttive = draft.b2b.filter(r => r.attivo)
    return {
      gruppiAttive: gAttive.length,
      gruppiTotali: draft.gruppi.length,
      gruppiCamere: gAttive.reduce((sum, r) => sum + r.camere, 0),
      b2bAttive: bAttive.length,
      b2bTotali: draft.b2b.length,
      b2bCamere: bAttive.reduce((sum, r) => sum + r.camere, 0),
      consulenze: [...draft.gruppi, ...draft.b2b].filter(r => r.consulenza === 'inviata').length,
    }
  }, [draft])

  return (
    <div className="lotti-mapping">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="lotti-mapping__field"
          value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
      </CfgToolbar>

      <div className="lotti-mapping__layout">
        <div className="lotti-mapping__main">
          {/* ── Area GRUPPI ─────────────────────────────────────────────────── */}
          <section className="lotti-mapping__area" aria-labelledby="lotti-gruppi-title">
            <header className="lotti-mapping__area-head">
              <h3 id="lotti-gruppi-title" className="lotti-mapping__area-title">
                <i className="fa-light fa-users" aria-hidden="true" /> Gruppi
              </h3>
              <p className="lotti-mapping__area-desc">
                Configurazione per aggregazione: associa a ogni camera la tipologia e il contingente.
              </p>
            </header>

            <CfgTable
              columns={[
                { key: 'nome',       label: 'Nome camera',      width: '22%' },
                { key: 'tipologia',  label: 'Tipologia',        width: '28%' },
                { key: 'camere',     label: 'Numero di camere', width: '18%', align: 'right' },
                { key: 'stato',      label: 'Stato',            width: '16%' },
                { key: 'consulenza', label: 'Consulenza',       width: '16%', align: 'center' },
              ]}
              empty={<span>Nessuna camera configurata per i Gruppi</span>}
            >
              {draft.gruppi.map((r) => (
                <tr key={r.id} className={clsx(!r.attivo && 'lotti-mapping__row--off')}>
                  <td>
                    <InputField
                      name={`gruppi-nome-${r.id}`}
                      value={r.nome}
                      onChange={(e) => updateGruppo(r.id, { nome: e.target.value })}
                      className="lotti-mapping__nome-input"
                    />
                  </td>
                  <td>
                    <SelectField
                      name={`gruppi-tipologia-${r.id}`}
                      value={r.tipologia}
                      onChange={(e) => updateGruppo(r.id, { tipologia: e.target.value })}
                      options={TIPOLOGIE_AGGREGATE.map(t => ({ value: t, label: t }))}
                      className="lotti-mapping__tipologia-select"
                    />
                  </td>
                  <td className="lotti-mapping__td-num">
                    <InputField
                      name={`gruppi-camere-${r.id}`}
                      type="number"
                      min={0}
                      value={r.camere}
                      disabled={!r.attivo}
                      onChange={(e) => updateGruppo(r.id, { camere: Number(e.target.value) || 0 })}
                      className="lotti-mapping__num-input"
                    />
                  </td>
                  <td>
                    <ToggleSwitch
                      checked={r.attivo}
                      label={r.attivo ? 'Attivo' : 'Disattivo'}
                      onChange={(checked) => updateGruppo(r.id, { attivo: checked, consulenza: 'idle' })}
                      className="lotti-mapping__toggle"
                    />
                  </td>
                  <td className="lotti-mapping__td-center">
                    <ConsulenzaBell
                      attivo={r.attivo}
                      consulenza={r.consulenza}
                      label={r.nome}
                      onRequest={() => richiediConsulenza(r.nome, (v) => updateGruppo(r.id, { consulenza: v }))}
                    />
                  </td>
                </tr>
              ))}
            </CfgTable>
          </section>

          {/* ── Area B2B ─────────────────────────────────────────────────────── */}
          <section className="lotti-mapping__area" aria-labelledby="lotti-b2b-title">
            <header className="lotti-mapping__area-head">
              <h3 id="lotti-b2b-title" className="lotti-mapping__area-title">
                <i className="fa-light fa-handshake" aria-hidden="true" /> B2B
              </h3>
              <p className="lotti-mapping__area-desc">
                Attiva le tipologie camera da esporre sul canale B2B: puoi selezionarne una o più insieme.
              </p>
            </header>

            <div className="lotti-mapping__b2b-select">
              <TipologieMultiSelect
                label="Tipologia camere"
                options={tipologie}
                value={b2bSelezione}
                onChange={setB2bSelezione}
              />
            </div>

            <CfgTable
              columns={[
                { key: 'tipologia',  label: 'Tipologia',        width: '46%' },
                { key: 'camere',     label: 'Numero di camere', width: '20%', align: 'right' },
                { key: 'stato',      label: 'Stato',            width: '20%' },
                { key: 'consulenza', label: 'Consulenza',       width: '14%', align: 'center' },
              ]}
              empty={<span>Nessuna tipologia attivata: selezionale dal campo «Tipologia camere»</span>}
            >
              {draft.b2b.map((r) => (
                <tr key={r.tipologia} className={clsx(!r.attivo && 'lotti-mapping__row--off')}>
                  <td className="lotti-mapping__td-name">{r.tipologia}</td>
                  <td className="lotti-mapping__td-num">
                    <InputField
                      name={`b2b-camere-${r.tipologia}`}
                      type="number"
                      min={0}
                      value={r.camere}
                      disabled={!r.attivo}
                      onChange={(e) => updateB2b(r.tipologia, { camere: Number(e.target.value) || 0 })}
                      className="lotti-mapping__num-input"
                    />
                  </td>
                  <td>
                    <ToggleSwitch
                      checked={r.attivo}
                      label={r.attivo ? 'Attivo' : 'Disattivo'}
                      onChange={(checked) => updateB2b(r.tipologia, { attivo: checked, consulenza: 'idle' })}
                      className="lotti-mapping__toggle"
                    />
                  </td>
                  <td className="lotti-mapping__td-center">
                    <ConsulenzaBell
                      attivo={r.attivo}
                      consulenza={r.consulenza}
                      label={r.tipologia}
                      onRequest={() => richiediConsulenza(r.tipologia, (v) => updateB2b(r.tipologia, { consulenza: v }))}
                    />
                  </td>
                </tr>
              ))}
            </CfgTable>
          </section>
        </div>

        {/* ── Recap laterale (dagli schizzi del PDF) ─────────────────────────── */}
        <aside className="lotti-mapping__recap" aria-label="Riepilogo configurazione">
          <h4 className="lotti-mapping__recap-title">
            <i className="fa-light fa-clipboard-list" aria-hidden="true" /> Riepilogo
          </h4>

          <div className="lotti-mapping__recap-section">
            <div className="lotti-mapping__recap-label">Gruppi</div>
            <dl className="lotti-mapping__recap-rows">
              <div className="lotti-mapping__recap-row">
                <dt>Camere attive</dt>
                <dd>{recap.gruppiAttive} di {recap.gruppiTotali}</dd>
              </div>
              <div className="lotti-mapping__recap-row">
                <dt>Contingente</dt>
                <dd>{recap.gruppiCamere} camere</dd>
              </div>
            </dl>
          </div>

          <div className="lotti-mapping__recap-section">
            <div className="lotti-mapping__recap-label">B2B</div>
            <dl className="lotti-mapping__recap-rows">
              <div className="lotti-mapping__recap-row">
                <dt>Tipologie attive</dt>
                <dd>{recap.b2bAttive} di {recap.b2bTotali}</dd>
              </div>
              <div className="lotti-mapping__recap-row">
                <dt>Contingente</dt>
                <dd>{recap.b2bCamere} camere</dd>
              </div>
            </dl>
          </div>

          <div className="lotti-mapping__recap-foot">
            <i className="fa-light fa-bell" aria-hidden="true" />
            {recap.consulenze === 0
              ? 'Nessuna richiesta di consulenza inviata'
              : recap.consulenze === 1
                ? '1 richiesta di consulenza inviata'
                : `${recap.consulenze} richieste di consulenza inviate`}
          </div>
        </aside>
      </div>

      <CfgSaveBar
        className="lotti-mapping__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setDraft(saved)}
        successMessage="Lotti mapping salvato"
      />
    </div>
  )
}

// ─── Campanella «Richiesta di consulenza» ─────────────────────────────────────
//  Stato ATTIVO → grigia, non cliccabile. Stato DISATTIVO → blu e interattiva,
//  con animazione in movimento (spenta con prefers-reduced-motion); al tap
//  l'animazione si ferma e parte la conferma di invio. Dopo l'invio la
//  campanella resta verde a conferma della richiesta.

function ConsulenzaBell({ attivo, consulenza, label, onRequest }: {
  attivo: boolean
  consulenza: Consulenza
  label: string
  onRequest: () => void
}) {
  if (attivo) {
    return (
      <Tooltip text="Disponibile disattivando lo stato della riga" variant="dark">
        <button
          type="button"
          className="lotti-mapping__bell lotti-mapping__bell--disabled"
          disabled
          aria-label={`Richiesta di consulenza per ${label} non disponibile`}
        >
          <i className="fa-solid fa-bell" aria-hidden="true" />
        </button>
      </Tooltip>
    )
  }

  if (consulenza === 'inviata') {
    return (
      <Tooltip text={`Richiesta inviata a ${EMAIL_COMMERCIALE}`} variant="dark">
        <button
          type="button"
          className="lotti-mapping__bell lotti-mapping__bell--sent"
          disabled
          aria-label={`Richiesta di consulenza per ${label} già inviata`}
        >
          <i className="fa-solid fa-bell-on" aria-hidden="true" />
        </button>
      </Tooltip>
    )
  }

  return (
    <Tooltip text="Richiedi una consulenza al commerciale Sibylla" variant="dark">
      <button
        type="button"
        className={clsx(
          'lotti-mapping__bell lotti-mapping__bell--active',
          consulenza === 'idle' && 'lotti-mapping__bell--ringing',
        )}
        onClick={onRequest}
        aria-label={`Richiedi una consulenza per ${label}`}
      >
        <i className="fa-solid fa-bell" aria-hidden="true" />
      </button>
    </Tooltip>
  )
}

// ─── Multiselect «Tipologia camere» ───────────────────────────────────────────
//  Selezione di una o più tipologie insieme, sul precedente del
//  NazionalitaMultiSelect (trigger con riepilogo + dropdown con checkbox).

function TipologieMultiSelect({ label, options, value, onChange }: {
  label: string
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t])

  return (
    <div className="lotti-multiselect" ref={wrapRef}>
      <span className="lotti-multiselect__label">{label}</span>
      <button
        type="button"
        className={clsx('lotti-multiselect__trigger', open && 'is-open')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {value.length === 0
          ? <span className="lotti-multiselect__ph">Seleziona tipologie</span>
          : (
            <span className="lotti-multiselect__summary">
              {value.length === 1 ? value[0] : `${value.length} tipologie selezionate`}
            </span>
          )}
        <i className="fa-solid fa-chevron-down lotti-multiselect__chev" aria-hidden="true" />
      </button>

      {open && (
        <div className="lotti-multiselect__pop" role="listbox" aria-label={label} aria-multiselectable="true">
          {options.map((t) => (
            <label key={t} className="lotti-multiselect__option" role="option" aria-selected={value.includes(t)}>
              <input
                type="checkbox"
                className="sib-checkbox"
                checked={value.includes(t)}
                onChange={() => toggle(t)}
              />
              <span>{t}</span>
            </label>
          ))}
          <div className="lotti-multiselect__quick">
            <button type="button" onClick={() => onChange(options)}>Tutte</button>
            <button type="button" onClick={() => onChange([])}>Nessuna</button>
          </div>
        </div>
      )}
    </div>
  )
}
