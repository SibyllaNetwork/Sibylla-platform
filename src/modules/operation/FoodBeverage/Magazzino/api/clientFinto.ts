// ─── Magazzino della Ristorazione: client finto (solo sviluppo) ──────────────
//  § B5.3 della scheda 17: risponde come il § 8 con pochi dati d'esempio in
//  memoria (si azzerano ricaricando la pagina), errori compresi, per provare
//  tutti i rami delle pagine finché Op e Portal non sono pronti. Lo carica
//  magazzinoFbOp solo nella build di sviluppo: mai in produzione.
//
//  Per provare gli altri rami, da console:
//    localStorage.setItem('sibylla.magFbFinto', JSON.stringify({ gestore: false }))   // utente operatore
//    localStorage.setItem('sibylla.magFbFinto', JSON.stringify({ collegata: false })) // azienda non collegata
//    localStorage.setItem('sibylla.magFbFinto', JSON.stringify({ rete: false }))      // 502 dal Portal
//    localStorage.removeItem('sibylla.magFbFinto')

import { MagazzinoFbErrore, NON_RAGGIUNGIBILE } from './magazzinoFbOp'
import type {
  Articolo, ArticoloRichiesta, BollaLetta, CategoriaRicette, Contesto, DatiAzione, Esito, FornitoreBreve, FornitoreRichiesta,
  InventarioDettaglio, InventarioRiga, MovimentoRichiesta, NomeAzione, Punto, RepartoRicetta, Rif, RigaGiacenza, RigaMovimento,
  RigaRegistro, RispostaAzione, StrutturaMag, TipoMovimento, Unita, VoceRicetta,
} from './tipi'

// ─── Opzioni ──────────────────────────────────────────────────────────────────

interface Opzioni { gestore: boolean; collegata: boolean; rete: boolean }
function opzioni(): Opzioni {
  let o: Partial<Opzioni> = {}
  try { o = JSON.parse(localStorage.getItem('sibylla.magFbFinto') || '{}') } catch { o = {} }
  return { gestore: o.gestore !== false, collegata: o.collegata !== false, rete: o.rete !== false }
}

const AUTORE = 'Utente demo'
const r3 = (n: number) => Math.round(n * 1000) / 1000
const r2 = (n: number) => Math.round(n * 100) / 100
const r4 = (n: number) => Math.round(n * 10000) / 10000
const fmtQ = (n: number, u: Unita) => `${n.toLocaleString('it-IT', { minimumFractionDigits: u === 'pz' ? 0 : 3, maximumFractionDigits: 3 })} ${u}`
const adesso = () => new Date().toISOString()
const fa = (giorni: number, ore = 9) => { const d = new Date(); d.setDate(d.getDate() - giorni); d.setHours(ore, 0, 0, 0); return d.toISOString() }
const ok = (id: number | null, avvisi: string[] = []): Esito => ({ success: true, error_message: null, id, duplicato: false, avvisi })
const ko = (msg: string): Esito => ({ success: false, error_message: msg, id: null, duplicato: false, avvisi: [] })

// ─── Dati d'esempio ───────────────────────────────────────────────────────────

interface ArticoloDb extends Omit<Articolo, 'giacenza_totale' | 'sotto_scorta' | 'categoria' | 'fornitori'> {
  fornitori: { id_fornitore: number; codice_fornitore: string | null; prezzo: number | null }[]
}
interface MovimentoDb extends Omit<RigaRegistro, 'righe_count' | 'valore' | 'anteprima'> { righe: RigaMovimento[] }
interface VoceDb { id_voce: number; nome: string; prezzo: number; id_categoria_menu: number; disponibile: boolean }
interface RicettaDb { reparto: RepartoRicetta; ingredienti: { id_articolo: number; quantita: number }[]; aggiornata_il: string; aggiornata_da: string }
interface InventarioDb extends Omit<InventarioRiga, 'articoli' | 'contati' | 'differenze' | 'valore_differenze'> {
  id_struttura: number
  conte: Map<number, { contata: number | null; da: string; il: string }>
  extra: Set<number>
  /** Teoriche congelate alla chiusura: dopo la rettifica le differenze restano quelle registrate. */
  teoriche?: Map<number, number>
}
interface FornitoreDb extends FornitoreRichiesta { id: number }

const db = {
  strutture: [{ id: 1, id_struttura_platform: 9, nome: 'Osteria della Mole' }] as StrutturaMag[],
  punti: [
    { id: 1, id_struttura: 1, nome: 'Magazzino', tipo: 'magazzino', attivo: true },
    { id: 2, id_struttura: 1, nome: 'Cucina', tipo: 'cucina', attivo: true },
    { id: 3, id_struttura: 1, nome: 'Bar', tipo: 'bar', attivo: true },
  ] as Punto[],
  categorie: [
    { id: 1, nome: 'Farine e cereali' }, { id: 2, nome: 'Pasta' }, { id: 3, nome: 'Ortofrutta' }, { id: 4, nome: 'Pesce' },
    { id: 5, nome: 'Oli e condimenti' }, { id: 6, nome: 'Latticini' }, { id: 7, nome: 'Bevande' }, { id: 8, nome: 'Vini' },
    { id: 9, nome: 'Conserve' },
  ] as Rif[],
  fornitori: [
    { id: 1, nome: 'Ingrosso Sud S.r.l.', partita_iva: '01234567890', codice_fiscale: null, indirizzo: 'Via Roma 1', cap: '80100', comune: 'Napoli', provincia: 'NA', telefono: null, email: null, pec: null },
    { id: 2, nome: 'Pescheria Il Molo', partita_iva: '09876543210', codice_fiscale: null, indirizzo: 'Molo Beverello', cap: '80133', comune: 'Napoli', provincia: 'NA', telefono: null, email: null, pec: null },
    { id: 3, nome: 'Cantine Campane S.p.A.', partita_iva: '05554443332', codice_fiscale: null, indirizzo: 'Via del Vino 8', cap: '83100', comune: 'Avellino', provincia: 'AV', telefono: null, email: null, pec: null },
  ] as FornitoreDb[],
  articoli: [] as ArticoloDb[],
  giacenze: new Map<string, number>(),
  movimenti: [] as MovimentoDb[],
  voci: [
    { id_voce: 14, nome: 'Spaghetti alle vongole', prezzo: 16, id_categoria_menu: 2, disponibile: true },
    { id_voce: 15, nome: 'Paccheri al pomodoro', prezzo: 12, id_categoria_menu: 2, disponibile: true },
    { id_voce: 21, nome: 'Frittura di paranza', prezzo: 18, id_categoria_menu: 3, disponibile: true },
    { id_voce: 30, nome: 'Pizza margherita', prezzo: 8, id_categoria_menu: 4, disponibile: true },
    { id_voce: 50, nome: 'Acqua naturale 75 cl', prezzo: 3, id_categoria_menu: 6, disponibile: true },
    { id_voce: 51, nome: 'Calice di Falanghina', prezzo: 6, id_categoria_menu: 6, disponibile: true },
    { id_voce: 60, nome: 'Tiramisù', prezzo: 6, id_categoria_menu: 5, disponibile: true },
  ] as VoceDb[],
  categorieMenu: [
    { id: 2, nome: 'Primi' }, { id: 3, nome: 'Secondi' }, { id: 4, nome: 'Pizze' }, { id: 5, nome: 'Dolci' }, { id: 6, nome: 'Bevande' },
  ] as Rif[],
  ricette: new Map<number, RicettaDb>(),
  inventari: [] as InventarioDb[],
  chiavi: new Map<string, number | null>(),
  prossimo: 1000,
}

const nuovoId = () => ++db.prossimo

function art(id: number, nome: string, cat: number, unita: Unita, scorta: number, costo: number, forn: number, cod: string,
  ean: { ean: string; quantita: number; descrizione: string }[] = []): ArticoloDb {
  return {
    id, codice: `ART-${String(id).padStart(6, '0')}`, nome, id_categoria: cat, unita, codici_a_barre: ean,
    fornitori: [{ id_fornitore: forn, codice_fornitore: cod, prezzo: costo }], scorta_minima: scorta,
    id_punto_predefinito: null, costo_medio: costo, attivo: true, note: null,
  }
}

db.articoli = [
  art(37, 'Farina 00', 1, 'kg', 5, 0.9312, 1, 'FA00-1', [
    { ean: '8001234567890', quantita: 1, descrizione: 'Pacco 1 kg' }, { ean: '8001234567906', quantita: 10, descrizione: 'Cartone 10 pacchi' }]),
  art(52, 'Spaghetti', 2, 'kg', 4, 1.85, 1, 'SPA-500', [{ ean: '8001234500019', quantita: 0.5, descrizione: 'Pacco 500 g' }]),
  art(53, 'Paccheri', 2, 'kg', 3, 2.1, 1, 'PAC-500', [{ ean: '8001234500026', quantita: 0.5, descrizione: 'Pacco 500 g' }]),
  art(61, 'Vongole veraci', 4, 'kg', 2, 11, 2, 'VON-1'),
  art(62, 'Pesce di paranza', 4, 'kg', 2, 9.5, 2, 'PAR-1'),
  art(70, 'Olio extravergine di oliva', 5, 'l', 5, 7.6, 1, 'EVO-5', [{ ean: '8005110000052', quantita: 5, descrizione: 'Latta 5 l' }]),
  art(71, 'Olio di semi di arachide', 5, 'l', 5, 2.4, 1, 'ARA-10'),
  art(72, 'Sale grosso', 5, 'kg', 2, 0.5, 1, 'SAL-1'),
  art(80, 'Pomodori pelati', 9, 'pz', 24, 1.2, 1, 'PEL-400', [{ ean: '8004567000400', quantita: 1, descrizione: 'Latta 400 g' }]),
  art(81, 'Mozzarella fior di latte', 6, 'kg', 3, 7.8, 1, 'MOZ-1'),
  art(82, 'Mascarpone', 6, 'kg', 1, 6.9, 1, 'MAS-500'),
  art(90, 'Basilico', 3, 'kg', 0.2, 18, 1, 'BAS-100'),
  art(91, 'Aglio', 3, 'kg', 0.5, 4.2, 1, 'AGL-1'),
  art(100, 'Acqua naturale 75 cl', 7, 'pz', 48, 0.45, 1, 'ACQ-75', [
    { ean: '8002270000751', quantita: 1, descrizione: 'Bottiglia 75 cl' }, { ean: '8002270000768', quantita: 12, descrizione: 'Cassa da 12' }]),
  art(110, 'Falanghina DOC', 8, 'l', 6, 6.4, 3, 'FAL-075', [{ ean: '8009990000751', quantita: 0.75, descrizione: 'Bottiglia 75 cl' }]),
]

const iniziali: [number, number, number][] = [
  [37, 1, 20], [37, 2, 3.5], [52, 1, 12], [52, 2, 2.4], [53, 1, 6], [53, 2, 1.2], [61, 2, 1.5], [62, 2, 1.1],
  [70, 1, 15], [70, 2, 2.5], [71, 2, 8], [72, 1, 4], [80, 1, 18], [80, 2, 6], [81, 2, 2.2], [82, 2, 0.3],
  [90, 2, 0.15], [91, 2, 0.8], [100, 1, 96], [100, 3, 22], [110, 1, 9], [110, 3, -0.75],
]
for (const [a, p, q] of iniziali) db.giacenze.set(`${a}:${p}`, q)

const setRicetta = (id: number, reparto: RepartoRicetta, ing: [number, number][]) =>
  db.ricette.set(id, { reparto, ingredienti: ing.map(([id_articolo, quantita]) => ({ id_articolo, quantita })), aggiornata_il: fa(2, 17), aggiornata_da: 'Mario Rossi' })
setRicetta(14, 'cucina', [[52, 0.12], [61, 0.25], [70, 0.02], [91, 0.005], [72, 0.01]])
setRicetta(15, 'cucina', [[53, 0.12], [80, 1], [70, 0.015], [90, 0.003]])
setRicetta(21, 'cucina', [[62, 0.3], [71, 0.15], [37, 0.05]])
setRicetta(30, 'cucina', [[37, 0.25], [80, 0.5], [81, 0.12], [70, 0.01], [90, 0.002]])
setRicetta(50, 'bar', [[100, 1]])
setRicetta(51, 'bar', [[110, 0.15]])

// ─── Utilità ──────────────────────────────────────────────────────────────────

const giac = (a: number, p: number) => db.giacenze.get(`${a}:${p}`) ?? 0
const aggiungi = (a: number, p: number, q: number) => db.giacenze.set(`${a}:${p}`, r3(giac(a, p) + q))
const puntiStruttura = (s: number) => db.punti.filter(p => p.id_struttura === s)
const totale = (a: number) => r3(db.punti.reduce((t, p) => t + giac(a, p.id), 0))
const articoloDb = (id: number | null | undefined) => db.articoli.find(a => a.id === id)
const nomeCat = (id: number | null) => db.categorie.find(c => c.id === id)?.nome ?? null
const nomeForn = (id: number) => db.fornitori.find(f => f.id === id)?.nome ?? ''
const rifPunto = (id: number | null | undefined): Rif | null => { const p = db.punti.find(x => x.id === id); return p ? { id: p.id, nome: p.nome } : null }

function articoloOut(a: ArticoloDb): Articolo {
  const t = totale(a.id)
  return {
    ...a, categoria: nomeCat(a.id_categoria), giacenza_totale: t, sotto_scorta: t < a.scorta_minima,
    fornitori: a.fornitori.map(f => ({ ...f, nome: nomeForn(f.id_fornitore) })),
  }
}

function rigaRegistro(m: MovimentoDb): RigaRegistro {
  const { righe, ...resto } = m
  const valore = r2(righe.reduce((t, r) => t + Math.abs(r.quantita) * (r.prezzo_unitario ?? articoloDb(r.id_articolo)?.costo_medio ?? 0), 0))
  // Il trasferimento ha due righe per articolo (uscita e ingresso): nell'anteprima conta l'uscita.
  const visibili = m.tipo === 'trasferimento' ? righe.filter(r => r.quantita < 0) : righe
  const parti = visibili.slice(0, 2).map(r => `${r.nome} ${fmtQ(Math.abs(r.quantita), r.unita)}`)
  const anteprima = parti.join(', ') + (visibili.length > 2 ? ` e altri ${visibili.length - 2}` : '')
  return { ...resto, righe_count: visibili.length, valore: m.tipo === 'trasferimento' ? valore / 2 : valore, anteprima }
}

/** Chiave anti-doppioni: stessa `id_operazione` → stesso esito, nessun doppione. */
function conChiave(chiave: string | undefined, fai: () => Esito): Esito {
  if (chiave && db.chiavi.has(chiave)) return { ...ok(db.chiavi.get(chiave) ?? null), duplicato: true }
  const e = fai()
  if (chiave && e.success) db.chiavi.set(chiave, e.id)
  return e
}

const riservata = () => { throw new MagazzinoFbErrore(403, 'Operazione riservata al responsabile del Food & Beverage.') }
const nonTrovato = (t: string) => { throw new MagazzinoFbErrore(404, t) }

function avvisiScorta(ids: number[]): string[] {
  return Array.from(new Set(ids)).map(articoloDb).filter((a): a is ArticoloDb => !!a && totale(a.id) < a.scorta_minima)
    .map(a => `${a.nome} è sotto la scorta minima.`)
}

// ─── Movimenti ────────────────────────────────────────────────────────────────

function registra(d: MovimentoRichiesta, gestore: boolean, origineForzata?: RigaRegistro['origine']): Esito {
  const tipi: TipoMovimento[] = ['carico', 'scarico', 'trasferimento', 'reso', 'scarto', 'vendita', 'rettifica']
  if (!tipi.includes(d.tipo)) return ko('Tipo di movimento non valido.')
  if (d.tipo === 'rettifica' && !gestore) riservata()
  if (!db.strutture.some(s => s.id === d.id_struttura)) return ko('Struttura non valida.')
  const punti = puntiStruttura(d.id_struttura)
  const punto = d.tipo === 'vendita' ? null : punti.find(p => p.id === d.id_punto)
  if (d.tipo !== 'vendita' && !punto) return ko('Punto di stoccaggio non valido.')
  if (d.tipo === 'trasferimento') {
    if (!punti.some(p => p.id === d.id_punto_destinazione)) return ko('Punto di stoccaggio non valido.')
    if (d.id_punto_destinazione === d.id_punto) return ko('Scegli un punto di destinazione diverso da quello di partenza.')
  }
  if ((d.tipo === 'carico' || d.tipo === 'reso') && !db.fornitori.some(f => f.id === d.id_fornitore)) return ko('Indica il fornitore.')
  if (d.tipo === 'scarto' && !['scaduto', 'deteriorato', 'rotto', 'errore_preparazione', 'altro'].includes(d.motivo ?? '')) return ko('Indica il motivo dello scarto.')
  if (!d.righe?.length) return ko('Aggiungi almeno un articolo.')
  if (d.righe.length > 200) return ko('Al massimo 200 righe per movimento.')
  const quando = d.data ? new Date(d.data) : new Date()
  if (quando.getTime() > Date.now() + 5 * 60_000) return ko('La data non può essere nel futuro.')
  if (quando.getTime() < Date.now() - 7 * 86_400_000) return ko('Si possono registrare movimenti fino a 7 giorni indietro.')

  // Vendita: le voci diventano righe di articoli con le ricette (§ 8.12).
  let righe: { id_articolo: number; quantita: number; prezzo_unitario: number | null; lotto: string | null; scadenza: string | null; id_punto: number }[] = []
  if (d.tipo === 'vendita') {
    for (let i = 0; i < d.righe.length; i++) {
      const r = d.righe[i]
      const voce = db.voci.find(v => v.id_voce === r.id_voce)
      if (!voce) return ko(`Riga ${i + 1}: articolo non valido.`)
      if (!r.porzioni || r.porzioni <= 0) return ko(`Riga ${i + 1}: quantità non valida.`)
      const ric = db.ricette.get(voce.id_voce)
      if (!ric) return ko(`«${voce.nome}» non ha una ricetta: aggiungila per scaricare le vendite.`)
      const p = punti.find(x => x.tipo === ric.reparto && x.attivo)!
      for (const ing of ric.ingredienti) righe.push({ id_articolo: ing.id_articolo, quantita: -r3(ing.quantita * r.porzioni), prezzo_unitario: null, lotto: null, scadenza: null, id_punto: p.id })
    }
  } else {
    const visti = new Set<number>()
    for (let i = 0; i < d.righe.length; i++) {
      const r = d.righe[i]
      const a = articoloDb(r.id_articolo)
      if (!a || !a.attivo) return ko(`Riga ${i + 1}: articolo non valido.`)
      if (visti.has(a.id)) return ko(`«${a.nome}» compare due volte.`)
      visti.add(a.id)
      const q = Number(r.quantita)
      if (!Number.isFinite(q) || r3(q) !== q || (d.tipo === 'rettifica' ? q === 0 : q <= 0)) return ko(`Riga ${i + 1}: quantità non valida.`)
      if (r.prezzo_unitario != null && !(r.prezzo_unitario >= 0)) return ko('Prezzo non valido.')
      if (r.scadenza && Number.isNaN(Date.parse(r.scadenza))) return ko('La data di scadenza non è valida.')
      const segno = d.tipo === 'carico' || d.tipo === 'rettifica' ? 1 : -1
      righe.push({ id_articolo: a.id, quantita: segno * q, prezzo_unitario: d.tipo === 'carico' ? r.prezzo_unitario ?? null : null, lotto: r.lotto ?? null, scadenza: r.scadenza ?? null, id_punto: punto!.id })
      if (d.tipo === 'trasferimento') righe.push({ id_articolo: a.id, quantita: q, prezzo_unitario: null, lotto: null, scadenza: null, id_punto: d.id_punto_destinazione! })
    }
    // Mai sotto zero (tranne vendita): tutto o niente.
    for (const r of righe) {
      if (r.quantita < 0 && giac(r.id_articolo, r.id_punto) + r.quantita < -1e-9) {
        const a = articoloDb(r.id_articolo)!
        return ko(`Giacenza insufficiente: ${a.nome} ne ha ${fmtQ(giac(a.id, r.id_punto), a.unita)} in ${rifPunto(r.id_punto)!.nome}.`)
      }
    }
  }
  if ((d.tipo === 'scarico' || d.tipo === 'rettifica') && !d.motivo?.trim()) return ko('Indica il motivo.')

  // Applica: costo medio sui carichi con prezzo, poi le giacenze.
  for (const r of righe) {
    const a = articoloDb(r.id_articolo)!
    if (d.tipo === 'carico' && r.prezzo_unitario != null) {
      const t = totale(a.id)
      a.costo_medio = t <= 0 || a.costo_medio == null ? r4(r.prezzo_unitario) : r4((t * a.costo_medio + r.quantita * r.prezzo_unitario) / (t + r.quantita))
      const f = a.fornitori.find(x => x.id_fornitore === d.id_fornitore)
      if (f) f.prezzo = r.prezzo_unitario
      else a.fornitori.push({ id_fornitore: d.id_fornitore!, codice_fornitore: null, prezzo: r.prezzo_unitario })
    }
    aggiungi(r.id_articolo, r.id_punto, r.quantita)
  }
  const id = nuovoId()
  db.movimenti.unshift({
    id, tipo: d.tipo, origine: origineForzata ?? d.origine ?? 'manuale', data: quando.toISOString(), registrato_il: adesso(), autore: AUTORE,
    punto: d.tipo === 'vendita' ? null : rifPunto(d.id_punto), punto_destinazione: d.tipo === 'trasferimento' ? rifPunto(d.id_punto_destinazione) : null,
    fornitore: d.id_fornitore && (d.tipo === 'carico' || d.tipo === 'reso') ? { id: d.id_fornitore, nome: nomeForn(d.id_fornitore) } : null,
    documento: d.documento ?? null, motivo: d.motivo ?? null, comanda: null, annulla: null, annullato_da: null,
    righe: righe.map(r => { const a = articoloDb(r.id_articolo)!; return { ...r, nome: a.nome, unita: a.unita, giacenza_dopo: giac(a.id, r.id_punto) } }),
  })
  return ok(id, avvisiScorta(righe.map(r => r.id_articolo)))
}

/** Movimenti d'esempio: un carico da bolla, un trasferimento e qualche scarico dalle comande. */
function seminaMovimenti() {
  const carico = (giorni: number, forn: number, doc: string, righe: [number, number, number][], origine: RigaRegistro['origine']) => {
    const id = nuovoId()
    db.movimenti.push({
      id, tipo: 'carico', origine, data: fa(giorni, 9), registrato_il: fa(giorni, 9), autore: 'Mario Rossi',
      punto: rifPunto(1), punto_destinazione: null, fornitore: { id: forn, nome: nomeForn(forn) }, documento: doc, motivo: null,
      comanda: null, annulla: null, annullato_da: null,
      righe: righe.map(([a, q, p]) => { const x = articoloDb(a)!; return { id_articolo: a, nome: x.nome, unita: x.unita, quantita: q, prezzo_unitario: p, lotto: null, scadenza: null, id_punto: 1, giacenza_dopo: giac(a, 1) } }),
    })
  }
  const comanda = (giorni: number, ore: number, idVoce: number, porzioni: number, tavolo: string, idComanda: number) => {
    const voce = db.voci.find(v => v.id_voce === idVoce)!
    const ric = db.ricette.get(idVoce)!
    const p = db.punti.find(x => x.tipo === ric.reparto)!
    db.movimenti.push({
      id: nuovoId(), tipo: 'vendita', origine: 'comanda', data: fa(giorni, ore), registrato_il: fa(giorni, ore), autore: 'Anna Bianchi',
      punto: null, punto_destinazione: null, fornitore: null, documento: null, motivo: null,
      comanda: { id: idComanda, tavolo, voce: voce.nome, porzioni }, annulla: null, annullato_da: null,
      righe: ric.ingredienti.map(i => { const x = articoloDb(i.id_articolo)!; return { id_articolo: x.id, nome: x.nome, unita: x.unita, quantita: -r3(i.quantita * porzioni), prezzo_unitario: null, lotto: null, scadenza: null, id_punto: p.id, giacenza_dopo: giac(x.id, p.id) } }),
    })
  }
  comanda(0, 13, 14, 2, '12', 551)
  comanda(0, 13, 50, 2, '12', 551)
  comanda(0, 12, 30, 3, '4', 549)
  comanda(1, 20, 21, 1, '7', 540)
  comanda(1, 20, 51, 2, '7', 540)
  db.movimenti.push({
    id: nuovoId(), tipo: 'trasferimento', origine: 'manuale', data: fa(1, 10), registrato_il: fa(1, 10), autore: 'Mario Rossi',
    punto: rifPunto(1), punto_destinazione: rifPunto(2), fornitore: null, documento: null, motivo: null, comanda: null, annulla: null, annullato_da: null,
    righe: [
      { id_articolo: 37, nome: 'Farina 00', unita: 'kg', quantita: -5, prezzo_unitario: null, lotto: null, scadenza: null, id_punto: 1, giacenza_dopo: 20 },
      { id_articolo: 37, nome: 'Farina 00', unita: 'kg', quantita: 5, prezzo_unitario: null, lotto: null, scadenza: null, id_punto: 2, giacenza_dopo: 3.5 },
    ],
  })
  carico(2, 1, 'DDT 1198 del ' + new Date(fa(2)).toLocaleDateString('it-IT'), [[37, 20, 0.95], [52, 10, 1.85], [80, 24, 1.2], [70, 10, 7.6]], 'bolla')
  carico(3, 2, 'DDT 77 del ' + new Date(fa(3)).toLocaleDateString('it-IT'), [[61, 3, 11], [62, 2.5, 9.5]], 'codice_a_barre')
  carico(4, 3, 'DDT 310 del ' + new Date(fa(4)).toLocaleDateString('it-IT'), [[110, 13.5, 6.4]], 'manuale')
  db.inventari.push({
    id: nuovoId(), id_struttura: 1, punto: { id: 3, nome: 'Bar' }, stato: 'chiuso', aperto_il: fa(6, 8), aperto_da: 'Mario Rossi',
    chiuso_il: fa(6, 10), chiuso_da: 'Mario Rossi', id_movimento: null, conte: new Map(), extra: new Set(),
  })
}
seminaMovimenti()

// ─── Ricette ──────────────────────────────────────────────────────────────────

function costoRicetta(id: number) {
  const r = db.ricette.get(id)
  if (!r) return null
  return r2(r.ingredienti.reduce((t, i) => t + i.quantita * (articoloDb(i.id_articolo)?.costo_medio ?? 0), 0))
}

function voceOut(v: VoceDb): VoceRicetta {
  const r = db.ricette.get(v.id_voce)
  const costo = costoRicetta(v.id_voce)
  const p = r ? db.punti.find(x => x.tipo === r.reparto && x.attivo) : null
  return {
    id_voce: v.id_voce, nome: v.nome, prezzo: v.prezzo, disponibile: v.disponibile, ricetta: !!r, reparto: r?.reparto ?? null,
    ingredienti: r?.ingredienti.length ?? 0, costo_porzione: costo,
    food_cost: costo != null && v.prezzo > 0 ? Math.round((costo / v.prezzo) * 1000) / 10 : null,
    articoli_mancanti: r && p ? r.ingredienti.filter(i => giac(i.id_articolo, p.id) <= 0).length : 0,
  }
}

// ─── Inventario ───────────────────────────────────────────────────────────────

function righeInventario(inv: InventarioDb) {
  const ids = new Set<number>(Array.from(inv.extra).concat(Array.from(inv.conte.keys())))
  if (inv.stato === 'aperto') for (const a of db.articoli) if (a.attivo && giac(a.id, inv.punto.id) !== 0) ids.add(a.id)
  return Array.from(ids).map(id => {
    const a = articoloDb(id)!
    const teorica = inv.teoriche?.get(id) ?? giac(id, inv.punto.id)
    const c = inv.conte.get(id)
    const contata = c?.contata ?? null
    const diff = contata == null ? null : r3(contata - teorica)
    return {
      id_articolo: id, nome: a.nome, categoria: nomeCat(a.id_categoria), unita: a.unita, teorica, contata, differenza: diff,
      valore_differenza: diff == null ? null : r2(diff * (a.costo_medio ?? 0)), contata_da: c?.da ?? null, contata_il: c?.il ?? null,
    }
  }).sort((x, y) => x.nome.localeCompare(y.nome))
}

function inventarioOut(inv: InventarioDb): InventarioRiga {
  const { conte: _c, extra: _e, id_struttura: _s, teoriche: _t, ...resto } = inv
  const righe = righeInventario(inv)
  const diffs = righe.filter(r => r.differenza != null && r.differenza !== 0)
  return { ...resto, articoli: righe.length, contati: righe.filter(r => r.contata != null).length, differenze: diffs.length, valore_differenze: r2(diffs.reduce((t, r) => t + (r.valore_differenza ?? 0), 0)) }
}

// ─── Bolla d'esempio ──────────────────────────────────────────────────────────

function bollaEsempio(): BollaLetta {
  const oggi = new Date()
  const iso = oggi.toISOString().slice(0, 10)
  return {
    leggibile: true,
    fornitore: { nome: 'Ortofrutta Vesuviana S.r.l.', partita_iva: '07778889990', codice_fiscale: null, indirizzo: 'Via Nazionale 120', cap: '80040', comune: 'San Sebastiano al Vesuvio', provincia: 'NA', telefono: '081 1234567', email: null, pec: null, id_fornitore: null },
    numero: '4471', data: iso, documento: `DDT 4471 del ${oggi.toLocaleDateString('it-IT')}`,
    righe: [
      { codice: 'FA00-1', ean: '8001234567906', descrizione: 'FARINA 00 KG 1 X 10', quantita_letta: 2, unita_letta: 'CT', lotto: 'L2311', scadenza: '2027-05-31', prezzo_letto: 9.5, id_articolo: 37, quantita: 20, prezzo_unitario: 0.95, proposta: null },
      { codice: 'PEL-400', ean: null, descrizione: 'POMODORI PELATI 400G', quantita_letta: 24, unita_letta: 'PZ', lotto: null, scadenza: '2028-12-31', prezzo_letto: 1.15, id_articolo: 80, quantita: 24, prezzo_unitario: 1.15, proposta: null },
      { codice: null, ean: null, descrizione: 'POMODORINI DATTERINI CASSETTA 3KG', quantita_letta: 2, unita_letta: 'CS', lotto: null, scadenza: null, prezzo_letto: 10.5, id_articolo: null, quantita: null, prezzo_unitario: null, proposta: { nome: 'Pomodorini datterini', unita: 'kg', quantita: 6, categoria: 'Ortofrutta', id_categoria: 3 } },
      { codice: null, ean: null, descrizione: 'ACETO BALSAMICO MODENA LT 1', quantita_letta: 3, unita_letta: 'PZ', lotto: null, scadenza: null, prezzo_letto: 6.2, id_articolo: null, quantita: null, prezzo_unitario: null, proposta: { nome: 'Aceto balsamico di Modena', unita: 'l', quantita: 3, categoria: 'Aceti', id_categoria: null } },
    ],
    avvisi: ['La seconda pagina è leggermente sfocata: controlla le quantità.'],
  }
}

// ─── Fotografa col telefono (§ 8.13): le foto "arrivano" da sole dopo qualche secondo ──

const passaggi = new Map<string, { scade: number; aperto: number; stato: 'attesa' | 'ritirata' }>()

/** Una "foto" di bolla disegnata al volo (solo per il client finto). */
function fotoFinta(): string {
  const c = document.createElement('canvas')
  c.width = 600; c.height = 840
  const g = c.getContext('2d')!
  g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#1e293b'; g.font = 'bold 26px sans-serif'; g.fillText('DOCUMENTO DI TRASPORTO', 40, 70)
  g.font = '18px sans-serif'; g.fillText('Ortofrutta Vesuviana S.r.l. · DDT 4471', 40, 110)
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#e2e8f0' : '#cbd5e1'; g.fillRect(40, 160 + i * 44, 520, 30) }
  return c.toDataURL('image/jpeg', 0.8).replace(/^data:[^,]*,/, '')
}

// ─── Azioni ───────────────────────────────────────────────────────────────────

type Gestori = { [A in NomeAzione]: (d: DatiAzione<A>, gestore: boolean) => RispostaAzione<A> }

const azioni: Gestori = {
  contesto: (_d, gestore): Contesto => ({
    strutture: db.strutture, punti: db.punti, categorie: [...db.categorie].sort((a, b) => a.nome.localeCompare(b.nome)),
    fornitori: db.fornitori.map((f): FornitoreBreve => ({ id: f.id, nome: f.nome, partita_iva: f.partita_iva })).sort((a, b) => a.nome.localeCompare(b.nome)),
    unita: [{ key: 'kg', nome: 'Chilogrammi' }, { key: 'l', nome: 'Litri' }, { key: 'pz', nome: 'Pezzi' }],
    motivi_scarto: [
      { key: 'scaduto', nome: 'Scaduto' }, { key: 'deteriorato', nome: 'Deteriorato' }, { key: 'rotto', nome: 'Rotto o versato' },
      { key: 'errore_preparazione', nome: 'Errore di preparazione' }, { key: 'altro', nome: 'Altro' },
    ],
    bolla_attiva: true,
    permessi: { gestore },
  }),

  giacenze: d => {
    if (!db.strutture.some(s => s.id === d.id_struttura)) nonTrovato('Struttura non trovata.')
    const punti = puntiStruttura(d.id_struttura).filter(p => !d.id_punto || p.id === d.id_punto)
    const cerca = d.cerca?.trim().toLowerCase()
    const righe: RigaGiacenza[] = db.articoli
      .filter(a => (d.inattivi || a.attivo) && (!d.id_categoria || a.id_categoria === d.id_categoria))
      .filter(a => !cerca || a.nome.toLowerCase().includes(cerca) || a.codice.toLowerCase().includes(cerca) || a.codici_a_barre.some(c => c.ean.includes(cerca)))
      .map(a => {
        const per_punto = punti.map(p => ({ id_punto: p.id, quantita: giac(a.id, p.id) })).filter(x => x.quantita !== 0)
        const tot = r3(per_punto.reduce((t, x) => t + x.quantita, 0))
        const ultimo = db.movimenti.find(m => m.righe.some(r => r.id_articolo === a.id))?.data ?? null
        return {
          id_articolo: a.id, nome: a.nome, categoria: nomeCat(a.id_categoria), unita: a.unita, per_punto, totale: tot,
          scorta_minima: a.scorta_minima, sotto_scorta: tot < a.scorta_minima, negativa: per_punto.some(x => x.quantita < 0),
          costo_medio: a.costo_medio, valore: r2(tot * (a.costo_medio ?? 0)), ultimo_movimento: ultimo,
        }
      })
      .filter(r => !d.solo_sotto_scorta || r.sotto_scorta)
      .sort((x, y) => x.nome.localeCompare(y.nome))
    return { aggiornato_il: adesso(), righe, valore_totale: r2(righe.reduce((t, r) => t + r.valore, 0)) }
  },

  articoli: d => {
    const cerca = d.cerca?.trim().toLowerCase()
    const tutte = db.articoli
      .filter(a => (d.inattivi ? !a.attivo : a.attivo) && (!d.id_categoria || a.id_categoria === d.id_categoria))
      .filter(a => !cerca || a.nome.toLowerCase().includes(cerca) || a.codice.toLowerCase().includes(cerca) || a.codici_a_barre.some(c => c.ean.includes(cerca)))
      .sort((x, y) => x.nome.localeCompare(y.nome))
    const per = Math.min(d.per_pagina ?? 50, 200)
    const pag = Math.max(d.pagina ?? 1, 1)
    return { totale: tutte.length, righe: tutte.slice((pag - 1) * per, pag * per).map(articoloOut) }
  },

  articolo: d => {
    const a = articoloDb(d.id) ?? nonTrovato('Articolo non trovato.')!
    const punti = puntiStruttura(d.id_struttura)
    return {
      ...articoloOut(a),
      giacenze: punti.map(p => ({ id_punto: p.id, quantita: giac(a.id, p.id) })),
      ultimi_movimenti: db.movimenti.filter(m => m.righe.some(r => r.id_articolo === a.id)).slice(0, 20).map(rigaRegistro),
      usato_in_ricette: db.voci.filter(v => db.ricette.get(v.id_voce)?.ingredienti.some(i => i.id_articolo === a.id)).map(v => ({ id: v.id_voce, nome: v.nome })),
    }
  },

  cerca_codice: d => {
    const c = d.codice.trim()
    for (const a of db.articoli) {
      if (a.codice.toLowerCase() === c.toLowerCase()) return { trovato: true, articolo: articoloOut(a), quantita: 1, descrizione: null }
      const b = a.codici_a_barre.find(x => x.ean === c)
      if (b) return { trovato: true, articolo: articoloOut(a), quantita: b.quantita, descrizione: b.descrizione }
    }
    return { trovato: false, articolo: null, quantita: 1, descrizione: null }
  },

  salva_articolo: (d: ArticoloRichiesta, gestore) => {
    if (d.id != null && !gestore) riservata()
    return conChiave(d.id == null ? d.id_operazione : undefined, () => {
      const nome = d.nome?.trim()
      if (!nome) return ko("Indica il nome dell'articolo.")
      if (nome.length > 120) return ko('Il nome può avere al massimo 120 caratteri.')
      if (db.articoli.some(a => a.id !== d.id && a.nome.toLowerCase() === nome.toLowerCase())) return ko(`Esiste già un articolo «${nome}».`)
      if (!['kg', 'l', 'pz'].includes(d.unita)) return ko('Unità di misura non valida.')
      for (const c of d.codici_a_barre) {
        if (!/^\d{8,14}$/.test(c.ean)) return ko('Codice a barre non valido.')
        if (!(c.quantita > 0)) return ko('Quantità del codice a barre non valida.')
        const altro = db.articoli.find(a => a.id !== d.id && a.codici_a_barre.some(x => x.ean === c.ean))
        if (altro) return ko(`Il codice a barre ${c.ean} è già di «${altro.nome}».`)
      }
      if (d.id_categoria != null && !db.categorie.some(c => c.id === d.id_categoria)) return ko('Categoria non valida.')
      if (d.fornitori.some(f => !db.fornitori.some(x => x.id === f.id_fornitore))) return ko('Fornitore non valido.')
      if (!(d.scorta_minima >= 0)) return ko('Scorta minima non valida.')
      if (d.id != null) {
        const a = articoloDb(d.id)
        if (!a) return ko('Articolo non trovato.')
        if (a.unita !== d.unita && db.movimenti.some(m => m.righe.some(r => r.id_articolo === a.id))) return ko("L'articolo ha già dei movimenti: l'unità di misura non si può cambiare.")
        Object.assign(a, {
          nome, id_categoria: d.id_categoria, unita: d.unita, codici_a_barre: d.codici_a_barre, scorta_minima: d.scorta_minima,
          id_punto_predefinito: d.id_punto_predefinito, attivo: d.attivo, note: d.note,
          fornitori: d.fornitori.map(f => ({ ...f, prezzo: a.fornitori.find(x => x.id_fornitore === f.id_fornitore)?.prezzo ?? null })),
        })
        return ok(a.id)
      }
      const id = nuovoId()
      db.articoli.push({
        id, codice: `ART-${String(id).padStart(6, '0')}`, nome, id_categoria: d.id_categoria, unita: d.unita, codici_a_barre: d.codici_a_barre,
        fornitori: d.fornitori.map(f => ({ ...f, prezzo: null })), scorta_minima: d.scorta_minima, id_punto_predefinito: d.id_punto_predefinito,
        costo_medio: null, attivo: d.attivo, note: d.note,
      })
      return ok(id)
    })
  },

  elimina_articolo: (d, gestore) => {
    if (!gestore) riservata()
    const a = articoloDb(d.id)
    if (!a) return ko('Articolo non trovato.')
    if (db.movimenti.some(m => m.righe.some(r => r.id_articolo === a.id))) return ko(`«${a.nome}» ha dei movimenti: non si può eliminare, ma puoi disattivarlo.`)
    const n = Array.from(db.ricette.values()).filter(r => r.ingredienti.some(i => i.id_articolo === a.id)).length
    if (n) return ko(`«${a.nome}» è in ${n} ricett${n === 1 ? 'a' : 'e'}: toglilo prima dalle ricette.`)
    db.articoli = db.articoli.filter(x => x.id !== a.id)
    return ok(a.id)
  },

  salva_categoria: (d, gestore) => {
    if (!gestore) riservata()
    return conChiave(d.id == null ? d.id_operazione : undefined, () => {
      const nome = d.nome?.trim()
      if (!nome) return ko('Indica il nome della categoria.')
      if (db.categorie.some(c => c.id !== d.id && c.nome.toLowerCase() === nome.toLowerCase())) return ko(`Esiste già la categoria «${nome}».`)
      if (d.id != null) { const c = db.categorie.find(x => x.id === d.id); if (c) c.nome = nome; return ok(d.id) }
      const id = nuovoId()
      db.categorie.push({ id, nome })
      return ok(id)
    })
  },

  elimina_categoria: (d, gestore) => {
    if (!gestore) riservata()
    const n = db.articoli.filter(a => a.id_categoria === d.id).length
    if (n) return ko(`La categoria ha ${n} articol${n === 1 ? 'o' : 'i'}: spostali prima di eliminarla.`)
    db.categorie = db.categorie.filter(c => c.id !== d.id)
    return ok(d.id)
  },

  salva_punto: (d, gestore) => {
    if (!gestore) riservata()
    return conChiave(d.id == null ? d.id_operazione : undefined, () => {
      const nome = d.nome?.trim()
      if (!nome) return ko('Indica il nome del punto.')
      if (!['magazzino', 'cucina', 'bar'].includes(d.tipo)) return ko('Tipo non valido.')
      if (db.punti.some(p => p.id !== d.id && p.id_struttura === d.id_struttura && p.nome.toLowerCase() === nome.toLowerCase())) return ko(`Esiste già un punto «${nome}» in questa struttura.`)
      if (d.id != null) {
        const p = db.punti.find(x => x.id === d.id)
        if (!p) return ko('Punto di stoccaggio non valido.')
        if (!d.attivo && p.attivo) {
          if (db.articoli.some(a => giac(a.id, p.id) !== 0)) return ko('Il punto ha ancora merce: trasferiscila prima di eliminarlo o disattivarlo.')
          if (p.tipo === 'cucina' && !db.punti.some(x => x.id !== p.id && x.id_struttura === p.id_struttura && x.tipo === 'cucina' && x.attivo)) return ko('Serve almeno un punto attivo di tipo cucina per scaricare le ricette.')
        }
        Object.assign(p, { nome, tipo: d.tipo, attivo: d.attivo })
        return ok(p.id)
      }
      const id = nuovoId()
      db.punti.push({ id, id_struttura: d.id_struttura, nome, tipo: d.tipo, attivo: d.attivo })
      return ok(id)
    })
  },

  elimina_punto: (d, gestore) => {
    if (!gestore) riservata()
    const p = db.punti.find(x => x.id === d.id)
    if (!p) return ko('Punto di stoccaggio non valido.')
    if (db.articoli.some(a => giac(a.id, p.id) !== 0)) return ko('Il punto ha ancora merce: trasferiscila prima di eliminarlo o disattivarlo.')
    if (db.movimenti.some(m => m.righe.some(r => r.id_punto === p.id))) return ko('Il punto ha dei movimenti: non si può eliminare, ma puoi disattivarlo.')
    db.punti = db.punti.filter(x => x.id !== p.id)
    return ok(p.id)
  },

  salva_fornitore: (d, gestore) => {
    if (d.id != null && !gestore) riservata()
    return conChiave(d.id == null ? d.id_operazione : undefined, () => {
      const nome = d.nome?.trim()
      if (!nome) return ko('Indica il nome del fornitore.')
      if (d.partita_iva && !/^\d{11}$/.test(d.partita_iva)) return ko('Partita IVA non valida.')
      if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return ko('Email non valida.')
      if (d.id != null) { const f = db.fornitori.find(x => x.id === d.id); if (f) Object.assign(f, { ...d, nome }); return ok(d.id) }
      const base = (s: string) => s.toLowerCase().replace(/\b(s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?)\b/g, '').replace(/[^a-z0-9]/g, '')
      const esistente = db.fornitori.find(f => (d.partita_iva && f.partita_iva === d.partita_iva) || base(f.nome) === base(nome))
      if (esistente) return ok(esistente.id)
      const id = nuovoId()
      db.fornitori.push({ ...d, id, nome })
      return ok(id)
    })
  },

  registra: (d, gestore) => conChiave(d.id_operazione, () => registra(d, gestore)),

  movimenti: d => {
    const dal = new Date(`${d.dal}T00:00:00`).getTime()
    const al = new Date(`${d.al}T23:59:59`).getTime()
    if (!(al >= dal) || al - dal > 366 * 86_400_000) throw new MagazzinoFbErrore(400, "L'intervallo può essere al massimo di 366 giorni.")
    const tipi = d.tipo == null ? null : Array.isArray(d.tipo) ? d.tipo : [d.tipo]
    const tutte = db.movimenti
      .filter(m => { const t = new Date(m.data).getTime(); return t >= dal && t <= al })
      .filter(m => !tipi || tipi.includes(m.tipo))
      .filter(m => !d.id_articolo || m.righe.some(r => r.id_articolo === d.id_articolo))
      .filter(m => !d.id_punto || m.righe.some(r => r.id_punto === d.id_punto))
      .filter(m => !d.origine || m.origine === d.origine)
      .filter(m => d.automatici !== false || m.origine !== 'comanda')
      .sort((a, b) => b.data.localeCompare(a.data))
    const per = Math.min(d.per_pagina ?? 50, 200)
    const pag = Math.max(d.pagina ?? 1, 1)
    return { totale: tutte.length, righe: tutte.slice((pag - 1) * per, pag * per).map(rigaRegistro) }
  },

  movimento: d => {
    const m = db.movimenti.find(x => x.id === d.id) ?? nonTrovato('Movimento non trovato.')!
    return { ...rigaRegistro(m), righe: m.righe }
  },

  annulla_movimento: (d, gestore) => {
    if (!gestore) riservata()
    return conChiave(d.id_operazione, () => {
      if (!d.motivo?.trim()) return ko("Indica il motivo dell'annullamento.")
      const m = db.movimenti.find(x => x.id === d.id)
      if (!m) return ko('Movimento non trovato.')
      if (m.annullato_da) return ko('Il movimento è già stato annullato.')
      if (m.annulla) return ko('Uno storno non si annulla: registra un nuovo movimento.')
      if (m.origine === 'comanda') return ko('Gli scarichi delle comande si correggono con una rettifica.')
      for (const r of m.righe) {
        if (-r.quantita < 0 && giac(r.id_articolo, r.id_punto) - r.quantita < -1e-9) return ko(`Annullarlo porterebbe ${r.nome} sotto zero in ${rifPunto(r.id_punto)?.nome}.`)
      }
      for (const r of m.righe) aggiungi(r.id_articolo, r.id_punto, -r.quantita)
      const id = nuovoId()
      db.movimenti.unshift({
        ...m, id, data: adesso(), registrato_il: adesso(), autore: AUTORE, motivo: d.motivo, annulla: m.id, annullato_da: null,
        righe: m.righe.map(r => ({ ...r, quantita: -r.quantita, giacenza_dopo: giac(r.id_articolo, r.id_punto) })),
      })
      m.annullato_da = id
      return ok(id)
    })
  },

  leggi_bolla: d => {
    if (!d.file?.length) throw new MagazzinoFbErrore(400, 'File non valido: servono immagini JPEG o PNG, oppure un PDF.')
    if (d.file.length > 3) throw new MagazzinoFbErrore(400, 'Al massimo 3 pagine per bolla.')
    if (d.file.some(f => f.dati.length * 0.75 > 5 * 1024 * 1024)) throw new MagazzinoFbErrore(400, 'File troppo pesante (massimo 5 MB).')
    return bollaEsempio()
  },

  bolla_telefono_apri: () => {
    const codice = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
    const scade = Date.now() + 15 * 60_000
    passaggi.set(codice, { scade, aperto: Date.now(), stato: 'attesa' })
    return { codice, url: `https://api.sibyllaop.it/bolla-telefono/${codice}`, scade_il: new Date(scade).toISOString() }
  },

  bolla_telefono_stato: d => {
    const p = passaggi.get(d.codice) ?? nonTrovato('Passaggio non trovato.')!
    const scade_il = new Date(p.scade).toISOString()
    if (p.stato === 'ritirata') return { stato: 'ritirata', scade_il, file: [] }
    if (Date.now() > p.scade) return { stato: 'scaduta', scade_il, file: [] }
    if (Date.now() - p.aperto < 7000) return { stato: 'attesa', scade_il, file: [] }
    p.stato = 'ritirata'
    return { stato: 'inviata', scade_il, file: [{ tipo: 'image/jpeg', dati: fotoFinta() }] }
  },

  ricette: d => {
    const cerca = d.cerca?.trim().toLowerCase()
    return db.categorieMenu
      .filter(c => !d.id_categoria_menu || c.id === d.id_categoria_menu)
      .map((c): CategoriaRicette => ({
        id_categoria_menu: c.id, categoria_menu: c.nome,
        voci: db.voci.filter(v => v.id_categoria_menu === c.id)
          .filter(v => !cerca || v.nome.toLowerCase().includes(cerca))
          .filter(v => !d.senza_ricetta || !db.ricette.has(v.id_voce))
          .map(voceOut),
      }))
      .filter(c => c.voci.length > 0)
  },

  ricetta: d => {
    const v = db.voci.find(x => x.id_voce === d.id_voce) ?? nonTrovato('Voce del menu non trovata.')!
    const r = db.ricette.get(v.id_voce)
    const out = voceOut(v)
    return {
      id_voce: v.id_voce, nome: v.nome, prezzo: v.prezzo, reparto: r?.reparto ?? null,
      ingredienti: (r?.ingredienti ?? []).map(i => { const a = articoloDb(i.id_articolo)!; return { id_articolo: a.id, nome: a.nome, unita: a.unita, quantita: i.quantita, costo: a.costo_medio == null ? null : r2(a.costo_medio * i.quantita) } }),
      costo_porzione: out.costo_porzione, food_cost: out.food_cost, aggiornata_il: r?.aggiornata_il ?? null, aggiornata_da: r?.aggiornata_da ?? null,
    }
  },

  salva_ricetta: (d, gestore) => {
    if (!gestore) riservata()
    if (!db.voci.some(v => v.id_voce === d.id_voce)) return ko('Voce del menu non trovata.')
    if (d.reparto !== 'cucina' && d.reparto !== 'bar') return ko('Reparto non valido: cucina o bar.')
    if (!d.ingredienti?.length) return ko('Aggiungi almeno un ingrediente.')
    if (d.ingredienti.length > 50) return ko('Al massimo 50 ingredienti.')
    const visti = new Set<number>()
    for (let i = 0; i < d.ingredienti.length; i++) {
      const x = d.ingredienti[i]
      const a = articoloDb(x.id_articolo)
      if (!a || !a.attivo) return ko(`Riga ${i + 1}: articolo non valido o disattivato.`)
      if (!(x.quantita > 0) || r3(x.quantita) !== x.quantita) return ko(`Riga ${i + 1}: quantità non valida.`)
      if (visti.has(a.id)) return ko(`«${a.nome}» compare due volte.`)
      visti.add(a.id)
    }
    db.ricette.set(d.id_voce, { reparto: d.reparto, ingredienti: d.ingredienti, aggiornata_il: adesso(), aggiornata_da: AUTORE })
    return ok(d.id_voce)
  },

  elimina_ricetta: (d, gestore) => {
    if (!gestore) riservata()
    if (!db.voci.some(v => v.id_voce === d.id_voce)) return ko('Voce del menu non trovata.')
    db.ricette.delete(d.id_voce)
    return ok(d.id_voce)
  },

  inventari: d => db.inventari
    .filter(i => i.id_struttura === d.id_struttura && (!d.stato || i.stato === d.stato))
    .sort((a, b) => b.aperto_il.localeCompare(a.aperto_il))
    .map(inventarioOut),

  inventario: d => {
    const inv = db.inventari.find(x => x.id === d.id) ?? nonTrovato('Inventario non trovato.')!
    return { ...inventarioOut(inv), righe: righeInventario(inv) } as InventarioDettaglio
  },

  inventario_apri: (d, gestore) => {
    if (!gestore) riservata()
    return conChiave(d.id_operazione, () => {
      const p = db.punti.find(x => x.id === d.id_punto && x.id_struttura === d.id_struttura)
      if (!p) return ko('Punto di stoccaggio non valido.')
      if (db.inventari.some(i => i.punto.id === p.id && i.stato === 'aperto')) return ko(`C'è già un inventario aperto per ${p.nome}.`)
      const id = nuovoId()
      db.inventari.push({ id, id_struttura: d.id_struttura, punto: { id: p.id, nome: p.nome }, stato: 'aperto', aperto_il: adesso(), aperto_da: AUTORE, chiuso_il: null, chiuso_da: null, id_movimento: null, conte: new Map(), extra: new Set() })
      return ok(id)
    })
  },

  inventario_conta: d => {
    const inv = db.inventari.find(x => x.id === d.id)
    if (!inv) return ko('Inventario non trovato.')
    if (inv.stato !== 'aperto') return ko("L'inventario è chiuso.")
    for (let i = 0; i < d.righe.length; i++) {
      const r = d.righe[i]
      if (r.contata != null && (!(r.contata >= 0) || r3(r.contata) !== r.contata)) return ko(`Riga ${i + 1}: quantità non valida (zero o più).`)
      if (!articoloDb(r.id_articolo)) return ko(`Riga ${i + 1}: articolo non valido.`)
    }
    for (const r of d.righe) {
      inv.extra.add(r.id_articolo)
      if (r.contata == null) inv.conte.delete(r.id_articolo)
      else inv.conte.set(r.id_articolo, { contata: r.contata, da: AUTORE, il: adesso() })
    }
    return ok(inv.id)
  },

  inventario_chiudi: (d, gestore) => {
    if (!gestore) riservata()
    const inv = db.inventari.find(x => x.id === d.id)
    if (!inv) return ko('Inventario non trovato.')
    if (inv.stato !== 'aperto') return ko("L'inventario è già chiuso.")
    if (inv.conte.size === 0) return ko('Nessun articolo contato.')
    const righe = righeInventario(inv)
    if (d.non_contati === 'azzera') for (const r of righe) if (r.contata == null) inv.conte.set(r.id_articolo, { contata: 0, da: AUTORE, il: adesso() })
    const finali = righeInventario(inv)
    inv.teoriche = new Map(finali.map(r => [r.id_articolo, r.teorica]))
    const diffs = finali.filter(r => r.differenza)
    let idMov: number | null = null
    if (diffs.length) {
      for (const r of diffs) aggiungi(r.id_articolo, inv.punto.id, r.differenza!)
      idMov = nuovoId()
      db.movimenti.unshift({
        id: idMov, tipo: 'rettifica', origine: 'inventario', data: adesso(), registrato_il: adesso(), autore: AUTORE,
        punto: inv.punto, punto_destinazione: null, fornitore: null, documento: `Inventario ${inv.punto.nome}`, motivo: 'Inventario',
        comanda: null, annulla: null, annullato_da: null,
        righe: diffs.map(r => ({ id_articolo: r.id_articolo, nome: r.nome, unita: r.unita, quantita: r.differenza!, prezzo_unitario: null, lotto: null, scadenza: null, id_punto: inv.punto.id, giacenza_dopo: giac(r.id_articolo, inv.punto.id) })),
      })
    }
    Object.assign(inv, { stato: 'chiuso', chiuso_il: adesso(), chiuso_da: AUTORE, id_movimento: idMov })
    return ok(idMov)
  },

  inventario_annulla: (d, gestore) => {
    if (!gestore) riservata()
    const inv = db.inventari.find(x => x.id === d.id)
    if (!inv) return ko('Inventario non trovato.')
    if (inv.stato !== 'aperto') return ko("L'inventario è già chiuso.")
    inv.stato = 'annullato'
    return ok(inv.id)
  },
}

const attesa = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function eseguiFinto<A extends NomeAzione>(azione: A, dati: DatiAzione<A>): Promise<RispostaAzione<A> | null> {
  const o = opzioni()
  await attesa(azione === 'leggi_bolla' ? 2200 : 180)
  if (!o.rete) throw new MagazzinoFbErrore(502, NON_RAGGIUNGIBILE)
  if (!o.collegata) return null
  const fn = azioni[azione] as (d: DatiAzione<A>, g: boolean) => RispostaAzione<A>
  if (!fn) throw new MagazzinoFbErrore(400, 'Azione non valida.')
  // Copia profonda: la pagina non deve poter toccare i dati "di Op".
  return JSON.parse(JSON.stringify(fn(dati, o.gestore))) as RispostaAzione<A>
}
