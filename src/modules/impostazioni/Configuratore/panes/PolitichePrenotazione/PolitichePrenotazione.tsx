import React, { useEffect, useRef, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import Modal from '../../../../../core/components/Modal'
import Ico from '../../../../../core/icons/Ico'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgTable, CfgSaveBar, type CfgColumn } from '../../../../../core/cfg'
import { InputField, SelectField, TextareaField, RadioGroup, CheckboxField, ToggleSwitch } from '../../../../../core/components/form'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { toast } from '../../../../../core/components/Toast/useToast'
import { buildDocumentoHtml, type DocumentoData } from './documentoHtml'
import './PolitichePrenotazione.sass'

/**
 * Politiche di prenotazione (Configuratore) — tre sezioni:
 *  1. Politiche di prenotazione — le regole di vendita (pagamenti, penali di
 *     cancellazione, mancato arrivo) con l'Ambito di applicazione; ogni regola
 *     genera un documento HTML impaginato consultabile dall'ospite.
 *  2. Termini e condizioni — libreria di testi legali multilingua, GLOBALE e
 *     VERSIONATA: le politiche referenziano un testo per id, ogni modifica ai
 *     testi crea una nuova versione.
 *  3. Gratuità e concessioni — ospiti non paganti al raggiungimento di una
 *     soglia di paganti (solo tariffe per persona).
 */

// ─── Modello dati ─────────────────────────────────────────────────────────────

type Ambito = 'tutte' | 'b2c' | 'b2b' | 'gruppi'

const AMBITO_SHORT: Record<Ambito, string> = {
  tutte: 'Tutte', b2c: 'B2C', b2b: 'B2B', gruppi: 'Gruppi',
}
const AMBITO_FULL: Record<Ambito, string> = {
  tutte:  'Tutte le vendite',
  b2c:    'Vendite dirette (B2C)',
  b2b:    'Canale B2B',
  gruppi: 'Gruppi',
}
const AMBITO_OPTIONS = (Object.keys(AMBITO_FULL) as Ambito[]).map((a) => ({ value: a, label: AMBITO_FULL[a] }))

interface Politica {
  Id: number
  Nome: string
  Ambito: Ambito
  Descrizione: string
  /** Riferimento alla libreria "Termini e condizioni" (null = nessun testo associato). */
  TerminiId: number | null
  PagamentiAbilitati: boolean
  RichiediCartaGaranzia: boolean
  CancellazioneAbilitata: boolean
  MancatoArrivoAbilitato: boolean
  MancatoArrivoPercentuale: number
  TestoIt: string
  TestoEn: string
  Attivo: boolean
  DocumentoHtml?: string
  DocumentoGeneratoIl?: string
}

/** Testo globale multilingua, riutilizzabile e versionato. */
interface Termine {
  id: number
  nome: string
  descrizione: string
  versione: number
  attivo: boolean
  testoIt: string
  testoEn: string
  aggiornatoIl: string
}

type ApplicaA = 'tutti' | 'adulti' | 'ragazzi' | 'bambini'

const APPLICA_LABELS: Record<ApplicaA, string> = {
  tutti: 'Tutti gli ospiti', adulti: 'Adulti', ragazzi: 'Ragazzi', bambini: 'Bambini',
}

/** Regola di gratuità: ogni N paganti, M ospiti non pagano (solo tariffe per persona). */
interface Gratuita {
  id: number
  nome: string
  ambito: Ambito
  ogniPaganti: number
  gratuite: number
  applicaA: ApplicaA
  attiva: boolean
}

// ─── Dati di esempio (fallback senza backend) ─────────────────────────────────

const TERMINI_FALLBACK: Termine[] = [
  {
    id: 1, nome: 'Cancellazione flessibile', versione: 3, attivo: true, aggiornatoIl: '12/06/2026',
    descrizione: 'Cancellazione gratuita fino a 3 giorni prima dell’arrivo, nessun anticipo.',
    testoIt: 'Cancellazione gratuita fino a 3 giorni prima dell’arrivo. Nessun anticipo richiesto alla prenotazione.',
    testoEn: 'Free cancellation up to 3 days before arrival. No advance payment required at the time of booking.',
  },
  {
    id: 2, nome: 'Non rimborsabile', versione: 2, attivo: true, aggiornatoIl: '03/04/2026',
    descrizione: 'Addebito integrale alla prenotazione, nessun rimborso in caso di cancellazione.',
    testoIt: 'Tariffa non rimborsabile: l’intero importo viene addebitato alla prenotazione e non è previsto alcun rimborso in caso di cancellazione.',
    testoEn: 'Non-refundable rate: the full amount is charged at booking and no refund applies in case of cancellation.',
  },
  {
    id: 3, nome: 'Caparra confirmatoria 30%', versione: 1, attivo: true, aggiornatoIl: '03/04/2026',
    descrizione: 'Acconto del 30% alla prenotazione, saldo all’arrivo.',
    testoIt: 'È richiesto un acconto del 30% alla prenotazione a titolo di caparra confirmatoria. Il saldo è dovuto all’arrivo.',
    testoEn: 'A 30% deposit is required at booking as a confirmatory deposit. The balance is due on arrival.',
  },
  {
    id: 4, nome: 'Condizioni gruppi', versione: 1, attivo: false, aggiornatoIl: '28/08/2026',
    descrizione: 'Rooming list, acconti scaglionati e release date per i gruppi. In lavorazione.',
    testoIt: 'Per i gruppi sono previsti acconti scaglionati e l’invio della rooming list entro la release date concordata.',
    testoEn: 'For groups, staged deposits apply and the rooming list must be sent by the agreed release date.',
  },
]

const POLITICHE_FALLBACK: Politica[] = [
  {
    Id: 1, Nome: 'Prenota libero', Ambito: 'tutte',
    Descrizione: 'Nessun vincolo: senza anticipo, carta o penali. La politica di benvenuto.',
    TerminiId: 1, PagamentiAbilitati: false, RichiediCartaGaranzia: false,
    CancellazioneAbilitata: false, MancatoArrivoAbilitato: false, MancatoArrivoPercentuale: 0,
    TestoIt: 'Non è richiesto alcun anticipo e non sono previste penali di cancellazione o di mancato arrivo.',
    TestoEn: 'No deposit is required and no cancellation or no-show penalties apply.',
    Attivo: true,
  },
  {
    Id: 2, Nome: 'Non rimborsabile', Ambito: 'b2c',
    Descrizione: 'Tariffa scontata con addebito immediato: nessun rimborso in caso di cancellazione.',
    TerminiId: 2, PagamentiAbilitati: true, RichiediCartaGaranzia: true,
    CancellazioneAbilitata: false, MancatoArrivoAbilitato: true, MancatoArrivoPercentuale: 100,
    TestoIt: 'L’intero importo viene addebitato alla conferma. In caso di mancata presentazione è prevista una penale del 100,00%.',
    TestoEn: 'The full amount is charged at confirmation. In case of no-show a 100.00% penalty applies.',
    Attivo: true,
  },
  {
    Id: 3, Nome: 'Acconto 50%', Ambito: 'b2b',
    Descrizione: 'Metà dell’importo alla conferma, saldo all’arrivo; penali su cancellazioni tardive.',
    TerminiId: 3, PagamentiAbilitati: true, RichiediCartaGaranzia: false,
    CancellazioneAbilitata: true, MancatoArrivoAbilitato: true, MancatoArrivoPercentuale: 75,
    TestoIt: 'È richiesto un acconto del 50% alla conferma. Sono previste penali di cancellazione e una penale di mancato arrivo del 75,00%.',
    TestoEn: 'A 50% deposit is due at confirmation. Cancellation penalties apply and the no-show penalty is 75.00%.',
    Attivo: true,
  },
  {
    Id: 4, Nome: 'Pagamento a rate', Ambito: 'b2c',
    Descrizione: 'Il soggiorno si paga in comode rate fino alla data di arrivo.',
    TerminiId: 1, PagamentiAbilitati: true, RichiediCartaGaranzia: false,
    CancellazioneAbilitata: true, MancatoArrivoAbilitato: true, MancatoArrivoPercentuale: 100,
    TestoIt: 'Il soggiorno può essere saldato a rate fino alla data di arrivo, secondo il piano concordato alla prenotazione.',
    TestoEn: 'The stay can be paid in instalments up to the arrival date, according to the plan agreed at booking.',
    Attivo: false,
  },
]

const GRATUITA_FALLBACK: Gratuita[] = [
  { id: 1, nome: 'Gruppi scolastici',  ambito: 'gruppi', ogniPaganti: 20, gratuite: 1, applicaA: 'ragazzi', attiva: true },
  { id: 2, nome: 'Famiglie in diretta', ambito: 'b2c',   ogniPaganti: 2,  gratuite: 1, applicaA: 'bambini', attiva: false },
]

const EMPTY_POLITICA: Politica = {
  Id: 0, Nome: '', Ambito: 'tutte', Descrizione: '', TerminiId: null,
  PagamentiAbilitati: false, RichiediCartaGaranzia: false,
  CancellazioneAbilitata: false,
  MancatoArrivoAbilitato: false, MancatoArrivoPercentuale: 0,
  TestoIt: '', TestoEn: '', Attivo: true,
}

const EMPTY_TERMINE: Termine = {
  id: 0, nome: '', descrizione: '', versione: 1, attivo: true, testoIt: '', testoEn: '', aggiornatoIl: '',
}

const EMPTY_GRATUITA: Gratuita = {
  id: 0, nome: '', ambito: 'tutte', ogniPaganti: 10, gratuite: 1, applicaA: 'tutti', attiva: true,
}

const pct = (n: number) => `${n.toFixed(2).replace('.', ',')}%`

/** Genera i testi IT/EN della politica a partire dalle condizioni scelte. */
function generaTesti(f: Politica): { it: string; en: string } {
  const it: string[] = []
  const en: string[] = []

  it.push(`La politica si applica a: ${AMBITO_FULL[f.Ambito].toLowerCase()}.`)
  en.push(`This policy applies to: ${AMBITO_FULL[f.Ambito].toLowerCase()}.`)

  if (f.PagamentiAbilitati) {
    it.push('È prevista la programmazione dei pagamenti, con un anticipo alla conferma della prenotazione.')
    en.push('Payment scheduling applies, with an advance payment at booking confirmation.')
  } else {
    it.push('Non è richiesto alcun anticipo: il saldo dovuto alla prenotazione è pari a 0%.')
    en.push('No advance payment is required: the balance due at booking is 0%.')
  }

  if (f.RichiediCartaGaranzia) {
    it.push('Per confermare la prenotazione è richiesta una carta di credito a garanzia.')
    en.push('A credit card guarantee is required to confirm the booking.')
  } else {
    it.push('Non è necessaria una carta di pagamento per confermare la prenotazione.')
    en.push('No payment card is needed to confirm the booking.')
  }

  if (f.CancellazioneAbilitata) {
    it.push('In caso di cancellazione si applicano le penali indicate nelle condizioni.')
    en.push('In case of cancellation, the penalties stated in the conditions apply.')
  } else {
    it.push('La cancellazione è gratuita: non è prevista alcuna penale.')
    en.push('Cancellation is free of charge: no penalty applies.')
  }

  if (f.MancatoArrivoAbilitato) {
    it.push(`In caso di mancata presentazione (no-show) si applica una penale del ${pct(f.MancatoArrivoPercentuale)}.`)
    en.push(`In case of no-show a penalty of ${pct(f.MancatoArrivoPercentuale)} applies.`)
  } else {
    it.push('Non è prevista alcuna penale per mancata presentazione (no-show).')
    en.push('No penalty applies in case of no-show.')
  }

  return { it: it.join(' '), en: en.join(' ') }
}

const SN = [{ value: '1', label: 'Sì' }, { value: '0', label: 'No' }]

// ─── Colonne (colgroup in %: mai scroll orizzontale) ──────────────────────────

const COLS_POLITICHE: CfgColumn[] = [
  { key: 'nome',    label: 'Nome',        width: '14%' },
  { key: 'ambito',  label: 'Ambito',      width: '9%'  },
  { key: 'descr',   label: 'Descrizione', width: '17%' },
  { key: 'pag',     label: 'Pagamenti',   width: '10%', align: 'center' },
  { key: 'canc',    label: <TruncatedText text="Cancellaz." full="Cancellazione" />, width: '10%', align: 'center' },
  { key: 'noshow',  label: <TruncatedText text="M. arrivo" full="Mancato arrivo" />, width: '10%', align: 'center' },
  { key: 'termini', label: 'Termini',     width: '17%' },
  { key: 'azioni',  label: 'Azioni',      width: '13%', align: 'center' },
]

const COLS_TERMINI: CfgColumn[] = [
  { key: 'nome',     label: 'Nome',        width: '20%' },
  { key: 'descr',    label: 'Descrizione', width: '40%' },
  { key: 'versione', label: 'Versione',    width: '10%', align: 'center' },
  { key: 'stato',    label: 'Stato',       width: '15%' },
  { key: 'azioni',   label: 'Azioni',      width: '15%', align: 'center' },
]

const COLS_GRATUITA: CfgColumn[] = [
  { key: 'attiva',   label: 'Attiva',       width: '8%',  align: 'center' },
  { key: 'nome',     label: 'Regola',       width: '20%' },
  { key: 'ambito',   label: 'Ambito',       width: '12%' },
  { key: 'regola',   label: 'Concessione',  width: '28%' },
  { key: 'applicaA', label: 'Applicata a',  width: '18%' },
  { key: 'azioni',   label: 'Azioni',       width: '14%', align: 'center' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PolitichePrenotazione() {
  const [politiche, setPolitiche] = useState<Politica[]>(POLITICHE_FALLBACK)
  const [termini, setTermini]     = useState<Termine[]>(TERMINI_FALLBACK)
  const [gratuite, setGratuite]   = useState<Gratuita[]>(GRATUITA_FALLBACK)

  const [editing, setEditing]           = useState<Politica | null>(null)
  const [editingTermine, setEditingTermine]   = useState<Termine | null>(null)
  const [editingGratuita, setEditingGratuita] = useState<Gratuita | null>(null)
  const [preview, setPreview] = useState<{ nome: string; html: string } | null>(null)
  // l'anteprima nel form è disponibile solo dopo aver cliccato "Genera testi"
  const [generated, setGenerated] = useState(false)

  const confirm       = useConfirmStore((s) => s.confirm)
  const markDirty     = useConfiguratoreStore((s) => s.markDirty)
  const resetDirty    = useConfiguratoreStore((s) => s.resetDirty)
  const setCompletion = useConfiguratoreStore((s) => s.setCompletion)

  // ── Dirty state: n° di operazioni dall'ultimo salvataggio + snapshot per Annulla
  const [pending, setPending] = useState(0)
  const snapshot = useRef({ politiche: POLITICHE_FALLBACK, termini: TERMINI_FALLBACK, gratuite: GRATUITA_FALLBACK })
  const bump = () => setPending((p) => p + 1)

  useEffect(() => { markDirty('politiche-prenotazione', pending) }, [pending, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ Politiche: Politica[]; Termini: Termine[]; Gratuita: Gratuita[] }>(
      'configura/GetPolitichePrenotazione', { method: 'POST', body: {} },
    )
      .then((d) => {
        if (cancelled || !d?.Politiche?.length) return
        setPolitiche(d.Politiche)
        if (d.Termini?.length) setTermini(d.Termini)
        if (d.Gratuita?.length) setGratuite(d.Gratuita)
        snapshot.current = { politiche: d.Politiche, termini: d.Termini ?? TERMINI_FALLBACK, gratuite: d.Gratuita ?? GRATUITA_FALLBACK }
      })
      .catch(() => { /* mantiene i dati di esempio */ })
    return () => { cancelled = true }
  }, [])

  // ── Documento HTML (logica conservata: buildDocumentoHtml) ──────────────────

  const termineOf = (id: number | null) => termini.find((t) => t.id === id) ?? null

  /** Dati del documento: testi della politica + testo dei Termini referenziati. */
  const docDataOf = (p: Politica): DocumentoData => {
    const t = termineOf(p.TerminiId)
    return {
      ...p,
      TerminiNome: t ? `${t.nome} · v${t.versione}` : '',
      TestoIt: [p.TestoIt, t?.testoIt].filter(Boolean).join('\n\n'),
      TestoEn: [p.TestoEn, t?.testoEn].filter(Boolean).join('\n\n'),
    }
  }

  const docHtmlOf = (p: Politica) => p.DocumentoHtml || buildDocumentoHtml(docDataOf(p), p.DocumentoGeneratoIl)

  const openPreview = (nome: string, html: string) => setPreview({ nome, html })

  const openInNewTab = (html: string) => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  // ── Sezione 1 · Politiche ────────────────────────────────────────────────────

  const upd = (patch: Partial<Politica>) => setEditing((e) => (e ? { ...e, ...patch } : e))

  const openEditor = (p: Politica) => { setGenerated(false); setEditing(p) }

  const genera = () => {
    if (!editing) return
    const { it, en } = generaTesti(editing)
    upd({ TestoIt: it, TestoEn: en })
    setGenerated(true)
    toast.success('Testi della politica generati (IT/EN)')
  }

  const requiredOk = !!editing && editing.Nome.trim() !== '' && editing.Descrizione.trim() !== ''
    && (!editing.MancatoArrivoAbilitato || editing.MancatoArrivoPercentuale > 0)
  const anteprimaReady = generated && requiredOk

  const savePolitica = () => {
    if (!editing) return
    if (!editing.Nome.trim()) { toast.warning('Inserisci un nome per la politica'); return }
    if (!editing.Descrizione.trim()) { toast.warning('Inserisci una descrizione'); return }
    const generatoIl = new Date().toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })
    const doc: Politica = { ...editing, DocumentoGeneratoIl: generatoIl }
    doc.DocumentoHtml = buildDocumentoHtml(docDataOf(doc), generatoIl)
    if (doc.Id) {
      setPolitiche((list) => list.map((p) => (p.Id === doc.Id ? doc : p)))
      toast.success(`Politica "${doc.Nome}" aggiornata · documento rigenerato`)
    } else {
      setPolitiche((list) => [...list, { ...doc, Id: Date.now() }])
      toast.success(`Politica "${doc.Nome}" creata · documento generato`)
    }
    bump()
    setEditing(null)
  }

  const removePolitica = async (p: Politica) => {
    const ok = await confirm({
      title: 'Elimina politica',
      message: `Eliminare la politica "${p.Nome}"? Il documento associato non sarà più raggiungibile.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    setPolitiche((list) => list.filter((x) => x.Id !== p.Id))
    bump()
    toast.success(`Politica "${p.Nome}" eliminata`)
  }

  // ── Sezione 2 · Termini e condizioni ─────────────────────────────────────────

  const saveTermine = () => {
    if (!editingTermine) return
    const t = editingTermine
    if (!t.nome.trim()) { toast.warning('Inserisci un nome per i termini'); return }
    if (!t.testoIt.trim() && !t.testoEn.trim()) { toast.warning('Inserisci almeno un testo (IT o EN)'); return }
    const oggi = new Date().toLocaleDateString('it-IT')
    if (t.id) {
      const prev = termini.find((x) => x.id === t.id)
      const testiCambiati = !!prev && (prev.testoIt !== t.testoIt || prev.testoEn !== t.testoEn)
      const next: Termine = { ...t, versione: testiCambiati ? t.versione + 1 : t.versione, aggiornatoIl: oggi }
      setTermini((list) => list.map((x) => (x.id === t.id ? next : x)))
      toast.success(testiCambiati
        ? `Termini "${next.nome}" aggiornati · nuova versione v${next.versione}`
        : `Termini "${next.nome}" aggiornati`)
    } else {
      setTermini((list) => [...list, { ...t, id: Date.now(), versione: 1, aggiornatoIl: oggi }])
      toast.success(`Termini "${t.nome}" creati (v1)`)
    }
    bump()
    setEditingTermine(null)
  }

  const removeTermine = async (t: Termine) => {
    const refs = politiche.filter((p) => p.TerminiId === t.id)
    if (refs.length > 0) {
      toast.warning(`"${t.nome}" è associato a ${refs.length === 1 ? '1 politica' : `${refs.length} politiche`}: scollega prima le politiche.`)
      return
    }
    const ok = await confirm({
      title: 'Elimina termini',
      message: `Eliminare "${t.nome}" (v${t.versione})? Tutte le versioni del testo andranno perse.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    setTermini((list) => list.filter((x) => x.id !== t.id))
    bump()
    toast.success(`Termini "${t.nome}" eliminati`)
  }

  const updT = (patch: Partial<Termine>) => setEditingTermine((e) => (e ? { ...e, ...patch } : e))

  // ── Sezione 3 · Gratuità e concessioni ───────────────────────────────────────

  const updG = (patch: Partial<Gratuita>) => setEditingGratuita((e) => (e ? { ...e, ...patch } : e))

  const fraseGratuita = (g: Gratuita) =>
    `${g.gratuite === 1 ? '1 gratuità' : `${g.gratuite} gratuità`} ogni ${g.ogniPaganti} paganti`

  const saveGratuita = () => {
    if (!editingGratuita) return
    const g = editingGratuita
    if (!g.nome.trim()) { toast.warning('Inserisci un nome per la regola'); return }
    if (g.ogniPaganti < 1 || g.gratuite < 1) { toast.warning('Paganti e gratuità devono essere almeno 1'); return }
    if (g.gratuite >= g.ogniPaganti) { toast.warning('Le gratuità devono essere meno dei paganti richiesti'); return }
    if (g.id) {
      setGratuite((list) => list.map((x) => (x.id === g.id ? g : x)))
      toast.success(`Regola "${g.nome}" aggiornata`)
    } else {
      setGratuite((list) => [...list, { ...g, id: Date.now() }])
      toast.success(`Regola "${g.nome}" creata`)
    }
    bump()
    setEditingGratuita(null)
  }

  const toggleGratuita = (g: Gratuita) => {
    setGratuite((list) => list.map((x) => (x.id === g.id ? { ...x, attiva: !x.attiva } : x)))
    bump()
  }

  const removeGratuita = async (g: Gratuita) => {
    const ok = await confirm({
      title: 'Elimina gratuità',
      message: `Eliminare la regola "${g.nome}" (${fraseGratuita(g)})?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    setGratuite((list) => list.filter((x) => x.id !== g.id))
    bump()
    toast.success(`Regola "${g.nome}" eliminata`)
  }

  // ── Salvataggio complessivo (save bar) ───────────────────────────────────────

  const saveAll = async () => {
    try {
      await apiFetchSibylla('configura/SetPolitichePrenotazione', {
        method: 'POST',
        body: { Politiche: politiche, Termini: termini, Gratuita: gratuite },
      })
    } catch { /* ambiente demo senza backend: lo stato resta quello locale */ }
    snapshot.current = { politiche, termini, gratuite }
    setPending(0)
    resetDirty()
    setCompletion('politiche-prenotazione',
      politiche.length > 0 && termini.length > 0 ? 'configured' : politiche.length > 0 ? 'partial' : 'empty')
  }

  const cancelAll = () => {
    setPolitiche(snapshot.current.politiche)
    setTermini(snapshot.current.termini)
    setGratuite(snapshot.current.gratuite)
    setPending(0)
    resetDirty()
    toast.info('Modifiche annullate')
  }

  const terminiOptions = [
    { value: '', label: 'Nessun testo associato' },
    ...termini.filter((t) => t.attivo).map((t) => ({ value: String(t.id), label: `${t.nome} · v${t.versione}` })),
  ]

  const boolCell = (on: boolean, labelOn: string, labelOff: string) => (
    on
      ? <Tooltip content={labelOn}><i className="fa-solid fa-circle-check politiche-prenotazione__check" aria-hidden="true" /></Tooltip>
      : <Tooltip content={labelOff}><span className="politiche-prenotazione__dash">—</span></Tooltip>
  )

  return (
    <div className="politiche-prenotazione">

      {/* ── 1 · Politiche di prenotazione ─────────────────────────────────────── */}
      <section className="politiche-prenotazione__section">
        <div className="politiche-prenotazione__section-head">
          <span className="politiche-prenotazione__section-ico"><i className="fa-light fa-clipboard-list" aria-hidden="true" /></span>
          <div className="politiche-prenotazione__section-titles">
            <h3 className="politiche-prenotazione__section-title">Politiche di prenotazione</h3>
            <p className="politiche-prenotazione__section-sub">
              Le regole applicate in fase di vendita: pagamenti, penali di cancellazione e mancato arrivo.
              Ogni politica genera un documento consultabile dall’ospite.
            </p>
          </div>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => openEditor({ ...EMPTY_POLITICA })}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Crea nuova regola
          </button>
        </div>

        <CfgTable
          columns={COLS_POLITICHE}
          empty={<span>Nessuna politica configurata: crea la prima regola per generare il documento di prenotazione.</span>}
        >
          {politiche.map((p) => {
            const t = termineOf(p.TerminiId)
            return (
              <tr key={p.Id} className={p.Attivo ? '' : 'politiche-prenotazione__row--off'}>
                <td>
                  <span className="politiche-prenotazione__name-cell">
                    <Tooltip content={p.Attivo ? 'Politica attiva' : 'Politica disattivata'}>
                      <span className={`politiche-prenotazione__dot ${p.Attivo ? 'is-on' : 'is-off'}`} aria-hidden="true" />
                    </Tooltip>
                    <TruncatedText text={p.Nome} className="politiche-prenotazione__trunc" />
                  </span>
                </td>
                <td><TruncatedText text={AMBITO_SHORT[p.Ambito]} full={AMBITO_FULL[p.Ambito]} className="politiche-prenotazione__trunc" /></td>
                <td>{p.Descrizione ? <TruncatedText text={p.Descrizione} className="politiche-prenotazione__trunc" /> : '—'}</td>
                <td className="politiche-prenotazione__col-c">
                  <span className="politiche-prenotazione__bool">
                    {boolCell(p.PagamentiAbilitati, 'Programmazione pagamenti prevista', 'Nessuna programmazione pagamenti')}
                    {p.RichiediCartaGaranzia && (
                      <Tooltip content="Carta di credito a garanzia richiesta">
                        <i className="fa-solid fa-credit-card politiche-prenotazione__card-ico" aria-hidden="true" />
                      </Tooltip>
                    )}
                  </span>
                </td>
                <td className="politiche-prenotazione__col-c">
                  {boolCell(p.CancellazioneAbilitata, 'Penali di cancellazione previste', 'Cancellazione senza penali')}
                </td>
                <td className="politiche-prenotazione__col-c">
                  {p.MancatoArrivoAbilitato
                    ? <Tooltip content={`Penale di mancato arrivo: ${pct(p.MancatoArrivoPercentuale)}`}><span className="politiche-prenotazione__pct-val">{pct(p.MancatoArrivoPercentuale)}</span></Tooltip>
                    : <Tooltip content="Nessuna penale di mancato arrivo"><span className="politiche-prenotazione__dash">—</span></Tooltip>}
                </td>
                <td>
                  {t
                    ? <TruncatedText text={`${t.nome} · v${t.versione}`} className="politiche-prenotazione__trunc" />
                    : '—'}
                </td>
                <td className="politiche-prenotazione__col-c">
                  <div className="politiche-prenotazione__actions-cell">
                    <Tooltip content="Documento della politica">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Documento della politica" onClick={() => openPreview(p.Nome, docHtmlOf(p))}>
                        <i className="fa-solid fa-eye" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Modifica">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => openEditor({ ...p })}>
                        <i className="fa-solid fa-pen" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Elimina">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => removePolitica(p)}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            )
          })}
        </CfgTable>
      </section>

      {/* ── 2 · Termini e condizioni ──────────────────────────────────────────── */}
      <section className="politiche-prenotazione__section">
        <div className="politiche-prenotazione__section-head">
          <span className="politiche-prenotazione__section-ico"><i className="fa-light fa-file-contract" aria-hidden="true" /></span>
          <div className="politiche-prenotazione__section-titles">
            <h3 className="politiche-prenotazione__section-title">Termini e condizioni</h3>
            <p className="politiche-prenotazione__section-sub">
              Libreria dei testi legali multilingua, condivisa da tutte le politiche.
              Ogni modifica ai testi crea una nuova versione, così i documenti già inviati restano tracciabili.
            </p>
          </div>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setEditingTermine({ ...EMPTY_TERMINE })}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Crea termini
          </button>
        </div>

        <CfgTable
          columns={COLS_TERMINI}
          empty={<span>Nessun testo in libreria: crea i primi termini da associare alle politiche.</span>}
        >
          {termini.map((t) => (
            <tr key={t.id}>
              <td><TruncatedText text={t.nome} className="politiche-prenotazione__trunc" /></td>
              <td>{t.descrizione ? <TruncatedText text={t.descrizione} className="politiche-prenotazione__trunc" /> : '—'}</td>
              <td className="politiche-prenotazione__col-c">
                <Tooltip content={`Ultimo aggiornamento: ${t.aggiornatoIl}`}>
                  <span className="politiche-prenotazione__version">v{t.versione}</span>
                </Tooltip>
              </td>
              <td>
                <span className={`politiche-prenotazione__badge ${t.attivo ? 'is-on' : 'is-off'}`}>
                  {t.attivo ? 'Attivo' : 'Bozza'}
                </span>
              </td>
              <td className="politiche-prenotazione__col-c">
                <div className="politiche-prenotazione__actions-cell">
                  <Tooltip content="Modifica (nuova versione)">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => setEditingTermine({ ...t })}>
                      <i className="fa-solid fa-pen" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Elimina">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => removeTermine(t)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </Tooltip>
                </div>
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      {/* ── 3 · Gratuità e concessioni ────────────────────────────────────────── */}
      <section className="politiche-prenotazione__section">
        <div className="politiche-prenotazione__section-head">
          <span className="politiche-prenotazione__section-ico"><i className="fa-light fa-gift" aria-hidden="true" /></span>
          <div className="politiche-prenotazione__section-titles">
            <h3 className="politiche-prenotazione__section-title">Gratuità e concessioni</h3>
            <p className="politiche-prenotazione__section-sub">
              Ospiti non paganti al raggiungimento di una soglia di paganti, per ambito di vendita.
            </p>
          </div>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setEditingGratuita({ ...EMPTY_GRATUITA })}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuova gratuità
          </button>
        </div>

        <div className="politiche-prenotazione__note" role="note">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <span>Le regole si applicano esclusivamente alle tariffe <strong>per persona</strong> e non alle tariffe per camera.</span>
        </div>

        <CfgTable
          columns={COLS_GRATUITA}
          empty={<span>Nessuna gratuità configurata: definisci la prima regola (es. 1 gratuità ogni 20 paganti).</span>}
        >
          {gratuite.map((g) => (
            <tr key={g.id} className={g.attiva ? '' : 'politiche-prenotazione__row--off'}>
              <td className="politiche-prenotazione__col-c">
                <ToggleSwitch checked={g.attiva} onChange={() => toggleGratuita(g)} className="politiche-prenotazione__toggle" />
              </td>
              <td><TruncatedText text={g.nome} className="politiche-prenotazione__trunc" /></td>
              <td><TruncatedText text={AMBITO_SHORT[g.ambito]} full={AMBITO_FULL[g.ambito]} className="politiche-prenotazione__trunc" /></td>
              <td><TruncatedText text={fraseGratuita(g)} className="politiche-prenotazione__trunc" /></td>
              <td><TruncatedText text={APPLICA_LABELS[g.applicaA]} className="politiche-prenotazione__trunc" /></td>
              <td className="politiche-prenotazione__col-c">
                <div className="politiche-prenotazione__actions-cell">
                  <Tooltip content="Modifica">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => setEditingGratuita({ ...g })}>
                      <i className="fa-solid fa-pen" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Elimina">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => removeGratuita(g)}>
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
        successMessage="Politiche di prenotazione salvate"
        className="politiche-prenotazione__savebar"
      />

      {/* ── Editor politica ───────────────────────────────────────────────────── */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} size="xl" className="politiche-modal">
          <div className="politiche-prenotazione__form">
            <div className="politiche-prenotazione__form-head">
              <div>
                <h2 className="politiche-prenotazione__form-title">{editing.Id ? 'Modifica politica' : 'Nuova politica'}</h2>
                <p className="politiche-prenotazione__form-sub">Definisci ambito e condizioni: i testi e il documento si generano da qui.</p>
              </div>
              <button type="button" className="politiche-prenotazione__form-close" onClick={() => setEditing(null)} aria-label="Chiudi">
                <Ico n="x" s={18} c="var(--color-text-disabled)" />
              </button>
            </div>

            {/* Anagrafica */}
            <section className="politiche-prenotazione__fsec">
              <div className="politiche-prenotazione__fsec-title">Anagrafica</div>
              <div className="politiche-prenotazione__grid3">
                <InputField name="nome" label="Nome" required value={editing.Nome} onChange={(e) => upd({ Nome: e.target.value })} placeholder="Es. Non rimborsabile" />
                <SelectField name="ambito" label="Ambito" value={editing.Ambito} options={AMBITO_OPTIONS} onChange={(e) => upd({ Ambito: e.target.value as Ambito })} />
                <InputField name="descrizione" label="Descrizione" required value={editing.Descrizione} onChange={(e) => upd({ Descrizione: e.target.value })} placeholder="A cosa serve questa politica" />
              </div>
              <ToggleSwitch label="Politica attiva" checked={editing.Attivo} onChange={(checked) => upd({ Attivo: checked })} />
            </section>

            {/* Condizioni */}
            <section className="politiche-prenotazione__fsec">
              <div className="politiche-prenotazione__fsec-title">Condizioni</div>
              <div className="politiche-prenotazione__cond-grid">
                <div className="politiche-prenotazione__cond">
                  <span className="politiche-prenotazione__cond-title">Programmazione pagamenti</span>
                  <RadioGroup name="pagamenti" value={editing.PagamentiAbilitati ? '1' : '0'} options={SN} onChange={(v) => upd({ PagamentiAbilitati: v === '1' })} />
                  {editing.PagamentiAbilitati && (
                    <CheckboxField name="carta" label="Richiedi carta di credito a garanzia" checked={editing.RichiediCartaGaranzia} onChange={(e) => upd({ RichiediCartaGaranzia: e.target.checked })} />
                  )}
                </div>
                <div className="politiche-prenotazione__cond">
                  <span className="politiche-prenotazione__cond-title">Penali di cancellazione</span>
                  <RadioGroup name="cancellazione" value={editing.CancellazioneAbilitata ? '1' : '0'} options={SN} onChange={(v) => upd({ CancellazioneAbilitata: v === '1' })} />
                </div>
                <div className="politiche-prenotazione__cond">
                  <span className="politiche-prenotazione__cond-title">Penale di mancato arrivo</span>
                  <RadioGroup name="mancato" value={editing.MancatoArrivoAbilitato ? '1' : '0'} options={SN} onChange={(v) => upd({ MancatoArrivoAbilitato: v === '1' })} />
                  {editing.MancatoArrivoAbilitato && (
                    <InputField
                      name="percentuale" type="number" label="Percentuale penale (%)" required
                      className="politiche-prenotazione__pct"
                      value={String(editing.MancatoArrivoPercentuale)}
                      onChange={(e) => upd({ MancatoArrivoPercentuale: Number(e.target.value) || 0 })}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Termini associati + testi della politica */}
            <section className="politiche-prenotazione__fsec">
              <div className="politiche-prenotazione__fsec-head">
                <div className="politiche-prenotazione__fsec-title">Testi del documento (multilingua)</div>
                <div className="politiche-prenotazione__fsec-tools">
                  <SelectField
                    className="politiche-prenotazione__modello"
                    name="termini"
                    label="Termini e condizioni associati"
                    hint="I testi si gestiscono nella sezione Termini e condizioni"
                    value={editing.TerminiId != null ? String(editing.TerminiId) : ''}
                    options={terminiOptions}
                    onChange={(e) => upd({ TerminiId: e.target.value ? Number(e.target.value) : null })}
                  />
                  <button type="button" className="sib-btn sib-btn--secondary politiche-prenotazione__genera" onClick={genera}>
                    <i className="fa-light fa-wand-magic-sparkles" aria-hidden="true" /> Genera testi (IT/EN)
                  </button>
                </div>
              </div>
              <div className="politiche-prenotazione__grid2">
                <TextareaField name="testoIt" label="Testo italiano" rows={6} value={editing.TestoIt} onChange={(e) => upd({ TestoIt: e.target.value })} placeholder="Testo della politica in italiano" />
                <TextareaField name="testoEn" label="Testo inglese" rows={6} value={editing.TestoEn} onChange={(e) => upd({ TestoEn: e.target.value })} placeholder="Policy text in English" />
              </div>
            </section>

            <div className="politiche-prenotazione__form-actions">
              <Tooltip content={anteprimaReady ? 'Anteprima del documento impaginato' : 'Genera i testi e compila i campi obbligatori per l’anteprima'}>
                <button
                  type="button"
                  className="sib-btn sib-btn--secondary politiche-prenotazione__preview-btn"
                  disabled={!anteprimaReady}
                  onClick={() => openPreview(editing.Nome || 'Documento', buildDocumentoHtml(docDataOf(editing), editing.DocumentoGeneratoIl))}
                >
                  <i className="fa-light fa-eye" aria-hidden="true" /> Anteprima
                </button>
              </Tooltip>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEditing(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={savePolitica}>Salva</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Editor termini e condizioni ───────────────────────────────────────── */}
      {editingTermine && (
        <Modal open onClose={() => setEditingTermine(null)} size="xl" className="politiche-modal">
          <div className="politiche-prenotazione__form">
            <div className="politiche-prenotazione__form-head">
              <div>
                <h2 className="politiche-prenotazione__form-title">
                  {editingTermine.id ? `Modifica termini · v${editingTermine.versione}` : 'Nuovi termini e condizioni'}
                </h2>
                <p className="politiche-prenotazione__form-sub">
                  {editingTermine.id
                    ? 'Salvando una modifica ai testi viene creata automaticamente una nuova versione.'
                    : 'Il testo entra in libreria e diventa associabile a qualsiasi politica.'}
                </p>
              </div>
              <button type="button" className="politiche-prenotazione__form-close" onClick={() => setEditingTermine(null)} aria-label="Chiudi">
                <Ico n="x" s={18} c="var(--color-text-disabled)" />
              </button>
            </div>

            <section className="politiche-prenotazione__fsec">
              <div className="politiche-prenotazione__fsec-title">Anagrafica</div>
              <div className="politiche-prenotazione__grid2">
                <InputField name="tNome" label="Nome" required value={editingTermine.nome} onChange={(e) => updT({ nome: e.target.value })} placeholder="Es. Cancellazione flessibile" />
                <InputField name="tDescrizione" label="Descrizione" value={editingTermine.descrizione} onChange={(e) => updT({ descrizione: e.target.value })} placeholder="Sintesi del contenuto del testo" />
              </div>
              <ToggleSwitch
                label="Testo attivo"
                description="Solo i testi attivi sono associabili alle politiche."
                checked={editingTermine.attivo}
                onChange={(checked) => updT({ attivo: checked })}
              />
            </section>

            <section className="politiche-prenotazione__fsec">
              <div className="politiche-prenotazione__fsec-title">Testi (multilingua)</div>
              <div className="politiche-prenotazione__grid2">
                <TextareaField name="tTestoIt" label="Testo italiano" rows={7} value={editingTermine.testoIt} onChange={(e) => updT({ testoIt: e.target.value })} placeholder="Testo dei termini in italiano" />
                <TextareaField name="tTestoEn" label="Testo inglese" rows={7} value={editingTermine.testoEn} onChange={(e) => updT({ testoEn: e.target.value })} placeholder="Terms text in English" />
              </div>
            </section>

            <div className="politiche-prenotazione__form-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEditingTermine(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={saveTermine}>Salva</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Editor gratuità ───────────────────────────────────────────────────── */}
      {editingGratuita && (
        <Modal open onClose={() => setEditingGratuita(null)} size="lg" className="politiche-gratuita-modal">
          <div className="politiche-prenotazione__form">
            <div className="politiche-prenotazione__form-head">
              <div>
                <h2 className="politiche-prenotazione__form-title">{editingGratuita.id ? 'Modifica gratuità' : 'Nuova gratuità'}</h2>
                <p className="politiche-prenotazione__form-sub">Si applica esclusivamente alle tariffe per persona, mai alle tariffe per camera.</p>
              </div>
              <button type="button" className="politiche-prenotazione__form-close" onClick={() => setEditingGratuita(null)} aria-label="Chiudi">
                <Ico n="x" s={18} c="var(--color-text-disabled)" />
              </button>
            </div>

            <section className="politiche-prenotazione__fsec">
              <div className="politiche-prenotazione__grid2">
                <InputField name="gNome" label="Nome" required value={editingGratuita.nome} onChange={(e) => updG({ nome: e.target.value })} placeholder="Es. Gruppi scolastici" />
                <SelectField name="gAmbito" label="Ambito" value={editingGratuita.ambito} options={AMBITO_OPTIONS} onChange={(e) => updG({ ambito: e.target.value as Ambito })} />
              </div>
              <div className="politiche-prenotazione__grid3">
                <InputField name="gPaganti" label="Ogni quanti paganti" type="number" min={1} value={String(editingGratuita.ogniPaganti)} onChange={(e) => updG({ ogniPaganti: Number(e.target.value) || 0 })} />
                <InputField name="gGratuite" label="Gratuità concesse" type="number" min={1} value={String(editingGratuita.gratuite)} onChange={(e) => updG({ gratuite: Number(e.target.value) || 0 })} />
                <SelectField
                  name="gApplicaA" label="Applicata a"
                  value={editingGratuita.applicaA}
                  options={(Object.keys(APPLICA_LABELS) as ApplicaA[]).map((k) => ({ value: k, label: APPLICA_LABELS[k] }))}
                  onChange={(e) => updG({ applicaA: e.target.value as ApplicaA })}
                />
              </div>
              <p className="politiche-prenotazione__gratuita-preview">
                <i className="fa-light fa-gift" aria-hidden="true" />
                {fraseGratuita(editingGratuita)} · {APPLICA_LABELS[editingGratuita.applicaA]} · {AMBITO_FULL[editingGratuita.ambito]}
              </p>
              <ToggleSwitch label="Regola attiva" checked={editingGratuita.attiva} onChange={(checked) => updG({ attiva: checked })} />
            </section>

            <div className="politiche-prenotazione__form-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEditingGratuita(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={saveGratuita}>Salva</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Anteprima documento (logica conservata) ───────────────────────────── */}
      {preview && (
        <Modal open onClose={() => setPreview(null)} size="xl" className="politiche-doc-modal">
          <div className="politiche-prenotazione__doc">
            <div className="politiche-prenotazione__doc-head">
              <div>
                <h2 className="politiche-prenotazione__form-title">Anteprima documento</h2>
                <p className="politiche-prenotazione__form-sub">{preview.nome}</p>
              </div>
              <button type="button" className="politiche-prenotazione__form-close" onClick={() => setPreview(null)} aria-label="Chiudi">
                <Ico n="x" s={18} c="var(--color-text-disabled)" />
              </button>
            </div>

            <iframe className="politiche-prenotazione__doc-frame" title="Anteprima documento" srcDoc={preview.html} />

            <div className="politiche-prenotazione__form-actions">
              <button type="button" className="sib-btn sib-btn--secondary politiche-prenotazione__preview-btn" onClick={() => openInNewTab(preview.html)}>
                <i className="fa-light fa-arrow-up-right-from-square" aria-hidden="true" /> Apri in nuova scheda
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => setPreview(null)}>Chiudi</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
