import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import AlertBanner from '../../../core/components/AlertBanner'
import { toast } from '../../../core/components/Toast/useToast'
import { InputField, SelectField, ToggleSwitch } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useTipologieCamereStore, type TipologiaCamera } from '../../../store/useTipologieCamereStore'
import RoomIllustration from './RoomIllustration'
import ConfigurazioneCamera from './ConfigurazioneCamera'
import { MAX_CAPACITA, MAX_LETTI_EXTRA, TIPI, lettiExtra, ospiti } from './catalogo'
import './InventarioCamere.sass'
import { useStruttureCliente, useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'

// ─── MOCK ─────────────────────────────────────────────────────────────────────
// Tipologie della struttura dalle schede demo: tutte le tipologie del catalogo,
// col numero di camere ripartito sul totale della struttura (stesso giro di
// tipologie del front office per quelle già presenti, almeno 1 per le altre).
const TIP_GIRO = ['Doppia Classic', 'Matrimoniale Deluxe', 'Singola Classic', 'Twin Classic', 'Tripla Classic', 'Matrimoniale Deluxe', 'DUS', 'Quadrupla']
const BASE: Record<string, { tipo: string; capacita: number; lettiExtra: number; descrizione: string }> = {
  'Singola Classic':     { tipo: 'Singola',      capacita: 1, lettiExtra: 0, descrizione: 'Letto singolo, scrivania e bagno privato con doccia.' },
  'Doppia Classic':      { tipo: 'Doppia',       capacita: 2, lettiExtra: 0, descrizione: 'Letto matrimoniale, spaziosa e accogliente: perfetta per le coppie.' },
  'Twin Classic':        { tipo: 'Twin',         capacita: 2, lettiExtra: 0, descrizione: 'Due letti singoli separati, ideale per amici o colleghi.' },
  'Matrimoniale Deluxe': { tipo: 'Matrimoniale', capacita: 2, lettiExtra: 1, descrizione: 'Letto king size, area relax e set di cortesia premium.' },
  'Tripla Classic':      { tipo: 'Tripla',       capacita: 3, lettiExtra: 0, descrizione: 'Letto matrimoniale più un singolo, ideale per tre ospiti.' },
  'Tripla con letto aggiunto': { tipo: 'Tripla', capacita: 3, lettiExtra: 1, descrizione: 'Tre posti letto più una brandina: per gruppi e famiglie numerose.' },
  'Quadrupla':           { tipo: 'Quadrupla',    capacita: 4, lettiExtra: 0, descrizione: 'Due letti matrimoniali, fino a quattro ospiti.' },
  'Family':              { tipo: 'Family',       capacita: 4, lettiExtra: 1, descrizione: 'Matrimoniale e letto a castello: spaziosa e versatile per le famiglie.' },
  'Suite':               { tipo: 'Suite',        capacita: 2, lettiExtra: 2, descrizione: 'Camera da letto e soggiorno separati, vista panoramica.' },
  'Camera accessibile':  { tipo: 'Accessibile',  capacita: 2, lettiExtra: 0, descrizione: 'Spazi di manovra, maniglioni di sostegno e bagno senza barriere.' },
  'DUS':                 { tipo: 'DUS',          capacita: 1, lettiExtra: 0, descrizione: 'Doppia a uso singola.' },
}

const PIANI_NOMI = ['Piano terra', 'Primo piano', 'Secondo piano', 'Terzo piano', 'Quarto piano', 'Quinto piano', 'Sesto piano', 'Settimo piano', 'Ottavo piano', 'Nono piano', 'Decimo piano']
const nomePiano = (n: number) => PIANI_NOMI[n] ?? `Piano ${n}`
const pianoBreve = (nome: string) => {
  const i = PIANI_NOMI.indexOf(nome)
  return i === 0 ? 'PT' : i > 0 ? `${i}°` : nome
}

function tipologieDemo(scheda: { camere: number; seme: number; categoria: string }): TipologiaCamera[] {
  const nomi = Object.keys(BASE)
  const conta = new Map<string, number>()
  const piani = new Map<string, Set<number>>()
  const n = Math.max(scheda.camere, nomi.length)
  const perPiano = n <= 8 ? n : n <= 40 ? 10 : n <= 100 ? 16 : 25
  const totPiani = Math.ceil(n / perPiano)
  for (let i = 0; i < n; i++) {
    // Le camere "una per tipologia" sono sparse sui piani, le altre seguono la numerazione.
    const piano = i < nomi.length ? 1 + (i % totPiani) : 1 + Math.floor(i / perPiano)
    const ultimo = piano === totPiani
    const tip = i < nomi.length ? nomi[(i * 5 + scheda.seme) % nomi.length]
      : scheda.categoria === 'studentato' ? (i % 4 === 0 ? 'Twin Classic' : 'Singola Classic')
      : ultimo && i % perPiano >= perPiano - 2 ? 'Suite' : TIP_GIRO[(scheda.seme + i * 7) % TIP_GIRO.length]
    conta.set(tip, (conta.get(tip) ?? 0) + 1)
    piani.set(tip, (piani.get(tip) ?? new Set()).add(piano))
  }
  return nomi.map((nome) => ({
    id: `tip-${scheda.seme}-${nome}`, nome, ...BASE[nome], numero: conta.get(nome) ?? 1,
    piani: Array.from(piani.get(nome) ?? []).sort((x, y) => x - y).map(nomePiano),
    nomeOnline: '', amenities: [], immagine: null, gallery: [], attiva: true,
  }))
}

let _seq = 0
const nuovoId = () => `tip-new-${Date.now()}-${++_seq}`
// Nuova tipologia dal catalogo (nome base → tipo, capacità, letti extra, descrizione).
const nuovaTipologia = (base: string): TipologiaCamera => ({
  id: nuovoId(), nome: base, ...BASE[base], numero: 1,
  nomeOnline: '', amenities: [], immagine: null, gallery: [], attiva: true,
})

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function InventarioCamere(_props: { navigate?: (p: string) => void } = {}) {
  // Strutture (con camere) del cliente corrente, a partire da quella selezionata in alto.
  const schede = useStruttureCliente()
  const strutture = useMemo(() => schede.filter((x) => x.camere > 0), [schede])
  const [strutturaNome, setStrutturaNome] = useStrutturaPagina()
  const scheda = strutture.find((s) => s.nome === strutturaNome)
  const pmsEsterno = scheda ? scheda.seme % 7 === 0 : false

  const salvate = useTipologieCamereStore((s) => s.salvate[strutturaNome])
  const salva = useTipologieCamereStore((s) => s.salva)
  const confirm = useConfirmStore((s) => s.confirm)

  const iniziali = useMemo(() => salvate ?? (scheda ? tipologieDemo(scheda) : []), [salvate, scheda])
  const [draft, setDraft] = useState<TipologiaCamera[]>(iniziali)
  // Il salvataggio dalla scheda camera aggiorna lo store: in quel caso la bozza
  // dell'elenco (eventuali altre modifiche non salvate) non va riallineata.
  const tieniBozza = useRef(false)
  useEffect(() => {
    if (tieniBozza.current) { tieniBozza.current = false; return }
    setDraft(iniziali)
  }, [iniziali])

  const [aperta, setAperta] = useState<string | null>(null)
  const [scheda_, setSchedaId] = useState<string | null>(null)
  const [errori, setErrori] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const salvatePerId = useMemo(() => new Map(iniziali.map((t) => [t.id, JSON.stringify(t)])), [iniziali])
  const modificata = (t: TipologiaCamera) => salvatePerId.get(t.id) !== JSON.stringify(t)
  const dirty = JSON.stringify(draft) !== JSON.stringify(iniziali)

  const update = (id: string, patch: Partial<TipologiaCamera>) => {
    setDraft((d) => d.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    if (patch.nome?.trim()) setErrori((e) => { const n = new Set(e); n.delete(id); return n })
  }
  const [picker, setPicker] = useState(false)
  const [piano, setPiano] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  useEffect(() => { setPiano(''); setTipoFiltro('') }, [strutturaNome])
  const pianiUsati = useMemo(() => {
    const usati = new Set(draft.flatMap((t) => t.piani ?? []))
    return PIANI_NOMI.filter((x) => usati.has(x)).concat(Array.from(usati).filter((x) => !PIANI_NOMI.includes(x)))
  }, [draft])
  const visibili = draft.filter((t) => (!piano || (t.piani ?? []).includes(piano)) && (!tipoFiltro || t.tipo === tipoFiltro))
  // Scelta dal catalogo → la tipologia entra in bozza e si apre subito la pagina
  // di allestimento; Annulla la scarta, Applica torna all'elenco sulla riga nuova.
  // Allestisci → la camera nuova vive solo nella scheda finché non viene salvata;
  // Salva (nuova o modifica) la registra subito e la porta nell'elenco.
  const [nuova, setNuova] = useState<TipologiaCamera | null>(null)
  const [vaiA, setVaiA] = useState<string | null>(null)
  const aggiungi = (base: string) => {
    const t = nuovaTipologia(base)
    setPicker(false)
    setPiano('')
    setTipoFiltro('')
    setNuova(t)
    setSchedaId(t.id)
  }
  const chiudiScheda = () => {
    setNuova(null)
    setSchedaId(null)
  }
  const salvaScheda = (upd: TipologiaCamera) => {
    const upsert = (list: TipologiaCamera[]) => (list.some((t) => t.id === upd.id) ? list.map((t) => (t.id === upd.id ? upd : t)) : [...list, upd])
    tieniBozza.current = true
    salva(strutturaNome, upsert(iniziali))
    setDraft(upsert)
    toast.success(nuova?.id === upd.id ? `Camera "${upd.nome}" aggiunta all'inventario.` : `Camera "${upd.nome}" salvata.`)
    setNuova(null)
    setSchedaId(null)
    setVaiA(upd.id)
  }
  useEffect(() => {
    if (!vaiA || scheda_) return
    document.getElementById(`invc-row-${vaiA}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setVaiA(null)
  }, [vaiA, scheda_])
  const duplica = (id: string) => setDraft((d) => {
    const i = d.findIndex((t) => t.id === id)
    const copia = { ...d[i], id: nuovoId(), nome: `${d[i].nome} (copia)` }
    return [...d.slice(0, i + 1), copia, ...d.slice(i + 1)]
  })
  const elimina = async (t: TipologiaCamera) => {
    const ok = await confirm({ message: <>Eliminare la tipologia <strong>{t.nome || 'senza nome'}</strong>? Le camere associate restano da riassegnare.</> })
    if (ok) setDraft((d) => d.filter((x) => x.id !== t.id))
  }
  const sposta = (from: string, to: string) => setDraft((d) => {
    const src = d.findIndex((t) => t.id === from)
    const dst = d.findIndex((t) => t.id === to)
    if (src < 0 || dst < 0 || src === dst) return d
    const next = [...d]
    const [x] = next.splice(src, 1)
    next.splice(dst, 0, x)
    return next
  })

  const annulla = () => { setDraft(iniziali); setErrori(new Set()); setAperta(null) }
  const salvaTutto = () => {
    const vuote = draft.filter((t) => !t.nome.trim()).map((t) => t.id)
    if (vuote.length) {
      setErrori(new Set(vuote))
      toast.error('Dai un nome a tutte le tipologie prima di salvare.')
      return
    }
    salva(strutturaNome, draft)
    setAperta(null)
    toast.success(`Tipologie di ${strutturaNome} salvate.`)
  }

  const inScheda = nuova?.id === scheda_ ? nuova : draft.find((t) => t.id === scheda_)
  if (inScheda) {
    return (
      <ConfigurazioneCamera key={inScheda.id} tipologia={inScheda} nuova={inScheda === nuova}
        pianiDisponibili={pianiUsati.length ? pianiUsati : PIANI_NOMI.slice(0, 3)}
        onBack={chiudiScheda} onSave={salvaScheda} />
    )
  }

  const camere = draft.reduce((s, t) => s + (t.attiva ? t.numero : 0), 0)
  const attive = draft.filter((t) => t.attiva).length

  return (
    <div className="invc">
      <PageHead title="Inventario camere" subtitle="Tipologie di camera della struttura: numero, capacità e letti extra" />

      <div className="invc__bar">
        <div className="invc__filters">
          <SelectField name="struttura" label="Struttura" className="invc__select" value={strutturaNome} onChange={(e) => setStrutturaNome(e.target.value)}
          options={strutture.map((s) => ({ value: s.nome, label: s.nome }))} />
          <SelectField name="piano" label="Piano" className="invc__select invc__select--sm" value={piano} onChange={(e) => setPiano(e.target.value)}
            options={[{ value: '', label: 'Tutti' }, ...pianiUsati.map((x) => ({ value: x, label: x }))]} />
          <SelectField name="tipologia" label="Tipologia camera" className="invc__select invc__select--sm" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
            options={[{ value: '', label: 'Tutte' }, ...TIPI.map((x) => ({ value: x, label: x }))]} />
        </div>
        <Tooltip text={pmsEsterno ? 'Non disponibile con PMS esterno per questa struttura' : 'Allestisci una nuova tipologia di camera'}>
          <button type="button" className="sib-btn sib-btn--primary" disabled={pmsEsterno} onClick={() => setPicker(true)}>
            <i className="fa-light fa-wand-magic-sparkles" /> Allestisci
          </button>
        </Tooltip>
      </div>

      {pmsEsterno && (
        <AlertBanner type="info">Questa struttura usa un PMS esterno: l'inventario arriva dal PMS e non è modificabile da qui.</AlertBanner>
      )}

      <section className="invc__panel">
        <header className="invc__panel-head">
          <h3 className="invc__panel-title">Tipologie inserite <span className="invc__panel-count">{piano || tipoFiltro ? `${visibili.length} di ${draft.length}` : draft.length}</span></h3>
          <span className={'invc__state' + (dirty ? ' invc__state--draft' : '')}>{dirty ? 'In bozza' : 'Salvato'}</span>
        </header>

        {visibili.length === 0 ? (
          <div className="sib-empty">{draft.length === 0 ? 'Nessuna tipologia: allestiscine una per iniziare.' : 'Nessuna tipologia per i filtri selezionati.'}</div>
        ) : (
          <ul className="invc__list">
            {visibili.map((t) => (
              <TipologiaRow key={t.id} t={t} disabled={pmsEsterno}
                aperta={aperta === t.id} evidenziata={modificata(t)} errore={errori.has(t.id)}
                dragging={dragId === t.id} over={overId === t.id && dragId !== t.id}
                onChange={(p) => update(t.id, p)}
                onToggleDettagli={() => setAperta((a) => (a === t.id ? null : t.id))}
                onScheda={() => setSchedaId(t.id)}
                onDuplica={() => duplica(t.id)}
                onElimina={() => elimina(t)}
                onDragStart={() => setDragId(t.id)}
                onDragEnter={() => { if (dragId) { setOverId(t.id); sposta(dragId, t.id) } }}
                onDragEnd={() => { setDragId(null); setOverId(null) }} />
            ))}
          </ul>
        )}

        <footer className="invc__panel-foot">
          <span className="invc__summary">{attive} tipologie attive · <strong>{camere}</strong> camere in vendita</span>
          <span className="invc__foot-acts">
            <button type="button" className="sib-btn sib-btn--secondary" disabled={!dirty} onClick={annulla}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" disabled={!dirty || pmsEsterno} onClick={salvaTutto}>
              <i className="fa-light fa-floppy-disk" /> Salva
            </button>
          </span>
        </footer>
      </section>

      <Modal open={picker} onClose={() => setPicker(false)} title="Allestisci tipologia" size="xl">
        <p className="invc-pick__hint">Scegli la tipologia di partenza: capacità, letti extra e descrizione si possono modificare dopo.</p>
        <div className="invc-pick">
          {Object.entries(BASE).map(([nome, b]) => (
            <button key={nome} type="button" className="invc-pick__card" onClick={() => aggiungi(nome)}>
              <RoomIllustration tipo={b.tipo} lettiExtra={b.lettiExtra} className="invc-pick__ill" />
              <span className="invc-pick__body">
                <span className="invc-pick__title">{nome}</span>
                <span className="invc-pick__desc">{b.descrizione}</span>
                <span className="invc-pick__cap">
                  <i className="fa-solid fa-user-group" /> {ospiti(b.capacita)}{b.lettiExtra > 0 && ` + ${lettiExtra(b.lettiExtra)}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

// ─── Riga tipologia ───────────────────────────────────────────────────────────

interface RowProps {
  t: TipologiaCamera
  disabled: boolean
  aperta: boolean
  evidenziata: boolean
  errore: boolean
  dragging: boolean
  over: boolean
  onChange: (p: Partial<TipologiaCamera>) => void
  onToggleDettagli: () => void
  onScheda: () => void
  onDuplica: () => void
  onElimina: () => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}

function TipologiaRow({ t, disabled, aperta, evidenziata, errore, dragging, over, onChange, onToggleDettagli, onScheda, onDuplica, onElimina, onDragStart, onDragEnter, onDragEnd }: RowProps) {
  // La riga è trascinabile solo partendo dalla maniglia, così i campi restano selezionabili.
  const [armata, setArmata] = useState(false)
  const totale = t.capacita + t.lettiExtra

  return (
    <li
      id={`invc-row-${t.id}`}
      className={'invc__row' + (evidenziata ? ' invc__row--draft' : '') + (dragging ? ' invc__row--dragging' : '') + (over ? ' invc__row--over' : '') + (t.attiva ? '' : ' invc__row--off')}
      draggable={armata && !disabled}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={() => { setArmata(false); onDragEnd() }}
    >
      <Letti tipo={t.tipo} capacita={t.capacita} extra={t.lettiExtra} />

      <Tooltip text="Trascina per riordinare">
        <span className="invc__handle" onMouseDown={() => setArmata(true)} onMouseUp={() => setArmata(false)}>
          <i className="fa-solid fa-grip-dots-vertical" />
        </span>
      </Tooltip>

      <div className="invc__main">
        <div className="invc__fields">
          <InputField name={`nome-${t.id}`} label="Nome tipologia" placeholder="Es. Doppia con letto aggiunto" className="invc__f-nome"
            value={t.nome} disabled={disabled} error={errore ? 'Obbligatorio' : undefined} onChange={(e) => onChange({ nome: e.target.value })} />
          <SelectField name={`tipo-${t.id}`} label="Tipo" className="invc__f-tipo" value={t.tipo} disabled={disabled}
            options={TIPI.map((x) => ({ value: x, label: x }))} onChange={(e) => onChange({ tipo: e.target.value })} />
          <InputField name={`numero-${t.id}`} label="N. camere" type="number" min={0} className="invc__f-num" value={t.numero} disabled={disabled}
            onChange={(e) => onChange({ numero: Math.max(0, Number(e.target.value) || 0) })} />
          <SelectField name={`cap-${t.id}`} label="Capacità" className="invc__f-cap" value={t.capacita} disabled={disabled}
            options={Array.from({ length: MAX_CAPACITA }, (_, i) => ({ value: i + 1, label: ospiti(i + 1) }))}
            onChange={(e) => onChange({ capacita: Number(e.target.value) })} />
          <SelectField name={`extra-${t.id}`} label="Letti extra" className="invc__f-extra" value={t.lettiExtra} disabled={disabled}
            options={Array.from({ length: MAX_LETTI_EXTRA + 1 }, (_, i) => ({ value: i, label: i === 0 ? 'Nessuno' : String(i) }))}
            onChange={(e) => onChange({ lettiExtra: Number(e.target.value) })} />
          <div className="invc__acts">
            <Tooltip text={disabled ? 'Non modificabile con PMS esterno' : 'Modifica camera'}>
              <button type="button" className="invc__edit" aria-label="Modifica camera" disabled={disabled} onClick={onScheda}>
                <i className="fa-solid fa-pen" />
              </button>
            </Tooltip>
            <Tooltip text={t.attiva ? 'Disattiva tipologia' : 'Attiva tipologia'}>
              <span className="invc__active">
                <ToggleSwitch label={t.attiva ? 'Attiva' : 'Inattiva'} checked={t.attiva} disabled={disabled} onChange={(v) => onChange({ attiva: v })} />
              </span>
            </Tooltip>
            <RowMenu disabled={disabled} onDuplica={onDuplica} onElimina={onElimina} />
          </div>
        </div>

        <div className="invc__meta">
          <span className="invc__cap">
            <i className="fa-solid fa-user-group" /> Fino a <strong>{ospiti(totale)}</strong>{t.lettiExtra > 0 && ` (${t.capacita}+${t.lettiExtra})`}
          </span>
          {!!t.piani?.length && (
            <Tooltip text={t.piani.join(', ')}>
              <span className="invc__cap"><i className="fa-solid fa-layer-group" /> Piani {t.piani.map(pianoBreve).join(' · ')}</span>
            </Tooltip>
          )}
          {t.descrizione && <span className="invc__desc">{t.descrizione}</span>}
          <button type="button" className={'invc__toggle-det' + (aperta ? ' is-open' : '')} aria-expanded={aperta}
            aria-controls={`invc-det-${t.id}`} onClick={onToggleDettagli}>
            Dettagli camera <i className="fa-solid fa-chevron-down" />
          </button>
        </div>

        {aperta && <DettagliCamera t={t} disabled={disabled} onModifica={onScheda} onClose={onToggleDettagli} />}
      </div>

    </li>
  )
}

// Illustrazione della tipologia (con brandina se ci sono letti extra).
function Letti({ tipo, capacita, extra }: { tipo: string; capacita: number; extra: number }) {
  return (
    <div className="invc__beds">
      <Tooltip text={`${tipo} · ${ospiti(capacita)}${extra ? ` + ${lettiExtra(extra)}` : ''}`}>
        <RoomIllustration tipo={tipo} lettiExtra={extra} fill />
      </Tooltip>
    </div>
  )
}

// Riepilogo in sola lettura di quanto inserito nella scheda camera.
function DettagliCamera({ t, disabled, onModifica, onClose }: { t: TipologiaCamera; disabled: boolean; onModifica: () => void; onClose: () => void }) {
  const immagini = [t.immagine, ...t.gallery].filter((x): x is string => !!x)
  const vuoto = <span className="invc__dd-empty">Non indicato</span>
  return (
    <div className="invc__details" id={`invc-det-${t.id}`}>
      <div className="invc__details-head">
        <span className="invc__details-title"><i className="fa-light fa-circle-info" /> Dettagli camera</span>
        <Tooltip text="Chiudi dettagli">
          <button type="button" className="invc__details-close" aria-label="Chiudi dettagli" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </Tooltip>
      </div>
      <dl className="invc__dl">
        <div><dt>Nome sui canali online</dt><dd>{t.nomeOnline || vuoto}</dd></div>
        <div><dt>Tipo</dt><dd>{t.tipo}</dd></div>
        <div><dt>N. camere</dt><dd>{t.numero}</dd></div>
        <div><dt>Ospiti</dt><dd>{ospiti(t.capacita)}{t.lettiExtra > 0 && ` + ${lettiExtra(t.lettiExtra)}`}</dd></div>
        <div className="invc__dl-wide"><dt>Piani</dt><dd>{t.piani?.length ? t.piani.join(', ') : vuoto}</dd></div>
        <div className="invc__dl-full"><dt>Descrizione</dt><dd>{t.descrizione || vuoto}</dd></div>
        <div className="invc__dl-full">
          <dt>Caratteristiche{t.amenities.length > 0 && ` (${t.amenities.length})`}</dt>
          <dd>
            {t.amenities.length ? (
              <span className="invc__chips">{t.amenities.map((a) => <span key={a} className="invc__chip"><i className="fa-solid fa-check" /> {a}</span>)}</span>
            ) : <span className="invc__dd-empty">Nessuna caratteristica selezionata</span>}
          </dd>
        </div>
        <div className="invc__dl-full">
          <dt>Immagini</dt>
          <dd>
            {immagini.length ? (
              <span className="invc__thumbs">
                {immagini.map((src, i) => <img key={i} src={src} alt={i === 0 && t.immagine ? 'Immagine principale' : `Immagine ${i + 1}`} className={i === 0 && t.immagine ? 'is-main' : ''} />)}
              </span>
            ) : <span className="invc__dd-empty">Nessuna immagine caricata</span>}
          </dd>
        </div>
      </dl>
      {!disabled && (
        <button type="button" className="invc__link invc__details-edit" onClick={onModifica}>
          <i className="fa-light fa-pen" /> Modifica camera
        </button>
      )}
    </div>
  )
}

function RowMenu({ disabled, onDuplica, onElimina }: { disabled: boolean; onDuplica: () => void; onElimina: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="invc__menu-wrap" ref={ref}>
      <Tooltip text="Altre azioni">
        <button type="button" className="invc__kebab" aria-label="Altre azioni" aria-expanded={open} disabled={disabled} onClick={() => setOpen((v) => !v)}>
          <i className="fa-solid fa-ellipsis-vertical" />
        </button>
      </Tooltip>
      {open && (
        <div className="invc__menu" role="menu">
          <button type="button" role="menuitem" className="invc__menu-item" onClick={() => { setOpen(false); onDuplica() }}>
            <i className="fa-light fa-copy" /> Duplica
          </button>
          <button type="button" role="menuitem" className="invc__menu-item invc__menu-item--danger" onClick={() => { setOpen(false); onElimina() }}>
            <i className="fa-light fa-trash-can" /> Elimina
          </button>
        </div>
      )}
    </div>
  )
}
