import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PACCHETTI_INIT, CLIENTS_INIT, CLIENT_ADMINS } from '../admin/SibyllaAdminPanel/constants'
import type { Modulo } from '../admin/SibyllaAdminPanel/types'

// ─────────────────────────────────────────────────────────────────────────────
//  Access store — utenze fittizie (profili) associate a uno o più moduli.
//  Ogni profilo, una volta "caricato", filtra il menu della sidenav alle sole
//  pagine dei moduli sottoscritti dal suo contratto.
//  currentProfileId = null  → nessun filtro (menu completo, comportamento attuale).
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessProfile {
  id: string
  nome: string
  email: string
  password: string
  /** Struttura/cliente di appartenenza. */
  cliente: string
  ruolo: string
  /** Id dei moduli sottoscritti (da `modules`). */
  moduli: string[]
}

/**
 * Sessione di assistenza: l'admin Sibylla entra nell'app "come" un cliente
 * (intestatario del contratto). La sidenav/topbar reali si filtrano sui suoi
 * moduli e assumono il tema oro della console di amministrazione.
 */
export interface AssistSession {
  intestatarioId: string
  nome: string
  moduli: string[]
  struttureIds: number[]
}

interface AccessState {
  /** Catalogo moduli (id → pagine). Allineato al seed dell'admin (PACCHETTI_INIT). */
  modules: Modulo[]
  profiles: AccessProfile[]
  /** Profilo attualmente caricato; null = menu completo. */
  currentProfileId: string | null
  /** Sessione di assistenza attiva (admin che impersona un cliente); null = nessuna. */
  assist: AssistSession | null
  /** Overlay della Login profili aperto. */
  accessOpen: boolean

  addProfile: (p: Omit<AccessProfile, 'id'>) => string
  updateProfile: (id: string, patch: Partial<AccessProfile>) => void
  removeProfile: (id: string) => void
  loginAs: (id: string | null) => void
  /** Avvia/termina una sessione di assistenza cliente. */
  startAssist: (s: AssistSession) => void
  exitAssist: () => void
  /** Verifica credenziali; ritorna il profilo o null. */
  login: (email: string, password: string) => AccessProfile | null
  /** Allinea i moduli dei profili di un'azienda (quando variati nell'admin). */
  syncClientModules: (clienteName: string, moduli: string[]) => void
  logout: () => void
  openAccess: () => void
  closeAccess: () => void
}

const MODULES: Modulo[] = PACCHETTI_INIT.map(m => ({ ...m, pages: [...m.pages] }))

// Utenze di test = amministratori delle aziende clienti (una per azienda).
// Derivate dalla stessa fonte usata dall'admin (CLIENTS_INIT + CLIENT_ADMINS),
// così profilo di login, utente del cliente e moduli assegnati restano allineati.
const SEED_PROFILES: AccessProfile[] = CLIENTS_INIT.map(c => {
  const a = CLIENT_ADMINS[c.id]
  return {
    id: `p-${c.id}`,
    nome: a?.nome ?? c.nome,
    email: a?.email ?? c.email,
    password: 'demo',
    cliente: c.nome,
    ruolo: 'Amministratore',
    moduli: a?.moduli ?? ['full-suite'],
  }
})

export const useAccessStore = create<AccessState>()(
  persist(
    (set, get) => ({
      modules: MODULES,
      profiles: SEED_PROFILES,
      currentProfileId: null,
      assist: null,
      accessOpen: false,

      addProfile: (p) => {
        const id = `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        set(s => ({ profiles: [{ id, ...p }, ...s.profiles] }))
        return id
      },
      updateProfile: (id, patch) =>
        set(s => ({ profiles: s.profiles.map(p => p.id === id ? { ...p, ...patch } : p) })),
      removeProfile: (id) =>
        set(s => ({
          profiles: s.profiles.filter(p => p.id !== id),
          currentProfileId: s.currentProfileId === id ? null : s.currentProfileId,
        })),
      loginAs: (id) => set({ currentProfileId: id, accessOpen: false }),
      startAssist: (s) => set({ assist: s, accessOpen: false }),
      exitAssist: () => set({ assist: null }),
      login: (email, password) => {
        const p = get().profiles.find(
          x => x.email.trim().toLowerCase() === email.trim().toLowerCase() && x.password === password,
        )
        if (p) set({ currentProfileId: p.id, accessOpen: false })
        return p ?? null
      },
      syncClientModules: (clienteName, moduli) =>
        set(s => ({ profiles: s.profiles.map(p => p.cliente === clienteName ? { ...p, moduli: [...moduli] } : p) })),
      logout: () => set({ currentProfileId: null }),
      openAccess: () => set({ accessOpen: true }),
      closeAccess: () => set({ accessOpen: false }),
    }),
    {
      name: 'sibylla.access',
      // Bump versione: rigenera le utenze di test (= admin delle aziende) anche
      // sostituendo eventuali profili persistiti in localStorage.
      version: 3,
      migrate: () => ({ profiles: SEED_PROFILES, currentProfileId: null, assist: null }),
      // Non persistiamo `modules` (riallineati dal seed) né `accessOpen` (transitorio).
      partialize: (s) => ({ profiles: s.profiles, currentProfileId: s.currentProfileId, assist: s.assist }),
    },
  ),
)

/**
 * Insieme delle pagine abilitate per un profilo = unione delle pagine dei moduli
 * sottoscritti. La Home è sempre inclusa (landing di piattaforma).
 */
export function enabledPagesForProfile(profile: AccessProfile, modules: Modulo[]): Set<string> {
  return enabledPagesForModuli(profile.moduli, modules)
}

/** Insieme delle pagine abilitate dall'unione dei moduli indicati (Home sempre inclusa). */
export function enabledPagesForModuli(moduli: string[], modules: Modulo[]): Set<string> {
  const set = new Set<string>(['home'])
  for (const mid of moduli) {
    const m = modules.find(x => x.id === mid)
    if (m) m.pages.forEach(pg => set.add(pg))
  }
  return set
}

/**
 * Voci del Configuratore visibili per un profilo, in base ai moduli sottoscritti.
 * Ritorna `null` se nessun limite (almeno un modulo concede tutte le voci, es.
 * Full Suite); altrimenti l'unione delle `configuratoreItems` dei moduli (es. il
 * modulo Ristoranti concede solo le voci Food & Beverage).
 */
export function allowedConfiguratoreIds(profile: AccessProfile, modules: Modulo[]): Set<string> | null {
  const set = new Set<string>()
  for (const mid of profile.moduli) {
    const m = modules.find(x => x.id === mid)
    if (!m) continue
    if (!m.configuratoreItems) return null  // modulo senza restrizioni → tutte le voci
    m.configuratoreItems.forEach(id => set.add(id))
  }
  return set
}
