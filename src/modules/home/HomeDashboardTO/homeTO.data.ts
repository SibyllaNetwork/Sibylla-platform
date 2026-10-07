// ─── HOME TOUR OPERATOR · dati demo ───────────────────────────────────────────
//  Meteo e cambi arrivano da API pubbliche senza chiave (Open-Meteo, Frankfurter):
//  qui solo le coordinate e i valori di ripiego se la rete non risponde.
//  Contratti, mercato, notizie ed eventi sono mock in attesa del backend.

export interface Destinazione { id: string; nome: string; lat: number; lon: number }

export const DESTINAZIONI: Destinazione[] = [
  { id: 'roma',    nome: 'Roma',    lat: 41.9028, lon: 12.4964 },
  { id: 'firenze', nome: 'Firenze', lat: 43.7696, lon: 11.2558 },
  { id: 'venezia', nome: 'Venezia', lat: 45.4408, lon: 12.3155 },
  { id: 'napoli',  nome: 'Napoli',  lat: 40.8518, lon: 14.2681 },
  { id: 'milano',  nome: 'Milano',  lat: 45.4642, lon: 9.19 },
]

/** Codici meteo WMO → descrizione + icona FA (`sole` = icona con il sole, in oro). */
export function meteoDa(code: number): { desc: string; ico: string; sole?: boolean } {
  if (code === 0) return { desc: 'Sereno', ico: 'fa-sun', sole: true }
  if (code <= 2) return { desc: 'Poco nuvoloso', ico: 'fa-cloud-sun', sole: true }
  if (code === 3) return { desc: 'Coperto', ico: 'fa-cloud' }
  if (code <= 48) return { desc: 'Nebbia', ico: 'fa-smog' }
  if (code <= 57) return { desc: 'Pioviggine', ico: 'fa-cloud-drizzle' }
  if (code <= 67) return { desc: 'Pioggia', ico: 'fa-cloud-rain' }
  if (code <= 77) return { desc: 'Neve', ico: 'fa-snowflake' }
  if (code <= 82) return { desc: 'Rovesci', ico: 'fa-cloud-showers-heavy' }
  return { desc: 'Temporale', ico: 'fa-cloud-bolt' }
}

export interface MeteoGiorno { data: string; code: number; max: number; min: number }
export interface Meteo {
  temp: number; code: number; vento: number; umidita: number
  giorni: MeteoGiorno[]
  live: boolean
}

/** Ripiego deterministico per destinazione (stessa città → stessi valori). */
export function meteoFallback(d: Destinazione): Meteo {
  const seed = d.nome.length
  const oggi = new Date()
  const codes = [1, 2, 61, 0, 3]
  return {
    temp: 19 + (seed % 5), code: codes[seed % codes.length], vento: 8 + seed, umidita: 58 + seed * 2,
    live: false,
    giorni: [1, 2, 3].map(i => {
      const g = new Date(oggi); g.setDate(oggi.getDate() + i)
      return { data: g.toISOString().slice(0, 10), code: codes[(seed + i) % codes.length], max: 21 + ((seed + i) % 4), min: 12 + ((seed + i) % 3) }
    }),
  }
}

// ── Prenotazioni: ultimi 6 mesi, anno corrente vs anno precedente ────────────
export interface MesePren { mese: string; pratiche: number; praticheLy: number; fatturato: number; fatturatoLy: number }
export const PRENOTAZIONI: MesePren[] = [
  { mese: 'Mag', pratiche: 42,  praticheLy: 36, fatturato: 118_400, fatturatoLy: 97_200 },
  { mese: 'Giu', pratiche: 67,  praticheLy: 58, fatturato: 196_300, fatturatoLy: 171_900 },
  { mese: 'Lug', pratiche: 88,  praticheLy: 81, fatturato: 274_800, fatturatoLy: 249_100 },
  { mese: 'Ago', pratiche: 95,  praticheLy: 92, fatturato: 301_500, fatturatoLy: 296_700 },
  { mese: 'Set', pratiche: 61,  praticheLy: 49, fatturato: 182_600, fatturatoLy: 141_300 },
  { mese: 'Ott', pratiche: 24,  praticheLy: 31, fatturato: 71_900,  fatturatoLy: 88_400 },
]

// ── Mercato: tariffa media camera doppia BB per destinazione (prossimi 30 gg) ─
export interface RigaMercato { dest: string; adr: number; deltaAdr: number; occ: number; trend: number[] }
export const MERCATO: RigaMercato[] = [
  { dest: 'Roma',    adr: 186, deltaAdr: 4.2,  occ: 84, trend: [170, 172, 175, 179, 178, 183, 186] },
  { dest: 'Firenze', adr: 172, deltaAdr: 2.8,  occ: 81, trend: [165, 166, 168, 167, 170, 171, 172] },
  { dest: 'Venezia', adr: 214, deltaAdr: -1.6, occ: 77, trend: [222, 220, 219, 217, 215, 213, 214] },
  { dest: 'Napoli',  adr: 128, deltaAdr: 6.1,  occ: 79, trend: [118, 119, 121, 123, 124, 126, 128] },
  { dest: 'Milano',  adr: 198, deltaAdr: -3.4, occ: 72, trend: [208, 207, 205, 203, 201, 199, 198] },
]

export interface Cambio { valuta: string; label: string; valore: number }
export const CAMBI_FALLBACK: Cambio[] = [
  { valuta: 'USD', label: 'Dollaro USA', valore: 1.13 },
  { valuta: 'GBP', label: 'Sterlina',    valore: 0.85 },
  { valuta: 'CHF', label: 'Franco svizzero', valore: 0.95 },
  { valuta: 'JPY', label: 'Yen',         valore: 178.2 },
]

// ── Contratti gestiti con le strutture ────────────────────────────────────────
export interface Contratto { id: string; struttura: string; citta: string; dal: string; al: string; tariffa: string; allotment: number; paese: string }
export const CONTRATTI: Contratto[] = [
  { id: 'c1', struttura: 'Hotel Aurelia Palace',     citta: 'Roma',    dal: '01/11/26', al: '31/03/27', tariffa: '€ 118 – 142', allotment: 20, paese: 'it' },
  { id: 'c2', struttura: 'Residenza Ponte Vecchio',  citta: 'Firenze', dal: '15/10/26', al: '31/12/26', tariffa: '€ 104 – 126', allotment: 12, paese: 'it' },
  { id: 'c3', struttura: 'Ca\' del Doge Boutique',    citta: 'Venezia', dal: '01/12/26', al: '28/02/27', tariffa: '€ 156 – 190', allotment: 8,  paese: 'it' },
  { id: 'c4', struttura: 'Grand Hotel Partenope',    citta: 'Napoli',  dal: '01/10/26', al: '30/04/27', tariffa: '€ 89 – 110',  allotment: 25, paese: 'it' },
  { id: 'c5', struttura: 'Hôtel Rive Gauche',        citta: 'Parigi',  dal: '20/10/26', al: '31/03/27', tariffa: '€ 165 – 205', allotment: 10, paese: 'fr' },
  { id: 'c6', struttura: 'Hotel Sol de Triana',      citta: 'Siviglia', dal: '01/11/26', al: '31/05/27', tariffa: '€ 92 – 118',  allotment: 15, paese: 'es' },
]

// ── Notizie dal mondo del turismo ─────────────────────────────────────────────
export interface Notizia { id: string; tag: string; titolo: string; testo: string; ore: number }
export const NOTIZIE: Notizia[] = [
  { id: 'n1', tag: 'Mercato',      ore: 1, titolo: 'Ponte di Ognissanti: prenotazioni città d\'arte in crescita', testo: 'Le richieste per il weekend lungo di novembre superano lo stesso periodo dello scorso anno, trainate da Roma e Firenze.' },
  { id: 'n2', tag: 'Trasporti',    ore: 3, titolo: 'Orario invernale: nuove rotte da e per il Nord Europa', testo: 'Più frequenze dirette verso Napoli e Venezia da Scandinavia e Paesi Bassi a partire da fine ottobre.' },
  { id: 'n3', tag: 'Normativa',    ore: 5, titolo: 'Tassa di soggiorno: aggiornamenti tariffari per il 2027', testo: 'Diversi comuni hanno deliberato le nuove fasce: da verificare nei preventivi dei gruppi per la prossima primavera.' },
  { id: 'n4', tag: 'Destinazioni', ore: 8, titolo: 'Mercatini di Natale: domanda gruppi già sopra le attese', testo: 'Allotment in esaurimento nelle località alpine per i weekend di dicembre: consigliato bloccare le opzioni.' },
]

// ── Eventi nelle destinazioni (influenzano domanda e tariffe) ─────────────────
export interface Evento { id: string; giorno: number; mese: string; titolo: string; dest: string; impatto: 'alto' | 'medio' }
export const EVENTI: Evento[] = [
  { id: 'e1', giorno: 15, mese: 'Ott', titolo: 'Festival del cinema',          dest: 'Roma',    impatto: 'alto' },
  { id: 'e2', giorno: 22, mese: 'Ott', titolo: 'Fiera internazionale del turismo', dest: 'Milano', impatto: 'alto' },
  { id: 'e3', giorno: 31, mese: 'Ott', titolo: 'Ponte di Ognissanti',          dest: 'Italia',  impatto: 'alto' },
  { id: 'e4', giorno: 8,  mese: 'Nov', titolo: 'Biennale – ultime settimane',  dest: 'Venezia', impatto: 'medio' },
  { id: 'e5', giorno: 21, mese: 'Nov', titolo: 'Salone del gusto',             dest: 'Firenze', impatto: 'medio' },
]
