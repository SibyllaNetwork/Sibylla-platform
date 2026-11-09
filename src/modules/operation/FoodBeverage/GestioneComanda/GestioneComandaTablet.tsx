// ─── Gestione comanda · versione tablet ───────────────────────────────────────
//  A tutto schermo, senza sidenav: lo strumento del cameriere al tavolo. Lo
//  schema è quello dei POS di sala più usati (Toast, Lightspeed, Square, TheFork
//  Manager): prima la mappa dei tavoli, poi la comanda in tre colonne —
//  categorie a sinistra, piatti al centro, scontrino a destra — con le azioni
//  pesanti (Invia in cucina, Conto) sempre sotto il pollice.
//
//  Scelte per il dito e per la fretta:
//    • bersagli da almeno 56px, niente menu a tendina, niente doppio clic
//    • un tocco su un piatto = +1, con il contatore sulla card e un lampo di
//      conferma; tenendo premuto si aprono note e varianti
//    • la portata ("uscita") si imposta da sola scegliendo la categoria
//      (antipasti → 1ª uscita, primi → 2ª…) e si può cambiare con un tocco
//    • le righe già partite per la cucina non si cancellano: si stornano col
//      motivo, come nella versione desktop
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import TouchKeyboard from '../../../../core/components/TouchKeyboard/TouchKeyboard'
import { InputField, SearchField, TextareaField } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, totaleRiga, totaleConto, totaleComanda, scontoComanda, SALE } from '../../../../store/useFbStore'
import {
  CAMERIERI, CATEGORIE_MENU, GRUPPI_INGREDIENTE, INGREDIENTI, INGREDIENTI_EXTRA, MOTIVI_STORNO, normalizzaRicerca, PORTATE, STATO_RIGA, STATO_TAVOLO, TIPI_MENU, VOCI_MENU,
  ricettaDi, type Comanda, type GruppoIngrediente, type MotivoStorno, type RigaComanda, type Tavolo, type VoceMenu,
} from '../fb.model'
import { useFbSenzaHotel, metodoAmmesso } from '../useFbSenzaHotel'
import { TabletMenu } from '../tablet/TabletShell'
import './GestioneComandaTablet.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

const NOTE_RAPIDE = [
  'Senza glutine', 'Senza lattosio', 'Ben cotto', 'Al sangue', 'Poco piccante',
  'Senza cipolla', 'Porzione bambino', 'A parte', 'Prima delle altre',
]

const PAGAMENTI: Array<{ id: NonNullable<Comanda['pagamento']>; label: string; ico: string }> = [
  { id: 'carta',    label: 'Carta',           ico: 'fa-credit-card' },
  { id: 'contanti', label: 'Contanti',        ico: 'fa-money-bill-wave' },
  { id: 'camera',   label: 'Addebito camera', ico: 'fa-bed' },
  { id: 'wallet',   label: 'Wallet Sibylla',  ico: 'fa-wallet' },
]

// ── Opzioni del piatto ──────────────────────────────────────────────────────
//  Scelte singole per famiglia di piatto (la cottura della carne, il formato
//  della porzione, l'impasto…). Vanno in cucina nella nota della riga come
//  "Gruppo: scelta". Le obbligatorie aprono il foglio appena il piatto è
//  aggiunto, come i "modificatori forzati" dei POS di sala.
interface GruppoOpzioni { nome: string; scelte: string[]; obbligatoria?: boolean }

const PESCE = /salmone|rombo|pesce|tonno|gamber|capesant|alici|baccal|sashimi|nigiri|uramaki/i

export function opzioniDi(v: VoceMenu): GruppoOpzioni[] {
  const cat = CATEGORIE_MENU.find(c => c.id === v.categoriaId)?.nome ?? ''
  const out: GruppoOpzioni[] = []
  // Carne alla griglia: la cottura si chiede sempre
  if (/bistecca|tagliata|filetto|controfiletto|costata|hamburger/i.test(v.nome) && !PESCE.test(v.nome)) {
    out.push({ nome: 'Cottura', scelte: ['Al sangue', 'Media', 'Ben cotta'], obbligatoria: true })
  }
  if (/secondi/i.test(cat) && !out.length) out.push({ nome: 'Contorno', scelte: ['Patate al forno', 'Verdure', 'Insalata', 'Senza contorno'], obbligatoria: true })
  if (/primi/i.test(cat)) out.push({ nome: 'Porzione', scelte: ['Intera', 'Mezza porzione'] })
  if (/pizz/i.test(cat)) {
    out.push({ nome: 'Impasto', scelte: ['Classico', 'Integrale', 'Senza glutine'], obbligatoria: true })
    out.push({ nome: 'Cottura', scelte: ['Normale', 'Ben cotta'] })
  }
  if (/sushi|sashimi/i.test(cat)) out.push({ nome: 'Salsa', scelte: ['Soia', 'Soia senza glutine', 'Wasabi a parte'] })
  if (/ramen/i.test(v.nome)) out.push({ nome: 'Piccante', scelte: ['Delicato', 'Medio', 'Piccante'] })
  if (/soft drink|bibite/i.test(cat)) out.push({ nome: 'Servizio', scelte: ['Con ghiaccio e limone', 'Senza ghiaccio'] })
  if (/caffetteria/i.test(cat) && /cappuccino|latte|macchiato/i.test(v.nome)) out.push({ nome: 'Latte', scelte: ['Intero', 'Senza lattosio', 'Vegetale'] })
  if (/caffetteria/i.test(cat) && /espresso|caffè/i.test(v.nome)) out.push({ nome: 'Caffè', scelte: ['Normale', 'Ristretto', 'Lungo', 'Decaffeinato'] })
  if (/birre/i.test(cat)) out.push({ nome: 'Formato', scelte: ['Piccola', 'Media'] })
  if (/cocktail/i.test(cat)) out.push({ nome: 'Variante', scelte: ['Classico', 'Analcolico'] })
  if (/vini|bollicine|rossi|bianchi|ros/i.test(cat) && v.reparto === 'cantina') out.push({ nome: 'Servizio', scelte: ['Bottiglia', 'Al calice'] })
  return out
}

/** Le aggiunte a pagamento hanno senso solo per i piatti di cucina. */
const conAggiunte = (v?: VoceMenu) => v?.reparto === 'cucina'

/** Portata proposta per categoria: è l'ordine in cui i piatti escono dalla cucina. */
const PORTATA_DI_CATEGORIA: Record<number, number> = { 1: 1, 2: 2, 3: 3, 14: 3, 4: 4 }

const minutiDa = (hhmm: string | null | undefined) => {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  return ((d.getHours() * 60 + d.getMinutes()) - (h * 60 + m) + 1440) % 1440
}
const durata = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}′` : `${min}′`)

export default function GestioneComandaTablet({ navigate }: { navigate?: (p: string) => void }) {
  const senzaHotel  = useFbSenzaHotel()
  const pagamenti   = PAGAMENTI.filter(p => metodoAmmesso(p.id, senzaHotel))
  const outlets     = useFbStore(s => s.outlets)
  const contesto    = useFbStore(s => s.contesto)
  const setContesto = useFbStore(s => s.setContesto)
  const tavoli      = useFbStore(s => s.tavoli)
  const comande     = useFbStore(s => s.comande)
  const apriTavolo  = useFbStore(s => s.apriTavolo)
  const aggiungiVoce = useFbStore(s => s.aggiungiVoce)
  const setQta      = useFbStore(s => s.setQta)
  const setNotaRiga = useFbStore(s => s.setNotaRiga)
  const setPortataRiga = useFbStore(s => s.setPortataRiga)
  const toggleSenzaRiga = useFbStore(s => s.toggleSenzaRiga)
  const setExtraRiga = useFbStore(s => s.setExtraRiga)
  const rimuoviRiga = useFbStore(s => s.rimuoviRiga)
  const stornaRiga  = useFbStore(s => s.stornaRiga)
  const inviaComanda = useFbStore(s => s.inviaComanda)
  const chiudiConto = useFbStore(s => s.chiudiConto)
  const setCoperti  = useFbStore(s => s.setCoperti)
  const nuovaComanda = useFbStore(s => s.nuovaComanda)
  const staccaConto = useFbStore(s => s.staccaConto)
  const setCategoriaCliente = useFbStore(s => s.setCategoriaCliente)
  const setNotaComanda = useFbStore(s => s.setNotaComanda)
  const setAddebitoCamera = useFbStore(s => s.setAddebitoCamera)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const categorieCliente = useFbStore(s => s.categorieCliente)
  const confirm     = useConfirmStore(s => s.confirm)

  const [vista, setVista] = useState<'tavoli' | 'comanda'>(contesto.tavoloId ? 'comanda' : 'tavoli')
  const [cameriere, setCameriere] = useState(CAMERIERI[0] ?? '')
  const [salaId, setSalaId] = useState(contesto.salaId)
  const [ora, setOra] = useState(() => new Date())
  useEffect(() => { const id = window.setInterval(() => setOra(new Date()), 30000); return () => window.clearInterval(id) }, [])

  const saleOutlet = SALE.filter(s => s.outletId === contesto.outletId)
  const outlet = outlets.find(o => o.id === contesto.outletId)

  // ── Tavolo e comanda di lavoro ────────────────────────────────────────────
  const tavolo = tavoli.find(t => t.id === contesto.tavoloId)
  // Più conti sullo stesso tavolo (conti separati): si sceglie quale si sta servendo
  const aperte = useMemo(() => comande.filter(c => c.tavoloId === tavolo?.id && c.stato === 'aperta'), [comande, tavolo])
  const [comandaId, setComandaId] = useState<number | null>(null)
  const comanda = aperte.find(c => c.id === comandaId) ?? aperte[0]
  const chiuseDelTavolo = useMemo(() => comande.filter(c => c.tavoloId === tavolo?.id && c.stato === 'chiusa'), [comande, tavolo])
  const pren = prenotazioni.find(p => p.tavoloId === tavolo?.id && p.data === contesto.data && p.stato !== 'annullata')
  const catCliente = categorieCliente.find(c => c.id === comanda?.categoriaClienteId)

  // ── Catalogo ──────────────────────────────────────────────────────────────
  const [tipoId, setTipoId] = useState(TIPI_MENU[0]?.id ?? 1)
  const categorie = useMemo(
    () => CATEGORIE_MENU.filter(c => c.tipoId === tipoId && VOCI_MENU.some(v => v.attiva && v.categoriaId === c.id))
      .sort((a, b) => a.ordine - b.ordine),
    [tipoId],
  )
  const [catId, setCatId] = useState<number | null>(null)
  const categoria = catId === -1 ? undefined : categorie.find(c => c.id === catId) ?? categorie[0]
  const [portata, setPortata] = useState(1)
  const [cerca, setCerca] = useState('')
  const voci = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    if (q) return VOCI_MENU.filter(v => v.attiva && v.nome.toLowerCase().includes(q))
    if (catId === -1) return VOCI_MENU.filter(v => v.attiva && categorie.some(c => c.id === v.categoriaId))
    return VOCI_MENU.filter(v => v.attiva && v.categoriaId === categoria?.id)
  }, [cerca, categoria, catId, categorie])

  const scegliCategoria = (id: number) => {
    setCatId(id); setCerca('')
    setPortata(PORTATA_DI_CATEGORIA[id] ?? 0)
  }
  const scegliTipo = (id: number) => {
    setTipoId(id); setCerca('')
    const prima = CATEGORIE_MENU.filter(c => c.tipoId === id).sort((a, b) => a.ordine - b.ordine)[0]
    if (prima) scegliCategoria(prima.id)
  }

  // Lampo di conferma sulla card appena toccata
  const [lampo, setLampo] = useState<{ id: number; n: number } | null>(null)
  const pressione = useRef<number | null>(null)
  const lungo = useRef(false)

  // ── Fogli (bottom sheet) ──────────────────────────────────────────────────
  const [apriCoperti, setApriCoperti] = useState<Tavolo | null>(null)
  const [rigaId, setRigaId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<MotivoStorno>(MOTIVI_STORNO[0])
  const [conto, setConto] = useState(false)
  const [pagamento, setPagamento] = useState<Comanda['pagamento']>('carta')
  const [scontrinoAperto, setScontrinoAperto] = useState(false)
  const [sceltaCameriere, setSceltaCameriere] = useState(false)
  const [schedaCliente, setSchedaCliente] = useState(false)
  const [notaTavolo, setNotaTavolo] = useState(false)
  const [archivio, setArchivio] = useState(false)
  const [dividi, setDividi] = useState<null | 'uguali' | 'righe'>(null)
  const [selRighe, setSelRighe] = useState<string[]>([])
  const [parti, setParti] = useState(2)
  const [cercaExtra, setCercaExtra] = useState('')
  const [gruppoExtra, setGruppoExtra] = useState<GruppoIngrediente | null>(null)

  const riga = comanda?.righe.find(r => r.id === rigaId) ?? null

  // ── Azioni ────────────────────────────────────────────────────────────────
  const entraNelTavolo = (t: Tavolo) => {
    const aperta = comande.find(c => c.tavoloId === t.id && c.stato === 'aperta')
    if (!aperta) { setApriCoperti(t); return }
    setContesto({ tavoloId: t.id, salaId: t.salaId })
    setComandaId(null)
    setVista('comanda')
  }

  const confermaCoperti = (n: number) => {
    if (!apriCoperti) return
    apriTavolo(apriCoperti.id, n, cameriere, contesto.turnoId, 0)
    setContesto({ tavoloId: apriCoperti.id, salaId: apriCoperti.salaId })
    toast.success(`Tavolo ${apriCoperti.numero} aperto · ${n} coperti`)
    setApriCoperti(null)
    if (categorie[0] && !catId) scegliCategoria(categorie[0].id)
    setVista('comanda')
  }

  const aggiungi = (v: VoceMenu) => {
    if (!comanda) return
    aggiungiVoce(comanda.id, v.id, portata)
    setLampo({ id: v.id, n: Date.now() })
    // Opzione obbligatoria (es. la cottura): si sceglie subito, prima di andare avanti
    if (opzioniDi(v).some(g => g.obbligatoria)) {
      const nuova = useFbStore.getState().comande.find(c => c.id === comanda.id)?.righe
        .filter(r => r.voceId === v.id && r.stato === 'in-comanda').slice(-1)[0]
      if (nuova) setRigaId(nuova.id)
    }
  }

  const premiInizio = (v: VoceMenu) => {
    lungo.current = false
    pressione.current = window.setTimeout(() => {
      lungo.current = true
      if (!comanda) return
      // Pressione lunga: aggiunge e apre subito note e varianti della riga nuova
      aggiungiVoce(comanda.id, v.id, portata)
      const nuova = useFbStore.getState().comande.find(c => c.id === comanda.id)?.righe
        .filter(r => r.voceId === v.id && r.stato === 'in-comanda').slice(-1)[0]
      if (nuova) setRigaId(nuova.id)
    }, 520)
  }
  const premiFine = (v: VoceMenu) => {
    if (pressione.current) window.clearTimeout(pressione.current)
    pressione.current = null
    if (!lungo.current) aggiungi(v)
  }

  const invia = () => {
    if (!comanda) return
    const n = inviaComanda(comanda.id)
    if (!n) { toast.info('Niente di nuovo da inviare'); return }
    toast.success(`Tavolo ${tavolo?.numero}: ${n} ${n === 1 ? 'piatto inviato' : 'piatti inviati'} in cucina`)
    setScontrinoAperto(false)
    setVista('tavoli')
  }

  const meno = async (r: RigaComanda) => {
    if (!comanda) return
    if (r.qta > 1) { setQta(comanda.id, r.id, r.qta - 1); return }
    const ok = await confirm({ message: `Togliere “${r.nome}” dalla comanda?`, confirmLabel: 'Togli' })
    if (ok) rimuoviRiga(comanda.id, r.id)
  }

  const eliminaRiga = async () => {
    if (!comanda || !riga) return
    const ok = await confirm({ message: `Togliere “${riga.nome}” dalla comanda?`, confirmLabel: 'Togli' })
    if (!ok) return
    rimuoviRiga(comanda.id, riga.id)
    setRigaId(null)
  }

  const storna = () => {
    if (!comanda || !riga) return
    stornaRiga(comanda.id, riga.id, motivo, cameriere || comanda.cameriere || 'sconosciuto')
    toast.info(`${riga.nome} stornata · ${motivo.toLowerCase()}`)
    setRigaId(null)
  }

  /** Scelta singola di un gruppo d'opzioni: sostituisce la scelta precedente dello stesso gruppo. */
  const scegliOpzione = (gruppo: string, scelta: string) => {
    if (!comanda || !riga) return
    const parti = (riga.note ? riga.note.split(' · ') : []).filter(p => !p.startsWith(`${gruppo}: `))
    const attuale = riga.note.split(' · ').includes(`${gruppo}: ${scelta}`)
    setNotaRiga(comanda.id, riga.id, (attuale ? parti : [`${gruppo}: ${scelta}`, ...parti]).join(' · '))
  }

  const toggleNota = (nota: string) => {
    if (!comanda || !riga) return
    const parti = riga.note ? riga.note.split(' · ') : []
    const nuove = parti.includes(nota) ? parti.filter(p => p !== nota) : [...parti, nota]
    setNotaRiga(comanda.id, riga.id, nuove.join(' · '))
  }

  const incassa = () => {
    if (!comanda || !tavolo) return
    const tot = totaleConto(comanda)
    chiudiConto(comanda.id, pagamento)
    setConto(false)
    const altri = aperte.filter(c => c.id !== comanda.id)
    if (altri.length) { setComandaId(altri[0].id); toast.success(`Conto n. ${comanda.numero} incassato · ${euro(tot)}`); return }
    setContesto({ tavoloId: null })
    setVista('tavoli')
    toast.success(`Tavolo ${tavolo.numero} chiuso · ${euro(tot)}`)
  }

  const quota = comanda ? totaleConto(comanda) / Math.max(1, parti) : 0
  const staccato = comanda ? comanda.righe.filter(r => selRighe.includes(r.id)).reduce((a, r) => a + totaleRiga(r), 0) : 0
  const confermaDivisione = () => {
    if (!comanda || !tavolo) return
    if (dividi === 'uguali') {
      chiudiConto(comanda.id, pagamento)
      toast.success(`${parti} quote da ${euro(quota)} incassate`)
      setDividi(null)
      const altri = aperte.filter(c => c.id !== comanda.id)
      if (altri.length) { setComandaId(altri[0].id); return }
      setContesto({ tavoloId: null }); setVista('tavoli')
      return
    }
    if (!selRighe.length) { toast.warning('Scegli le consumazioni da staccare'); return }
    staccaConto(comanda.id, selRighe, pagamento)
    toast.success(`Conto staccato e incassato · ${euro(staccato)}`)
    setSelRighe([]); setDividi(null)
  }

  // ── Dati per lo scontrino ─────────────────────────────────────────────────
  const daInviare = comanda?.righe.filter(r => r.stato === 'in-comanda') ?? []
  const perPortata = useMemo(() => {
    if (!comanda) return []
    return PORTATE
      .map(p => ({ p, righe: comanda.righe.filter(r => r.portata === p.id) }))
      .filter(g => g.righe.length)
  }, [comanda])
  const inComandaDi = (voceId: number) =>
    comanda?.righe.filter(r => r.voceId === voceId && r.stato === 'in-comanda').reduce((a, r) => a + r.qta, 0) ?? 0

  const orario = ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const iniziali = cameriere.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()

  // ──────────────────────────────────────────────────────────────────────────
  const schermo = (
    <div className="gctab" role="application" aria-label="Comanda al tavolo">
      {/* ── Testata ─────────────────────────────────────────────────────── */}
      <header className="gctab__head">
        <div className="gctab__head-sx">
        <TabletMenu pagina="gest-comanda" navigate={navigate} />
        {vista === 'comanda' ? (
          <button type="button" className="gctab__head-btn" onClick={() => setVista('tavoli')} aria-label="Torna ai tavoli">
            <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Tavoli
          </button>
        ) : (
          <button type="button" className="gctab__head-btn" onClick={() => navigate?.('home')} aria-label="Esci dalla comanda">
            <i className="fa-solid fa-arrow-right-from-bracket fa-flip-horizontal" aria-hidden="true" /> Esci
          </button>
        )}
        </div>

        <div className="gctab__head-centro">
          {vista === 'comanda' && tavolo && comanda ? (
            <>
              <span className="gctab__head-tavolo">Tavolo {tavolo.numero}</span>
              <span className="gctab__head-sep" />
              <span className="gctab__coperti">
                <button type="button" aria-label="Un coperto in meno" onClick={() => setCoperti(comanda.id, Math.max(1, comanda.coperti - 1))}>
                  <i className="fa-solid fa-minus" aria-hidden="true" />
                </button>
                <span><i className="fa-solid fa-user-group" aria-hidden="true" /> {comanda.coperti}</span>
                <button type="button" aria-label="Un coperto in più" onClick={() => setCoperti(comanda.id, comanda.coperti + 1)}>
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </span>
              <span className="gctab__head-sep" />
              <span className="gctab__head-info"><i className="fa-regular fa-clock" aria-hidden="true" /> {durata(minutiDa(comanda.apertaAlle))}</span>
            </>
          ) : (
            <span className="gctab__head-tavolo">{outlet?.nome ?? 'Sala'}</span>
          )}
        </div>

        <div className="gctab__head-dx">
          <span className="gctab__head-ora">{orario}</span>
          <button type="button" className="gctab__cameriere" onClick={() => setSceltaCameriere(true)} aria-label={`Cameriere: ${cameriere}. Cambia`}>
            <span className="gctab__cameriere-av" aria-hidden="true">{iniziali}</span>
            <span>{cameriere}</span>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>
        </div>
      </header>

      {vista === 'tavoli' ? (
        /* ── Mappa dei tavoli ──────────────────────────────────────────── */
        <main className="gctab__tavoli">
          <nav className="gctab__sale" aria-label="Sale">
            {saleOutlet.map(s => {
              const aperti = tavoli.filter(t => t.salaId === s.id && comande.some(c => c.tavoloId === t.id && c.stato === 'aperta')).length
              return (
                <button key={s.id} type="button" className={`gctab__sala ${salaId === s.id ? 'is-on' : ''}`} onClick={() => setSalaId(s.id)}>
                  {s.nome}<em>{aperti} aperti</em>
                </button>
              )
            })}
          </nav>
          <div className="gctab__griglia-tavoli">
            {tavoli.filter(t => t.salaId === salaId && t.stato !== 'bloccato')
              .sort((a, b) => a.numero.localeCompare(b.numero, 'it', { numeric: true }))
              .map(t => {
                const c = comande.find(x => x.tavoloId === t.id && x.stato === 'aperta')
                const stato = c ? (c.righe.some(r => r.stato === 'in-comanda') ? 'ordinato' : t.stato === 'libero' ? 'occupato' : t.stato) : t.stato
                const meta = STATO_TAVOLO[stato] ?? STATO_TAVOLO.libero
                const mio = c && c.cameriere === cameriere
                return (
                  <button
                    key={t.id} type="button"
                    className={`gctab__tav ${c ? 'is-aperto' : ''} ${mio ? 'is-mio' : ''}`}
                    style={{ '--st': meta.color } as React.CSSProperties}
                    onClick={() => entraNelTavolo(t)}
                  >
                    <span className="gctab__tav-num">{t.numero}</span>
                    <span className="gctab__tav-stato"><i aria-hidden="true" />{c ? meta.label : t.stato === 'libero' ? 'Libero' : meta.label}</span>
                    {c ? (
                      <span className="gctab__tav-dett">
                        <span><i className="fa-solid fa-user-group" aria-hidden="true" /> {c.coperti}</span>
                        <span><i className="fa-regular fa-clock" aria-hidden="true" /> {durata(minutiDa(c.apertaAlle))}</span>
                        <strong>{euro(totaleConto(c))}</strong>
                      </span>
                    ) : (
                      <span className="gctab__tav-dett"><span><i className="fa-solid fa-chair" aria-hidden="true" /> {t.capienza} posti</span></span>
                    )}
                    {c && <span className="gctab__tav-cam">{c.cameriere}</span>}
                  </button>
                )
              })}
          </div>
        </main>
      ) : !comanda || !tavolo ? (
        <main className="gctab__vuoto">
          <i className="fa-solid fa-chair" aria-hidden="true" />
          <p>Scegli un tavolo per iniziare</p>
          <button type="button" className="gctab__cta" onClick={() => setVista('tavoli')}>Vai ai tavoli</button>
        </main>
      ) : (
        /* ── Comanda: categorie · piatti · scontrino ──────────────────── */
        <main className={`gctab__comanda ${scontrinoAperto ? 'is-scontrino' : ''}`}>
          <aside className="gctab__cat">
            <SearchField className="gctab__cerca" name="cerca-piatto" value={cerca} placeholder="Cerca"
              onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} />
            <div className="gctab__tipi" role="tablist">
              {TIPI_MENU.filter(t => CATEGORIE_MENU.some(c => c.tipoId === t.id && VOCI_MENU.some(v => v.attiva && v.categoriaId === c.id))).map(t => (
                <button key={t.id} type="button" role="tab" aria-selected={tipoId === t.id}
                  className={`gctab__tipo ${tipoId === t.id ? 'is-on' : ''}`} onClick={() => scegliTipo(t.id)}>
                  {t.nome}
                </button>
              ))}
            </div>
            <div className="gctab__cat-lista">
              <button type="button" className={`gctab__cat-btn ${!cerca && catId === -1 ? 'is-on' : ''}`}
                style={{ '--cc': 'var(--color-primary)' } as React.CSSProperties} onClick={() => { setCatId(-1); setCerca('') }}>
                <span className="gctab__cat-emoji" aria-hidden="true">🍽️</span>
                <span>Tutte</span>
              </button>
              {categorie.map(c => (
                <button key={c.id} type="button"
                  className={`gctab__cat-btn ${!cerca && categoria?.id === c.id ? 'is-on' : ''}`}
                  style={{ '--cc': c.colore } as React.CSSProperties}
                  onClick={() => scegliCategoria(c.id)}>
                  <span className="gctab__cat-emoji" aria-hidden="true">{c.emoji}</span>
                  <span>{c.nome}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="gctab__piatti">
            <div className="gctab__piatti-bar">
              <div className="gctab__uscite" role="radiogroup" aria-label="Uscita">
                {PORTATE.map(p => (
                  <button key={p.id} type="button" role="radio" aria-checked={portata === p.id}
                    className={`gctab__uscita ${portata === p.id ? 'is-on' : ''}`} onClick={() => setPortata(p.id)}>
                    <span className="gctab__uscita-n" aria-hidden="true">{p.id === 0 ? <i className="fa-solid fa-bolt" /> : p.id}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="gctab__griglia">
              {voci.map(v => {
                const n = inComandaDi(v.id)
                const cat = CATEGORIE_MENU.find(c => c.id === v.categoriaId)
                return (
                  <button
                    key={v.id} type="button"
                    className={`gctab__piatto ${n ? 'has-qta' : ''} ${lampo?.id === v.id ? 'is-lampo' : ''}`}
                    data-lampo={lampo?.id === v.id ? lampo.n : undefined}
                    style={{ '--cc': cat?.colore } as React.CSSProperties}
                    onPointerDown={() => premiInizio(v)}
                    onPointerUp={() => premiFine(v)}
                    onPointerLeave={() => { if (pressione.current) window.clearTimeout(pressione.current); pressione.current = null }}
                    onContextMenu={e => e.preventDefault()}
                    aria-label={`${v.nome}, ${euro(v.prezzo)}${n ? `, ${n} in comanda` : ''}`}
                  >
                    <span className="gctab__piatto-nome">{v.nome}</span>
                    <span className="gctab__piatto-desc">{v.descrizione}</span>
                    {opzioniDi(v).length > 0 && <span className="gctab__piatto-opz"><i className="fa-solid fa-sliders" aria-hidden="true" /> {opzioniDi(v).map(g => g.nome).join(' · ')}</span>}
                    <span className="gctab__piatto-piede">
                      <strong>{euro(v.prezzo)}</strong>
                      {!!v.allergeni.length && <span className="gctab__piatto-all" title="Allergeni">{v.allergeni.join(' ')}</span>}
                    </span>
                    {!!n && <span className="gctab__piatto-qta" key={lampo?.id === v.id ? lampo.n : 'q'}>{n}</span>}
                  </button>
                )
              })}
              {!voci.length && <p className="gctab__nessuno">Nessun piatto trovato.</p>}
            </div>
            <p className="gctab__suggerimento"><i className="fa-regular fa-hand-pointer" aria-hidden="true" /> Tocca per aggiungere · tieni premuto per note e varianti</p>
          </section>

          <aside className="gctab__scontrino" aria-label="Comanda del tavolo">
            <button type="button" className="gctab__scontrino-maniglia" onClick={() => setScontrinoAperto(o => !o)}>
              <span>Comanda · {comanda.righe.length} righe</span>
              <strong>{euro(totaleConto(comanda))}</strong>
              <i className={`fa-solid ${scontrinoAperto ? 'fa-chevron-down' : 'fa-chevron-up'}`} aria-hidden="true" />
            </button>
            <div className="gctab__conti-tav">
              {aperte.map(c => (
                <button key={c.id} type="button" className={`gctab__conto-chip ${c.id === comanda.id ? 'is-on' : ''}`} onClick={() => setComandaId(c.id)}>
                  n. {c.numero}<em>{euro(totaleConto(c))}</em>
                </button>
              ))}
              <button type="button" className="gctab__conto-chip gctab__conto-chip--add"
                onClick={() => { const id = nuovaComanda(tavolo.id); setComandaId(id); toast.success('Nuovo conto aperto sul tavolo') }}>
                <i className="fa-solid fa-plus" aria-hidden="true" /> Conto separato
              </button>
            </div>
            <button type="button" className="gctab__ospite" onClick={() => setSchedaCliente(true)}>
              <i className="fa-solid fa-user" aria-hidden="true" />
              <span>{pren?.ospite || 'Ospite senza nome'}</span>
              <em>{catCliente?.nome ?? 'Standard'}{catCliente?.scontoPerc ? ` −${catCliente.scontoPerc}%` : ''}</em>
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
            {(comanda.nota || pren?.note) && (
              <button type="button" className="gctab__nota-tav" onClick={() => setNotaTavolo(true)}>
                <i className="fa-solid fa-note-sticky" aria-hidden="true" />
                <span>{[comanda.nota, pren?.note && `Prenotazione: ${pren.note}`].filter(Boolean).join(' · ')}</span>
              </button>
            )}
            <div className="gctab__righe">
              {!perPortata.length && (
                <div className="gctab__righe-vuote">
                  <i className="fa-solid fa-receipt" aria-hidden="true" />
                  <p>La comanda è vuota.<br />Tocca un piatto per aggiungerlo.</p>
                </div>
              )}
              {perPortata.map(({ p, righe }) => (
                <section key={p.id} className="gctab__gruppo">
                  <h4><i className={`fa-solid ${p.ico}`} aria-hidden="true" /> {p.id === 0 ? 'Subito' : `${p.id}ª uscita · ${p.label}`}</h4>
                  {righe.map(r => {
                    const nuova = r.stato === 'in-comanda'
                    const senza = r.senza.map(id => ricettaDi(r.voceId).find(x => x.ing.id === id)?.ing.nome).filter(Boolean)
                    return (
                      <div key={r.id} className={`gctab__riga ${nuova ? 'is-nuova' : ''}`}>
                        {nuova ? (
                          <span className="gctab__step">
                            <button type="button" aria-label={`Uno in meno di ${r.nome}`} onClick={() => meno(r)}><i className="fa-solid fa-minus" aria-hidden="true" /></button>
                            <span>{r.qta}</span>
                            <button type="button" aria-label={`Uno in più di ${r.nome}`} onClick={() => setQta(comanda.id, r.id, r.qta + 1)}><i className="fa-solid fa-plus" aria-hidden="true" /></button>
                          </span>
                        ) : (
                          <span className="gctab__qta-fissa">{r.qta}×</span>
                        )}
                        <button type="button" className="gctab__riga-corpo" onClick={() => { setRigaId(r.id); setMotivo(MOTIVI_STORNO[0]) }}>
                          <span className="gctab__riga-nome">{r.nome}</span>
                          {(r.note || senza.length > 0 || r.extra.length > 0) && (
                            <span className="gctab__riga-note">
                              {[...senza.map(n => `senza ${n!.toLowerCase()}`), ...r.extra.map(e => `+ ${e.nome.toLowerCase()}`), r.note].filter(Boolean).join(' · ')}
                            </span>
                          )}
                          {!nuova && (
                            <span className="gctab__riga-stato" style={{ '--st': STATO_RIGA[r.stato].color } as React.CSSProperties}>
                              <i aria-hidden="true" />{STATO_RIGA[r.stato].label}
                            </span>
                          )}
                        </button>
                        <span className="gctab__riga-prezzo">{euro(totaleRiga(r))}</span>
                      </div>
                    )
                  })}
                </section>
              ))}
            </div>
            <footer className="gctab__azioni">
              {!!scontoComanda(comanda) && (
                <div className="gctab__subtot">
                  <span>Imponibile {euro(totaleComanda(comanda))}</span>
                  <span>Sconto {catCliente?.nome} −{euro(scontoComanda(comanda))}</span>
                </div>
              )}
              <div className="gctab__totale">
                <span>Totale</span>
                <strong>{euro(totaleConto(comanda))}</strong>
              </div>
              <div className="gctab__secondarie">
                <button type="button" onClick={() => setNotaTavolo(true)}><i className="fa-solid fa-note-sticky" aria-hidden="true" />Nota</button>
                <button type="button" disabled={!comanda.righe.length} onClick={() => { setPagamento(pagamenti.find(p => p.id !== 'camera')?.id ?? 'carta'); setParti(Math.max(2, comanda.coperti)); setSelRighe([]); setDividi('uguali') }}><i className="fa-solid fa-scissors" aria-hidden="true" />Dividi</button>
                <button type="button" onClick={() => window.print()}><i className="fa-solid fa-print" aria-hidden="true" />Stampa</button>
                <button type="button" onClick={() => setArchivio(true)}><i className="fa-solid fa-box-archive" aria-hidden="true" />Archivio{chiuseDelTavolo.length ? <em>{chiuseDelTavolo.length}</em> : null}</button>
              </div>
              <div className="gctab__azioni-btn">
                <button type="button" className="gctab__conto" onClick={() => { setPagamento(pagamenti[0]?.id ?? 'carta'); setConto(true) }} disabled={!comanda.righe.length}>
                  <i className="fa-solid fa-receipt" aria-hidden="true" /> Conto
                </button>
                <button type="button" className="gctab__invia" onClick={invia} disabled={!daInviare.length}>
                  <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                  Invia in cucina{daInviare.length ? <em>{daInviare.reduce((a, r) => a + r.qta, 0)}</em> : null}
                </button>
              </div>
            </footer>
          </aside>
        </main>
      )}

      {/* ── Foglio: chi sta servendo ─────────────────────────────────────── */}
      {sceltaCameriere && (
        <Foglio titolo="Chi sta servendo?" onChiudi={() => setSceltaCameriere(false)}>
          <div className="gctab__camerieri">
            {CAMERIERI.map(c => (
              <button key={c} type="button" className={`gctab__cam-btn ${c === cameriere ? 'is-on' : ''}`} onClick={() => { setCameriere(c); setSceltaCameriere(false) }}>
                <span className="gctab__cameriere-av" aria-hidden="true">{c.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()}</span>
                {c}
              </button>
            ))}
          </div>
        </Foglio>
      )}

      {/* ── Foglio: coperti all'apertura del tavolo ─────────────────────── */}
      {apriCoperti && (
        <Foglio titolo={`Tavolo ${apriCoperti.numero} · quanti coperti?`} onChiudi={() => setApriCoperti(null)}>
          <div className="gctab__numeri">
            {Array.from({ length: Math.max(8, apriCoperti.capienza + 2) }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={`gctab__numero ${n === apriCoperti.capienza ? 'is-sugg' : ''}`} onClick={() => confermaCoperti(n)}>{n}</button>
            ))}
          </div>
        </Foglio>
      )}

      {/* ── Foglio: note, varianti, uscita, storno di una riga ──────────── */}
      {riga && comanda && (
        <Foglio titolo={riga.nome} sotto={`${riga.qta} × ${euro(riga.prezzo)} · ${STATO_RIGA[riga.stato].label}`} onChiudi={() => setRigaId(null)}>
          {riga.stato === 'in-comanda' ? (
            <>
              {(() => {
                const voce = VOCI_MENU.find(v => v.id === riga.voceId)
                return voce ? opzioniDi(voce).map(g => (
                  <div key={g.nome}>
                    <h5 className="gctab__foglio-lab">{g.nome}{g.obbligatoria && <em className="gctab__obblig"> · da scegliere</em>}</h5>
                    <div className="gctab__chips">
                      {g.scelte.map(sc => {
                        const on = riga.note.split(' · ').includes(`${g.nome}: ${sc}`)
                        return <button key={sc} type="button" className={`gctab__chip gctab__chip--opz ${on ? 'is-on' : ''}`} onClick={() => scegliOpzione(g.nome, sc)}>{on && <i className="fa-solid fa-circle-check" aria-hidden="true" />}{sc}</button>
                      })}
                    </div>
                  </div>
                )) : null
              })()}
              {conAggiunte(VOCI_MENU.find(v => v.id === riga.voceId)) && (
                <>
                  <h5 className="gctab__foglio-lab">Aggiunte</h5>
                  {riga.extra.length > 0 && (
                    <ul className="gctab__extra-scelti">
                      {riga.extra.map(e => {
                        const ing = INGREDIENTI.find(i => i.id === e.ingredienteId)
                        return (
                          <li key={e.ingredienteId}>
                            <span>{e.nome}</span>
                            <em>{e.prezzo ? `+${euro(e.prezzo * e.qta)}` : 'incluso'}</em>
                            <span className="gctab__step">
                              <button type="button" aria-label={`Meno ${e.nome}`} onClick={() => ing && setExtraRiga(comanda.id, riga.id, ing, e.qta - 1)}><i className="fa-solid fa-minus" aria-hidden="true" /></button>
                              <span>{e.qta}</span>
                              <button type="button" aria-label={`Più ${e.nome}`} onClick={() => ing && setExtraRiga(comanda.id, riga.id, ing, e.qta + 1)}><i className="fa-solid fa-plus" aria-hidden="true" /></button>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="gctab__extra-filtri">
                    <SearchField className="gctab__extra-cerca" name="cerca-aggiunta" value={cercaExtra} placeholder="Cerca un'aggiunta"
                      onChange={e => setCercaExtra(e.target.value)} onClear={() => setCercaExtra('')} />
                    <div className="gctab__chips gctab__chips--scroll">
                      <button type="button" className={`gctab__chip ${!gruppoExtra ? 'is-on' : ''}`} onClick={() => setGruppoExtra(null)}>Più richiesti</button>
                      {GRUPPI_INGREDIENTE.filter(g => INGREDIENTI_EXTRA.some(i => i.gruppo === g.id)).map(g => (
                        <button key={g.id} type="button" className={`gctab__chip ${gruppoExtra === g.id ? 'is-on' : ''}`} onClick={() => setGruppoExtra(g.id)}>
                          <i className={`fa-solid ${g.ico}`} aria-hidden="true" />{g.breve}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="gctab__chips">
                    {(() => {
                      const q = normalizzaRicerca(cercaExtra)
                      const base = gruppoExtra ? INGREDIENTI_EXTRA.filter(i => i.gruppo === gruppoExtra) : INGREDIENTI_EXTRA
                      const lista = q ? base.filter(i => normalizzaRicerca(i.nome).includes(q)) : gruppoExtra ? base : base.filter(i => i.frequente)
                      return lista.slice(0, 24).map(i => {
                        const qta = riga.extra.find(e => e.ingredienteId === i.id)?.qta ?? 0
                        return (
                          <button key={i.id} type="button" className={`gctab__chip gctab__chip--extra ${qta ? 'is-on' : ''}`}
                            onClick={() => setExtraRiga(comanda.id, riga.id, i, qta ? 0 : 1)}>
                            {qta ? <i className="fa-solid fa-circle-check" aria-hidden="true" /> : <i className="fa-solid fa-plus" aria-hidden="true" />}
                            {i.nome}<em>{i.prezzoExtra ? `+${euro(i.prezzoExtra)}` : 'incluso'}</em>
                          </button>
                        )
                      })
                    })()}
                  </div>
                </>
              )}
              <h5 className="gctab__foglio-lab">Note per la cucina</h5>
              <div className="gctab__chips">
                {NOTE_RAPIDE.map(n => {
                  const on = riga.note.split(' · ').includes(n)
                  return <button key={n} type="button" className={`gctab__chip ${on ? 'is-on' : ''}`} onClick={() => toggleNota(n)}>{on && <i className="fa-solid fa-check" aria-hidden="true" />}{n}</button>
                })}
              </div>
              {ricettaDi(riga.voceId).length > 0 && (
                <>
                  <h5 className="gctab__foglio-lab">Senza…</h5>
                  <div className="gctab__chips">
                    {ricettaDi(riga.voceId).map(({ ing }) => {
                      const on = riga.senza.includes(ing.id)
                      return <button key={ing.id} type="button" className={`gctab__chip gctab__chip--senza ${on ? 'is-on' : ''}`} onClick={() => toggleSenzaRiga(comanda.id, riga.id, ing.id)}>{on && <i className="fa-solid fa-ban" aria-hidden="true" />}{ing.nome}{!!ing.allergeni.length && <em className="gctab__chip-all">{ing.allergeni.join('')}</em>}</button>
                    })}
                  </div>
                </>
              )}
              <TextareaField name="nota-riga" label="Nota libera per la cucina" rows={2} value={riga.note}
                onChange={e => setNotaRiga(comanda.id, riga.id, e.target.value)} placeholder="Indicazioni per la cucina…" />
              <h5 className="gctab__foglio-lab">Uscita</h5>
              <div className="gctab__chips">
                {PORTATE.map(p => (
                  <button key={p.id} type="button" className={`gctab__chip ${riga.portata === p.id ? 'is-on' : ''}`} onClick={() => setPortataRiga(comanda.id, riga.id, p.id)}>
                    <i className={`fa-solid ${p.ico}`} aria-hidden="true" />{p.id === 0 ? 'Subito' : `${p.id}ª · ${p.label}`}
                  </button>
                ))}
              </div>
              <div className="gctab__foglio-azioni">
                <button type="button" className="gctab__foglio-elimina" onClick={eliminaRiga}><i className="fa-solid fa-trash" aria-hidden="true" /> Togli dalla comanda</button>
                <button type="button" className="gctab__cta" onClick={() => setRigaId(null)}>Fatto</button>
              </div>
            </>
          ) : (
            <>
              <p className="gctab__foglio-info"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Il piatto è già partito per la cucina: non si cancella, si storna indicando il motivo.</p>
              <h5 className="gctab__foglio-lab">Motivo dello storno</h5>
              <div className="gctab__chips">
                {MOTIVI_STORNO.map(m => (
                  <button key={m} type="button" className={`gctab__chip ${motivo === m ? 'is-on' : ''}`} onClick={() => setMotivo(m)}>{m}</button>
                ))}
              </div>
              <div className="gctab__foglio-azioni">
                <button type="button" className="gctab__foglio-annulla" onClick={() => setRigaId(null)}>Annulla</button>
                <button type="button" className="gctab__foglio-elimina gctab__foglio-elimina--pieno" onClick={storna}><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Storna</button>
              </div>
            </>
          )}
        </Foglio>
      )}

      {/* ── Foglio: conto ────────────────────────────────────────────────── */}
      {conto && comanda && tavolo && (
        <Foglio titolo={`Conto · tavolo ${tavolo.numero}`} onChiudi={() => setConto(false)}>
          <div className="gctab__conto-tot">
            <span>Da incassare</span>
            <strong>{euro(totaleConto(comanda))}</strong>
            <em>{comanda.coperti} coperti · {euro(totaleConto(comanda) / Math.max(1, comanda.coperti))} a persona</em>
          </div>
          {daInviare.length > 0 && (
            <p className="gctab__foglio-info gctab__foglio-info--warn"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {daInviare.length} {daInviare.length === 1 ? 'riga non è ancora stata inviata' : 'righe non sono ancora state inviate'} in cucina.</p>
          )}
          <div className="gctab__metodi">
            {pagamenti.map(p => (
              <button key={p.id} type="button" className={`gctab__metodo ${pagamento === p.id ? 'is-on' : ''}`} onClick={() => setPagamento(p.id)}>
                <i className={`fa-solid ${p.ico}`} aria-hidden="true" />{p.label}
              </button>
            ))}
          </div>
          {pagamento === 'camera' && (
            <InputField name="camera" label="Numero camera" value={comanda.addebitoCamera}
              onChange={e => setAddebitoCamera(comanda.id, e.target.value)} placeholder={pren?.camera || 'es. 204'} />
          )}
          <div className="gctab__foglio-azioni">
            <button type="button" className="gctab__foglio-annulla" onClick={() => setConto(false)}>Annulla</button>
            <button type="button" className="gctab__invia" onClick={incassa} disabled={pagamento === 'camera' && !comanda.addebitoCamera.trim()}><i className="fa-solid fa-check" aria-hidden="true" /> Incassa e libera il tavolo</button>
          </div>
        </Foglio>
      )}
      {/* ── Foglio: ospite e categoria cliente ───────────────────────────── */}
      {schedaCliente && comanda && (
        <Foglio titolo="Ospite e listino" onChiudi={() => setSchedaCliente(false)}>
          {pren ? (
            <p className="gctab__foglio-info"><i className="fa-solid fa-calendar-check" aria-hidden="true" /> {pren.ospite} · {pren.pax} coperti alle {pren.ora}{pren.note ? ` · ${pren.note}` : ''}</p>
          ) : (
            <p className="gctab__foglio-info"><i className="fa-solid fa-person-walking" aria-hidden="true" /> Tavolo senza prenotazione (walk-in).</p>
          )}
          <h5 className="gctab__foglio-lab">Categoria cliente</h5>
          <div className="gctab__chips">
            {categorieCliente.map(c => (
              <button key={c.id} type="button" className={`gctab__chip ${c.id === comanda.categoriaClienteId ? 'is-on' : ''}`} onClick={() => setCategoriaCliente(comanda.id, c.id)}>
                {c.nome}{c.scontoPerc > 0 && <em className="gctab__chip-sconto">−{c.scontoPerc}%</em>}
              </button>
            ))}
          </div>
          <div className="gctab__foglio-azioni"><button type="button" className="gctab__cta" onClick={() => setSchedaCliente(false)}>Fatto</button></div>
        </Foglio>
      )}

      {/* ── Foglio: nota del tavolo ──────────────────────────────────────── */}
      {notaTavolo && comanda && (
        <Foglio titolo={`Nota del tavolo ${tavolo?.numero ?? ''}`} sotto="Arriva in cucina con ogni invio" onChiudi={() => setNotaTavolo(false)}>
          <div className="gctab__chips">
            {['Ospiti di fretta', 'Compleanno', 'Bambini al tavolo', 'Tutto insieme', 'Cliente abituale'].map(n => {
              const on = comanda.nota.split(' · ').includes(n)
              return <button key={n} type="button" className={`gctab__chip ${on ? 'is-on' : ''}`} onClick={() => {
                const parti = comanda.nota ? comanda.nota.split(' · ') : []
                setNotaComanda(comanda.id, (on ? parti.filter(p => p !== n) : [...parti, n]).join(' · '))
              }}>{on && <i className="fa-solid fa-check" aria-hidden="true" />}{n}</button>
            })}
          </div>
          <TextareaField name="nota-tavolo" label="Nota libera" rows={3} value={comanda.nota} onChange={e => setNotaComanda(comanda.id, e.target.value)} placeholder="Es. tavolo anniversario, portare il dolce con candelina" />
          <div className="gctab__foglio-azioni"><button type="button" className="gctab__cta" onClick={() => setNotaTavolo(false)}>Fatto</button></div>
        </Foglio>
      )}

      {/* ── Foglio: dividi il conto ──────────────────────────────────────── */}
      {dividi && comanda && (
        <Foglio titolo="Dividi il conto" sotto={`Totale ${euro(totaleConto(comanda))}`} onChiudi={() => setDividi(null)}>
          <div className="gctab__seg">
            <button type="button" className={dividi === 'uguali' ? 'is-on' : ''} onClick={() => setDividi('uguali')}><i className="fa-solid fa-equals" aria-hidden="true" /> Parti uguali</button>
            <button type="button" className={dividi === 'righe' ? 'is-on' : ''} onClick={() => setDividi('righe')}><i className="fa-solid fa-list-check" aria-hidden="true" /> Per consumazione</button>
          </div>
          {dividi === 'uguali' ? (
            <div className="gctab__parti">
              <span className="gctab__step gctab__step--big">
                <button type="button" aria-label="Meno parti" onClick={() => setParti(n => Math.max(2, n - 1))}><i className="fa-solid fa-minus" aria-hidden="true" /></button>
                <span>{parti}</span>
                <button type="button" aria-label="Più parti" onClick={() => setParti(n => n + 1)}><i className="fa-solid fa-plus" aria-hidden="true" /></button>
              </span>
              <div className="gctab__conto-tot"><span>Ognuno paga</span><strong>{euro(quota)}</strong></div>
            </div>
          ) : (
            <>
              <div className="gctab__sel-righe">
                {comanda.righe.map(r => {
                  const on = selRighe.includes(r.id)
                  return (
                    <button key={r.id} type="button" className={`gctab__sel-riga ${on ? 'is-on' : ''}`} onClick={() => setSelRighe(v => on ? v.filter(x => x !== r.id) : [...v, r.id])}>
                      <i className={`fa-${on ? 'solid fa-square-check' : 'regular fa-square'}`} aria-hidden="true" />
                      <span>{r.qta}× {r.nome}</span>
                      <strong>{euro(totaleRiga(r))}</strong>
                    </button>
                  )
                })}
              </div>
              <div className="gctab__conto-tot"><span>Conto da staccare</span><strong>{euro(staccato)}</strong><em>restano {euro(totaleConto(comanda) - staccato)} sul tavolo</em></div>
            </>
          )}
          <div className="gctab__metodi">
            {pagamenti.filter(p => p.id !== 'camera').map(p => (
              <button key={p.id} type="button" className={`gctab__metodo ${pagamento === p.id ? 'is-on' : ''}`} onClick={() => setPagamento(p.id)}>
                <i className={`fa-solid ${p.ico}`} aria-hidden="true" />{p.label}
              </button>
            ))}
          </div>
          <div className="gctab__foglio-azioni">
            <button type="button" className="gctab__foglio-annulla" onClick={() => setDividi(null)}>Annulla</button>
            <button type="button" className="gctab__invia" onClick={confermaDivisione} disabled={dividi === 'righe' && !selRighe.length}>
              <i className={`fa-solid ${dividi === 'uguali' ? 'fa-check' : 'fa-scissors'}`} aria-hidden="true" /> {dividi === 'uguali' ? `Incassa ${parti} quote` : 'Stacca e incassa'}
            </button>
          </div>
        </Foglio>
      )}

      {/* ── Foglio: archivio conti chiusi del tavolo ─────────────────────── */}
      {archivio && tavolo && (
        <Foglio titolo={`Archivio del tavolo ${tavolo.numero}`} onChiudi={() => setArchivio(false)}>
          {chiuseDelTavolo.length ? chiuseDelTavolo.map(c => (
            <article key={c.id} className="gctab__arch">
              <header>
                <strong>n. {c.numero}</strong>
                <span>{c.apertaAlle}–{c.chiusaAlle}</span>
                <span>{PAGAMENTI.find(p => p.id === c.pagamento)?.label ?? '—'}</span>
                <strong>{euro(totaleConto(c))}</strong>
              </header>
              <ul>{c.righe.map(r => <li key={r.id}><span>{r.qta}× {r.nome}</span><span>{euro(totaleRiga(r))}</span></li>)}</ul>
            </article>
          )) : <p className="gctab__foglio-info"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Nessun conto chiuso su questo tavolo.</p>}
        </Foglio>
      )}

      {/* Tablet: la tastiera di sistema non c'è sempre, questa sì */}
      <TouchKeyboard within=".gctab" />
    </div>
  )

  return createPortal(schermo, document.body)
}

// ─── Foglio dal basso (bottom sheet) ──────────────────────────────────────────
export function Foglio({ titolo, sotto, onChiudi, children }: { titolo: string; sotto?: string; onChiudi: () => void; children: React.ReactNode }) {
  // Il "click" che il browser genera dopo il tocco che ha aperto il foglio cade sul velo: non deve chiuderlo.
  const aperto = useRef(Date.now())
  return (
    <div className="gctab__velo" onClick={() => { if (Date.now() - aperto.current > 450) onChiudi() }}>
      <div className="gctab__foglio" role="dialog" aria-modal="true" aria-label={titolo} onClick={e => e.stopPropagation()}>
        <span className="gctab__foglio-maniglia" aria-hidden="true" />
        <header className="gctab__foglio-head">
          <div>
            <h3>{titolo}</h3>
            {sotto && <p>{sotto}</p>}
          </div>
          <button type="button" onClick={onChiudi} aria-label="Chiudi"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        </header>
        <div className="gctab__foglio-corpo">{children}</div>
      </div>
    </div>
  )
}
