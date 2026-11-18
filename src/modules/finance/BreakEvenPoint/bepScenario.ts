import type { Bep, MeseFinance } from '../_data/financeMock'

/**
 * Simulazione di scenario sul BEP: dati un ricavo e un margine obiettivo, quali
 * costi servono per centrarli tenendo fermo il ricavo per camera.
 *
 *   camere obiettivo = Ricavi obiettivo / ricavo per camera
 *   leva "costi fissi":     costi fissi massimi = Ricavi − costi variabili − Margine
 *   leva "costo variabile": costo variabile max per camera = (Ricavi − Margine − costi fissi) / camere
 *
 * Lo scenario ha un nuovo punto di pareggio (costi fissi / margine unitario).
 */
export type Leva = 'fissi' | 'variabili'

export interface Obiettivi { ricavi: number; margine: number; leva: Leva }

export interface Scenario extends Obiettivi {
  camere: number
  costiFissi: number
  cvu: number
  mcu: number
  camereBep: number
  ricaviBep: number
  /** Margine che si avrebbe ai ricavi obiettivo con i costi di oggi. */
  margineCostiAttuali: number
  /** Variazione richiesta sulla leva, rispetto a oggi (es. −0,12 = −12%). */
  variazioneLeva: number
  fattibile: boolean
}

export function simula(bep: Bep, o: Obiettivi): Scenario {
  const p = bep.ricavoPerCamera
  const camere = p > 0 ? o.ricavi / p : 0
  const margineCostiAttuali = o.ricavi - camere * bep.cvu - bep.costiFissi
  let costiFissi = bep.costiFissi
  let cvu = bep.cvu
  if (o.leva === 'fissi') costiFissi = o.ricavi - camere * bep.cvu - o.margine
  else cvu = camere > 0 ? (o.ricavi - o.margine - bep.costiFissi) / camere : 0
  const mcu = p - cvu
  const camereBep = mcu > 0 ? Math.max(0, costiFissi) / mcu : 0
  const base = o.leva === 'fissi' ? bep.costiFissi : bep.cvu
  const nuovo = o.leva === 'fissi' ? costiFissi : cvu
  return {
    ...o,
    camere,
    costiFissi,
    cvu,
    mcu,
    camereBep,
    ricaviBep: camereBep * p,
    margineCostiAttuali,
    variazioneLeva: base ? (nuovo - base) / base : 0,
    fattibile: costiFissi >= 0 && cvu >= 0 && mcu > 0,
  }
}

/** Ripartizione mensile dello scenario per le voci del Budget complessivo. */
export function mesiScenario(s: Scenario, mesi: MeseFinance[]) {
  const totRic = mesi.reduce((a, m) => a + m.ricaviTotali, 0) || 1
  const totCam = mesi.reduce((a, m) => a + m.camereVendute, 0) || 1
  const totFix = mesi.reduce((a, m) => a + m.costiFissi, 0) || 1
  const r = (n: number) => Math.round(n)
  return {
    vendite: mesi.map(m => r(s.ricavi * (m.ricaviTotali / totRic))),
    proventi: mesi.map(() => 0),
    fisso: mesi.map(m => r(s.costiFissi * (m.costiFissi / totFix))),
    variabile: mesi.map(m => r(s.camere * (m.camereVendute / totCam) * s.cvu)),
  }
}
