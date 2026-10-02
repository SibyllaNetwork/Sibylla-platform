import { generaPms, pmsAttivo, type PmsDemo } from './pmsDemo'
import { schedaDemo } from '../../../core/demo/struttureDemo'

// Gestionale demo di una struttura qualsiasi del cliente: quella attiva (in alto)
// è già calcolata; per le altre, scelte dai select "Struttura" delle pagine, si
// genera con la stessa scheda (stessi dati del front office se la si seleziona).
const cache = new Map<string, PmsDemo>()

export function pmsDi(nome: string): PmsDemo {
  const attivo = pmsAttivo()
  if (!nome || attivo.nome === nome) return attivo
  const oggi = new Date().toDateString()
  const k = `${nome}|${oggi}`
  let d = cache.get(k)
  if (!d) {
    const s = schedaDemo(nome)
    d = generaPms({ nome, categoria: s.categoria, classificazione: s.tipo, camere: s.camere })
    cache.set(k, d)
  }
  return d
}
