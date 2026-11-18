import type { Bep, MeseFinance } from '../_data/financeMock'

/**
 * Simulazione di scenario sul BEP. Si sceglie UN parametro obiettivo, Ricavi
 * oppure Margine; l'altro si ricava dalla struttura dei costi di oggi
 * (ricavo per camera, costo variabile per camera, costi fissi):
 *
 *   Ricavi obiettivo  → camere = Ricavi / ricavo per camera
 *                       margine = camere × margine unitario − costi fissi
 *   Margine obiettivo → camere = (Margine + costi fissi) / margine unitario
 *                       ricavi = camere × ricavo per camera
 *
 * Il punto di pareggio resta quello di oggi: lo scenario mostra dove si
 * colloca l'obiettivo rispetto al pareggio e quanto margine di sicurezza dà.
 */
export type Parametro = 'ricavi' | 'margine'

export interface Obiettivi { parametro: Parametro; valore: number }

export interface Scenario extends Obiettivi {
  camere: number
  ricavi: number
  margine: number
  costiFissi: number
  cvu: number
  mcu: number
  camereBep: number
  ricaviBep: number
  /** Margine di sicurezza dello scenario (0-1). */
  sicurezza: number
  /** Variazione dei ricavi e del margine rispetto a oggi (es. 0,1 = +10%). */
  varRicavi: number
  varMargine: number
  fattibile: boolean
}

export function simula(bep: Bep, o: Obiettivi, ricaviOggi: number, margineOggi: number): Scenario {
  const p = bep.ricavoPerCamera
  const camere = o.parametro === 'ricavi'
    ? (p > 0 ? o.valore / p : 0)
    : (bep.mcu > 0 ? (o.valore + bep.costiFissi) / bep.mcu : 0)
  const ricavi = o.parametro === 'ricavi' ? o.valore : camere * p
  const margine = o.parametro === 'margine' ? o.valore : camere * bep.mcu - bep.costiFissi
  return {
    ...o,
    camere,
    ricavi,
    margine,
    costiFissi: bep.costiFissi,
    cvu: bep.cvu,
    mcu: bep.mcu,
    camereBep: bep.camereBep,
    ricaviBep: bep.ricaviBep,
    sicurezza: camere ? (camere - bep.camereBep) / camere : 0,
    varRicavi: ricaviOggi ? (ricavi - ricaviOggi) / ricaviOggi : 0,
    varMargine: margineOggi ? (margine - margineOggi) / Math.abs(margineOggi) : 0,
    fattibile: o.valore > 0 && bep.mcu > 0 && camere > 0,
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
