// ─── PROFILE ANALYSIS · MODELLO DATI ────────────────────────────────────────────
//  Il singolo dipendente letto come in una scheda BI: carriera e retribuzione,
//  dove va il suo tempo, competenze contro la media del reparto, formazione
//  obbligatoria e premio di risultato.
//
//  Il personale è quello condiviso delle pagine HR (`DIPENDENTI_HR`); i numeri
//  storici sono generati in modo deterministico per dipendente e anno (stesso
//  dipendente → stessi numeri a ogni apertura). Le assenze dell'anno prendono le
//  richieste APPROVATE di "Gestione ferie e permessi" dove ci sono, e il premio
//  quello di "Assegna obiettivo" se al dipendente è assegnato un obiettivo
//  individuale: le pagine HR non possono raccontare due storie diverse.

import {
  DIPENDENTI_HR, ORE_GIORNO, giorniLavorativi, oreRichiesta,
  type DipendenteHr, type Reparto, type RichiestaAssenza,
} from '../../../store/useHrGestioneStore'
import {
  premioSbloccato, premioTotale, avanzamentoPct, tuttiSotto, type Obiettivo,
} from '../../../store/useObiettiviStore'

export const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

/** Livelli del CCNL Turismo, dal più basso: l'indice+1 è la "quota" sull'asse. */
export const LIVELLI = ['7° livello', '6° livello', '5° livello', '4° livello', '3° livello', '2° livello', '1° livello', 'Quadro']
export const livelloBreve = (n: number) => (n >= 8 ? 'Q' : `${8 - n}°`)
/** RAL di riferimento a tempo pieno per livello (migliaia di €). */
const RAL_LIVELLO = [19.6, 21.0, 22.6, 24.6, 27.2, 31.0, 37.0, 46.0]

const ORE_MESE = 173

interface ProfiloReparto {
  ruoli: [string, string, string]
  competenze: string[]
  corsi: { nome: string; anni: number }[]
  livMax: number
}

const COMUNI = [
  { nome: 'Sicurezza generale', anni: 5 },
  { nome: 'Antincendio', anni: 5 },
  { nome: 'Primo soccorso', anni: 3 },
  { nome: 'Privacy e GDPR', anni: 2 },
]

const REPARTI: Record<Reparto, ProfiloReparto> = {
  'Front office': {
    ruoli: ['Addetto ricevimento', 'Capo ricevimento', 'Front office manager'],
    competenze: ['Accoglienza', 'Lingue straniere', 'Upselling', 'Problem solving', 'Uso del PMS', 'Lavoro in squadra'],
    corsi: [...COMUNI, { nome: 'Antiriciclaggio e pagamenti', anni: 3 }],
    livMax: 7,
  },
  'F&B': {
    ruoli: ['Cameriere di sala', 'Chef de rang', 'Maître'],
    competenze: ['Servizio al tavolo', 'Conoscenza vini', 'Upselling', 'Velocità', 'Cura del cliente', 'Lavoro in squadra'],
    corsi: [...COMUNI, { nome: 'HACCP', anni: 2 }],
    livMax: 6,
  },
  Cucina: {
    ruoli: ['Commis di cucina', 'Chef de partie', 'Sous chef'],
    competenze: ['Tecnica', 'Igiene e HACCP', 'Velocità', 'Food cost', 'Creatività', 'Lavoro in squadra'],
    corsi: [...COMUNI, { nome: 'HACCP', anni: 2 }, { nome: 'Allergeni', anni: 3 }],
    livMax: 7,
  },
  Housekeeping: {
    ruoli: ['Cameriera ai piani', 'Governante di piano', 'Governante generale'],
    competenze: ['Standard di pulizia', 'Velocità', 'Cura dei dettagli', 'Uso dei prodotti', 'Puntualità', 'Lavoro in squadra'],
    corsi: [...COMUNI, { nome: 'Rischio chimico', anni: 3 }],
    livMax: 6,
  },
  Manutenzione: {
    ruoli: ['Manutentore', 'Tecnico specializzato', 'Capo manutenzione'],
    competenze: ['Impianti elettrici', 'Idraulica', 'Tempestività', 'Prevenzione', 'Sicurezza', 'Lavoro in squadra'],
    corsi: [...COMUNI, { nome: 'Lavori elettrici (PES/PAV)', anni: 5 }, { nome: 'Lavori in quota', anni: 5 }],
    livMax: 6,
  },
  Amministrazione: {
    ruoli: ['Impiegato amministrativo', 'Contabile', 'Responsabile amministrativo'],
    competenze: ['Contabilità', 'Precisione', 'Gestionali', 'Rispetto scadenze', 'Analisi dei dati', 'Lavoro in squadra'],
    corsi: [...COMUNI, { nome: 'Videoterminali', anni: 5 }],
    livMax: 8,
  },
}

// ─── Generatore deterministico ──────────────────────────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r1 = (n: number) => Math.round(n * 10) / 10

// ─── Tipi ──────────────────────────────────────────────────────────────────────
export type Tipologia = 'Tempo indeterminato' | 'Tempo determinato' | 'Apprendistato' | 'Stagionale'

export interface AnagraficaProfilo {
  dip: DipendenteHr
  nomeCompleto: string
  iniziali: string
  sesso: 'M' | 'F'
  ruolo: string
  livello: number
  tipologia: Tipologia
  /** Quota dell'orario pieno (1 = 40 ore settimanali). */
  orarioPct: number
  assunzione: string
  nascita: string
  eta: number
  anzianitaMesi: number
}

export interface AnnoCarriera {
  anno: number
  label: string
  ral: number
  livello: number
  ruolo: string
  /** RAL media dei colleghi di reparto presenti in quell'anno. */
  mediaReparto: number | null
  evento?: string
}

export interface MeseOre {
  label: string
  mese: number
  contratto: number
  ordinarie: number
  straordinari: number
  ferie: number
  rol: number
  malattia: number
  formazione: number
  /** Lordo del mese (cedolino). */
  lordo: number
  netto: number
}

export interface Competenza { nome: string; dip: number; reparto: number }

export type StatoCorso = 'valido' | 'scadenza' | 'scaduto'
export interface Corso { nome: string; fatto: string; scade: string; stato: StatoCorso; giorni: number }

export interface Premio {
  fonte: 'obiettivo' | 'stima'
  nome: string
  massimo: number
  maturato: number
  /** Raggiungimento ponderato degli obiettivi, 0-100. */
  pct: number
  driver: { nome: string; peso: number; pct: number }[]
  chiusura?: string
}

export interface Insight { tono: 'good' | 'warn' | 'bad'; icona: string; testo: string }

export interface ProfiloData {
  anno: number
  aggiornatoAl: Date
  anagrafica: AnagraficaProfilo
  carriera: AnnoCarriera[]
  mesi: MeseOre[]
  mesiLy: MeseOre[]
  competenze: Competenza[]
  corsi: Corso[]
  premio: Premio
}

// ─── Anagrafica ────────────────────────────────────────────────────────────────
const TIPOLOGIA: Record<number, Tipologia> = { 7: 'Tempo determinato', 8: 'Stagionale', 11: 'Apprendistato' }
const FEMMINILI = new Set(['Giulia', 'Sara', 'Elena', 'Chiara'])

function anagrafica(d: DipendenteHr, oggi: Date): AnagraficaProfilo {
  const r = rng(d.id * 7919)
  const annoAss = 2013 + ((d.id * 3) % 11)
  const meseAss = 1 + Math.floor(r() * 12)
  const annoNascita = annoAss - 22 - Math.floor(r() * 18)
  const giornoNascita = 1 + Math.floor(r() * 27)
  const meseNascita = 1 + Math.floor(r() * 12)
  const assunzione = `${annoAss}-${String(meseAss).padStart(2, '0')}-01`
  const nascita = `${annoNascita}-${String(meseNascita).padStart(2, '0')}-${String(giornoNascita).padStart(2, '0')}`
  const nasc = new Date(`${nascita}T12:00:00`)
  let eta = oggi.getFullYear() - nasc.getFullYear()
  if (oggi.getMonth() < nasc.getMonth() || (oggi.getMonth() === nasc.getMonth() && oggi.getDate() < nasc.getDate())) eta--
  const anzianitaMesi = (oggi.getFullYear() - annoAss) * 12 + (oggi.getMonth() + 1 - meseAss)
  const car = carrieraBase(d, oggi.getFullYear())
  const ultimo = car[car.length - 1]
  return {
    dip: d,
    nomeCompleto: `${d.nome} ${d.cognome}`,
    iniziali: `${d.nome[0]}${d.cognome[0]}`,
    sesso: FEMMINILI.has(d.nome) ? 'F' : 'M',
    ruolo: ultimo.ruolo,
    livello: ultimo.livello,
    tipologia: TIPOLOGIA[d.id] ?? 'Tempo indeterminato',
    orarioPct: orarioPct(d),
    assunzione,
    nascita,
    eta,
    anzianitaMesi: Math.max(0, anzianitaMesi),
  }
}

/** Part-time dedotto dal monte ROL: 72 ore = tempo pieno. */
const orarioPct = (d: DipendenteHr) => Math.min(1, Math.round((d.rolAnnui / 72) * 20) / 20)

// ─── Carriera ──────────────────────────────────────────────────────────────────
function carrieraBase(d: DipendenteHr, finoA: number): Omit<AnnoCarriera, 'mediaReparto'>[] {
  const prof = REPARTI[d.reparto]
  const r = rng(d.id * 104729)
  const annoAss = 2013 + ((d.id * 3) % 11)
  const stagionale = TIPOLOGIA[d.id] === 'Stagionale'
  const quota = orarioPct(d) * (stagionale ? 7 / 12 : 1)
  let livello = 1 + (d.id % 3)
  let prossima = annoAss + 2 + Math.floor(r() * 2)
  const out: Omit<AnnoCarriera, 'mediaReparto'>[] = []
  for (let anno = annoAss; anno <= finoA; anno++) {
    let evento: string | undefined = anno === annoAss ? 'Assunzione' : undefined
    if (anno >= prossima && livello < prof.livMax) {
      livello++
      prossima = anno + 2 + Math.floor(r() * 3)
      evento = `Passaggio al ${LIVELLI[livello - 1]}`
    }
    const anni = anno - annoAss
    // Scatti di anzianità (+1,2% l'anno) e rinnovo del CCNL nel 2024 (+3%)
    const ccnl = anno >= 2024 ? 1.03 : 1
    const merito = 1 + r() * 0.025
    const ral = Math.round(RAL_LIVELLO[livello - 1] * 1000 * (1 + anni * 0.012) * ccnl * merito * quota / 50) * 50
    if (!evento && anno === 2024) evento = 'Rinnovo del CCNL'
    const ruolo = prof.ruoli[livello <= 3 ? 0 : livello <= 5 ? 1 : 2]
    out.push({ anno, label: String(anno), ral, livello, ruolo, evento })
  }
  return out
}

function carriera(d: DipendenteHr, finoA: number): AnnoCarriera[] {
  const colleghi = DIPENDENTI_HR.filter(x => x.reparto === d.reparto && x.id !== d.id).map(x => carrieraBase(x, finoA))
  return carrieraBase(d, finoA).map(c => {
    const pari = colleghi.map(cc => cc.find(x => x.anno === c.anno)?.ral).filter((v): v is number => v != null)
    const tutti = [...pari, c.ral]
    return { ...c, mediaReparto: pari.length ? Math.round(tutti.reduce((s, v) => s + v, 0) / tutti.length / 50) * 50 : null }
  })
}

// ─── Ore del mese ──────────────────────────────────────────────────────────────
//  In hotel le ferie si fanno in bassa stagione e gli straordinari si concentrano
//  da giugno a settembre; la malattia cade soprattutto d'inverno.
const PESO_FERIE = [3, 2, 0.6, 0.5, 0.3, 0.2, 0.1, 0.1, 0.3, 0.8, 2.5, 1.6]
const PESO_STRAO = [0.2, 0.2, 0.5, 0.9, 1.2, 1.8, 2.4, 2.6, 1.6, 0.8, 0.3, 0.6]
const PESO_MAL = [2, 1.8, 1.2, 0.8, 0.5, 0.4, 0.4, 0.3, 0.5, 0.9, 1.4, 1.8]

function mesiAnno(d: DipendenteHr, anno: number, carr: Omit<AnnoCarriera, 'mediaReparto'>[], richieste: RichiestaAssenza[], fino: number): MeseOre[] {
  const r = rng(d.id * 31337 + anno * 17)
  // Il carattere del dipendente (quanto straordinario fa) è stabile negli anni; varia il rumore
  const stabile = rng(d.id * 15485863)()
  const pct = orarioPct(d)
  const stagionale = TIPOLOGIA[d.id] === 'Stagionale'
  const ralAnno = carr.find(c => c.anno === anno)?.ral ?? carr[carr.length - 1]?.ral ?? 0
  const attivi = Array.from({ length: 12 }, (_, m) => (!stagionale || (m >= 3 && m <= 9)))
  const nAttivi = attivi.filter(Boolean).length || 1
  const sommaFerie = PESO_FERIE.reduce((s, v, m) => s + (attivi[m] ? v : 0), 0) || 1
  const sommaStrao = PESO_STRAO.reduce((s, v, m) => s + (attivi[m] ? v : 0), 0) || 1
  const totFerie = d.ferieAnnue * ORE_GIORNO * pct * (stagionale ? 7 / 12 : 1) * (0.78 + r() * 0.22)
  const totStrao = (60 + stabile * 120) * (0.85 + r() * 0.3) * pct
  const totRol = d.rolAnnui * (0.55 + r() * 0.4)
  // Episodi di malattia: 0-3 nell'anno, 1-5 giorni l'uno
  const malattiaMese = Array(12).fill(0) as number[]
  const episodi = Math.floor(r() * 3.6)
  for (let k = 0; k < episodi; k++) {
    let x = r() * PESO_MAL.reduce((s, v) => s + v, 0)
    let m = 0
    while (m < 11 && x > PESO_MAL[m]) { x -= PESO_MAL[m]; m++ }
    if (attivi[m]) malattiaMese[m] += (1 + Math.floor(r() * 5)) * ORE_GIORNO * pct
  }
  const mesiFormazione = [Math.floor(r() * 12), Math.floor(r() * 12)]

  // Richieste approvate dell'anno, per mese e tipo (la data d'inizio decide il mese)
  const reali = new Map<string, number>()
  for (const q of richieste) {
    if (q.dipendenteId !== d.id || q.stato !== 'Approvata' || !q.dal.startsWith(String(anno))) continue
    const m = Number(q.dal.slice(5, 7)) - 1
    const cat = q.tipo === 'Ferie' ? 'ferie' : q.tipo === 'Malattia' ? 'malattia' : 'rol'
    const ore = q.tipo === 'Ferie' || q.tipo === 'Malattia'
      ? Math.max(1, giorniLavorativi(q.dal, q.al)) * ORE_GIORNO * pct
      : oreRichiesta(q)
    reali.set(`${m}-${cat}`, (reali.get(`${m}-${cat}`) ?? 0) + ore)
  }

  const out: MeseOre[] = []
  for (let m = 0; m < fino; m++) {
    if (!attivi[m]) {
      out.push({ label: MESI_BREVI[m], mese: m, contratto: 0, ordinarie: 0, straordinari: 0, ferie: 0, rol: 0, malattia: 0, formazione: 0, lordo: 0, netto: 0 })
      continue
    }
    const contratto = Math.round(ORE_MESE * pct)
    const ferie = reali.get(`${m}-ferie`) ?? (totFerie * PESO_FERIE[m]) / sommaFerie
    const rol = reali.get(`${m}-rol`) ?? (totRol / nAttivi) * (0.4 + r() * 1.2)
    const malattia = reali.get(`${m}-malattia`) ?? malattiaMese[m]
    const formazione = mesiFormazione.includes(m) ? 4 + Math.floor(r() * 3) * 4 : 0
    const assenze = Math.min(contratto, ferie + rol + malattia + formazione)
    const straordinari = (totStrao * PESO_STRAO[m]) / sommaStrao * (0.7 + r() * 0.6)
    const mensile = ralAnno / (stagionale ? 7 : 14)
    // Tredicesima a dicembre e quattordicesima a giugno (salvo stagionali)
    const extra = !stagionale && (m === 5 || m === 11) ? mensile : 0
    const lordo = Math.round(mensile + extra + straordinari * (ralAnno / 14 / ORE_MESE / Math.max(pct, 0.5)) * 1.25)
    out.push({
      label: MESI_BREVI[m],
      mese: m,
      contratto,
      ordinarie: r1(contratto - assenze),
      straordinari: r1(straordinari),
      ferie: r1(ferie),
      rol: r1(rol),
      malattia: r1(malattia),
      formazione: r1(formazione),
      lordo,
      netto: Math.round(lordo * 0.735),
    })
  }
  return out
}

// ─── Competenze ────────────────────────────────────────────────────────────────
function punteggi(d: DipendenteHr, anno: number): number[] {
  const r = rng(d.id * 2654435 + anno)
  const carr = carrieraBase(d, anno)
  const anni = Math.max(0, anno - carr[0].anno)
  return REPARTI[d.reparto].competenze.map(() => Math.round(Math.min(98, 48 + r() * 34 + Math.min(anni, 10) * 1.6)))
}

function competenze(d: DipendenteHr, anno: number): Competenza[] {
  const colleghi = DIPENDENTI_HR.filter(x => x.reparto === d.reparto).map(x => punteggi(x, anno))
  const mie = punteggi(d, anno)
  return REPARTI[d.reparto].competenze.map((nome, i) => ({
    nome,
    dip: mie[i],
    reparto: Math.round(colleghi.reduce((s, p) => s + p[i], 0) / colleghi.length),
  }))
}

// ─── Formazione obbligatoria ───────────────────────────────────────────────────
function corsi(d: DipendenteHr, oggi: Date): Corso[] {
  const r = rng(d.id * 486187)
  return REPARTI[d.reparto].corsi.map((c): Corso => {
    // Fatto fra 2 mesi e (validità + 4 mesi) fa: qualcuno scade, qualcuno è in scadenza
    const mesiFa = 2 + Math.floor(r() * (c.anni * 12 + 2))
    const fatto = new Date(oggi.getFullYear(), oggi.getMonth() - mesiFa, 1 + Math.floor(r() * 27), 12)
    const scade = new Date(fatto.getFullYear() + c.anni, fatto.getMonth(), fatto.getDate(), 12)
    const giorni = Math.round((scade.getTime() - oggi.getTime()) / 86400000)
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    return { nome: c.nome, fatto: iso(fatto), scade: iso(scade), giorni, stato: giorni < 0 ? 'scaduto' : giorni <= 90 ? 'scadenza' : 'valido' }
  }).sort((a, b) => a.giorni - b.giorni)
}

// ─── Premio di risultato ───────────────────────────────────────────────────────
function premio(d: DipendenteHr, ral: number, anno: number, assenteismo: number, obiettivi: Obiettivo[]): Premio {
  const nome = `${d.nome} ${d.cognome}`
  const presenza = Math.round(Math.max(0, Math.min(100, 100 - assenteismo * 12)))
  const ob = obiettivi.find(o => o.tipologia === 'individuale' && o.assegnatario === nome && o.stato !== 'bozza')
  if (ob) {
    const vendite = avanzamentoPct(ob)
    const r = rng(d.id * 9176 + anno)
    const qualita = Math.round(70 + r() * 25)
    const driver = [
      { nome: 'Vendite', peso: 60, pct: vendite },
      { nome: 'Soddisfazione ospiti', peso: 25, pct: qualita },
      { nome: 'Presenza', peso: 15, pct: presenza },
    ]
    const sotto = tuttiSotto(ob)
    return {
      fonte: 'obiettivo',
      nome: ob.nome,
      massimo: premioTotale(ob),
      maturato: premioSbloccato(ob),
      pct: Math.round(driver.reduce((s, x) => s + x.pct * x.peso, 0) / 100),
      driver,
      chiusura: sotto[sotto.length - 1]?.al,
    }
  }
  const r = rng(d.id * 7727 + anno)
  const driver = [
    { nome: 'Risultato di reparto', peso: 50, pct: Math.round(55 + r() * 45) },
    { nome: 'Soddisfazione ospiti', peso: 30, pct: Math.round(60 + r() * 38) },
    { nome: 'Presenza', peso: 20, pct: presenza },
  ]
  const pct = Math.round(driver.reduce((s, x) => s + x.pct * x.peso, 0) / 100)
  const massimo = Math.round((ral * 0.07) / 50) * 50
  // Sotto il 50% di raggiungimento il premio non scatta; poi cresce in proporzione
  const maturato = pct < 50 ? 0 : Math.round((massimo * pct) / 100 / 10) * 10
  return { fonte: 'stima', nome: `Premio di risultato ${anno}`, massimo, maturato, pct, driver, chiusura: `${anno}-12-31` }
}

// ─── Costruzione ───────────────────────────────────────────────────────────────
export function buildProfilo(dipendenteId: number, anno: number, richieste: RichiestaAssenza[], obiettivi: Obiettivo[]): ProfiloData {
  const oggi = new Date()
  const d = DIPENDENTI_HR.find(x => x.id === dipendenteId) ?? DIPENDENTI_HR[0]
  const ana = anagrafica(d, oggi)
  const carr = carriera(d, anno).filter(c => c.anno <= anno)
  const corrente = anno === oggi.getFullYear()
  const fino = corrente ? oggi.getMonth() + 1 : 12
  const base = carrieraBase(d, anno)
  const mesi = anno >= base[0].anno ? mesiAnno(d, anno, base, richieste, fino) : []
  const mesiLy = anno - 1 >= base[0].anno ? mesiAnno(d, anno - 1, base, richieste, fino) : []
  const sum = (k: keyof MeseOre) => mesi.reduce((s, x) => s + (x[k] as number), 0)
  const assenteismo = sum('contratto') ? (sum('malattia') / sum('contratto')) * 100 : 0
  const ralAnno = carr[carr.length - 1]?.ral ?? 0
  return {
    anno,
    aggiornatoAl: oggi,
    anagrafica: corrente ? ana : { ...ana, ruolo: carr[carr.length - 1]?.ruolo ?? ana.ruolo, livello: carr[carr.length - 1]?.livello ?? ana.livello },
    carriera: carr.slice(-8),
    mesi,
    mesiLy,
    competenze: competenze(d, anno),
    corsi: corsi(d, oggi),
    premio: premio(d, ralAnno, anno, assenteismo, obiettivi),
  }
}

// ─── Indicatori derivati ───────────────────────────────────────────────────────
export function computeProfilo(p: ProfiloData) {
  const sum = (arr: MeseOre[], k: keyof MeseOre) => arr.reduce((s, x) => s + (x[k] as number), 0)
  const lavorate = sum(p.mesi, 'ordinarie') + sum(p.mesi, 'straordinari')
  const lavorateLy = sum(p.mesiLy, 'ordinarie') + sum(p.mesiLy, 'straordinari')
  const contratto = sum(p.mesi, 'contratto')
  const straordinari = sum(p.mesi, 'straordinari')
  const straordinariLy = sum(p.mesiLy, 'straordinari')
  const malattia = sum(p.mesi, 'malattia')
  const malattiaLy = sum(p.mesiLy, 'malattia')
  const contrattoLy = sum(p.mesiLy, 'contratto')
  const assenteismo = contratto ? (malattia / contratto) * 100 : 0
  const assenteismoLy = contrattoLy ? (malattiaLy / contrattoLy) * 100 : 0
  const ferieOre = sum(p.mesi, 'ferie')
  const ferieGiorni = ferieOre / ORE_GIORNO / Math.max(p.anagrafica.orarioPct, 0.1)
  const ferieMaturate = p.anagrafica.dip.ferieAnnue * (p.mesi.length / 12)
  const c = p.carriera
  const ultimo = c[c.length - 1]
  const prima = c[c.length - 2]
  const ralDelta = ultimo && prima && prima.ral ? ((ultimo.ral - prima.ral) / prima.ral) * 100 : undefined
  const vsReparto = ultimo?.mediaReparto ? ((ultimo.ral - ultimo.mediaReparto) / ultimo.mediaReparto) * 100 : 0
  const ralIngresso = c[0]?.ral ?? 0
  const crescitaCarriera = ralIngresso ? ((ultimo.ral - ralIngresso) / ralIngresso) * 100 : 0
  const inRegola = p.corsi.filter(x => x.stato !== 'scaduto').length
  const compliance = p.corsi.length ? (inRegola / p.corsi.length) * 100 : 100
  const tempo = [
    { key: 'ordinarie', label: 'Ore ordinarie', ore: sum(p.mesi, 'ordinarie') },
    { key: 'straordinari', label: 'Straordinari', ore: straordinari },
    { key: 'ferie', label: 'Ferie', ore: ferieOre },
    { key: 'rol', label: 'ROL e permessi', ore: sum(p.mesi, 'rol') },
    { key: 'malattia', label: 'Malattia', ore: malattia },
    { key: 'formazione', label: 'Formazione', ore: sum(p.mesi, 'formazione') },
  ]
  const totTempo = tempo.reduce((s, x) => s + x.ore, 0) || 1
  const mediaCompetenze = p.competenze.reduce((s, x) => s + x.dip, 0) / (p.competenze.length || 1)
  const mediaCompetenzeRep = p.competenze.reduce((s, x) => s + x.reparto, 0) / (p.competenze.length || 1)
  const forte = [...p.competenze].sort((a, b) => (b.dip - b.reparto) - (a.dip - a.reparto))[0]
  const debole = [...p.competenze].sort((a, b) => (a.dip - a.reparto) - (b.dip - b.reparto))[0]
  const lordoAnno = sum(p.mesi, 'lordo')
  const costoAzienda = (ultimo?.ral ?? 0) * 1.36

  const insight: Insight[] = []
  if (Math.abs(vsReparto) >= 3) {
    insight.push(vsReparto > 0
      ? { tono: 'good', icona: 'fa-arrow-trend-up', testo: `RAL del ${fmtP(vsReparto)} sopra la media del reparto` }
      : { tono: 'warn', icona: 'fa-arrow-trend-down', testo: `RAL del ${fmtP(-vsReparto)} sotto la media del reparto: rischio di uscita` })
  }
  const scaduti = p.corsi.filter(x => x.stato === 'scaduto')
  const inScadenza = p.corsi.filter(x => x.stato === 'scadenza')
  if (scaduti.length) insight.push({ tono: 'bad', icona: 'fa-triangle-exclamation', testo: `${scaduti.length === 1 ? `"${scaduti[0].nome}" scaduto` : `${scaduti.length} corsi obbligatori scaduti`}: va programmato l'aggiornamento` })
  else if (inScadenza.length) insight.push({ tono: 'warn', icona: 'fa-hourglass-half', testo: `"${inScadenza[0].nome}" scade fra ${inScadenza[0].giorni} giorni` })
  const quotaStrao = contratto ? (straordinari / contratto) * 100 : 0
  if (quotaStrao >= 6) insight.push({ tono: 'warn', icona: 'fa-business-time', testo: `Straordinari al ${fmtP(quotaStrao)} dell'orario: valuta un recupero con ROL` })
  const ferieResidue = ferieMaturate - ferieGiorni
  if (ferieResidue >= 6 && p.mesi.length >= 9) insight.push({ tono: 'warn', icona: 'fa-umbrella-beach', testo: `${Math.round(ferieResidue)} giorni di ferie maturate ancora da godere` })
  if (forte && forte.dip - forte.reparto >= 5) insight.push({ tono: 'good', icona: 'fa-star', testo: `Punto di forza: ${forte.nome.toLowerCase()} (+${forte.dip - forte.reparto} sulla media)` })
  if (assenteismo < 1.5 && contratto > 0) insight.push({ tono: 'good', icona: 'fa-heart-pulse', testo: `Assenteismo basso (${fmtP(assenteismo)}): nessun episodio critico` })

  return {
    lavorate, lavorateLy, straordinari, straordinariLy, assenteismo, assenteismoLy,
    ralDelta, vsReparto, crescitaCarriera, compliance, inRegola, tempo, totTempo,
    mediaCompetenze, mediaCompetenzeRep, forte, debole, ferieGiorni, ferieMaturate,
    lordoAnno, costoAzienda, insight: insight.slice(0, 4), quotaStrao,
    sparkRal: c.map(x => x.ral),
    sparkOre: p.mesi.map(x => x.ordinarie + x.straordinari),
    sparkStrao: p.mesi.map(x => x.straordinari),
    sparkAss: p.mesi.map(x => (x.contratto ? (x.malattia / x.contratto) * 100 : 0)),
    sparkCompetenze: p.competenze.map(x => x.dip),
  }
}

const fmtP = (n: number) => `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(n)}%`

/** "8 anni e 4 mesi" */
export function fmtAnzianita(mesi: number) {
  const a = Math.floor(mesi / 12)
  const m = mesi % 12
  if (!a) return `${m} ${m === 1 ? 'mese' : 'mesi'}`
  return m ? `${a} ${a === 1 ? 'anno' : 'anni'} e ${m} ${m === 1 ? 'mese' : 'mesi'}` : `${a} ${a === 1 ? 'anno' : 'anni'}`
}

export const fmtDataIt = (iso: string) => iso.split('-').reverse().join('/')
