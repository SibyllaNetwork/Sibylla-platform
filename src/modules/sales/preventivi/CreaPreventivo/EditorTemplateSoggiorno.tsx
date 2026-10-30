import React, { useEffect, useMemo, useRef, useState } from 'react'
import { HexColorInput, HexColorPicker } from 'react-colorful'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import AlertBanner from '../../../../core/components/AlertBanner'
import Modal from '../../../../core/components/Modal'
import {
  InputField, RadioGroup, RangeField, SelectField, TextareaField, ToggleSwitch,
} from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { usePreventiviSoggiornoStore, type PreventivoSoggiorno, type PropostaSoggiorno } from '../../../../store/usePreventiviSoggiornoStore'
import { useTemplatePreventivoStore } from '../../../../store/useTemplatePreventivoStore'
import { terminiDi, useTerminiStore, type Termini } from '../../../../store/useTerminiStore'
import {
  BLOCCHI, FONT, FOOTER_VUOTO, FOTO_COPERTINA, datiStruttura, PALETTE, SEGNAPOSTO, TEMPLATE_DEFAULT, TEMPLATE_PRONTI, normalizza,
  testoIn, tradotto,
  type BloccoId, type CampoTesto, type ColoriTemplate, type DatiFooter, type FontKey, type TemplateSoggiorno,
} from './templateSoggiorno'
import { LETTERE, comprimiFoto, mailHtml, scaricaEml } from './soggiorno'
import { ELENCO_LINGUE, LINGUE, tr, type Lingua } from './lingue'
import { motivoIn } from './PagamentoNexi'
import FlagCircle from '../../../../core/components/FlagCircle'
import { preventivoEsempio, conCamereAssegnate } from './esempio'
import { Proposta, nuovaProposta, useStruttureSoggiorno } from './PreventivoSoggiorno'
import './EditorTemplateSoggiorno.sass'

/**
 * Editor del template della mail del preventivo di soggiorno: impaginazione
 * (ordine e visibilità dei blocchi), intestazione e copertina, disposizione
 * delle proposte e posizione delle foto, lettera e testi, tipografia, colori,
 * dimensioni, bordi e angoli; anteprima dal vivo su desktop e smartphone.
 * Nella scheda Proposte si definiscono le soluzioni sui dati veri della
 * struttura (camere libere, assegnazione automatica o manuale), che passano nel
 * preventivo con "Salva e crea preventivo".
 *
 * Rotta: editor-template-soggiorno[:<templateId>[:<preventivoId>]]. Un
 * template pronto si personalizza in copia.
 */

const uid = () => Math.random().toString(36).slice(2, 10)

type Sezione = 'generale' | 'impaginazione' | 'intestazione' | 'copertina' | 'proposte' | 'testi' | 'conferma' | 'termini' | 'footer' | 'pagamento' | 'tipografia' | 'colori' | 'forme'
type TipoMail = 'preventivo' | 'conferma' | 'rifiuto'
const TIPI_MAIL: { v: TipoMail; label: string; ico: string }[] = [
  { v: 'preventivo', label: 'Preventivo', ico: 'fa-envelope' },
  { v: 'conferma', label: 'Conferma prenotazione', ico: 'fa-envelope-circle-check' },
  { v: 'rifiuto', label: 'Pagamento non riuscito', ico: 'fa-credit-card' },
]
/** Testi che si traducono, per contare quelli ancora in italiano. */
const CAMPI_TESTO: CampoTesto[] = ['etichetta', 'titolo', 'sottotitolo', 'saluto', 'lettera', 'chiusura', 'firma', 'contatti', 'condizioni', 'pulsante',
  'confermaTitolo', 'confermaLettera', 'confermaNote', 'confermaChiusura', 'notaLegale']

const SEZIONI: { id: Sezione; label: string; icona: string; desc: string }[] = [
  { id: 'generale', label: 'Generale', icona: 'fa-sliders', desc: 'Nome e punto di partenza' },
  { id: 'impaginazione', label: 'Impaginazione', icona: 'fa-table-layout', desc: 'Ordine dei blocchi, larghezza, spazi' },
  { id: 'intestazione', label: 'Intestazione e titoli', icona: 'fa-heading', desc: 'Logo, stile, titolo e sottotitolo' },
  { id: 'copertina', label: 'Immagine di copertina', icona: 'fa-image', desc: 'Foto, altezza' },
  { id: 'proposte', label: 'Proposte e foto camere', icona: 'fa-bed', desc: 'Disposizione, posizione foto, prezzi' },
  { id: 'testi', label: 'Lettera e testi', icona: 'fa-envelope-open-text', desc: 'Saluto, lettera, firma, note sull\'offerta' },
  { id: 'conferma', label: 'Mail di conferma', icona: 'fa-envelope-circle-check', desc: 'Testi della conferma di prenotazione' },
  { id: 'termini', label: 'Termini e condizioni', icona: 'fa-file-contract', desc: 'Crea o scegli il documento da inserire' },
  { id: 'footer', label: 'Footer istituzionale', icona: 'fa-building-columns', desc: 'Dati societari e contatti dell\'azienda' },
  { id: 'pagamento', label: 'Pagamento con carta', icona: 'fa-credit-card', desc: 'Caparra o saldo con Nexi dopo l\'accettazione' },
  { id: 'tipografia', label: 'Tipografia', icona: 'fa-font', desc: 'Font, dimensioni, peso, interlinea' },
  { id: 'colori', label: 'Colori', icona: 'fa-palette', desc: 'Palette e singoli colori' },
  { id: 'forme', label: 'Bordi e angoli', icona: 'fa-vector-square', desc: 'Spessore, stile, arrotondamenti, ombra' },
]

const COLORI: { k: keyof ColoriTemplate; label: string }[] = [
  { k: 'sfondo', label: 'Sfondo esterno' }, { k: 'superficie', label: 'Fondo mail e card' },
  { k: 'primario', label: 'Primario (titoli, intestazione)' }, { k: 'accento', label: 'Accento (etichette, extra)' },
  { k: 'testo', label: 'Testo' }, { k: 'tenue', label: 'Testo secondario' }, { k: 'bordo', label: 'Bordi e separatori' },
  { k: 'pulsante', label: 'Pulsante' }, { k: 'testoPulsante', label: 'Testo del pulsante' },
  { k: 'testoIntestazione', label: 'Testo sull\'intestazione piena' },
  { k: 'sfondoFooter', label: 'Fondo del footer' }, { k: 'testoFooter', label: 'Testo del footer' },
]

const PESI = [400, 500, 600, 700, 800].map((p) => ({ value: String(p), label: { 400: 'Normale', 500: 'Medio', 600: 'Semi-grassetto', 700: 'Grassetto', 800: 'Extra-grassetto' }[p]! }))

const FOTO_POS: { v: TemplateSoggiorno['proposte']['fotoCamera']; label: string }[] = [
  { v: 'sinistra', label: 'A sinistra' }, { v: 'destra', label: 'A destra' }, { v: 'sopra', label: 'Sopra' }, { v: 'nascosta', label: 'Nessuna foto' },
]

/** Copia di lavoro: un template pronto si personalizza come nuovo template. */
function copiaDiLavoro(id: string | undefined, personali: TemplateSoggiorno[]): TemplateSoggiorno {
  const mio = personali.find((t) => t.id === id)
  if (mio) return normalizza(mio)
  const pronto = TEMPLATE_PRONTI.find((t) => t.id === id)
  const base = normalizza(pronto ?? TEMPLATE_DEFAULT)
  return { ...base, id: `tpl-${Date.now().toString(36)}`, pronto: false, nome: pronto ? `${pronto.nome} personalizzato` : 'Il mio template', descrizione: '' }
}

export default function EditorTemplateSoggiorno({ navigate, param = '' }: { navigate: (p: string) => void; param?: string }) {
  const [tplId, prevId] = param.split(':')
  const personali = useTemplatePreventivoStore((s) => s.personali)
  const salvaTemplate = useTemplatePreventivoStore((s) => s.salva)
  const eliminaTemplate = useTemplatePreventivoStore((s) => s.elimina)
  const salvaPreventivo = usePreventiviSoggiornoStore((s) => s.salva)
  const documenti = useTerminiStore((s) => s.documenti)
  const eliminaTermini = useTerminiStore((s) => s.elimina)
  const confirm = useConfirmStore((s) => s.confirm)
  const strutture = useStruttureSoggiorno()

  const [tpl, setTpl] = useState<TemplateSoggiorno>(() => copiaDiLavoro(tplId || undefined, personali))
  const esistente = personali.some((t) => t.id === tpl.id)
  const [pr, setPr] = useState<PreventivoSoggiorno>(() => {
    const salvato = usePreventiviSoggiornoStore.getState().preventivi.find((p) => p.id === prevId)
    return salvato ?? preventivoEsempio(strutture.iniziale, tpl.id)
  })
  const [tab, setTab] = useState<'design' | 'proposte'>('design')
  const [aperta, setAperta] = useState<Sezione | null>('impaginazione')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [modificato, setModificato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  // Lingua dei testi che si modificano e dell'anteprima; mail mostrata nell'anteprima.
  const [lingua, setLingua] = useState<Lingua>(() => pr.lingua ?? 'it')
  const [tipoMail, setTipoMail] = useState<TipoMail>('preventivo')
  // Documento di termini aperto nell'editor (null = chiuso, 'nuovo' = da creare).
  const [terminiEdit, setTerminiEdit] = useState<Termini | 'nuovo' | null>(null)

  const set = <K extends keyof TemplateSoggiorno>(k: K, patch: Partial<TemplateSoggiorno[K]>) => {
    setTpl((t) => ({ ...t, [k]: typeof patch === 'object' && !Array.isArray(patch) ? { ...(t[k] as object), ...patch } : patch }))
    setModificato(true)
  }
  const setCampo = (patch: Partial<Pick<TemplateSoggiorno, 'nome' | 'descrizione' | 'blocchi'>>) => { setTpl((t) => ({ ...t, ...patch })); setModificato(true) }

  // Il messaggio della bozza d'esempio segue la lettera del template.
  const lettera = testoIn(tpl, lingua, 'lettera')
  const prAnteprima = useMemo(() => ({ ...pr, lingua, ...(prevId ? {} : { messaggio: lettera }) }), [pr, prevId, lettera, lingua])
  const termini = terminiDi(tpl.termini.id, documenti)
  const html = useMemo(() => mailHtml(prAnteprima, {
    template: tpl, termini, tipo: tipoMail,
    rifiuto: { importo: 250, motivo: motivoIn('Fondi insufficienti', lingua) },
  }), [prAnteprima, tpl, termini, tipoMail, lingua])
  const daTradurre = (l: Lingua) => CAMPI_TESTO.filter((k) => !tradotto(tpl, l, k)).length

  // Testo del template nella lingua in modifica: l'italiano è la base, le altre
  // lingue scrivono in `traduzioni` (vuoto = traduzione automatica o italiano).
  const valoreTesto = (k: CampoTesto) => (lingua === 'it' ? (k === 'notaLegale' ? tpl.footer.notaLegale : tpl.testi[k]) : tpl.traduzioni?.[lingua]?.[k] ?? '')
  const scriviTesto = (k: CampoTesto, v: string) => {
    if (lingua === 'it') { if (k === 'notaLegale') set('footer', { notaLegale: v }); else set('testi', { [k]: v } as Partial<TemplateSoggiorno['testi']>); return }
    setTpl((t) => ({ ...t, traduzioni: { ...t.traduzioni, [lingua]: { ...t.traduzioni?.[lingua], [k]: v } } }))
    setModificato(true)
  }
  const campoTesto = (k: CampoTesto, label: string, rows = 0, extra: { hint?: string; placeholder?: string } = {}) => {
    const auto = lingua === 'it' ? extra.placeholder : testoIn({ ...tpl, traduzioni: {} }, lingua, k)
    const manca = lingua !== 'it' && !tradotto(tpl, lingua, k)
    const hint = manca ? 'Testo scritto a mano: non c\'è una traduzione automatica, scrivila qui (altrimenti resta in italiano)' : extra.hint
    return rows
      ? <TextareaField key={`${k}-${lingua}`} name={`t-${k}`} label={label} rows={rows} value={valoreTesto(k)} placeholder={auto} hint={hint} error={undefined}
          onChange={(e) => scriviTesto(k, e.target.value)} />
      : <InputField key={`${k}-${lingua}`} name={`t-${k}`} label={label} value={valoreTesto(k)} placeholder={auto} hint={hint}
          onChange={(e) => scriviTesto(k, e.target.value)} />
  }

  // ── Punto di partenza: applica l'aspetto di un template pronto ─────────────
  const partiDa = async (id: string) => {
    const src = TEMPLATE_PRONTI.find((t) => t.id === id)
    if (!src) return
    const ok = !modificato || await confirm({
      title: 'Applica template', message: `Applicare l'aspetto del template "${src.nome}"? Le personalizzazioni fatte finora vengono sostituite.`,
      confirmLabel: 'Applica',
    })
    if (ok) { setTpl((t) => ({ ...normalizza(src), id: t.id, nome: t.nome, descrizione: t.descrizione, pronto: false })); setModificato(true) }
  }

  // ── Blocchi: ordine (frecce o trascinamento) e visibilità ──────────────────
  const trascinato = useRef<number | null>(null)
  const [sopra, setSopra] = useState<number | null>(null)
  const sposta = (da: number, a: number) => {
    if (a < 0 || a >= tpl.blocchi.length || da === a) return
    const b = [...tpl.blocchi]
    const [x] = b.splice(da, 1)
    b.splice(a, 0, x)
    setCampo({ blocchi: b })
  }
  const visibile = (id: BloccoId, v: boolean) => setCampo({ blocchi: tpl.blocchi.map((b) => (b.id === id ? { ...b, visibile: v } : b)) })

  // ── Immagini (logo e copertina) ────────────────────────────────────────────
  const caricaImg = async (f: File | undefined, lato: number, fn: (src: string) => void) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.warning('Scegli un file immagine (JPG, PNG, WebP)'); return }
    try {
      // I loghi piccoli restano com'erano (PNG trasparenti), il resto si comprime.
      if (f.size < 200 * 1024 && f.type !== 'image/jpeg') {
        const r = new FileReader()
        r.onload = () => fn(r.result as string)
        r.readAsDataURL(f)
      } else fn(await comprimiFoto(f, lato))
    } catch { toast.error('Impossibile leggere l\'immagine') }
  }

  // ── Proposte sui dati veri ─────────────────────────────────────────────────
  const setProp = (id: string, patch: Partial<PropostaSoggiorno>) =>
    setPr((p) => ({ ...p, proposte: p.proposte.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
  const aggiungi = () => setPr((p) => ({ ...p, proposte: [...p.proposte, conCamereAssegnate(nuovaProposta(), p.struttura)] }))
  const duplica = (q: PropostaSoggiorno) => setPr((p) => {
    const i = p.proposte.findIndex((x) => x.id === q.id)
    const copia = { ...q, id: uid(), titolo: q.titolo ? `${q.titolo} (copia)` : '', camere: q.camere.map((c) => ({ ...c, id: uid(), tariffe: { ...c.tariffe }, numeri: [...c.numeri] })), servizi: [...q.servizi], extra: q.extra.map((e) => ({ ...e, id: uid() })) }
    return { ...p, proposte: [...p.proposte.slice(0, i + 1), copia, ...p.proposte.slice(i + 1)] }
  })
  const rimuovi = async (q: PropostaSoggiorno, i: number) => {
    const ok = await confirm({ title: 'Elimina soluzione', message: `Eliminare la proposta ${LETTERE[i]}${q.titolo ? ` "${q.titolo}"` : ''}?`, confirmLabel: 'Elimina', danger: true })
    if (ok) setPr((p) => ({ ...p, proposte: p.proposte.filter((x) => x.id !== q.id) }))
  }

  // ── Salvataggio ────────────────────────────────────────────────────────────
  const valida = () => {
    if (!tpl.nome.trim()) { setErrore('Dai un nome al template per ritrovarlo nella galleria'); setTab('design'); setAperta('generale'); return false }
    if (!tpl.blocchi.some((b) => b.id === 'proposte' && b.visibile)) { setErrore('Il blocco Proposte deve restare visibile: è quello con i pulsanti per accettare'); setTab('design'); setAperta('impaginazione'); return false }
    setErrore(null)
    return true
  }
  const salva = () => {
    if (!valida()) return false
    salvaTemplate(tpl); setModificato(false)
    toast.success(`Template "${tpl.nome}" salvato`)
    return true
  }
  const salvaECrea = () => {
    if (!salva()) return
    const prev: PreventivoSoggiorno = prevId
      ? { ...pr, templateId: tpl.id }
      : { ...pr, lingua, codice: usePreventiviSoggiornoStore.getState().prossimoCodice(), templateId: tpl.id, messaggio: lettera }
    salvaPreventivo(prev)
    navigate(`crea-preventivo:${prev.id}`)
  }
  // ── Lista dei template salvati: apri, nuovo, elimina ───────────────────────
  const conPreventivo = (s: string) => (prevId ? `${s}:${prevId}` : s)
  const apri = async (id: string) => {
    if (id === tpl.id) return
    const ok = !modificato || await confirm({
      title: 'Modifiche non salvate', message: `Aprire un altro template senza salvare "${tpl.nome}"?`, confirmLabel: 'Apri senza salvare', danger: true,
    })
    if (ok) navigate(`editor-template-soggiorno:${conPreventivo(id === '__nuovo' ? '' : id)}`)
  }
  const elimina = async () => {
    const ok = await confirm({
      title: 'Elimina template',
      message: `Eliminare il template "${tpl.nome}"? I preventivi in bozza che lo usano passeranno al template Classico.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    eliminaTemplate(tpl.id)
    toast.success(`Template "${tpl.nome}" eliminato`)
    navigate(`editor-template-soggiorno:${conPreventivo('')}`)
  }
  const apriInvio = () => { if (valida()) setInvio(true) }
  const inviato = (dest: { cliente: string; email: string; oggetto: string; prova: boolean }) => {
    setInvio(false)
    // Nessun servizio di posta collegato: la mail si scarica come .eml (bozza pronta da spedire).
    scaricaEml(html, dest.email, dest.oggetto, `${dest.prova ? 'Prova' : 'Preventivo'} ${tpl.nome} ${lingua.toUpperCase()}`)
    if (dest.prova) { toast.info(`Mail scaricata: aprila nel programma di posta, è già indirizzata a ${dest.email}`, 'Mail di prova'); return }
    salvaTemplate(tpl); setModificato(false)
    const ora = new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const prev: PreventivoSoggiorno = {
      ...pr, lingua, ...(prevId ? {} : { codice: usePreventiviSoggiornoStore.getState().prossimoCodice(), messaggio: lettera }),
      cliente: dest.cliente, email: dest.email, templateId: tpl.id, stato: pr.stato === 'Accettato' ? pr.stato : 'Inviato', inviatoIl: ora,
    }
    salvaPreventivo(prev)
    toast.info(`Mail scaricata per ${dest.email}: aprila nel programma di posta e premi Invia. Il preventivo è segnato come inviato.`, `Preventivo ${prev.codice}`)
    navigate(`crea-preventivo:${prev.id}`)
  }

  // ── Termini e condizioni ───────────────────────────────────────────────────
  const rimuoviTermini = async () => {
    if (!termini) return
    const ok = await confirm({
      title: 'Elimina termini e condizioni',
      message: `Eliminare "${termini.titolo}" dalla libreria? Gli altri template che lo usano non lo mostreranno più.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    eliminaTermini(termini.id)
    set('termini', { id: null })
    toast.success(`"${termini.titolo}" eliminato`)
  }

  const esci = async () => {
    const ok = !modificato || await confirm({
      title: 'Modifiche non salvate', message: 'Uscire dall\'editor senza salvare il template?', confirmLabel: 'Esci senza salvare', danger: true,
    })
    if (ok) navigate(prevId ? `crea-preventivo:${prevId}` : 'crea-preventivo')
  }

  const { blocchi, intestazione: H, copertina: K, proposte: L, font: F, colori: C, forme: S } = tpl
  const r = (label: string, name: string, value: number, onChange: (v: number) => void, min: number, max: number, step = 1, suffix = 'px') => (
    <RangeField label={label} name={name} value={value} onChange={onChange} min={min} max={max} step={step}
      valueLabel={`${value}${suffix}`} hideReset />
  )

  const pannello: Record<Sezione, () => React.ReactNode> = {
    generale: () => (
      <>
        <InputField name="tpl-nome" label="Nome del template" required value={tpl.nome} onChange={(e) => setCampo({ nome: e.target.value })} placeholder="Es. Estate al mare" />
        <TextareaField name="tpl-desc" label="Descrizione" rows={2} value={tpl.descrizione} onChange={(e) => setCampo({ descrizione: e.target.value })} placeholder="Quando usarlo (compare nella galleria)" />
        <SelectField name="tpl-base" label="Parti dall'aspetto di un template pronto" value="" placeholder="Scegli un template pronto…"
          onChange={(e) => partiDa(e.target.value)} options={TEMPLATE_PRONTI.map((t) => ({ value: t.id, label: t.nome }))} />
      </>
    ),
    impaginazione: () => (
      <>
        <p className="tpled__hint">Trascina i blocchi o usa le frecce per cambiare l'ordine; con l'interruttore li mostri o li nascondi.</p>
        <ol className="tpled__blocks">
          {blocchi.map((b, i) => (
            <li key={b.id} draggable
              className={'tpled__block' + (b.visibile ? '' : ' is-off') + (sopra === i ? ' is-over' : '')}
              onDragStart={(e) => { trascinato.current = i; e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { e.preventDefault(); setSopra(i) }}
              onDragLeave={() => setSopra((s) => (s === i ? null : s))}
              onDrop={(e) => { e.preventDefault(); if (trascinato.current != null) sposta(trascinato.current, i); trascinato.current = null; setSopra(null) }}
              onDragEnd={() => { trascinato.current = null; setSopra(null) }}>
              <i className="fa-solid fa-grip-dots-vertical tpled__grip" aria-hidden="true" />
              <i className={`fa-regular ${BLOCCHI[b.id].icona} tpled__block-ico`} aria-hidden="true" />
              <span className="tpled__block-txt"><strong>{BLOCCHI[b.id].label}</strong><small>{BLOCCHI[b.id].desc}</small></span>
              <Tooltip text="Sposta su">
                <button type="button" className="sib-btn sib-btn--icon tpled__ico" aria-label={`Sposta su ${BLOCCHI[b.id].label}`} disabled={i === 0} onClick={() => sposta(i, i - 1)}>
                  <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text="Sposta giù">
                <button type="button" className="sib-btn sib-btn--icon tpled__ico" aria-label={`Sposta giù ${BLOCCHI[b.id].label}`} disabled={i === blocchi.length - 1} onClick={() => sposta(i, i + 1)}>
                  <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                </button>
              </Tooltip>
              <ToggleSwitch checked={b.visibile} onChange={(v) => visibile(b.id, v)} disabled={b.id === 'proposte'} />
            </li>
          ))}
        </ol>
        {r('Larghezza della mail', 'larghezza', S.larghezza, (v) => set('forme', { larghezza: v }), 480, 800, 10)}
        {r('Spaziatura interna', 'spaziatura', S.spaziatura, (v) => set('forme', { spaziatura: v }), 12, 48)}
      </>
    ),
    intestazione: () => (
      <>
        <RadioGroup name="h-stile" label="Stile" value={H.stile} onChange={(v) => set('intestazione', { stile: v as typeof H.stile })}
          options={[{ value: 'pieno', label: 'Piena' }, { value: 'chiaro', label: 'Chiara' }, { value: 'linea', label: 'Con linea' }]} />
        <RadioGroup name="h-align" label="Allineamento" value={H.allineamento} onChange={(v) => set('intestazione', { allineamento: v as typeof H.allineamento })}
          options={[{ value: 'left', label: 'Sinistra' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Destra' }]} />
        <ImmagineField label="Logo" value={H.logo} vuoto="Nessun logo" onFile={(f) => caricaImg(f, 480, (src) => set('intestazione', { logo: src }))}
          onRimuovi={() => set('intestazione', { logo: null })} piccola />
        <ToggleSwitch label="Mostra l'etichetta col codice" checked={H.mostraCodice} onChange={(v) => set('intestazione', { mostraCodice: v })} />
        {H.mostraCodice && campoTesto('etichetta', 'Etichetta')}
        {campoTesto('titolo', 'Titolo')}
        {campoTesto('sottotitolo', 'Sottotitolo')}
        <Segnaposto />
      </>
    ),
    copertina: () => (
      <>
        {!blocchi.find((b) => b.id === 'copertina')?.visibile && (
          <AlertBanner type="info">
            La copertina è nascosta.{' '}
            <button type="button" className="tpled__link" onClick={() => visibile('copertina', true)}>Mostrala</button>
          </AlertBanner>
        )}
        <div className="tpled__photos">
          {FOTO_COPERTINA.map((f) => (
            <Tooltip key={f.url} text={f.nome}>
              <button type="button" aria-pressed={K.immagine === f.url} aria-label={f.nome}
                className={'tpled__photo' + (K.immagine === f.url ? ' is-on' : '')} onClick={() => set('copertina', { immagine: f.url })}>
                <img src={f.url.replace('w=1200', 'w=240')} alt="" />
              </button>
            </Tooltip>
          ))}
        </div>
        <ImmagineField label="Oppure carica la tua foto" value={FOTO_COPERTINA.some((f) => f.url === K.immagine) ? null : K.immagine}
          vuoto="Nessuna foto caricata" onFile={(f) => caricaImg(f, 1400, (src) => set('copertina', { immagine: src }))}
          onRimuovi={() => set('copertina', { immagine: FOTO_COPERTINA[0].url })} />
        {r('Altezza', 'cop-h', K.altezza, (v) => set('copertina', { altezza: v }), 120, 380, 10)}
      </>
    ),
    proposte: () => (
      <>
        <Scelte label="Disposizione delle proposte" value={L.disposizione} onChange={(v) => set('proposte', { disposizione: v })}
          opzioni={[{ v: 'colonna', label: 'Una sotto l\'altra', ico: 'fa-bars' }, { v: 'griglia', label: 'Affiancate (2 colonne)', ico: 'fa-table-columns' }]} />
        <Scelte label="Posizione delle foto delle camere" value={L.fotoCamera} onChange={(v) => set('proposte', { fotoCamera: v })}
          opzioni={FOTO_POS.map((o) => ({ ...o, schema: o.v }))} />
        {L.disposizione === 'griglia' && L.fotoCamera !== 'nascosta' && L.fotoCamera !== 'sopra' && (
          <p className="tpled__hint">Con le proposte affiancate le foto vanno sopra: c'è metà dello spazio.</p>
        )}
        <RadioGroup name="p-prezzi" label="Prezzi" value={L.prezzi} onChange={(v) => set('proposte', { prezzi: v as typeof L.prezzi })}
          options={[{ value: 'completo', label: 'Dettaglio completo' }, { value: 'totale', label: 'Solo il totale' }]} />
        <ToggleSwitch label="Tariffe giorno per giorno" description="Per i soggiorni di più notti" checked={L.dettaglioGiorni} onChange={(v) => set('proposte', { dettaglioGiorni: v })} />
        <ToggleSwitch label="Servizi inclusi" checked={L.mostraServizi} onChange={(v) => set('proposte', { mostraServizi: v })} />
        <ToggleSwitch label="Numeri di camera" description="Le camere assegnate dal gestionale" checked={L.mostraNumeriCamera} onChange={(v) => set('proposte', { mostraNumeriCamera: v })} />
        {campoTesto('pulsante', 'Testo del pulsante')}
      </>
    ),
    testi: () => (
      <>
        {campoTesto('saluto', 'Saluto')}
        {campoTesto('lettera', 'Lettera', 4, { hint: 'È il messaggio con cui parte ogni preventivo con questo template: si può cambiare preventivo per preventivo' })}
        {campoTesto('chiusura', 'Chiusura')}
        {campoTesto('firma', 'Firma', 2)}
        {campoTesto('contatti', 'Contatti', 2, { placeholder: 'Indirizzo, telefono, email, sito' })}
        {campoTesto('condizioni', 'Note sull\'offerta', 3)}
        <Segnaposto />
      </>
    ),
    conferma: () => (
      <>
        <p className="tpled__hint">La mail che il cliente riceve a prenotazione confermata: stessa grafica del preventivo, con il riepilogo della proposta accettata, gli extra prenotati e i termini accettati.</p>
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setTipoMail('conferma')}>
          <i className="fa-regular fa-eye" aria-hidden="true" /> Vedi la mail di conferma
        </button>
        {campoTesto('confermaTitolo', 'Sottotitolo della conferma')}
        {campoTesto('confermaLettera', 'Messaggio', 3)}
        {campoTesto('confermaNote', 'Note per l\'arrivo', 3)}
        {campoTesto('confermaChiusura', 'Chiusura')}
        <Segnaposto />
      </>
    ),
    pagamento: () => (
      <>
        <ToggleSwitch label="Pagamento con carta dopo l'accettazione" description="Il cliente paga con Nexi XPay: la prenotazione si conferma solo a pagamento autorizzato"
          checked={tpl.pagamento.attivo} onChange={(v) => set('pagamento', { attivo: v })} />
        {tpl.pagamento.attivo && (
          <>
            <RadioGroup name="pg-modo" label="Cosa paga il cliente" value={tpl.pagamento.modalita} onChange={(v) => set('pagamento', { modalita: v as TemplateSoggiorno['pagamento']['modalita'] })}
              options={[{ value: 'caparra', label: 'Caparra' }, { value: 'totale', label: 'Totale' }, { value: 'scelta', label: 'Sceglie lui' }]} />
            {tpl.pagamento.modalita !== 'totale' && (
              <RangeField label="Caparra" name="pg-pct" value={tpl.pagamento.percentualeCaparra} onChange={(v) => set('pagamento', { percentualeCaparra: v })}
                min={10} max={100} step={5} valueLabel={`${tpl.pagamento.percentualeCaparra}%`} hideReset />
            )}
            <AlertBanner type="info">
              Ambiente di prova: la piattaforma non è ancora collegata a Nexi, nessun addebito reale. Con l'integrazione i dati della carta si inseriscono sulla pagina di Nexi e l'esito arriva dal gateway.
            </AlertBanner>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setTipoMail('rifiuto')}>
              <i className="fa-regular fa-eye" aria-hidden="true" /> Vedi la mail di pagamento non riuscito
            </button>
          </>
        )}
      </>
    ),
    termini: () => (
      <>
        {!blocchi.find((b) => b.id === 'termini')?.visibile && (
          <AlertBanner type="info">
            Il blocco Termini e condizioni è nascosto.{' '}
            <button type="button" className="tpled__link" onClick={() => visibile('termini', true)}>Mostralo</button>
          </AlertBanner>
        )}
        <SelectField name="tc-doc" label="Documento da inserire" value={tpl.termini.id ?? ''} placeholder="Nessun documento"
          onChange={(e) => set('termini', { id: e.target.value || null })}
          options={documenti.map((d) => ({ value: d.id, label: d.titolo }))} />
        {termini && <p className="tpled__hint">{termini.sezioni.length} sezioni · aggiornato il {termini.aggiornato}</p>}
        <div className="tpled__row-acts">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setTerminiEdit('nuovo')}>
            <i className="fa-regular fa-plus" aria-hidden="true" /> Crea nuovi
          </button>
          {termini && (
            <>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setTerminiEdit(termini)}>
                <i className="fa-regular fa-pen" aria-hidden="true" /> Modifica
              </button>
              <Tooltip text="Elimina dalla libreria">
                <button type="button" className="sib-btn sib-btn--icon tpled__ico" aria-label="Elimina termini e condizioni" onClick={rimuoviTermini}>
                  <i className="fa-solid fa-trash-can" aria-hidden="true" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
        <RadioGroup name="tc-pres" label="Nella mail" value={tpl.termini.presentazione} onChange={(v) => set('termini', { presentazione: v as 'completo' | 'sintesi' })}
          options={[{ value: 'sintesi', label: 'In sintesi' }, { value: 'completo', label: 'Testo completo' }]} />
        <ToggleSwitch label="Accettazione obbligatoria" description="Per confermare la proposta il cliente deve spuntare di averli letti e accettati"
          checked={tpl.termini.obbligatorio} onChange={(v) => set('termini', { obbligatorio: v })} />
      </>
    ),
    footer: () => {
      const D = tpl.footer
      const base = datiStruttura(pr.struttura)
      const campo = (k: keyof DatiFooter, label: string, ph = '') => (
        <InputField name={`ft-${k}`} label={label} value={D[k] as string} placeholder={(base[k] as string) || ph}
          onChange={(e) => set('footer', { [k]: e.target.value } as Partial<DatiFooter>)} />
      )
      return (
        <>
          {!blocchi.find((b) => b.id === 'footer')?.visibile && (
            <AlertBanner type="info">
              Il footer è nascosto.{' '}
              <button type="button" className="tpled__link" onClick={() => visibile('footer', true)}>Mostralo</button>
            </AlertBanner>
          )}
          <p className="tpled__hint">I campi vuoti si completano con i dati della struttura del preventivo (in grigio).</p>
          <div className="tpled__row-acts">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => set('footer', base)}>
              <i className="fa-regular fa-building" aria-hidden="true" /> Compila dai dati di {pr.struttura}
            </button>
            <button type="button" className="sib-btn sib-btn--ghost" onClick={() => set('footer', { ...FOOTER_VUOTO, notaLegale: D.notaLegale })}>
              <i className="fa-regular fa-eraser" aria-hidden="true" /> Svuota
            </button>
          </div>
          <span className="tpled__group">Dati societari</span>
          {campo('ragioneSociale', 'Ragione sociale')}
          {campo('indirizzo', 'Indirizzo', 'Via, numero civico')}
          <div className="tpled__grid3">
            {campo('cap', 'CAP')}
            {campo('citta', 'Città')}
            {campo('provincia', 'Prov.')}
          </div>
          <div className="tpled__grid2">
            {campo('piva', 'Partita IVA', 'IT01234567890')}
            {campo('codiceFiscale', 'Codice fiscale')}
            {campo('rea', 'REA', 'SR-123456')}
            {campo('capitaleSociale', 'Capitale sociale', '10.000 € i.v.')}
          </div>
          <span className="tpled__group">Contatti</span>
          <div className="tpled__grid2">
            {campo('telefono', 'Telefono')}
            {campo('email', 'Email')}
            {campo('pec', 'PEC', 'azienda@pec.it')}
            {campo('sito', 'Sito web')}
          </div>
          <span className="tpled__group">Social</span>
          {campo('facebook', 'Facebook', 'facebook.com/…')}
          {campo('instagram', 'Instagram', 'instagram.com/…')}
          {campo('linkedin', 'LinkedIn', 'linkedin.com/company/…')}
          {campoTesto('notaLegale', 'Nota legale', 3)}
          <RadioGroup name="ft-align" label="Allineamento" value={D.allineamento} onChange={(v) => set('footer', { allineamento: v as DatiFooter['allineamento'] })}
            options={[{ value: 'left', label: 'Sinistra' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Destra' }]} />
          <ToggleSwitch label="Logo nel footer" description={H.logo ? 'Lo stesso dell\'intestazione' : 'Carica prima il logo in Intestazione e titoli'}
            checked={D.mostraLogo} disabled={!H.logo} onChange={(v) => set('footer', { mostraLogo: v })} />
        </>
      )
    },
    tipografia: () => (
      <>
        <SelectField name="f-titoli" label="Font dei titoli" value={F.titoli} onChange={(e) => set('font', { titoli: e.target.value as FontKey })}
          options={(Object.keys(FONT) as FontKey[]).map((k) => ({ value: k, label: FONT[k].label }))} />
        <SelectField name="f-testo" label="Font del testo" value={F.testo} onChange={(e) => set('font', { testo: e.target.value as FontKey })}
          options={(Object.keys(FONT) as FontKey[]).map((k) => ({ value: k, label: FONT[k].label }))} />
        <SelectField name="f-peso" label="Peso dei titoli" value={String(F.pesoTitoli)} onChange={(e) => set('font', { pesoTitoli: Number(e.target.value) })} options={PESI} />
        {r('Dimensione del titolo', 'f-dt', F.dimTitolo, (v) => set('font', { dimTitolo: v }), 16, 44)}
        {r('Dimensione del sottotitolo', 'f-ds', F.dimSottotitolo, (v) => set('font', { dimSottotitolo: v }), 11, 22)}
        {r('Dimensione del testo', 'f-dx', F.dimTesto, (v) => set('font', { dimTesto: v }), 11, 18)}
        <RangeField label="Interlinea" name="f-int" value={F.interlinea} onChange={(v) => set('font', { interlinea: v })} min={1.2} max={2} step={0.05}
          valueLabel={F.interlinea.toFixed(2)} hideReset />
        <ToggleSwitch label="Etichette in maiuscolo" description="Codice del preventivo e lettera della proposta" checked={F.etichetteMaiuscole} onChange={(v) => set('font', { etichetteMaiuscole: v })} />
      </>
    ),
    colori: () => (
      <>
        <div className="tpled__palettes">
          {PALETTE.map((p) => (
            <button key={p.nome} type="button" className="tpled__palette" onClick={() => set('colori', p.colori)}>
              <svg viewBox="0 0 48 12" aria-hidden="true">
                {[p.colori.primario, p.colori.accento, p.colori.sfondo, p.colori.testo].map((c, i) => <rect key={i} x={i * 12} width="12" height="12" fill={c} />)}
              </svg>
              {p.nome}
            </button>
          ))}
        </div>
        <div className="tpled__colors">
          {COLORI.map(({ k, label }) => (
            <ColorField key={k} label={label} value={C[k]} onChange={(v) => set('colori', { [k]: v } as Partial<ColoriTemplate>)} />
          ))}
        </div>
      </>
    ),
    forme: () => (
      <>
        {r('Spessore dei bordi', 's-b', S.bordo, (v) => set('forme', { bordo: v }), 0, 4)}
        {S.bordo > 0 && (
          <RadioGroup name="s-stile" label="Stile dei bordi" value={S.stileBordo} onChange={(v) => set('forme', { stileBordo: v as typeof S.stileBordo })}
            options={[{ value: 'solid', label: 'Continuo' }, { value: 'dashed', label: 'Tratteggiato' }, { value: 'dotted', label: 'Puntinato' }]} />
        )}
        {r('Angoli del contenitore', 's-rc', S.raggioContenitore, (v) => set('forme', { raggioContenitore: v }), 0, 32)}
        {r('Angoli delle proposte', 's-rp', S.raggioCard, (v) => set('forme', { raggioCard: v }), 0, 32)}
        {r('Angoli del pulsante', 's-rb', S.raggioPulsante, (v) => set('forme', { raggioPulsante: v }), 0, 30)}
        {r('Angoli delle foto', 's-rf', S.raggioFoto, (v) => set('forme', { raggioFoto: v }), 0, 24)}
        <ToggleSwitch label="Ombra" description="Sotto il contenitore e le proposte" checked={S.ombra} onChange={(v) => set('forme', { ombra: v })} />
      </>
    ),
  }

  return (
    <div className="tpled">
      <PageHead
        title={esistente ? `Modifica template · ${tpl.nome}` : 'Crea il tuo template'}
        subtitle="Personalizza la mail del preventivo di soggiorno: l'anteprima si aggiorna mentre lavori"
        onBack={esci}
      />

      <div className="tpled__lib">
        <SelectField name="tpl-lista" label="I miei template" value={esistente ? tpl.id : '__nuovo'} onChange={(e) => apri(e.target.value)}
          options={[
            { value: '__nuovo', label: esistente ? '+ Crea un nuovo template' : `${tpl.nome || 'Nuovo template'} (non salvato)` },
            ...personali.map((t) => ({ value: t.id, label: t.nome })),
          ]} />
        <span className="tpled__lib-info">
          {esistente
            ? <><i className="fa-regular fa-circle-check" aria-hidden="true" /> Salvato{personali.find((t) => t.id === tpl.id)?.aggiornato ? ` il ${personali.find((t) => t.id === tpl.id)!.aggiornato}` : ''} · {personali.length} {personali.length === 1 ? 'template salvato' : 'template salvati'}</>
            : <><i className="fa-regular fa-circle-dashed" aria-hidden="true" /> Nuovo template: salvalo per ritrovarlo nella lista</>}
        </span>
        <div className="tpled__lib-acts">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={salva}>
            <i className="fa-regular fa-floppy-disk" aria-hidden="true" /> Salva
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={apriInvio}>
            <i className="fa-regular fa-paper-plane" aria-hidden="true" /> Invia
          </button>
          {esistente && (
            <button type="button" className="sib-btn sib-btn--secondary tpled__danger" onClick={elimina}>
              <i className="fa-regular fa-trash-can" aria-hidden="true" /> Elimina
            </button>
          )}
          <button type="button" className="sib-btn sib-btn--primary" onClick={salvaECrea}>
            <i className="fa-solid fa-file-signature" aria-hidden="true" /> {prevId ? 'Salva e torna al preventivo' : 'Salva e crea preventivo'}
          </button>
        </div>
      </div>

      {errore && <AlertBanner type="error">{errore}</AlertBanner>}

      <div className="tpled__tabs" role="tablist" aria-label="Sezioni dell'editor">
        {([['design', 'Design della mail', 'fa-pen-ruler'], ['proposte', `Proposte (${pr.proposte.length})`, 'fa-bed']] as const).map(([id, label, ico]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={'tpled__tab' + (tab === id ? ' is-on' : '')} onClick={() => setTab(id)}>
            <i className={`fa-regular ${ico}`} aria-hidden="true" /> {label}
          </button>
        ))}
        {modificato && <span className="tpled__dirty"><i className="fa-solid fa-circle" aria-hidden="true" /> Modifiche non salvate</span>}
      </div>

      <div className="tpled__langs" role="radiogroup" aria-label="Lingua">
        <span className="tpled__label">Lingua dei testi e dell'anteprima</span>
        {ELENCO_LINGUE.map((l) => {
          const n = l === 'it' ? 0 : daTradurre(l)
          return (
            <Tooltip key={l} text={n ? `${n} ${n === 1 ? 'testo scritto a mano da tradurre' : 'testi scritti a mano da tradurre'}` : l === 'it' ? 'Lingua di base' : 'Tutti i testi tradotti'}>
              <button type="button" role="radio" aria-checked={lingua === l} className={'tpled__lang' + (lingua === l ? ' is-on' : '')} onClick={() => setLingua(l)}>
                <FlagCircle code={LINGUE[l].bandiera} size={18} /> {LINGUE[l].nativo}
                {n > 0 && <span className="tpled__lang-n">{n}</span>}
              </button>
            </Tooltip>
          )
        })}
      </div>

      {tab === 'design' ? (
        <div className="tpled__layout">
          <aside className="tpled__panel" aria-label="Impostazioni del template">
            {SEZIONI.map((s) => (
              <section key={s.id} className={'tpled__sec' + (aperta === s.id ? ' is-open' : '')}>
                <button type="button" className="tpled__sec-head" aria-expanded={aperta === s.id} onClick={() => setAperta(aperta === s.id ? null : s.id)}>
                  <span className="tpled__sec-ico"><i className={`fa-regular ${s.icona}`} aria-hidden="true" /></span>
                  <span className="tpled__sec-txt"><strong>{s.label}</strong><small>{s.desc}</small></span>
                  <i className={'fa-regular tpled__chev ' + (aperta === s.id ? 'fa-chevron-up' : 'fa-chevron-down')} aria-hidden="true" />
                </button>
                {aperta === s.id && <div className="tpled__sec-body">{pannello[s.id]()}</div>}
              </section>
            ))}
          </aside>

          <Anteprima html={html} device={device} onDevice={setDevice} tipo={tipoMail} onTipo={setTipoMail} />
        </div>
      ) : (
        <div className="tpled__props">
          <div className="tpled__props-head">
            <SelectField name="p-struttura" label="Struttura" value={pr.struttura}
              onChange={(e) => { const s = e.target.value; setPr((p) => ({ ...p, struttura: s, proposte: p.proposte.map((q) => conCamereAssegnate(q, s)) })) }}
              options={strutture.opzioni.some((o) => o.value === pr.struttura) ? strutture.opzioni : [{ value: pr.struttura, label: pr.struttura }, ...strutture.opzioni]} />
            <p className="tpled__hint">
              Le camere sono quelle libere nel gestionale della struttura per le date scelte: il sistema le assegna in automatico,
              oppure le scegli tu per numero. Le proposte passano nel preventivo con "{prevId ? 'Salva e torna al preventivo' : 'Salva e crea preventivo'}".
            </p>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setTab('design')}>
              <i className="fa-regular fa-eye" aria-hidden="true" /> Vedi nella mail
            </button>
          </div>
          {pr.proposte.map((q, i) => (
            <Proposta key={q.id} q={q} i={i} struttura={pr.struttura} sola={pr.proposte.length === 1} scelta={pr.accettata === q.id}
              onChange={(patch) => setProp(q.id, patch)} onDuplica={() => duplica(q)} onElimina={() => rimuovi(q, i)} />
          ))}
          <button type="button" className="tpled__add" onClick={aggiungi}>
            <i className="fa-regular fa-plus" aria-hidden="true" /> Aggiungi una soluzione
          </button>
        </div>
      )}

      {invio && <InviaModal html={html} pr={pr} lingua={lingua} onClose={() => setInvio(false)} onInvia={inviato} />}
      {terminiEdit && (
        <TerminiModal doc={terminiEdit === 'nuovo' ? null : terminiEdit} onClose={() => setTerminiEdit(null)}
          onSalvato={(id) => { set('termini', { id }); setTerminiEdit(null) }} />
      )}
    </div>
  )
}

// ─── Anteprima dal vivo ───────────────────────────────────────────────────────
function Anteprima({ html, device, onDevice, tipo, onTipo }: {
  html: string; device: 'desktop' | 'mobile'; onDevice: (d: 'desktop' | 'mobile') => void; tipo: TipoMail; onTipo: (t: TipoMail) => void
}) {
  return (
    <div className="tpled__preview">
      <div className="tpled__preview-bar">
        <div className="tpled__kinds" role="radiogroup" aria-label="Mail da vedere">
          {TIPI_MAIL.map((x) => (
            <button key={x.v} type="button" role="radio" aria-checked={tipo === x.v} className={'tpled__kind' + (tipo === x.v ? ' is-on' : '')} onClick={() => onTipo(x.v)}>
              <i className={`fa-regular ${x.ico}`} aria-hidden="true" /> {x.label}
            </button>
          ))}
        </div>
        <div className="tpled__devices" role="radiogroup" aria-label="Dispositivo">
          {([['desktop', 'fa-desktop', 'Computer'], ['mobile', 'fa-mobile-screen', 'Smartphone']] as const).map(([d, ico, label]) => (
            <Tooltip key={d} text={label}>
              <button type="button" role="radio" aria-checked={device === d} aria-label={label}
                className={'tpled__device' + (device === d ? ' is-on' : '')} onClick={() => onDevice(d)}>
                <i className={`fa-regular ${ico}`} aria-hidden="true" />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className={'tpled__stage tpled__stage--' + device}>
        <iframe className="tpled__frame" title="Anteprima della mail" srcDoc={html} />
      </div>
    </div>
  )
}

// ─── Campi dell'editor ────────────────────────────────────────────────────────
function Scelte<V extends string>({ label, value, onChange, opzioni }: {
  label: string; value: V; onChange: (v: V) => void
  opzioni: { v: V; label: string; ico?: string; schema?: string }[]
}) {
  return (
    <div className="tpled__choice">
      <span className="tpled__label">{label}</span>
      <div className="tpled__choice-opts" role="radiogroup" aria-label={label}>
        {opzioni.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v}
            className={'tpled__opt' + (value === o.v ? ' is-on' : '')} onClick={() => onChange(o.v)}>
            {o.schema ? <span className={`tpled__schema tpled__schema--${o.schema}`} aria-hidden="true"><i /><b /><b /></span>
              : <i className={`fa-regular ${o.ico}`} aria-hidden="true" />}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ImmagineField({ label, value, vuoto, onFile, onRimuovi, piccola }: {
  label: string; value: string | null; vuoto: string; onFile: (f?: File) => void; onRimuovi: () => void; piccola?: boolean
}) {
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="tpled__img">
      <span className="tpled__label">{label}</span>
      <div className="tpled__img-row">
        <span className={'tpled__img-prev' + (piccola ? ' tpled__img-prev--logo' : '')}>
          {value ? <img src={value} alt="" /> : <small>{vuoto}</small>}
        </span>
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => file.current?.click()}>
          <i className="fa-regular fa-upload" aria-hidden="true" /> {value ? 'Cambia' : 'Carica'}
        </button>
        {value && (
          <Tooltip text="Rimuovi immagine">
            <button type="button" className="sib-btn sib-btn--icon tpled__ico" aria-label="Rimuovi immagine" onClick={onRimuovi}>
              <i className="fa-solid fa-trash-can" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>
      <input ref={file} type="file" accept="image/*" className="tpled__file" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const fuori = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="tpled__color" ref={box}>
      <button type="button" className="tpled__color-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg className="tpled__swatch" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="5" fill={value} /></svg>
        <span className="tpled__color-lbl">{label}</span>
        <code>{value.toUpperCase()}</code>
      </button>
      {open && (
        <div className="tpled__picker">
          <HexColorPicker color={value} onChange={onChange} />
          <HexColorInput color={value} onChange={onChange} prefixed className="tpled__hex" aria-label={`Codice colore ${label}`} />
        </div>
      )}
    </div>
  )
}

function Segnaposto() {
  const copia = (s: string) => { navigator.clipboard?.writeText(s); toast.info(`${s} copiato: incollalo nel testo`) }
  return (
    <div className="tpled__vars">
      <span className="tpled__label">Segnaposto</span>
      <div className="tpled__vars-list">
        {SEGNAPOSTO.map(([k, d]) => (
          <Tooltip key={k} text={`${d} · clic per copiare`}>
            <button type="button" className="tpled__var" onClick={() => copia(k)}>{k}</button>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

// ─── Invio: mail di prova o preventivo vero al cliente ───────────────────────
function InviaModal({ html, pr, lingua, onClose, onInvia }: {
  html: string; pr: PreventivoSoggiorno; lingua: Lingua; onClose: () => void
  onInvia: (d: { cliente: string; email: string; oggetto: string; prova: boolean }) => void
}) {
  const [prova, setProva] = useState(!pr.email)
  const [cliente, setCliente] = useState(pr.cliente)
  const [email, setEmail] = useState(pr.email)
  // La mail parte nella lingua scelta: anche l'oggetto.
  const [oggetto, setOggetto] = useState(`${tr(lingua, 'Preventivo di soggiorno')} · ${pr.struttura}`)
  const [tentato, setTentato] = useState(false)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const ok = emailOk && (prova || !!cliente.trim())
  const invia = () => { setTentato(true); if (ok) onInvia({ cliente: cliente.trim(), email: email.trim(), oggetto, prova }) }

  return (
    <Modal open onClose={onClose} size="xl" title="Invia la mail" className="tpled-send">
      <div className="tpled-send__body">
        <div className="tpled-send__fields">
          <RadioGroup name="send-tipo" label="Cosa inviare" value={prova ? 'prova' : 'cliente'} onChange={(v) => setProva(v === 'prova')}
            options={[{ value: 'prova', label: 'Una mail di prova' }, { value: 'cliente', label: 'Il preventivo al cliente' }]} />
          {!prova && (
            <InputField name="send-cliente" label="Cliente" required value={cliente} onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome e cognome o azienda" error={tentato && !cliente.trim() ? 'Indica il cliente' : undefined} />
          )}
          <InputField name="send-email" label={prova ? 'Invia la prova a' : 'Email del cliente'} type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} iconLeft="fa-regular fa-envelope" placeholder="nome@dominio.it"
            error={tentato && !emailOk ? 'Indica un\'email valida' : undefined} />
          <InputField name="send-oggetto" label="Oggetto" value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
          <p className="tpled__send-lang"><FlagCircle code={LINGUE[lingua].bandiera} size={16} /> Mail in {LINGUE[lingua].label.toLowerCase()}: testo e oggetto nella lingua scelta.</p>
          <AlertBanner type="info">
            La piattaforma non è ancora collegata a un servizio di invio: la mail si scarica come file .eml, che si apre come bozza
            nel programma di posta (Outlook, Apple Mail, Thunderbird) già impaginata, con destinatario e oggetto. Premi Invia da lì.
          </AlertBanner>
          <p className="tpled__hint">
            {prova
              ? 'La prova contiene le proposte attuali: serve a vedere la mail com\'è davvero nel programma di posta.'
              : 'Il template viene salvato e il preventivo, con queste proposte, passa in "Inviato": lo ritrovi in I miei preventivi.'}
          </p>
        </div>
        <iframe className="tpled-send__frame" title="Mail da inviare" srcDoc={html} />
      </div>
      <div className="tpled-send__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={invia}>
          <i className="fa-regular fa-download" aria-hidden="true" /> {prova ? 'Scarica la mail di prova' : 'Scarica la mail per il cliente'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Termini e condizioni: crea o modifica un documento della libreria ───────
function TerminiModal({ doc, onClose, onSalvato }: { doc: Termini | null; onClose: () => void; onSalvato: (id: string) => void }) {
  const salva = useTerminiStore((s) => s.salva)
  const confirm = useConfirmStore((s) => s.confirm)
  const [titolo, setTitolo] = useState(doc?.titolo ?? '')
  const [sezioni, setSezioni] = useState(doc?.sezioni.map((x) => ({ ...x })) ?? [{ id: uid(), titolo: '', testo: '' }])
  const [errore, setErrore] = useState<string | null>(null)

  const setSez = (id: string, patch: Partial<{ titolo: string; testo: string }>) => setSezioni((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const sposta = (i: number, d: number) => setSezioni((xs) => {
    const j = i + d
    if (j < 0 || j >= xs.length) return xs
    const out = [...xs]; [out[i], out[j]] = [out[j], out[i]]; return out
  })
  const togli = async (i: number) => {
    const x = sezioni[i]
    const ok = (!x.titolo && !x.testo) || await confirm({
      title: 'Elimina sezione', message: `Eliminare la sezione "${x.titolo || `n. ${i + 1}`}"?`, confirmLabel: 'Elimina', danger: true,
    })
    if (ok) setSezioni((xs) => xs.filter((y) => y.id !== x.id))
  }
  const conferma = () => {
    const piene = sezioni.filter((x) => x.titolo.trim() || x.testo.trim())
    if (!titolo.trim()) { setErrore('Dai un titolo al documento'); return }
    if (!piene.length) { setErrore('Scrivi almeno una sezione'); return }
    if (piene.some((x) => !x.titolo.trim() || !x.testo.trim())) { setErrore('Ogni sezione ha bisogno di un titolo e di un testo'); return }
    const id = doc?.id ?? `tc-${Date.now().toString(36)}`
    salva({ id, titolo: titolo.trim(), aggiornato: '', sezioni: piene.map((x) => ({ ...x, titolo: x.titolo.trim(), testo: x.testo.trim() })) })
    toast.success(`"${titolo.trim()}" salvato nella libreria`)
    onSalvato(id)
  }

  return (
    <Modal open onClose={onClose} size="lg" title={doc ? 'Modifica termini e condizioni' : 'Nuovi termini e condizioni'} className="tpled-tc">
      <div className="tpled-tc__body">
        {errore && <AlertBanner type="error">{errore}</AlertBanner>}
        <InputField name="tc-titolo" label="Titolo del documento" required value={titolo} onChange={(e) => setTitolo(e.target.value)}
          placeholder="Es. Condizioni generali di soggiorno" />
        <ol className="tpled-tc__list">
          {sezioni.map((x, i) => (
            <li key={x.id} className="tpled-tc__sec">
              <div className="tpled-tc__sec-head">
                <span className="tpled-tc__num">{i + 1}</span>
                <InputField name={`tc-s-${x.id}`} ariaLabel={`Titolo sezione ${i + 1}`} value={x.titolo} onChange={(e) => setSez(x.id, { titolo: e.target.value })}
                  placeholder="Titolo della sezione (es. Cancellazione)" className="tpled-tc__sec-title" />
                <Tooltip text="Sposta su">
                  <button type="button" className="sib-btn sib-btn--icon tpled__ico" aria-label="Sposta su" disabled={i === 0} onClick={() => sposta(i, -1)}>
                    <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip text="Sposta giù">
                  <button type="button" className="sib-btn sib-btn--icon tpled__ico" aria-label="Sposta giù" disabled={i === sezioni.length - 1} onClick={() => sposta(i, 1)}>
                    <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip text="Elimina sezione">
                  <button type="button" className="sib-btn sib-btn--icon tpled__ico" aria-label="Elimina sezione" onClick={() => togli(i)}>
                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
              <TextareaField name={`tc-t-${x.id}`} label="Testo" rows={3} value={x.testo}
                onChange={(e) => setSez(x.id, { testo: e.target.value })} placeholder="Testo della clausola" />
            </li>
          ))}
        </ol>
        <button type="button" className="tpled__add" onClick={() => setSezioni((xs) => [...xs, { id: uid(), titolo: '', testo: '' }])}>
          <i className="fa-regular fa-plus" aria-hidden="true" /> Aggiungi una sezione
        </button>
      </div>
      <div className="tpled-tc__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={conferma}>
          <i className="fa-regular fa-floppy-disk" aria-hidden="true" /> Salva e inserisci nel template
        </button>
      </div>
    </Modal>
  )
}
