import React, { useState } from 'react'
import { ALL_PAGES, CLIENTS_INIT, PACCHETTI_INIT, USERS_INIT, RUOLO_COLORS, tipologiaLabel, ASSIGNED_MODULI_INIT, pagesForModuli, EMPTY_NEW_CLIENT } from './constants'
import { getAllPages } from './helpers'
import { ALL_CONFIGURATORE_IDS } from '../../modules/impostazioni/Configuratore/configuratoriList'
import { useAccessStore } from '../../store/useAccessStore'
import { useAdminConfigStore } from '../../store/useAdminConfigStore'
import type {
  AdminMode, AdminTab, Cliente, FnType, MasterForm, Modulo, ModuloForm,
  NewClientForm, PlatformSection, Ruolo, RuoloForm, UserAssoc, UserRow,
} from './types'
import { useCatalogoStore } from '../../store/useCatalogoStore'
import type {
  CatalogoSubTab, Categoria, CategoriaForm, Fornitore, FornitoreForm,
  Prodotto, ProdottoForm,
} from './catalogo/types'
import ClientsSidebar from './ClientsSidebar/ClientsSidebar'
import ClientHeader from './ClientHeader/ClientHeader'
import PlatformSidebar from './PlatformSidebar/PlatformSidebar'
import StrutturaTab from './tabs/StrutturaTab/StrutturaTab'
import PagineTab from './tabs/PagineTab/PagineTab'
import ModuliTab from './tabs/ModuliTab/ModuliTab'
import RuoliTab from './tabs/RuoliTab/RuoliTab'
import FunzioniTab from './tabs/FunzioniTab/FunzioniTab'
import UtentiTab from './tabs/UtentiTab/UtentiTab'
import AssociazioniTab from './tabs/AssociazioniTab/AssociazioniTab'
import CatalogoTab from './tabs/CatalogoTab/CatalogoTab'
import ServiziAdminTab from '../../modules/purchasing/Servizi/ServiziAdminTab'
import BannerTab from './tabs/BannerTab/BannerTab'
import AgoraShell from '../../modules/purchasing/Agora/AgoraShell'
import Ico from '../../core/icons/Ico'
import NewClientModal from './modals/NewClientModal/NewClientModal'
import MasterUserModal from './modals/MasterUserModal/MasterUserModal'
import ModuloModal from './modals/ModuloModal/ModuloModal'
import RuoloModal from './modals/RuoloModal/RuoloModal'
import ConfirmDeleteModal from './modals/ConfirmDeleteModal/ConfirmDeleteModal'
import CategoriaModal from './modals/CategoriaModal/CategoriaModal'
import FornitoreModal from './modals/FornitoreModal/FornitoreModal'
import ProdottoModal from './modals/ProdottoModal/ProdottoModal'
import './SibyllaAdminPanel.sass'

interface Props {
  navigate?: (p: string) => void
  /** Modalità embedded (dentro la console assistenza): nasconde lo switch e personalizza brand/lista. */
  embedded?: boolean
  /** Forza la modalità (clients/platform) e nasconde lo switch top-level. */
  lockedMode?: AdminMode
  /** Modalità iniziale senza bloccare lo switch (default 'clients'). */
  initialMode?: AdminMode
  /** Sostituisce il brand "Sibylla Admin" nella topbar del pannello. */
  brandTitle?: string
  /** Intestazione della colonna clienti (es. nome dell'intestatario del contratto). */
  clientsTitle?: string
  /** Limita la lista alle sole strutture indicate (id di CLIENTS_INIT). */
  structureIds?: number[]
}

interface NewUser {
  nome: string
  email: string
  ruolo: string
}

export default function SibyllaAdminPanel(props: Props) {
  const { embedded, lockedMode, initialMode, brandTitle, clientsTitle, structureIds } = props
  const [clients, setClients] = useState<Cliente[]>(CLIENTS_INIT)
  const [selId, setSelId] = useState<number>(() => structureIds?.[0] ?? 1)
  const [tab, setTab] = useState<AdminTab>('struttura')
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState(false)

  // Due modalità top-level: gestione clienti vs configurazione piattaforma.
  // Sono completamente indipendenti: ciascuna ha la propria sidebar e contenuti.
  const [mode, setMode] = useState<AdminMode>(lockedMode ?? initialMode ?? 'clients')
  const [platformSection, setPlatformSection] = useState<PlatformSection>('catalogo')

  // Strutture mostrate nella colonna clienti (in embedded = quelle dell'intestatario).
  const visibleClients = structureIds ? clients.filter(c => structureIds.includes(c.id)) : clients

  const [enabledPages, setEnabledPages] = useState<Record<number, Set<string>>>(() => {
    const init: Record<number, Set<string>> = {}
    // Pagine abilitate derivate dai moduli assegnati a ciascuna azienda.
    CLIENTS_INIT.forEach(c => {
      const mids = ASSIGNED_MODULI_INIT[c.id]
      init[c.id] = mids ? new Set(pagesForModuli(mids)) : new Set(ALL_PAGES)
    })
    return init
  })
  const [forms, setForms] = useState<Record<number, Cliente>>(() => {
    const init: Record<number, Cliente> = {}
    CLIENTS_INIT.forEach(c => { init[c.id] = { ...c } })
    return init
  })
  const [users, setUsers] = useState<Record<number, UserRow[]>>(USERS_INIT)
  const [newUser, setNewUser] = useState<NewUser>({ nome: '', email: '', ruolo: 'Manager' })

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientForm, setNewClientForm] = useState<NewClientForm>({ ...EMPTY_NEW_CLIENT })
  const [newClientId, setNewClientId] = useState<number | null>(null)
  // Form completo della struttura per cliente (dettagli prima tab + modifica inline).
  const [structForms, setStructForms] = useState<Record<number, NewClientForm>>({})
  const [editingStruct, setEditingStruct] = useState(false)
  const [editStructForm, setEditStructForm] = useState<NewClientForm>({ ...EMPTY_NEW_CLIENT })

  const [showMasterModal, setShowMasterModal] = useState(false)
  const [masterSent, setMasterSent] = useState(false)
  const [masterSending, setMasterSending] = useState(false)
  const [masterForm, setMasterForm] = useState<MasterForm>({ nome: '', cognome: '', email: '', telefono: '', ruolo: 'Amministratore Unico' })

  const [moduliList, setModuliList] = useState<Modulo[]>(() => PACCHETTI_INIT.map(p => ({ ...p, pages: [...p.pages] })))
  const [assignedModuli, setAssignedModuli] = useState<Record<number, Set<string>>>(() => {
    const init: Record<number, Set<string>> = {}
    // Moduli pre-assegnati a ciascuna azienda (modificabili dalla tab Moduli).
    CLIENTS_INIT.forEach(c => { init[c.id] = new Set(ASSIGNED_MODULI_INIT[c.id] || []) })
    return init
  })
  const [showModuloModal, setShowModuloModal] = useState(false)
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null)
  const [moduloForm, setModuloForm] = useState<ModuloForm>({ nome: '', desc: '', pagesSet: new Set(), configItemsSet: new Set() })
  const [deleteModuloId, setDeleteModuloId] = useState<string | null>(null)

  // Ruoli e matrice funzioni: persistiti (le creazioni si salvano) e pre-popolati.
  const ruoliMap = useAdminConfigStore(s => s.ruoliMap)
  const setRuoliMap = useAdminConfigStore(s => s.setRuoliMap)
  const funzioniMap = useAdminConfigStore(s => s.funzioniMap)
  const setFunzioniMap = useAdminConfigStore(s => s.setFunzioniMap)
  const assocMap = useAdminConfigStore(s => s.assocMap)
  const setAssocMap = useAdminConfigStore(s => s.setAssocMap)
  const [selRuoloId, setSelRuoloId] = useState<string | null>(null)
  const [showRuoloModal, setShowRuoloModal] = useState(false)
  const [editingRuolo, setEditingRuolo] = useState<Ruolo | null>(null)
  const [ruoloForm, setRuoloForm] = useState<RuoloForm>({ nome: '', desc: '', colore: RUOLO_COLORS[0] })
  const [deleteRuoloId, setDeleteRuoloId] = useState<string | null>(null)
  const [fnSearch, setFnSearch] = useState('')

  // ─── Catalogo (globale, source-of-truth in useCatalogoStore) ─────────────
  const [catalogoSubTab, setCatalogoSubTab] = useState<CatalogoSubTab>('categorie')
  const categorie = useCatalogoStore(s => s.categorie)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const addCategoria       = useCatalogoStore(s => s.addCategoria)
  const updateCategoria    = useCatalogoStore(s => s.updateCategoria)
  const removeCategoria    = useCatalogoStore(s => s.removeCategoria)
  const addFornitore       = useCatalogoStore(s => s.addFornitore)
  const updateFornitore    = useCatalogoStore(s => s.updateFornitore)
  const removeFornitore    = useCatalogoStore(s => s.removeFornitore)
  const addProdotto        = useCatalogoStore(s => s.addProdotto)
  const updateProdotto     = useCatalogoStore(s => s.updateProdotto)
  const removeProdotto     = useCatalogoStore(s => s.removeProdotto)
  const toggleProdottoAttivoStore = useCatalogoStore(s => s.toggleProdottoAttivo)
  const toggleFornitorePubblicato = useCatalogoStore(s => s.toggleFornitorePubblicato)
  const toggleProdottoPubblicato  = useCatalogoStore(s => s.toggleProdottoPubblicato)
  const isBarcodeUsedStore = useCatalogoStore(s => s.isBarcodeUsed)

  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [categoriaForm, setCategoriaForm] = useState<CategoriaForm>({ nome: '', icona: 'fa-building', descrizione: '', macroArea: '' })
  const [deleteCategoriaId, setDeleteCategoriaId] = useState<string | null>(null)

  const [showFornitoreModal, setShowFornitoreModal] = useState(false)
  const [editingFornitore, setEditingFornitore] = useState<Fornitore | null>(null)
  const [fornitoreForm, setFornitoreForm] = useState<FornitoreForm>({
    nome: '', descrizione: '', storia: '', indirizzo: '', citta: '', regione: '', cap: '',
    telefono: '', email: '', sito: '', annoFondazione: '', certificazioni: '', caratteristiche: '',
    categoriaId: '', macroArea: '', immagineUrl: '',
  })
  const [deleteFornitoreId, setDeleteFornitoreId] = useState<string | null>(null)

  const [showProdottoModal, setShowProdottoModal] = useState(false)
  const [editingProdotto, setEditingProdotto] = useState<Prodotto | null>(null)
  const [prodottoForm, setProdottoForm] = useState<ProdottoForm>({
    barcode: '', nome: '', descrizione: '', categoriaId: '', classe: '', tipologia: '', fornitoreId: '',
    prezzoBase: '', unita: 'pz', quantitaUnita: '1', immagineUrl: '', foto: [], scortaMinima: '0', attivo: true,
    agoraAbilitato: false, agoraPrezzo: '',
    networkAbilitato: true, networkPrezzo: '',
    parametri: [],
  })
  const [deleteProdottoId, setDeleteProdottoId] = useState<string | null>(null)

  const client = clients.find(c => c.id === selId)!
  const form = forms[selId] || client
  const enabled = enabledPages[selId] || new Set<string>(ALL_PAGES)
  const enabledCount = enabled.size
  const totalCount = ALL_PAGES.length
  const clientRuoli = ruoliMap[selId] || []
  const clientAssigned = assignedModuli[selId] || new Set<string>()
  const clientUsers = users[selId] || []
  const clientAssoc = assocMap[selId] || {}
  const setUserAssoc = (userId: number, next: UserAssoc) =>
    setAssocMap(p => ({ ...p, [selId]: { ...(p[selId] || {}), [userId]: next } }))

  const handleSave = () => {
    setClients(p => p.map(c => c.id === selId ? { ...c, ...form } : c))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ─── Struttura: dettaglio completo (prima tab) + modifica ──────────────────
  // Per i clienti creati con la modale usa il form salvato; per i clienti seed
  // ne deriva uno dai dati base del Cliente (campi avanzati vuoti).
  const deriveStruct = (c: Cliente): NewClientForm => ({
    ...EMPTY_NEW_CLIENT,
    nome: c.nome,
    categoria: c.categoria,
    classificazione: c.classificazione,
    citta: c.citta,
    email: c.email || '',
    telefono: c.tel || '',
    camere: String(c.camere || 0),
  })
  const currentStruct = structForms[selId] || deriveStruct(form)
  const openEditStruct = () => {
    setEditStructForm(structForms[selId] || deriveStruct(form))
    setEditingStruct(true)
  }
  const cancelEditStruct = () => setEditingStruct(false)
  const saveEditStruct = () => {
    const f = editStructForm
    if (!f.nome.trim()) return
    const totale = f.piani.reduce(
      (tot, p) => tot + Object.values(p.camere).reduce((a, b) => a + (b || 0), 0), 0,
    )
    const patch: Partial<Cliente> = {
      nome: f.nome, categoria: f.categoria, classificazione: f.classificazione,
      citta: f.citta, email: f.email, tel: f.telefono,
      camere: totale || parseInt(f.camere) || 0,
    }
    setStructForms(p => ({ ...p, [selId]: f }))
    setForms(p => ({ ...p, [selId]: { ...p[selId], ...patch } }))
    setClients(p => p.map(c => c.id === selId ? { ...c, ...patch } : c))
    setEditingStruct(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ─── Pagine: toggle singola e di gruppo ────────────────────────────────────
  const togglePage = (pageId: string) =>
    setEnabledPages(p => {
      const s = new Set(p[selId])
      s.has(pageId) ? s.delete(pageId) : s.add(pageId)
      return { ...p, [selId]: s }
    })
  const toggleGroup = (children: any[]) => {
    const pages = getAllPages(children)
    setEnabledPages(p => {
      const s = new Set(p[selId])
      const allOn = pages.every(pg => s.has(pg))
      pages.forEach(pg => allOn ? s.delete(pg) : s.add(pg))
      return { ...p, [selId]: s }
    })
  }
  const enableAll  = () => setEnabledPages(p => ({ ...p, [selId]: new Set(ALL_PAGES) }))
  const disableAll = () => setEnabledPages(p => ({ ...p, [selId]: new Set() }))

  // ─── Moduli ────────────────────────────────────────────────────────────────
  const toggleModuloAssign = (moduloId: string) => {
    setAssignedModuli(prev => {
      const s = new Set(prev[selId])
      s.has(moduloId) ? s.delete(moduloId) : s.add(moduloId)
      const allEnabled = new Set<string>()
      moduliList.forEach(m => { if (s.has(m.id)) m.pages.forEach(pg => allEnabled.add(pg)) })
      setEnabledPages(pp => ({ ...pp, [selId]: allEnabled }))
      // Allinea il profilo di login dell'azienda ai moduli appena variati.
      const clienteNome = clients.find(c => c.id === selId)?.nome
      if (clienteNome) useAccessStore.getState().syncClientModules(clienteNome, Array.from(s))
      return { ...prev, [selId]: s }
    })
  }

  const openCreateModulo = () => {
    setEditingModulo(null)
    // Nuovo modulo: tutte le voci del Configuratore visibili di default.
    setModuloForm({ nome: '', desc: '', pagesSet: new Set(), configItemsSet: new Set(ALL_CONFIGURATORE_IDS) })
    setShowModuloModal(true)
  }
  const openEditModulo = (m: Modulo) => {
    setEditingModulo(m)
    setModuloForm({
      nome: m.label,
      desc: m.desc || '',
      pagesSet: new Set(m.pages),
      // undefined = tutte visibili (moduli creati prima di questa funzione)
      configItemsSet: new Set(m.configuratoreItems ?? ALL_CONFIGURATORE_IDS),
    })
    setShowModuloModal(true)
  }
  const confirmModulo = () => {
    if (!moduloForm.nome.trim() || moduloForm.pagesSet.size === 0) return
    const configuratoreItems = Array.from(moduloForm.configItemsSet)
    if (editingModulo) {
      setModuliList(p => p.map(m =>
        m.id === editingModulo.id
          ? { ...m, label: moduloForm.nome, desc: moduloForm.desc, pages: Array.from(moduloForm.pagesSet), configuratoreItems }
          : m,
      ))
    } else {
      setModuliList(p => [...p, {
        id: `custom-${Date.now()}`,
        label: moduloForm.nome,
        desc: moduloForm.desc,
        pages: Array.from(moduloForm.pagesSet),
        configuratoreItems,
      }])
    }
    setShowModuloModal(false)
  }
  const confirmDeleteModulo = () => {
    if (!deleteModuloId) return
    setModuliList(p => p.filter(m => m.id !== deleteModuloId))
    setDeleteModuloId(null)
  }

  // ─── Ruoli ─────────────────────────────────────────────────────────────────
  const openCreateRuolo = () => {
    setEditingRuolo(null)
    setRuoloForm({ nome: '', desc: '', colore: RUOLO_COLORS[0] })
    setShowRuoloModal(true)
  }
  const openEditRuolo = (r: Ruolo) => {
    setEditingRuolo(r)
    setRuoloForm({ nome: r.nome, desc: r.desc, colore: r.colore })
    setShowRuoloModal(true)
  }
  const confirmRuolo = () => {
    if (!ruoloForm.nome.trim()) return
    if (editingRuolo) {
      setRuoliMap(p => ({
        ...p,
        [selId]: p[selId].map(r => r.id === editingRuolo.id ? { ...r, ...ruoloForm } : r),
      }))
    } else {
      const newR: Ruolo = { id: `ruolo-${Date.now()}`, ...ruoloForm }
      setRuoliMap(p => ({ ...p, [selId]: [...(p[selId] || []), newR] }))
    }
    setShowRuoloModal(false)
  }
  const confirmDeleteRuolo = () => {
    if (!deleteRuoloId) return
    setRuoliMap(p => ({ ...p, [selId]: p[selId].filter(r => r.id !== deleteRuoloId) }))
    if (selRuoloId === deleteRuoloId) setSelRuoloId(null)
    setDeleteRuoloId(null)
  }

  // ─── Funzioni ──────────────────────────────────────────────────────────────
  const setFn = (ruoloId: string, pageId: string, val: FnType) =>
    setFunzioniMap(p => ({
      ...p,
      [selId]: {
        ...p[selId],
        [ruoloId]: { ...(p[selId]?.[ruoloId] || {}), [pageId]: val },
      },
    }))
  const getFn = (ruoloId: string, pageId: string): FnType =>
    funzioniMap[selId]?.[ruoloId]?.[pageId] || 'completo'
  const setAllFn = (ruoloId: string, val: FnType) => {
    const updates: Record<string, FnType> = {}
    Array.from(enabled).forEach(pg => { updates[pg] = val })
    setFunzioniMap(p => ({ ...p, [selId]: { ...p[selId], [ruoloId]: updates } }))
  }
  const goConfigureFunzioni = (rId: string) => {
    setTab('funzioni')
    setSelRuoloId(rId)
  }

  // ─── Cliente: nuovo + master ──────────────────────────────────────────────
  const handleAddClient = () => {
    if (!newClientForm.nome.trim()) return
    const id = Date.now()
    // Totale camere = somma di tutte le tipologie su tutti i piani della matrice.
    const totaleCamere = newClientForm.piani.reduce(
      (tot, p) => tot + Object.values(p.camere).reduce((a, b) => a + (b || 0), 0), 0,
    )
    const nc: Cliente = {
      id,
      nome: newClientForm.nome,
      categoria: newClientForm.categoria,
      classificazione: newClientForm.classificazione,
      citta: newClientForm.citta,
      camere: totaleCamere || parseInt(newClientForm.camere) || 20,
      valuta: 'EUR',
      lingua: 'Italiano',
      stato: 'attivo',
      email: newClientForm.email,
      tel: '',
    }
    // Moduli scelti alla creazione → pagine abilitate + profilo di accesso.
    const moduli = newClientForm.moduli
    const modPages = new Set<string>()
    moduliList.forEach(m => { if (moduli.includes(m.id)) m.pages.forEach(pg => modPages.add(pg)) })
    const enabled = moduli.length ? modPages : new Set(ALL_PAGES)

    setClients(p => [...p, nc])
    setForms(p => ({ ...p, [id]: nc }))
    setStructForms(p => ({ ...p, [id]: { ...newClientForm } }))
    setEnabledPages(p => ({ ...p, [id]: enabled }))
    setUsers(p => ({ ...p, [id]: [] }))
    setRuoliMap(p => ({ ...p, [id]: [] }))
    setAssignedModuli(p => ({ ...p, [id]: new Set(moduli) }))

    // Crea l'utenza di accesso (profilo) così il cliente è caricabile dalla Login.
    useAccessStore.getState().addProfile({
      nome: nc.nome,
      email: nc.email || `admin@${nc.nome.toLowerCase().replace(/[^a-z0-9]+/g, '')}.it`,
      password: 'demo',
      cliente: nc.nome,
      ruolo: 'Amministratore',
      moduli: moduli.length ? moduli : ['full-suite'],
    })

    setSelId(id)
    setNewClientId(id)
    setShowNewClient(false)
    setNewClientForm({ ...EMPTY_NEW_CLIENT })
    setMasterForm({ nome: '', cognome: '', email: newClientForm.email, telefono: '', ruolo: 'Amministratore Unico' })
    setMasterSent(false)
    setShowMasterModal(true)
  }

  const handleSendMaster = () => {
    if (!masterForm.nome.trim() || !masterForm.email.trim()) return
    setMasterSending(true)
    setTimeout(() => {
      const newMaster: UserRow = {
        id: Date.now(),
        nome: `${masterForm.nome} ${masterForm.cognome}`.trim(),
        email: masterForm.email,
        ruolo: 'Master / ' + masterForm.ruolo,
        attivo: true,
      }
      if (newClientId !== null) {
        setUsers(p => ({ ...p, [newClientId]: [newMaster, ...(p[newClientId] || [])] }))
      }
      setMasterSending(false)
      setMasterSent(true)
    }, 1600)
  }

  // ─── Utenti ────────────────────────────────────────────────────────────────
  const addUser = () => {
    if (!newUser.nome.trim() || !newUser.email.trim()) return
    setUsers(p => ({
      ...p,
      [selId]: [
        ...(p[selId] || []),
        { id: Date.now(), nome: newUser.nome, email: newUser.email, ruolo: newUser.ruolo, attivo: true },
      ],
    }))
    setNewUser({ nome: '', email: '', ruolo: 'Manager' })
  }
  const removeUser = (id: number) =>
    setUsers(p => ({ ...p, [selId]: (p[selId] || []).filter(u => u.id !== id) }))

  // ─── Catalogo: Categorie ───────────────────────────────────────────────────
  const openCreateCategoria = () => {
    setEditingCategoria(null)
    setCategoriaForm({ nome: '', icona: 'fa-building', descrizione: '', macroArea: '' })
    setShowCategoriaModal(true)
  }
  const openEditCategoria = (c: Categoria) => {
    setEditingCategoria(c)
    setCategoriaForm({ nome: c.nome, icona: c.icona, descrizione: c.descrizione, macroArea: c.macroArea })
    setShowCategoriaModal(true)
  }
  const confirmCategoria = () => {
    if (!categoriaForm.nome.trim() || !categoriaForm.macroArea) return
    if (editingCategoria) {
      updateCategoria(editingCategoria.id, categoriaForm)
    } else {
      addCategoria(categoriaForm)
    }
    setShowCategoriaModal(false)
  }
  const confirmDeleteCategoria = () => {
    if (!deleteCategoriaId) return
    removeCategoria(deleteCategoriaId)
    setDeleteCategoriaId(null)
  }

  // ─── Catalogo: Fornitori ───────────────────────────────────────────────────
  const splitCsv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)
  const joinCsv = (arr: string[]) => arr.join(', ')

  const openCreateFornitore = () => {
    setEditingFornitore(null)
    setFornitoreForm({
      nome: '', descrizione: '', storia: '', indirizzo: '', citta: '', regione: '', cap: '',
      telefono: '', email: '', sito: '', annoFondazione: '', certificazioni: '', caratteristiche: '',
      categoriaId: '', macroArea: '', immagineUrl: '',
    })
    setShowFornitoreModal(true)
  }
  const openEditFornitore = (f: Fornitore) => {
    setEditingFornitore(f)
    setFornitoreForm({
      nome: f.nome, descrizione: f.descrizione, storia: f.storia,
      indirizzo: f.indirizzo, citta: f.citta, regione: f.regione, cap: f.cap,
      telefono: f.telefono, email: f.email, sito: f.sito,
      annoFondazione: String(f.annoFondazione || ''),
      certificazioni: joinCsv(f.certificazioni),
      caratteristiche: joinCsv(f.caratteristiche),
      categoriaId: f.categoriaId, macroArea: f.macroArea, immagineUrl: f.immagineUrl,
    })
    setShowFornitoreModal(true)
  }
  const confirmFornitore = () => {
    if (!fornitoreForm.nome.trim() || !fornitoreForm.categoriaId || !fornitoreForm.macroArea) return
    const data: Omit<Fornitore, 'id'> = {
      nome: fornitoreForm.nome,
      descrizione: fornitoreForm.descrizione,
      storia: fornitoreForm.storia,
      indirizzo: fornitoreForm.indirizzo,
      citta: fornitoreForm.citta,
      regione: fornitoreForm.regione,
      cap: fornitoreForm.cap,
      telefono: fornitoreForm.telefono,
      email: fornitoreForm.email,
      sito: fornitoreForm.sito,
      annoFondazione: parseInt(fornitoreForm.annoFondazione) || 0,
      certificazioni: splitCsv(fornitoreForm.certificazioni),
      caratteristiche: splitCsv(fornitoreForm.caratteristiche),
      categoriaId: fornitoreForm.categoriaId,
      macroArea: fornitoreForm.macroArea,
      immagineUrl: fornitoreForm.immagineUrl,
      pubblicato: editingFornitore?.pubblicato ?? false,
    }
    if (editingFornitore) {
      updateFornitore(editingFornitore.id, data)
    } else {
      addFornitore(data)
    }
    setShowFornitoreModal(false)
  }
  const confirmDeleteFornitore = () => {
    if (!deleteFornitoreId) return
    removeFornitore(deleteFornitoreId)
    setDeleteFornitoreId(null)
  }

  // ─── Catalogo: Prodotti ────────────────────────────────────────────────────
  const isBarcodeUsed = (code: string, exceptId?: string) =>
    isBarcodeUsedStore(code, exceptId)

  const openCreateProdotto = () => {
    setEditingProdotto(null)
    setProdottoForm({
      barcode: '', nome: '', descrizione: '',
      categoriaId: '', classe: '', tipologia: '', fornitoreId: '',
      prezzoBase: '', unita: 'pz', quantitaUnita: '1', immagineUrl: '', foto: [], scortaMinima: '0', attivo: true,
      agoraAbilitato: false, agoraPrezzo: '',
      networkAbilitato: true, networkPrezzo: '',
      parametri: [],
    })
    setShowProdottoModal(true)
  }
  const openEditProdotto = (p: Prodotto) => {
    setEditingProdotto(p)
    setProdottoForm({
      barcode: p.barcode,
      nome: p.nome,
      descrizione: p.descrizione,
      categoriaId: p.categoriaId,
      classe: p.classe,
      tipologia: p.tipologia,
      fornitoreId: p.fornitoreId,
      prezzoBase: String(p.prezzoBase),
      unita: p.unita,
      quantitaUnita: String(p.quantitaUnita),
      immagineUrl: p.immagineUrl,
      foto: p.foto ?? (p.immagineUrl ? [p.immagineUrl] : []),
      scortaMinima: String(p.scortaMinima),
      attivo: p.attivo,
      agoraAbilitato: p.mercati.agora.abilitato,
      agoraPrezzo: p.mercati.agora.prezzoVendita ? String(p.mercati.agora.prezzoVendita) : '',
      networkAbilitato: p.mercati.network.abilitato,
      networkPrezzo: p.mercati.network.prezzoVendita ? String(p.mercati.network.prezzoVendita) : '',
      parametri: p.parametri ?? [],
    })
    setShowProdottoModal(true)
  }
  const confirmProdotto = () => {
    const code = prodottoForm.barcode.trim()
    const prezzoBase = parseFloat(prodottoForm.prezzoBase)
    if (!prodottoForm.nome.trim() || !prodottoForm.categoriaId || !prodottoForm.classe || !prodottoForm.fornitoreId) return
    if (!code || isNaN(prezzoBase)) return
    if (isBarcodeUsed(code, editingProdotto?.id)) return
    if (!prodottoForm.agoraAbilitato && !prodottoForm.networkAbilitato) return

    const agoraPr = parseFloat(prodottoForm.agoraPrezzo)
    const networkPr = parseFloat(prodottoForm.networkPrezzo)
    if (prodottoForm.agoraAbilitato && (isNaN(agoraPr) || agoraPr <= 0)) return
    if (prodottoForm.networkAbilitato && (isNaN(networkPr) || networkPr <= 0)) return

    const data: Omit<Prodotto, 'id'> = {
      barcode: code,
      nome: prodottoForm.nome,
      descrizione: prodottoForm.descrizione,
      categoriaId: prodottoForm.categoriaId,
      classe: prodottoForm.classe,
      tipologia: prodottoForm.tipologia,
      fornitoreId: prodottoForm.fornitoreId,
      prezzoBase,
      unita: prodottoForm.unita,
      quantitaUnita: parseFloat(prodottoForm.quantitaUnita) || 1,
      immagineUrl: prodottoForm.immagineUrl,
      foto: prodottoForm.foto,
      scortaMinima: parseInt(prodottoForm.scortaMinima) || 0,
      attivo: prodottoForm.attivo,
      pubblicato: editingProdotto?.pubblicato ?? false,
      mercati: {
        agora:   { abilitato: prodottoForm.agoraAbilitato,   prezzoVendita: prodottoForm.agoraAbilitato ? agoraPr : 0 },
        network: { abilitato: prodottoForm.networkAbilitato, prezzoVendita: prodottoForm.networkAbilitato ? networkPr : 0 },
      },
      parametri: prodottoForm.parametri,
    }
    if (editingProdotto) {
      updateProdotto(editingProdotto.id, data)
    } else {
      addProdotto(data)
    }
    setShowProdottoModal(false)
  }
  const confirmDeleteProdotto = () => {
    if (!deleteProdottoId) return
    removeProdotto(deleteProdottoId)
    setDeleteProdottoId(null)
  }
  const toggleProdottoAttivo = (id: string) => toggleProdottoAttivoStore(id)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sap">
      <AdminTopBar
        mode={mode}
        onModeChange={setMode}
        brandTitle={brandTitle}
        hideSwitch={!!lockedMode}
      />

      <div className="sap__view">
        {mode === 'clients' ? (
          <>
            <ClientsSidebar
              clients={visibleClients}
              selId={selId}
              search={search}
              onSearch={setSearch}
              onSelect={(id) => { setSelId(id); setEditingStruct(false) }}
              onNewClient={() => setShowNewClient(true)}
              title={clientsTitle}
              subtitle={embedded ? 'Strutture del cliente' : undefined}
            />

            <div className="sap__main">
              <ClientHeader
                client={client}
                formStato={form.stato}
                formTipo={tipologiaLabel(form)}
                formCitta={form.citta}
                enabledCount={enabledCount}
                totalCount={totalCount}
                saved={saved}
                tab={tab}
                onTabChange={setTab}
              />

              <div className="sap__body">
                {tab === 'struttura' && (
                  <StrutturaTab
                    data={currentStruct}
                    editing={editingStruct}
                    draft={editStructForm}
                    setDraft={setEditStructForm}
                    onEdit={openEditStruct}
                    onSave={saveEditStruct}
                    onCancel={cancelEditStruct}
                  />
                )}
                {tab === 'moduli' && (
                  <PagineTab
                    enabled={enabled}
                    enabledCount={enabledCount}
                    totalCount={totalCount}
                    onTogglePage={togglePage}
                    onToggleGroup={toggleGroup}
                    onEnableAll={enableAll}
                    onDisableAll={disableAll}
                    onSave={handleSave}
                  />
                )}
                {tab === 'pacchetti' && (
                  <ModuliTab
                    client={client}
                    modules={moduliList}
                    assigned={clientAssigned}
                    enabledCount={enabledCount}
                    onToggleAssign={toggleModuloAssign}
                    onCreate={openCreateModulo}
                    onEdit={openEditModulo}
                    onDelete={setDeleteModuloId}
                  />
                )}
                {tab === 'ruoli' && (
                  <RuoliTab
                    client={client}
                    ruoli={clientRuoli}
                    onCreate={openCreateRuolo}
                    onEdit={openEditRuolo}
                    onDelete={setDeleteRuoloId}
                    onConfigureFunzioni={goConfigureFunzioni}
                  />
                )}
                {tab === 'funzioni' && (
                  <FunzioniTab
                    ruoli={clientRuoli}
                    selRuoloId={selRuoloId}
                    enabled={enabled}
                    fnSearch={fnSearch}
                    setSelRuoloId={setSelRuoloId}
                    setFnSearch={setFnSearch}
                    goToRuoli={() => setTab('ruoli')}
                    goToModuli={() => setTab('pacchetti')}
                    getFn={getFn}
                    setFn={setFn}
                    setAllFn={setAllFn}
                  />
                )}
                {tab === 'utenti' && (
                  <UtentiTab
                    users={clientUsers}
                    newUser={newUser}
                    setNewUser={setNewUser}
                    onAdd={addUser}
                    onRemove={removeUser}
                  />
                )}
                {tab === 'associazioni' && (
                  <AssociazioniTab
                    client={client}
                    users={clientUsers}
                    ruoli={clientRuoli}
                    strutture={clients.map(c => ({ id: c.id, nome: c.nome }))}
                    assoc={clientAssoc}
                    onChange={setUserAssoc}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <PlatformSidebar section={platformSection} onSelect={setPlatformSection} />

            <div className="sap__main">
              <PlatformHeader section={platformSection} />

              <div className={`sap__body${platformSection === 'agora-console' ? ' sap__body--flush' : ''}`}>
                {platformSection === 'catalogo' && (
                  <CatalogoTab
                    subTab={catalogoSubTab}
                    setSubTab={setCatalogoSubTab}
                    categorie={categorie}
                    fornitori={fornitori}
                    prodotti={prodotti}
                    onCreateCategoria={openCreateCategoria}
                    onEditCategoria={openEditCategoria}
                    onDeleteCategoria={setDeleteCategoriaId}
                    onCreateFornitore={openCreateFornitore}
                    onEditFornitore={openEditFornitore}
                    onDeleteFornitore={setDeleteFornitoreId}
                    onToggleFornitorePubblicato={toggleFornitorePubblicato}
                    onCreateProdotto={openCreateProdotto}
                    onEditProdotto={openEditProdotto}
                    onDeleteProdotto={setDeleteProdottoId}
                    onToggleProdottoAttivo={toggleProdottoAttivo}
                    onToggleProdottoPubblicato={toggleProdottoPubblicato}
                  />
                )}
                {platformSection === 'servizi' && (
                  <ServiziAdminTab />
                )}
                {platformSection === 'banner' && (
                  <BannerTab />
                )}
                {platformSection === 'agora-console' && (
                  <AgoraShell initialPath="/admin" />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <NewClientModal
        open={showNewClient}
        form={newClientForm}
        setForm={setNewClientForm}
        onClose={() => setShowNewClient(false)}
        onConfirm={handleAddClient}
      />

      <MasterUserModal
        open={showMasterModal}
        form={masterForm}
        setForm={setMasterForm}
        clienteName={clients.find(c => c.id === newClientId)?.nome}
        sending={masterSending}
        sent={masterSent}
        onClose={() => setShowMasterModal(false)}
        onSend={handleSendMaster}
      />

      <ModuloModal
        open={showModuloModal}
        editing={editingModulo}
        form={moduloForm}
        setForm={setModuloForm}
        onClose={() => setShowModuloModal(false)}
        onConfirm={confirmModulo}
      />

      <ConfirmDeleteModal
        open={deleteModuloId !== null}
        title="Elimina modulo"
        itemName={moduliList.find(m => m.id === deleteModuloId)?.label || ''}
        onClose={() => setDeleteModuloId(null)}
        onConfirm={confirmDeleteModulo}
      />

      <RuoloModal
        open={showRuoloModal}
        editing={editingRuolo}
        form={ruoloForm}
        setForm={setRuoloForm}
        onClose={() => setShowRuoloModal(false)}
        onConfirm={confirmRuolo}
      />

      <ConfirmDeleteModal
        open={deleteRuoloId !== null}
        title="Elimina ruolo"
        itemName={clientRuoli.find(r => r.id === deleteRuoloId)?.nome || ''}
        onClose={() => setDeleteRuoloId(null)}
        onConfirm={confirmDeleteRuolo}
      />

      <CategoriaModal
        open={showCategoriaModal}
        editing={editingCategoria}
        form={categoriaForm}
        setForm={setCategoriaForm}
        onClose={() => setShowCategoriaModal(false)}
        onConfirm={confirmCategoria}
      />

      <ConfirmDeleteModal
        open={deleteCategoriaId !== null}
        title="Elimina categoria"
        itemName={categorie.find(c => c.id === deleteCategoriaId)?.nome || ''}
        onClose={() => setDeleteCategoriaId(null)}
        onConfirm={confirmDeleteCategoria}
      />

      <FornitoreModal
        open={showFornitoreModal}
        editing={editingFornitore}
        form={fornitoreForm}
        setForm={setFornitoreForm}
        categorie={categorie}
        onClose={() => setShowFornitoreModal(false)}
        onConfirm={confirmFornitore}
      />

      <ConfirmDeleteModal
        open={deleteFornitoreId !== null}
        title="Elimina fornitore"
        itemName={fornitori.find(f => f.id === deleteFornitoreId)?.nome || ''}
        onClose={() => setDeleteFornitoreId(null)}
        onConfirm={confirmDeleteFornitore}
      />

      <ProdottoModal
        open={showProdottoModal}
        editing={editingProdotto}
        form={prodottoForm}
        setForm={setProdottoForm}
        categorie={categorie}
        fornitori={fornitori}
        onClose={() => setShowProdottoModal(false)}
        onConfirm={confirmProdotto}
        isBarcodeUsed={isBarcodeUsed}
      />

      <ConfirmDeleteModal
        open={deleteProdottoId !== null}
        title="Elimina prodotto"
        itemName={prodotti.find(p => p.id === deleteProdottoId)?.nome || ''}
        onClose={() => setDeleteProdottoId(null)}
        onConfirm={confirmDeleteProdotto}
      />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   AdminTopBar — barra superiore con brand + switcher modalità top-level.
   Permette di passare in modo netto da "Clienti" a "Piattaforma" (e viceversa).
   ──────────────────────────────────────────────────────────────────────────── */
const MODE_OPTIONS: ReadonlyArray<readonly [AdminMode, string, string]> = [
  ['clients',  'Clienti',    'profile'],
  ['platform', 'Piattaforma', 'gear'],
] as const

interface AdminTopBarProps {
  mode: AdminMode
  onModeChange: (m: AdminMode) => void
  brandTitle?: string
  hideSwitch?: boolean
}

function AdminTopBar({ mode, onModeChange, brandTitle, hideSwitch }: AdminTopBarProps) {
  return (
    <header className="sap__topbar">
      <div className="sap__brand">
        <span className="sap__brand-mark">S</span>
        <div className="sap__brand-text">
          <span className="sap__brand-title">{brandTitle ?? 'Sibylla Admin'}</span>
          <span className="sap__brand-sub">Pannello di controllo</span>
        </div>
      </div>

      {!hideSwitch && (
        <nav className="sap__mode-switch" role="tablist" aria-label="Modalità">
          {MODE_OPTIONS.map(([id, label, ico]) => {
            const active = mode === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                className={`sap__mode-btn${active ? ' sap__mode-btn--active' : ''}`}
                onClick={() => onModeChange(id)}
              >
                <Ico n={ico} s={13} c={active ? '#fff' : 'var(--color-text-inactive)'} />
                {label}
              </button>
            )
          })}
        </nav>
      )}
    </header>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   PlatformHeader — header della sezione selezionata in modalità Piattaforma.
   Analogo a ClientHeader ma senza tab (sono in sidebar) e senza dati cliente.
   ──────────────────────────────────────────────────────────────────────────── */
const PLATFORM_SECTION_META: Record<PlatformSection, { title: string; subtitle: string }> = {
  'catalogo':      { title: 'Catalogo merceologico', subtitle: 'Categorie, fornitori e prodotti pubblicati sui mercati' },
  'servizi':       { title: 'Servizi',               subtitle: 'Escursioni, noleggi, eventi e altri servizi con listini Agorà / B2B / B2C' },
  'banner':        { title: 'Banner & affiliazione', subtitle: 'Genera banner di ricerca e prenotazione da pubblicare sui siti di terzi per promuovere Sibylla' },
  'agora-console': { title: 'Piattaforma admin',     subtitle: 'Strutture, contenuti e impostazioni dei canali Agorà / B2B / B2C' },
}

function PlatformHeader({ section }: { section: PlatformSection }) {
  const meta = PLATFORM_SECTION_META[section]
  return (
    <header className="sap__page-head">
      <div className="sap__page-title">{meta.title}</div>
      <div className="sap__page-subtitle">{meta.subtitle}</div>
    </header>
  )
}
