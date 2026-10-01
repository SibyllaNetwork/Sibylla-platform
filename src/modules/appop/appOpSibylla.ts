// ─── APP OP! PER I CLIENTI DI SIBYLLA PLATFORM ────────────────────────────────
//  Configurazione dell'app Op! dell'azienda collegata: moduli per reparto e
//  utenze dei dipendenti con grado, reparti e codice di invito. I dati stanno in
//  Sibylla: azioni 🆕 di SibyllaApiProxy descritte in
//  sibylla-op/docs/integrazione-sibylla/13-configuratore-app-op.md. Finché il
//  Portal non le espone, la pagina lavora su una copia di prova nel browser.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetchSibylla, ApiError } from '../../services/api'
import { REPARTI_OP, repartoDaId, type LivelloOp, type RepartiModuli, type RepartoOp } from './opCatalogo'
import type { DipendenteOp, DipendenteRichiesta, InvitoOp } from './opApi'

interface UtenteSibylla {
  id_utente: number
  nome: string
  cognome: string
  email: string
  id_reparti: number[]
  responsabile_reparti: number[]
  hr: boolean
  livello: LivelloOp
  stato: 'invitato' | 'attivo' | 'bloccato'
  invito_scade_il: string | null
  ultimo_accesso: string | null
}

interface ConfigSibylla {
  moduli_reparti: Record<string, string[]>
  utenti: UtenteSibylla[]
}

const ids = (keys: RepartoOp[]) => keys.map(k => REPARTI_OP.find(r => r.key === k)!.id)
const keys = (idList: number[]) => idList.map(id => repartoDaId(id)?.key).filter((k): k is RepartoOp => !!k)

const daSibylla = (u: UtenteSibylla): DipendenteOp => ({
  id: u.id_utente, nome: u.nome, cognome: u.cognome, email: u.email, livello: u.livello,
  reparti: keys(u.id_reparti), responsabileReparti: keys(u.responsabile_reparti), hr: u.hr,
  stato: u.stato, invitoScadeIl: u.invito_scade_il, ultimoAccesso: u.ultimo_accesso,
})

const moduliDa = (m: Record<string, string[]>): RepartiModuli =>
  Object.fromEntries(Object.entries(m).map(([id, v]) => [repartoDaId(Number(id))?.key, v]).filter(([k]) => !!k))

const moduliPer = (r: RepartiModuli): Record<string, string[]> =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [String(REPARTI_OP.find(x => x.key === k)!.id), v ?? []]))

/** Il Portal non espone ancora l'azione (404) o non risponde: si usa la copia di prova. */
const nonDisponibile = (e: unknown) => !(e instanceof ApiError) || e.status === 404 || e.status >= 500

const post = <T,>(path: string, body: unknown) => apiFetchSibylla<T>(path, { method: 'POST', body, redirectOn401: false })

// ─── Copia di prova (browser) ─────────────────────────────────────────────────

const CODICE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const nuovoCodice = () => Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => CODICE[Math.floor(Math.random() * CODICE.length)]).join('')).join('-')
const tra15Giorni = () => new Date(Date.now() + 15 * 86_400_000).toISOString()
const maschera = (email: string) => email.replace(/^(.)[^@]*/, (_, c) => `${c}•••••`)

interface ProvaState {
  reparti: RepartiModuli
  dipendenti: DipendenteOp[]
  setReparti: (r: RepartiModuli) => void
  salva: (id: number | null, d: DipendenteRichiesta) => { dipendente: DipendenteOp; invito: InvitoOp | null }
  invita: (id: number) => InvitoOp
}

export const useAppOpProva = create<ProvaState>()(persist((set, get) => ({
  reparti: { pulizie: REPARTI_OP[0].predefiniti, frontOffice: REPARTI_OP[3].predefiniti },
  dipendenti: [],
  setReparti: reparti => set({ reparti }),
  salva: (id, d) => {
    const invito = !id && d.inviaInvito !== false ? { codice: nuovoCodice(), scadeIl: tra15Giorni(), emailMascherata: maschera(d.email) } : null
    const esistente = get().dipendenti.find(x => x.id === id)
    const dipendente: DipendenteOp = {
      id: id ?? Math.max(0, ...get().dipendenti.map(x => x.id)) + 1,
      nome: d.nome, cognome: d.cognome, email: d.email, livello: d.livello, reparti: d.reparti,
      responsabileReparti: d.responsabileReparti, hr: d.hr,
      stato: esistente?.stato ?? 'invitato', invitoScadeIl: invito?.scadeIl ?? esistente?.invitoScadeIl ?? null, ultimoAccesso: esistente?.ultimoAccesso ?? null,
    }
    set({ dipendenti: esistente ? get().dipendenti.map(x => (x.id === id ? dipendente : x)) : [...get().dipendenti, dipendente] })
    return { dipendente, invito }
  },
  invita: id => {
    const d = get().dipendenti.find(x => x.id === id)!
    const invito = { codice: nuovoCodice(), scadeIl: tra15Giorni(), emailMascherata: maschera(d.email) }
    set({ dipendenti: get().dipendenti.map(x => (x.id === id ? { ...x, invitoScadeIl: invito.scadeIl } : x)) })
    return invito
  },
}), { name: 'sibylla-app-op-prova' }))

// ─── API (Portal, con la copia di prova come riserva) ─────────────────────────

export interface ConfigAppOp {
  reparti: RepartiModuli
  dipendenti: DipendenteOp[]
  /** true = il Portal non espone ancora le API: dati di prova nel browser. */
  prova: boolean
}

export const appOpSibylla = {
  async leggi(): Promise<ConfigAppOp> {
    try {
      const c = await post<ConfigSibylla>('OpApp/config/Get', {})
      return { reparti: moduliDa(c.moduli_reparti ?? {}), dipendenti: (c.utenti ?? []).map(daSibylla), prova: false }
    } catch (e) {
      if (!nonDisponibile(e)) throw e
      const p = useAppOpProva.getState()
      return { reparti: p.reparti, dipendenti: p.dipendenti, prova: true }
    }
  },

  async salvaModuli(reparti: RepartiModuli, prova: boolean): Promise<void> {
    if (prova) { useAppOpProva.getState().setReparti(reparti); return }
    await post('OpApp/config/SalvaModuli', { moduli_reparti: moduliPer(reparti) })
  },

  async salvaUtente(id: number | null, d: DipendenteRichiesta, prova: boolean): Promise<{ invito: InvitoOp | null }> {
    if (prova) return { invito: useAppOpProva.getState().salva(id, d).invito }
    const r = await post<{ success: boolean; error_message?: string; invito?: { codice: string; scade_il: string; email_mascherata: string } | null }>('OpApp/utenti/Salva', {
      id_utente: id, nome: d.nome, cognome: d.cognome, email: d.email, livello: d.livello,
      id_reparti: ids(d.reparti), responsabile_reparti: ids(d.responsabileReparti), hr: d.hr, invia_invito: !id && d.inviaInvito !== false,
    })
    if (!r.success) throw new Error(r.error_message || 'Utenza non salvata.')
    return { invito: r.invito ? { codice: r.invito.codice, scadeIl: r.invito.scade_il, emailMascherata: r.invito.email_mascherata } : null }
  },

  async invita(id: number, prova: boolean): Promise<InvitoOp> {
    if (prova) return useAppOpProva.getState().invita(id)
    const r = await post<{ codice: string; scade_il: string; email_mascherata: string }>('OpApp/inviti/Invia', { id_utente: id })
    return { codice: r.codice, scadeIl: r.scade_il, emailMascherata: r.email_mascherata }
  },
}
