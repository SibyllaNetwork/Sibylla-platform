import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, ToggleSwitch, RadioGroup, CheckboxField } from '../../../../../core/components/form'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './LottiMapping.sass'
import { useStrutturaCorrente, useStruttureCliente } from '../../../../../hooks/useStrutturaCorrente'
import { idStruttura } from '../../../../../core/demo/struttureDemo'

// ─── LOTTI MAPPING (§4.15) ────────────────────────────────────────────────────
//  In produzione è un flusso di tre pagine consecutive; qui è UNA pagina con
//  le stesse funzioni in tre sezioni:
//   1. LOTTI — per Gruppi e B2B i tipi lotto (1, 1/2, 1/4) con le camere per
//      lotto, l'interruttore «Standard Sibylla» e la campanella «Consulting».
//      Con lo standard attivo le camere sono quelle di Sibylla e la campanella
//      è spenta; disattivandolo le camere diventano modificabili e la campanella
//      si accende (animata) per chiedere una consulenza al commerciale.
//   2. AGGREGAZIONI E TIPOLOGIE — per struttura e segmento (Gruppi/B2B), con
//      la categoria come filtro delle tipologie camera: si crea un'AGGREGAZIONE
//      (nome, moltiplicatore, tipologie assegnate) oppure si associa una
//      singola TIPOLOGIA CAMERE al segmento. Una tipologia può stare in una sola
//      aggregazione/associazione per segmento (colonna «Assegnata»).
//   3. RIEPILOGO — a lato, per struttura e categoria: lotti, aggregazioni e
//      tipologie associate di Gruppi e B2B.

const PANE_ID = 'lotti-mapping'
const EMAIL_COMMERCIALE = 'commerciale@sibyllanetwork.com'

type Consulenza = 'idle' | 'ferma' | 'inviata'
type Segmento = 'gruppi' | 'b2b'
type Modo = 'aggregazione' | 'tipologia'

const SEGMENTI: { value: Segmento; label: string }[] = [
  { value: 'gruppi', label: 'Gruppi' },
  { value: 'b2b',    label: 'B2B' },
]
const nomeSegmento = (s: Segmento) => SEGMENTI.find(x => x.value === s)!.label

interface Lotto {
  tipo: string
  camere: number
  /** Camere previste dallo standard Sibylla (ripristinate riattivandolo). */
  camereStandard: number
  standard: boolean
  consulenza: Consulenza
}

interface Aggregazione {
  id: number
  strutturaId: number
  segmento: Segmento
  nome: string
  tipologie: string[]
  moltiplicatore: number
}

interface Associazione {
  strutturaId: number
  segmento: Segmento
  tipologia: string
}

interface Tipologia { nome: string; categoria: string }
interface Struttura { Id: number; nome: string }

interface Snapshot {
  lotti: Record<Segmento, Lotto[]>
  aggregazioni: Aggregazione[]
  associazioni: Associazione[]
}

interface Data extends Partial<Snapshot> {
  Strutture?: Struttura[]
  StrutturaId?: number | null
  tipologie?: Tipologia[]
}

// Tipologie camera della struttura (stessi nomi della demo di Camere mapping)
const TIPOLOGIE_DEMO: Tipologia[] = [
  { nome: 'DBL CLASSIC',   categoria: 'Classic' },
  { nome: 'TWN GARDEN',    categoria: 'Classic' },
  { nome: 'SGL ECONOMY',   categoria: 'Economy' },
  { nome: 'DBL SUPERIOR',  categoria: 'Superior' },
  { nome: 'DBL DELUXE',    categoria: 'Superior' },
  { nome: 'TRP FAMILY',    categoria: 'Family' },
  { nome: 'QDP FAMILY',    categoria: 'Family' },
  { nome: 'JSU PANORAMIC', categoria: 'Suite' },
]

const lotto = (tipo: string, camere: number): Lotto =>
  ({ tipo, camere, camereStandard: camere, standard: true, consulenza: 'idle' })

const SNAPSHOT_INIZIALE: Snapshot = {
  lotti: {
    gruppi: [lotto('1', 25), lotto('1/2', 13)],
    b2b:    [lotto('1', 4), lotto('1/2', 2), lotto('1/4', 1)],
  },
  aggregazioni: [],
  associazioni: [],
}

// Modifiche non salvate: confronto elemento per elemento
function countChanges(saved: Snapshot, draft: Snapshot): number {
  let n = 0
  for (const seg of ['gruppi', 'b2b'] as Segmento[]) {
    draft.lotti[seg].forEach((l, i) => {
      const s = saved.lotti[seg][i]
      if (!s || s.camere !== l.camere || s.standard !== l.standard) n++
    })
  }
  const aggKey = (a: Aggregazione) => JSON.stringify([a.nome, a.tipologie, a.moltiplicatore])
  const savedAgg = new Map(saved.aggregazioni.map(a => [a.id, aggKey(a)]))
  draft.aggregazioni.forEach(a => { if (savedAgg.get(a.id) !== aggKey(a)) n++ })
  n += saved.aggregazioni.filter(a => !draft.aggregazioni.some(d => d.id === a.id)).length
  const assKey = (a: Associazione) => `${a.strutturaId}|${a.segmento}|${a.tipologia}`
  const savedAss = new Set(saved.associazioni.map(assKey))
  const draftAss = new Set(draft.associazioni.map(assKey))
  draftAss.forEach(k => { if (!savedAss.has(k)) n++ })
  savedAss.forEach(k => { if (!draftAss.has(k)) n++ })
  return n
}

export default function LottiMapping() {
  const confirm       = useConfirmStore(s => s.confirm)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture] = useState<Struttura[]>([])
  // Senza backend: le strutture del cliente corrente, a partire da quella selezionata in alto.
  const { struttura: strutturaCorrente } = useStrutturaCorrente()
  const struttureCliente = useStruttureCliente()
  const [strutturaId, setStrutturaId] = useState<number | null>(() => idStruttura(strutturaCorrente))
  useEffect(() => { setStrutturaId(idStruttura(strutturaCorrente)) }, [strutturaCorrente])
  const [tipologie, setTipologie] = useState<Tipologia[]>(TIPOLOGIE_DEMO)

  const [saved, setSaved] = useState<Snapshot>(SNAPSHOT_INIZIALE)
  const [draft, setDraft] = useState<Snapshot>(SNAPSHOT_INIZIALE)

  // Filtri della sezione Aggregazioni (la categoria filtra anche il riepilogo)
  const [categoria, setCategoria] = useState('')
  const [segmento, setSegmento] = useState<Segmento>('gruppi')
  const [modo, setModo] = useState<Modo>('aggregazione')

  // Form aggregazione (nuova o in modifica) / associazione tipologia
  const [editId, setEditId] = useState<number | null>(null)
  const [nomeAgg, setNomeAgg] = useState('')
  const [moltiplicatore, setMoltiplicatore] = useState(1)
  const [scelte, setScelte] = useState<string[]>([])
  const [tipologiaSingola, setTipologiaSingola] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetLottiMapping', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !d?.lotti) return
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        if (Array.isArray(d.tipologie) && d.tipologie.length > 0) setTipologie(d.tipologie)
        const snap: Snapshot = { lotti: d.lotti, aggregazioni: d.aggregazioni ?? [], associazioni: d.associazioni ?? [] }
        setSaved(snap)
        setDraft(snap)
      })
      .catch(() => { /* backend assente in demo: restano i dati iniziali */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, draft), [saved, draft])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const opzioniStrutture = (strutture.length ? strutture : struttureCliente.map((x) => ({ Id: idStruttura(x.nome), nome: x.nome })))
    .map((s) => ({ value: s.Id, label: s.nome }))
  const categorie = useMemo(() => Array.from(new Set(tipologie.map(t => t.categoria))), [tipologie])

  // ── 1. Lotti ────────────────────────────────────────────────────────────────
  const updateLotto = (seg: Segmento, tipo: string, patch: Partial<Lotto>) =>
    setDraft(d => ({ ...d, lotti: { ...d.lotti, [seg]: d.lotti[seg].map(l => l.tipo === tipo ? { ...l, ...patch } : l) } }))

  const setStandard = (seg: Segmento, l: Lotto, on: boolean) =>
    updateLotto(seg, l.tipo, on
      ? { standard: true, camere: l.camereStandard, consulenza: 'idle' }
      : { standard: false, consulenza: 'idle' })

  // Campanella: al tap l'animazione si ferma e si chiede conferma dell'invio
  const richiediConsulenza = async (seg: Segmento, l: Lotto) => {
    updateLotto(seg, l.tipo, { consulenza: 'ferma' })
    const ok = await confirm({
      title: 'Richiesta di consulenza',
      message: `Inviare la richiesta di consulenza per il lotto ${l.tipo} (${nomeSegmento(seg)}) via e-mail al commerciale Sibylla (${EMAIL_COMMERCIALE})?`,
      confirmLabel: 'Invia richiesta',
      cancelLabel: 'Annulla',
    })
    if (ok) {
      updateLotto(seg, l.tipo, { consulenza: 'inviata' })
      toast.success(`Richiesta di consulenza inviata a ${EMAIL_COMMERCIALE}`)
    }
  }

  // ── 2. Aggregazioni e tipologie (scope: struttura + segmento) ───────────────
  const nelloScope = <T extends { strutturaId: number; segmento: Segmento }>(x: T, seg: Segmento = segmento) =>
    x.strutturaId === strutturaId && x.segmento === seg
  const aggScope = draft.aggregazioni.filter(a => nelloScope(a))
  const assScope = draft.associazioni.filter(a => nelloScope(a))
  const tipologieFiltrate = tipologie.filter(t => !categoria || t.categoria === categoria)

  // Dove è già assegnata una tipologia nel segmento (esclusa l'aggregazione in modifica)
  const assegnazione = (nome: string): string | null => {
    const agg = aggScope.find(a => a.id !== editId && a.tipologie.includes(nome))
    if (agg) return agg.nome
    if (assScope.some(a => a.tipologia === nome)) return 'Tipologia associata'
    return null
  }

  const resetForm = () => {
    setEditId(null); setNomeAgg(''); setMoltiplicatore(1); setScelte([]); setTipologiaSingola('')
  }
  // Cambiando scope o modalità il form riparte pulito
  useEffect(() => { resetForm() }, [strutturaId, segmento, modo])

  const nomeDuplicato = aggScope.some(a => a.id !== editId && a.nome.trim().toLowerCase() === nomeAgg.trim().toLowerCase())
  const formAggValido = !!strutturaId && nomeAgg.trim() !== '' && !nomeDuplicato && scelte.length > 0 && moltiplicatore >= 1

  const salvaAggregazione = () => {
    if (!formAggValido || !strutturaId) return
    const dati = { nome: nomeAgg.trim(), tipologie: scelte, moltiplicatore }
    setDraft(d => ({
      ...d,
      aggregazioni: editId != null
        ? d.aggregazioni.map(a => a.id === editId ? { ...a, ...dati } : a)
        : [...d.aggregazioni, { id: Date.now(), strutturaId, segmento, ...dati }],
    }))
    toast.success(editId != null ? `Aggregazione «${dati.nome}» aggiornata` : `Aggregazione «${dati.nome}» aggiunta`)
    resetForm()
  }

  const modificaAggregazione = (a: Aggregazione) => {
    setModo('aggregazione')
    // dopo il reset dovuto al cambio modalità
    window.setTimeout(() => {
      setEditId(a.id); setNomeAgg(a.nome); setMoltiplicatore(a.moltiplicatore); setScelte(a.tipologie)
    }, 0)
  }

  const eliminaAggregazione = async (a: Aggregazione) => {
    const ok = await confirm({
      title: 'Elimina aggregazione',
      message: `Eliminare l'aggregazione «${a.nome}»? Le tipologie associate tornano disponibili.`,
      confirmLabel: 'Elimina',
      cancelLabel: 'Annulla',
      danger: true,
    })
    if (!ok) return
    setDraft(d => ({ ...d, aggregazioni: d.aggregazioni.filter(x => x.id !== a.id) }))
    if (editId === a.id) resetForm()
  }

  const associaTipologia = () => {
    if (!strutturaId || !tipologiaSingola || assegnazione(tipologiaSingola)) return
    setDraft(d => ({ ...d, associazioni: [...d.associazioni, { strutturaId, segmento, tipologia: tipologiaSingola }] }))
    toast.success(`${tipologiaSingola} associata a ${nomeSegmento(segmento)}`)
    setTipologiaSingola('')
  }

  const rimuoviAssociazione = async (a: Associazione) => {
    const ok = await confirm({
      title: 'Rimuovi tipologia',
      message: `Rimuovere ${a.tipologia} dalle tipologie camere ${nomeSegmento(a.segmento)}?`,
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
      danger: true,
    })
    if (!ok) return
    setDraft(d => ({ ...d, associazioni: d.associazioni.filter(x => !(x.strutturaId === a.strutturaId && x.segmento === a.segmento && x.tipologia === a.tipologia)) }))
  }

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetLottiMapping', { method: 'POST', body: { StrutturaId: strutturaId, ...draft } })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[LottiMapping] persistenza remota non disponibile:', err)
    }
    setSaved(draft)
    setCompletion(PANE_ID, draft.aggregazioni.length > 0 || draft.associazioni.length > 0 ? 'configured' : 'partial')
    resetDirty()
  }

  // ── 3. Riepilogo (struttura + categoria) ────────────────────────────────────
  const nelFiltroCategoria = (nome: string) => !categoria || tipologie.find(t => t.nome === nome)?.categoria === categoria
  const riepilogoAgg = draft.aggregazioni.filter(a => a.strutturaId === strutturaId && a.tipologie.some(nelFiltroCategoria))
  const riepilogoAss = (seg: Segmento) => draft.associazioni.filter(a => nelloScope(a, seg) && nelFiltroCategoria(a.tipologia))

  return (
    <div className="lotti-mapping">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="lotti-mapping__field"
          value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={opzioniStrutture}
        />
        <SelectField
          name="categoria"
          label="Categoria"
          className="lotti-mapping__field"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          options={[{ value: '', label: 'Tutte le categorie' }, ...categorie.map(c => ({ value: c, label: c }))]}
        />
      </CfgToolbar>

      <div className="lotti-mapping__layout">
        <div className="lotti-mapping__main">

          {/* ── 1. Lotti ─────────────────────────────────────────────────────── */}
          <section className="lotti-mapping__area" aria-labelledby="lotti-tipi-title">
            <header className="lotti-mapping__area-head">
              <h3 id="lotti-tipi-title" className="lotti-mapping__area-title">
                <span className="lotti-mapping__step">1</span> Lotti
              </h3>
              <p className="lotti-mapping__area-desc">
                Camere per tipo lotto. Disattiva «Standard Sibylla» per personalizzarle e chiedere una consulenza.
              </p>
            </header>

            <div className="lotti-mapping__lotti">
              {SEGMENTI.map(({ value: seg, label }) => (
                <div key={seg} className="lotti-mapping__lotti-col">
                  <div className="lotti-mapping__sub">{label}</div>
                  <CfgTable
                    columns={[
                      { key: 'tipo',       label: 'Tipo lotto', width: '19%' },
                      { key: 'camere',     label: 'Camere',     width: '23%', align: 'right' },
                      { key: 'standard',   label: <TruncatedText text="Std. Sibylla" full="Standard Sibylla" />, width: '29%', align: 'center' },
                      { key: 'consulting', label: 'Consulting', width: '29%', align: 'center' },
                    ]}
                  >
                    {draft.lotti[seg].map((l) => (
                      <tr key={l.tipo}>
                        <td className="lotti-mapping__td-name">{l.tipo}</td>
                        <td className="lotti-mapping__td-num">
                          {l.standard
                            ? <span className="lotti-mapping__num">{l.camere}</span>
                            : (
                              <InputField
                                name={`lotto-${seg}-${l.tipo}`}
                                type="number"
                                min={0}
                                value={l.camere}
                                onChange={(e) => updateLotto(seg, l.tipo, { camere: Math.max(0, Number(e.target.value) || 0) })}
                                className="lotti-mapping__num-input"
                              />
                            )}
                        </td>
                        <td className="lotti-mapping__td-center">
                          <ToggleSwitch
                            checked={l.standard}
                            onChange={(on) => setStandard(seg, l, on)}
                            className="lotti-mapping__toggle"
                          />
                        </td>
                        <td className="lotti-mapping__td-center">
                          <ConsulenzaBell
                            attivo={l.standard}
                            consulenza={l.consulenza}
                            label={`lotto ${l.tipo} ${label}`}
                            onRequest={() => richiediConsulenza(seg, l)}
                          />
                        </td>
                      </tr>
                    ))}
                  </CfgTable>
                </div>
              ))}
            </div>
          </section>

          {/* ── 2. Aggregazioni e tipologie ─────────────────────────────────── */}
          <section className="lotti-mapping__area" aria-labelledby="lotti-agg-title">
            <header className="lotti-mapping__area-head">
              <h3 id="lotti-agg-title" className="lotti-mapping__area-title">
                <span className="lotti-mapping__step">2</span> Aggregazioni e tipologie
              </h3>
              <p className="lotti-mapping__area-desc">
                Raggruppa più tipologie in un'aggregazione con il suo moltiplicatore, oppure associa una tipologia al segmento.
              </p>
            </header>

            <div className="lotti-mapping__scope">
              <SelectField
                name="segmento"
                label="Segmento"
                className="lotti-mapping__field-sm"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value as Segmento)}
                options={SEGMENTI}
              />
              <RadioGroup
                name="modo"
                label="Configura"
                value={modo}
                onChange={(v) => setModo(v as Modo)}
                options={[
                  { value: 'aggregazione', label: 'Aggregazione' },
                  { value: 'tipologia',    label: 'Tipologia camere' },
                ]}
              />
            </div>

            <div className="lotti-mapping__agg">
              {/* Form + tipologie disponibili */}
              <div className="lotti-mapping__agg-form">
                {modo === 'aggregazione' ? (
                  <>
                    <div className="lotti-mapping__form-row">
                      <InputField
                        name="nome-aggregazione"
                        label="Nome aggregazione"
                        placeholder="Es. Doppie vista mare"
                        value={nomeAgg}
                        onChange={(e) => setNomeAgg(e.target.value)}
                        error={nomeDuplicato ? 'Nome già usato nel segmento' : undefined}
                        className="lotti-mapping__grow"
                      />
                      <InputField
                        name="moltiplicatore"
                        label="Moltiplicatore"
                        type="number"
                        min={1}
                        value={moltiplicatore}
                        onChange={(e) => setMoltiplicatore(Math.max(1, Number(e.target.value) || 1))}
                        className="lotti-mapping__molt"
                      />
                    </div>

                    <CfgTable
                      columns={[
                        { key: 'sel',       label: '',          width: '12%', align: 'center' },
                        { key: 'nome',      label: 'Tipologia', width: '36%' },
                        { key: 'categoria', label: 'Categoria', width: '22%' },
                        { key: 'assegnata', label: 'Assegnata', width: '30%' },
                      ]}
                      empty={<span>Nessuna tipologia per la categoria selezionata.</span>}
                    >
                      {tipologieFiltrate.map((t) => {
                        const dove = assegnazione(t.nome)
                        const sel = scelte.includes(t.nome)
                        return (
                          <tr key={t.nome} className={clsx(dove && 'lotti-mapping__row--off', sel && 'lotti-mapping__row--sel')}>
                            <td className="lotti-mapping__td-center">
                              <CheckboxField
                                name={`tip-${t.nome}`}
                                checked={sel}
                                disabled={!!dove}
                                onChange={() => setScelte(s => sel ? s.filter(x => x !== t.nome) : [...s, t.nome])}
                              />
                            </td>
                            <td className="lotti-mapping__td-name">{t.nome}</td>
                            <td>{t.categoria}</td>
                            <td>{dove ?? <span className="lotti-mapping__muted">Libera</span>}</td>
                          </tr>
                        )
                      })}
                    </CfgTable>

                    <div className="lotti-mapping__form-actions">
                      {editId != null && (
                        <button type="button" className="sib-btn sib-btn--secondary" onClick={resetForm}>Annulla modifica</button>
                      )}
                      <button type="button" className="sib-btn sib-btn--primary" disabled={!formAggValido} onClick={salvaAggregazione}>
                        <i className={`fa-solid ${editId != null ? 'fa-check' : 'fa-plus'}`} aria-hidden="true" />
                        {editId != null ? 'Aggiorna aggregazione' : 'Aggiungi aggregazione'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="lotti-mapping__form-row">
                    <SelectField
                      name="tipologia-camere"
                      label="Tipologia camere"
                      placeholder="Seleziona tipologia"
                      value={tipologiaSingola}
                      onChange={(e) => setTipologiaSingola(e.target.value)}
                      options={tipologieFiltrate.map(t => {
                        const dove = assegnazione(t.nome)
                        return { value: t.nome, label: dove ? `${t.nome} — ${dove}` : t.nome, disabled: !!dove }
                      })}
                      className="lotti-mapping__grow"
                    />
                    <button type="button" className="sib-btn sib-btn--primary lotti-mapping__add" disabled={!tipologiaSingola} onClick={associaTipologia}>
                      <i className="fa-solid fa-plus" aria-hidden="true" /> Associa
                    </button>
                  </div>
                )}
              </div>

              {/* Configurazioni dello scope */}
              <div className="lotti-mapping__agg-list">
                <div className="lotti-mapping__sub">Aggregazioni {nomeSegmento(segmento)}</div>
                <CfgTable
                  columns={[
                    { key: 'nome',  label: 'Nome',                 width: '28%' },
                    { key: 'tip',   label: 'Tipologie associate',  width: '38%' },
                    { key: 'molt',  label: 'Molt.',                width: '14%', align: 'right' },
                    { key: 'az',    label: 'Azioni',               width: '20%', align: 'center' },
                  ]}
                  empty={<span>Nessuna aggregazione configurata per lo scope selezionato.</span>}
                >
                  {aggScope.map((a) => (
                    <tr key={a.id} className={clsx(editId === a.id && 'lotti-mapping__row--sel')}>
                      <td className="lotti-mapping__td-name">{a.nome}</td>
                      <td>{a.tipologie.join(', ')}</td>
                      <td className="lotti-mapping__td-num">×{a.moltiplicatore}</td>
                      <td className="lotti-mapping__td-center">
                        <Tooltip text="Modifica">
                          <button type="button" className="sib-btn sib-btn--icon lotti-mapping__act" onClick={() => modificaAggregazione(a)} aria-label={`Modifica ${a.nome}`}>
                            <i className="fa-solid fa-pen" aria-hidden="true" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Elimina">
                          <button type="button" className="sib-btn sib-btn--icon lotti-mapping__act" onClick={() => eliminaAggregazione(a)} aria-label={`Elimina ${a.nome}`}>
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </CfgTable>

                <div className="lotti-mapping__sub">Tipologie camere {nomeSegmento(segmento)}</div>
                <CfgTable
                  columns={[
                    { key: 'nome', label: 'Nome',      width: '50%' },
                    { key: 'cat',  label: 'Categoria', width: '30%' },
                    { key: 'az',   label: 'Azioni',    width: '20%', align: 'center' },
                  ]}
                  empty={<span>Nessuna tipologia associata allo scope selezionato.</span>}
                >
                  {assScope.map((a) => (
                    <tr key={a.tipologia}>
                      <td className="lotti-mapping__td-name">{a.tipologia}</td>
                      <td>{tipologie.find(t => t.nome === a.tipologia)?.categoria}</td>
                      <td className="lotti-mapping__td-center">
                        <Tooltip text="Rimuovi">
                          <button type="button" className="sib-btn sib-btn--icon lotti-mapping__act" onClick={() => rimuoviAssociazione(a)} aria-label={`Rimuovi ${a.tipologia}`}>
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </CfgTable>
              </div>
            </div>
          </section>
        </div>

        {/* ── 3. Riepilogo (struttura + categoria) ──────────────────────────── */}
        <aside className="lotti-mapping__recap" aria-label="Riepilogo configurazione">
          <h4 className="lotti-mapping__recap-title">
            <span className="lotti-mapping__step">3</span> Riepilogo
          </h4>
          <div className="lotti-mapping__recap-scope">
            {opzioniStrutture.find(o => o.value === strutturaId)?.label ?? '—'} · {categoria || 'tutte le categorie'}
          </div>

          {SEGMENTI.map(({ value: seg, label }) => {
            const agg = riepilogoAgg.filter(a => a.segmento === seg)
            const ass = riepilogoAss(seg)
            return (
              <div key={seg} className="lotti-mapping__recap-section">
                <div className="lotti-mapping__recap-label">{label}</div>
                <dl className="lotti-mapping__recap-rows">
                  {draft.lotti[seg].map(l => (
                    <div key={l.tipo} className="lotti-mapping__recap-row">
                      <dt>Lotto {l.tipo}</dt>
                      <dd>{l.camere} cam. <span className="lotti-mapping__muted">{l.standard ? 'standard' : 'personalizzato'}</span></dd>
                    </div>
                  ))}
                </dl>
                <div className="lotti-mapping__recap-list">
                  <span>Aggregazioni</span>
                  {agg.length === 0
                    ? <em>nessuna</em>
                    : agg.map(a => <div key={a.id}><strong>{a.nome}</strong> ×{a.moltiplicatore} · {a.tipologie.join(', ')}</div>)}
                </div>
                <div className="lotti-mapping__recap-list">
                  <span>Tipologie camere</span>
                  {ass.length === 0 ? <em>nessuna</em> : <div>{ass.map(a => a.tipologia).join(', ')}</div>}
                </div>
              </div>
            )
          })}

          <div className="lotti-mapping__recap-foot">
            <i className="fa-solid fa-bell" aria-hidden="true" />
            {(() => {
              const n = [...draft.lotti.gruppi, ...draft.lotti.b2b].filter(l => l.consulenza === 'inviata').length
              return n === 0 ? 'Nessuna richiesta di consulenza inviata' : n === 1 ? '1 richiesta di consulenza inviata' : `${n} richieste di consulenza inviate`
            })()}
          </div>
        </aside>
      </div>

      <CfgSaveBar
        className="lotti-mapping__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => { setDraft(saved); resetForm() }}
        successMessage="Lotti mapping salvato"
      />
    </div>
  )
}

// ─── Campanella «Consulting» ──────────────────────────────────────────────────
//  Standard Sibylla ATTIVO → grigia, non cliccabile. Standard DISATTIVO → blu e
//  interattiva, con animazione in movimento (spenta con prefers-reduced-motion);
//  al tap l'animazione si ferma e parte la conferma di invio. Dopo l'invio la
//  campanella resta verde a conferma della richiesta.

function ConsulenzaBell({ attivo, consulenza, label, onRequest }: {
  attivo: boolean
  consulenza: Consulenza
  label: string
  onRequest: () => void
}) {
  if (attivo) {
    return (
      <Tooltip text="Disponibile disattivando «Standard Sibylla»" variant="dark">
        <button type="button" className="lotti-mapping__bell lotti-mapping__bell--disabled" disabled
          aria-label={`Consulenza per ${label} non disponibile`}>
          <i className="fa-solid fa-bell" aria-hidden="true" />
        </button>
      </Tooltip>
    )
  }

  if (consulenza === 'inviata') {
    return (
      <Tooltip text={`Richiesta inviata a ${EMAIL_COMMERCIALE}`} variant="dark">
        <button type="button" className="lotti-mapping__bell lotti-mapping__bell--sent" disabled
          aria-label={`Consulenza per ${label} già richiesta`}>
          <i className="fa-solid fa-bell-on" aria-hidden="true" />
        </button>
      </Tooltip>
    )
  }

  return (
    <Tooltip text="Richiedi una consulenza al commerciale Sibylla" variant="dark">
      <button
        type="button"
        className={clsx('lotti-mapping__bell lotti-mapping__bell--active', consulenza === 'idle' && 'lotti-mapping__bell--ringing')}
        onClick={onRequest}
        aria-label={`Richiedi una consulenza per ${label}`}
      >
        <i className="fa-solid fa-bell" aria-hidden="true" />
      </button>
    </Tooltip>
  )
}
