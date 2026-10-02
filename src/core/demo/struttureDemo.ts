import { CLIENTS_INIT } from '../../admin/SibyllaAdminPanel/constants'

// ─── Schede demo delle strutture ─────────────────────────────────────────────
//  Per le pagine che elencano il portafoglio del cliente (I miei business,
//  Griglia disponibilità, Efficienza operativa, IDS, confronti dell'Executive):
//  una scheda per struttura con tipo, città, camere e stelle. Viene dalla
//  scheda cliente dell'Admin quando c'è, altrimenti è dedotta dal nome — sempre
//  la stessa per lo stesso nome. Le camere coincidono con quelle del front
//  office demo (_data/pmsDemo).

export interface SchedaDemo {
  id: string
  nome: string
  /** Etichetta di tipologia: "Resort 5★", "Hotel 4★", "B&B", "Trattoria"… */
  tipo: string
  categoria: string
  citta: string
  camere: number
  stelle: number
  seme: number
}

export const hashNome = (t: string) => {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0
  return h
}

const PROVINCE: Record<string, string> = {
  Noto: 'Noto', Siracusa: 'Siracusa', Catania: 'Catania', Taormina: 'Taormina', Roma: 'Roma', Milano: 'Milano',
}

const ETICHETTA: Record<string, string> = {
  bnb: 'B&B', ristorante: 'Ristorante', bar: 'Cocktail bar', 'case-vacanze': 'Case vacanze',
  appartamenti: 'Residence', studentato: 'Studentato',
}

export function schedaDemo(nome: string): SchedaDemo {
  const seme = hashNome(nome)
  const id = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  const c = CLIENTS_INIT.find(x => x.nome === nome)
  if (c) {
    const stelle = Number((c.classificazione.match(/(\d)★/) ?? [])[1]) || (c.categoria === 'hotel' ? 4 : 0)
    return {
      id, nome, seme, categoria: c.categoria, stelle,
      tipo: c.classificazione ? (c.categoria === 'hotel' && !/hotel|resort/i.test(c.classificazione) ? `Hotel ${c.classificazione}` : c.classificazione) : ETICHETTA[c.categoria] ?? c.categoria,
      citta: c.citta.replace(/\s*\(.*\)$/, ''),
      camere: Number(c.camere) || 0,
    }
  }
  const resort = /resort/i.test(nome)
  const ultima = nome.split(/\s+/).pop() ?? nome
  const stelle = resort ? 5 : 3 + (seme % 2)
  return {
    id, nome, seme, categoria: 'hotel', stelle,
    tipo: resort ? `Resort ${stelle}★` : `Hotel ${stelle}★`,
    citta: PROVINCE[ultima] ?? ultima,
    // Stessa formula del front office demo: le camere tornano fra le pagine.
    camere: 40 + (seme % 50),
  }
}

/** Identificativo numerico stabile della struttura (legato al nome). */
export const idStruttura = (nome: string) => (hashNome(nome) % 900000) + 100

/** La scheda nella forma del ciclo revenue (sales/_data/revenueMock). */
export function strutturaRevenue(s: SchedaDemo) {
  const tipo: 'hotel' | 'resort' | 'bb' = /resort/i.test(s.tipo) ? 'resort' : s.categoria === 'bnb' ? 'bb' : 'hotel'
  const adrK = s.categoria === 'studentato' ? 0.35
    : s.categoria === 'bnb' ? 0.8
    : s.categoria === 'case-vacanze' || s.categoria === 'appartamenti' ? 0.9
    : tipo === 'resort' ? 1.55 : s.stelle >= 5 ? 1.45 : s.stelle === 4 ? 1 : 0.85
  return { id: idStruttura(s.nome), nome: s.nome, camere: s.camere, tipo, adrK }
}
