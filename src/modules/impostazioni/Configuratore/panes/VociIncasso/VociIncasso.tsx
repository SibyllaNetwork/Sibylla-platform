import React, { useEffect, useRef, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgTable, CfgSaveBar, type CfgColumn } from '../../../../../core/cfg'
import { InputField, SelectField, ToggleSwitch } from '../../../../../core/components/form'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { toast } from '../../../../../core/components/Toast/useToast'
import './VociIncasso.sass'

/**
 * Voci incasso (Configuratore) — due entità distinte, ciascuna con la sua
 * sezione (form + tabella):
 *  1. Voci d'incasso — codici incasso con gruppo, commissioni, codici FEL/SCEL
 *     e Gateway di pagamento associato; toggle attivo, modifica ed elimina.
 *  2. Scadenze Sospesi — scadenze di pagamento dei sospesi (giorni + fine mese).
 *
 * NB: le opzioni del campo Gateway sono modellate qui in locale; quando il
 * configuratore `gateway` esporrà i gateway configurati andranno lette da lì.
 */

interface Voce {
  id: number
  codice: string
  descrizione: string
  gruppo: string
  commissioni: number
  codFel: string
  codScel: string
  gateway: string
  attiva: boolean
}

interface Scadenza {
  id: number
  descrizione: string
  giorni: number
  fineMese: boolean
}

// ─── Opzioni (mock locali in attesa del backend / configuratore gateway) ──────

const GRUPPI      = ['Contanti', 'Carte', 'Bonifici', 'Sospesi', 'Altro']
const CODICI_FEL  = ['MP01', 'MP02', 'MP03', 'MP05', 'MP08', 'MP12']

const GATEWAY_OPTIONS = [
  { value: '',       label: 'Nessun gateway' },
  { value: 'nexy',   label: 'Nexy' },
  { value: 'axerve', label: 'Axerve' },
  { value: 'stripe', label: 'Stripe' },
]
const gatewayLabel = (v: string) => GATEWAY_OPTIONS.find((g) => g.value === v)?.label ?? v

// ─── Dati di esempio (fallback senza backend) ─────────────────────────────────

const VOCI_FALLBACK: Voce[] = [
  { id: 1, codice: 'CONT', descrizione: 'Contanti',            gruppo: 'Contanti', commissioni: 0,   codFel: 'MP01', codScel: '01', gateway: '',     attiva: true },
  { id: 2, codice: 'CC',   descrizione: 'Carta di credito',    gruppo: 'Carte',    commissioni: 1.5, codFel: 'MP08', codScel: '02', gateway: 'nexy', attiva: true },
  { id: 3, codice: 'BON',  descrizione: 'Bonifico bancario',   gruppo: 'Bonifici', commissioni: 0,   codFel: 'MP05', codScel: '03', gateway: '',     attiva: true },
  { id: 4, codice: 'SOSP', descrizione: 'Sospeso ditta',       gruppo: 'Sospesi',  commissioni: 0,   codFel: 'MP02', codScel: '04', gateway: '',     attiva: false },
]

const SCADENZE_FALLBACK: Scadenza[] = [
  { id: 1, descrizione: '30 giorni data fattura', giorni: 30, fineMese: false },
  { id: 2, descrizione: '60 giorni fine mese',    giorni: 60, fineMese: true },
]

const EMPTY_VOCE: Omit<Voce, 'id' | 'attiva'> = {
  codice: '', descrizione: '', gruppo: '', commissioni: 0, codFel: '', codScel: '', gateway: '',
}
const EMPTY_SCAD: Omit<Scadenza, 'id'> = { descrizione: '', giorni: 0, fineMese: false }

const fmtComm = (n: number) => `${String(n).replace('.', ',')}%`

// ─── Colonne (colgroup in %: mai scroll orizzontale) ──────────────────────────

const COLS_VOCI: CfgColumn[] = [
  { key: 'attiva', label: 'Attiva',      width: '7%',  align: 'center' },
  { key: 'codice', label: 'Codice',      width: '10%' },
  { key: 'descr',  label: 'Descrizione', width: '21%' },
  { key: 'gruppo', label: 'Gruppo',      width: '12%' },
  { key: 'comm',   label: <TruncatedText text="Comm. (%)" full="Commissioni (%)" />, width: '10%', align: 'right' },
  { key: 'gw',     label: 'Gateway',     width: '11%' },
  { key: 'fel',    label: 'Cod. Fel',    width: '9%'  },
  { key: 'scel',   label: 'Cod. Scel',   width: '9%'  },
  { key: 'azioni', label: 'Azioni',      width: '11%', align: 'center' },
]

const COLS_SCADENZE: CfgColumn[] = [
  { key: 'descr',    label: 'Descrizione', width: '48%' },
  { key: 'giorni',   label: 'Giorni',      width: '14%', align: 'center' },
  { key: 'fineMese', label: 'Fine mese',   width: '18%', align: 'center' },
  { key: 'azioni',   label: 'Azioni',      width: '20%', align: 'center' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function VociIncasso() {
  const [voci, setVoci]         = useState<Voce[]>(VOCI_FALLBACK)
  const [scadenze, setScadenze] = useState<Scadenza[]>(SCADENZE_FALLBACK)

  // form voce (usato anche come editor: editingVoceId ≠ null = modifica)
  const [voceForm, setVoceForm]           = useState(EMPTY_VOCE)
  const [editingVoceId, setEditingVoceId] = useState<number | null>(null)

  // form scadenza
  const [scadForm, setScadForm]           = useState(EMPTY_SCAD)
  const [editingScadId, setEditingScadId] = useState<number | null>(null)

  const confirm       = useConfirmStore((s) => s.confirm)
  const markDirty     = useConfiguratoreStore((s) => s.markDirty)
  const resetDirty    = useConfiguratoreStore((s) => s.resetDirty)
  const setCompletion = useConfiguratoreStore((s) => s.setCompletion)

  // ── Dirty state: n° di operazioni dall'ultimo salvataggio + snapshot per Annulla
  const [pending, setPending] = useState(0)
  const snapshot = useRef({ voci: VOCI_FALLBACK, scadenze: SCADENZE_FALLBACK })
  const bump = () => setPending((p) => p + 1)

  useEffect(() => { markDirty('voci-incasso', pending) }, [pending, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ voci: Voce[]; scadenze: Scadenza[] }>('configura/GetVociIncasso', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !d?.voci?.length) return
        setVoci(d.voci)
        if (d.scadenze?.length) setScadenze(d.scadenze)
        snapshot.current = { voci: d.voci, scadenze: d.scadenze ?? SCADENZE_FALLBACK }
      })
      .catch(() => { /* mantiene i dati di esempio */ })
    return () => { cancelled = true }
  }, [])

  // ── Voci d'incasso ───────────────────────────────────────────────────────────

  const submitVoce = () => {
    if (!voceForm.codice.trim()) { toast.warning('Inserisci il codice incasso'); return }
    if (!voceForm.descrizione.trim()) { toast.warning('Inserisci la descrizione'); return }
    const duplicato = voci.some((v) => v.id !== editingVoceId && v.codice.trim().toLowerCase() === voceForm.codice.trim().toLowerCase())
    if (duplicato) { toast.warning(`Il codice "${voceForm.codice}" esiste già`); return }

    if (editingVoceId != null) {
      setVoci((list) => list.map((v) => (v.id === editingVoceId ? { ...v, ...voceForm } : v)))
      toast.success(`Voce "${voceForm.codice}" aggiornata`)
    } else {
      setVoci((list) => [...list, { ...voceForm, id: Date.now(), attiva: true }])
      toast.success(`Voce "${voceForm.codice}" aggiunta`)
    }
    bump()
    setVoceForm(EMPTY_VOCE)
    setEditingVoceId(null)
  }

  const editVoce = (v: Voce) => {
    setEditingVoceId(v.id)
    setVoceForm({ codice: v.codice, descrizione: v.descrizione, gruppo: v.gruppo, commissioni: v.commissioni, codFel: v.codFel, codScel: v.codScel, gateway: v.gateway })
  }

  const cancelEditVoce = () => { setEditingVoceId(null); setVoceForm(EMPTY_VOCE) }

  const toggleVoce = (v: Voce) => {
    setVoci((list) => list.map((x) => (x.id === v.id ? { ...x, attiva: !x.attiva } : x)))
    bump()
  }

  const removeVoce = async (v: Voce) => {
    const ok = await confirm({
      title: 'Elimina voce d’incasso',
      message: `Eliminare la voce "${v.codice} · ${v.descrizione}"? Gli incassi già registrati non vengono modificati.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    if (editingVoceId === v.id) cancelEditVoce()
    setVoci((list) => list.filter((x) => x.id !== v.id))
    bump()
    toast.success(`Voce "${v.codice}" eliminata`)
  }

  // ── Scadenze Sospesi ─────────────────────────────────────────────────────────

  const submitScad = () => {
    if (!scadForm.descrizione.trim()) { toast.warning('Inserisci la descrizione della sospensione'); return }
    if (scadForm.giorni <= 0) { toast.warning('Il valore giorni deve essere maggiore di zero'); return }

    if (editingScadId != null) {
      setScadenze((list) => list.map((s) => (s.id === editingScadId ? { ...s, ...scadForm } : s)))
      toast.success(`Scadenza "${scadForm.descrizione}" aggiornata`)
    } else {
      setScadenze((list) => [...list, { ...scadForm, id: Date.now() }])
      toast.success(`Scadenza "${scadForm.descrizione}" aggiunta`)
    }
    bump()
    setScadForm(EMPTY_SCAD)
    setEditingScadId(null)
  }

  const editScad = (s: Scadenza) => {
    setEditingScadId(s.id)
    setScadForm({ descrizione: s.descrizione, giorni: s.giorni, fineMese: s.fineMese })
  }

  const cancelEditScad = () => { setEditingScadId(null); setScadForm(EMPTY_SCAD) }

  const removeScad = async (s: Scadenza) => {
    const ok = await confirm({
      title: 'Elimina scadenza',
      message: `Eliminare la scadenza "${s.descrizione}"?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    if (editingScadId === s.id) cancelEditScad()
    setScadenze((list) => list.filter((x) => x.id !== s.id))
    bump()
    toast.success(`Scadenza "${s.descrizione}" eliminata`)
  }

  // ── Salvataggio complessivo (save bar) ───────────────────────────────────────

  const saveAll = async () => {
    try {
      await apiFetchSibylla('configura/SetVociIncasso', { method: 'POST', body: { voci, scadenze } })
    } catch { /* ambiente demo senza backend: lo stato resta quello locale */ }
    snapshot.current = { voci, scadenze }
    setPending(0)
    resetDirty()
    setCompletion('voci-incasso',
      voci.length > 0 && scadenze.length > 0 ? 'configured' : voci.length > 0 || scadenze.length > 0 ? 'partial' : 'empty')
  }

  const cancelAll = () => {
    setVoci(snapshot.current.voci)
    setScadenze(snapshot.current.scadenze)
    cancelEditVoce()
    cancelEditScad()
    setPending(0)
    resetDirty()
    toast.info('Modifiche annullate')
  }

  return (
    <div className="voci-incasso">

      {/* ── 1 · Voci d'incasso ────────────────────────────────────────────────── */}
      <section className="voci-incasso__section">
        <div className="voci-incasso__section-head">
          <span className="voci-incasso__section-ico"><i className="fa-light fa-receipt" aria-hidden="true" /></span>
          <div className="voci-incasso__section-titles">
            <h3 className="voci-incasso__section-title">Voci d’incasso</h3>
            <p className="voci-incasso__section-sub">
              I codici con cui vengono registrati gli incassi: gruppo, commissioni, codici FEL/SCEL e gateway di pagamento.
            </p>
          </div>
        </div>

        <div className={`voci-incasso__form-card ${editingVoceId != null ? 'is-editing' : ''}`}>
          {editingVoceId != null && (
            <div className="voci-incasso__form-banner">
              <i className="fa-solid fa-pen" aria-hidden="true" />
              <span>Stai modificando la voce <strong>{voci.find((v) => v.id === editingVoceId)?.codice}</strong></span>
              <button type="button" className="voci-incasso__form-banner-cancel" onClick={cancelEditVoce}>Annulla modifica</button>
            </div>
          )}
          <div className="voci-incasso__form">
            <InputField name="codice" label="Codice incasso" className="voci-incasso__f-codice" placeholder="Es. CC" value={voceForm.codice} onChange={(e) => setVoceForm({ ...voceForm, codice: e.target.value })} />
            <InputField name="descrizione" label="Descrizione" className="voci-incasso__f-descr" placeholder="Es. Carta di credito" value={voceForm.descrizione} onChange={(e) => setVoceForm({ ...voceForm, descrizione: e.target.value })} />
            <SelectField
              name="gruppo" label="Gruppo" className="voci-incasso__f-gruppo" placeholder="Seleziona"
              value={voceForm.gruppo}
              onChange={(e) => setVoceForm({ ...voceForm, gruppo: e.target.value })}
              options={GRUPPI.map((g) => ({ value: g, label: g }))}
            />
            <InputField
              name="commissioni" label="Commissioni (%)" type="number" min={0} step={0.1}
              className="voci-incasso__f-num" iconRight="fa-light fa-percent"
              value={voceForm.commissioni}
              onChange={(e) => setVoceForm({ ...voceForm, commissioni: Number(e.target.value) || 0 })}
            />
            <SelectField
              name="codFel" label="Cod. Fel" className="voci-incasso__f-cod" placeholder="Seleziona"
              value={voceForm.codFel}
              onChange={(e) => setVoceForm({ ...voceForm, codFel: e.target.value })}
              options={CODICI_FEL.map((c) => ({ value: c, label: c }))}
            />
            <InputField name="codScel" label="Cod. Scel" className="voci-incasso__f-cod" placeholder="Es. 02" value={voceForm.codScel} onChange={(e) => setVoceForm({ ...voceForm, codScel: e.target.value })} />
            <SelectField
              name="gateway" label="Gateway" className="voci-incasso__f-gruppo"
              value={voceForm.gateway}
              onChange={(e) => setVoceForm({ ...voceForm, gateway: e.target.value })}
              options={GATEWAY_OPTIONS}
            />
            <button type="button" className="sib-btn sib-btn--primary voci-incasso__add" onClick={submitVoce}>
              {editingVoceId != null
                ? <>Salva modifiche</>
                : <><i className="fa-light fa-circle-plus" aria-hidden="true" /> Aggiungi</>}
            </button>
          </div>
        </div>

        <CfgTable
          columns={COLS_VOCI}
          empty={<span>Nessuna voce d’incasso configurata: aggiungi la prima con il form qui sopra.</span>}
        >
          {voci.map((v) => (
            <tr key={v.id} className={`${v.attiva ? '' : 'voci-incasso__row--off'} ${editingVoceId === v.id ? 'voci-incasso__row--editing' : ''}`}>
              <td className="voci-incasso__col-c">
                <ToggleSwitch checked={v.attiva} onChange={() => toggleVoce(v)} className="voci-incasso__toggle" />
              </td>
              <td><span className="voci-incasso__code">{v.codice}</span></td>
              <td><TruncatedText text={v.descrizione} className="voci-incasso__trunc" /></td>
              <td>{v.gruppo ? <TruncatedText text={v.gruppo} className="voci-incasso__trunc" /> : '—'}</td>
              <td className="voci-incasso__col-r">{v.commissioni > 0 ? fmtComm(v.commissioni) : '—'}</td>
              <td>
                {v.gateway
                  ? (
                    <span className="voci-incasso__gw">
                      <i className="fa-solid fa-credit-card" aria-hidden="true" />
                      <TruncatedText text={gatewayLabel(v.gateway)} className="voci-incasso__trunc" />
                    </span>
                  )
                  : '—'}
              </td>
              <td>{v.codFel || '—'}</td>
              <td>{v.codScel || '—'}</td>
              <td className="voci-incasso__col-c">
                <div className="voci-incasso__actions-cell">
                  <Tooltip content="Modifica">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => editVoce(v)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Elimina">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => removeVoce(v)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </Tooltip>
                </div>
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      {/* ── 2 · Scadenze Sospesi ──────────────────────────────────────────────── */}
      <section className="voci-incasso__section">
        <div className="voci-incasso__section-head">
          <span className="voci-incasso__section-ico"><i className="fa-light fa-clock-rotate-left" aria-hidden="true" /></span>
          <div className="voci-incasso__section-titles">
            <h3 className="voci-incasso__section-title">Scadenze Sospesi</h3>
            <p className="voci-incasso__section-sub">
              Le scadenze di pagamento applicabili agli incassi sospesi: giorni dalla data documento, con eventuale slittamento a fine mese.
            </p>
          </div>
        </div>

        <div className={`voci-incasso__form-card ${editingScadId != null ? 'is-editing' : ''}`}>
          {editingScadId != null && (
            <div className="voci-incasso__form-banner">
              <i className="fa-solid fa-pen" aria-hidden="true" />
              <span>Stai modificando la scadenza <strong>{scadenze.find((s) => s.id === editingScadId)?.descrizione}</strong></span>
              <button type="button" className="voci-incasso__form-banner-cancel" onClick={cancelEditScad}>Annulla modifica</button>
            </div>
          )}
          <div className="voci-incasso__form">
            <InputField name="scadDescrizione" label="Descrizione sospensione" className="voci-incasso__f-descr" placeholder="Es. 30 giorni data fattura" value={scadForm.descrizione} onChange={(e) => setScadForm({ ...scadForm, descrizione: e.target.value })} />
            <InputField name="scadGiorni" label="Valore giorni" type="number" min={1} className="voci-incasso__f-num" value={scadForm.giorni || ''} onChange={(e) => setScadForm({ ...scadForm, giorni: Number(e.target.value) || 0 })} />
            <div className="voci-incasso__f-toggle">
              <span className="voci-incasso__f-toggle-label">Fine mese</span>
              <ToggleSwitch checked={scadForm.fineMese} onChange={(checked) => setScadForm({ ...scadForm, fineMese: checked })} />
            </div>
            <button type="button" className="sib-btn sib-btn--primary voci-incasso__add" onClick={submitScad}>
              {editingScadId != null
                ? <>Salva modifiche</>
                : <><i className="fa-light fa-circle-plus" aria-hidden="true" /> Aggiungi scadenza</>}
            </button>
          </div>
        </div>

        <h4 className="voci-incasso__table-title">Scadenze Sospesi configurate</h4>
        <CfgTable
          columns={COLS_SCADENZE}
          empty={<span>Nessuna scadenza configurata: aggiungi la prima con il form qui sopra.</span>}
        >
          {scadenze.map((s) => (
            <tr key={s.id} className={editingScadId === s.id ? 'voci-incasso__row--editing' : ''}>
              <td><TruncatedText text={s.descrizione} className="voci-incasso__trunc" /></td>
              <td className="voci-incasso__col-c">{s.giorni}</td>
              <td className="voci-incasso__col-c">
                {s.fineMese
                  ? <Tooltip content="La scadenza slitta a fine mese"><i className="fa-solid fa-circle-check voci-incasso__check" aria-hidden="true" /></Tooltip>
                  : <Tooltip content="Nessuno slittamento a fine mese"><span className="voci-incasso__dash">—</span></Tooltip>}
              </td>
              <td className="voci-incasso__col-c">
                <div className="voci-incasso__actions-cell">
                  <Tooltip content="Modifica">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => editScad(s)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Elimina">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => removeScad(s)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </Tooltip>
                </div>
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      <CfgSaveBar
        count={pending}
        onSave={saveAll}
        onCancel={cancelAll}
        successMessage="Voci incasso salvate"
        className="voci-incasso__savebar"
      />
    </div>
  )
}
