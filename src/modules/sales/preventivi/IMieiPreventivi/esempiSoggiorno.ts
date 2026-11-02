import type { PreventivoSoggiorno, PropostaSoggiorno, TentativoPagamento } from '../../../../store/usePreventiviSoggiornoStore'
import { conCamereAssegnate } from '../CreaPreventivo/esempio'
import { bastano, camereLibere, primaDataUtile } from '../CreaPreventivo/disponibilita'
import { STRUTTURE, conto } from '../CreaPreventivo/soggiorno'
import { templateDi } from '../../../../store/useTemplatePreventivoStore'

// ─── Preventivi di soggiorno d'esempio (senza backend) ───────────────────────
//  Uno per stato, con tutti i dati di Crea preventivo (proposte, camere dal
//  gestionale, servizi, extra, lingua, pagamenti), date relative a oggi e id
//  fissi. Aprendone uno si copia nello store e diventa modificabile.

const STRUTTURA = STRUTTURE[0]

const giorno = (n: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d }
const iso = (n: number) => { const d = giorno(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const data = (n: number) => giorno(n).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dataOra = (n: number, ore: number, minuti = 0) => {
  const d = giorno(n); d.setHours(ore, minuti)
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const istante = (n: number, ore: number) => { const d = giorno(n); d.setHours(ore, 12); return d.toISOString() }

// Come in Crea preventivo: se nel periodo le camere libere non bastano, la prima data utile.
function proposta(id: string, p: Partial<PropostaSoggiorno>): PropostaSoggiorno {
  const q: PropostaSoggiorno = {
    id, titolo: '', assegnazione: 'automatica', checkin: iso(30), checkout: iso(33), adulti: 2, bambini: 0,
    camere: [], trattamento: 'Pernottamento e colazione', servizi: ['Wi-Fi'], extra: [],
    scontoPct: 0, tassaImporto: 3.5, tassaMaxNotti: 7, tassaEsentiMinori: true, ...p,
  }
  const ospiti = q.adulti + q.bambini
  const utile = bastano(camereLibere(STRUTTURA, q.checkin, q.checkout), ospiti) ? null : primaDataUtile(STRUTTURA, q.checkin, q.checkout, ospiti)
  return conCamereAssegnate(utile ? { ...q, checkin: utile.checkin, checkout: utile.checkout } : q, STRUTTURA)
}

function preventivo(n: number, p: Partial<PreventivoSoggiorno> & Pick<PreventivoSoggiorno, 'cliente' | 'email' | 'proposte'>): PreventivoSoggiorno {
  return {
    id: `esempio-${n}`, codice: `PRV-S0${40 + n}`, struttura: STRUTTURA, telefono: '', validita: '7', creato: data(-3),
    stato: 'Bozza', messaggio: templateDi(undefined).testi.lettera, lingua: 'it', ...p,
  }
}

function pagamento(id: string, p: PreventivoSoggiorno, esito: TentativoPagamento['esito'], extra: Partial<TentativoPagamento>): TentativoPagamento {
  const q = p.proposte.find((x) => x.id === (extra.propostaId ?? p.accettata)) ?? p.proposte[0]
  const totale = conto(q, extra.extraScelti ?? p.extraScelti).totaleConExtra
  return {
    id, il: istante(-1, 18), esito, tipo: 'caparra', importo: Math.round(totale * 30) / 100,
    circuito: 'Visa', ultime4: '4242', titolare: p.cliente, letta: true, ...extra,
  }
}

function crea(): PreventivoSoggiorno[] {
  // Confermato: proposta scelta con un extra e caparra pagata.
  const colombo = preventivo(1, {
    cliente: 'Famiglia Colombo', email: 'colombo.famiglia@mail.it', telefono: '+39 333 482 1190', creato: data(-6),
    stato: 'Accettato', inviatoIl: dataOra(-6, 10, 15), rispostaIl: dataOra(-1, 18, 12), accettata: 'e1-b',
    extraScelti: ['e1-b-bici'], terminiAccettati: 'Termini e condizioni di soggiorno (v. 2026)',
    proposte: [
      proposta('e1-a', { titolo: 'Weekend per due', checkin: iso(24), checkout: iso(27), servizi: ['Wi-Fi', 'Late check-out', 'Welcome drink'],
        extra: [{ id: 'e1-a-cena', nome: 'Cena romantica', prezzo: 90, unita: 'soggiorno' }] }),
      proposta('e1-b', { titolo: 'Famiglia', checkin: iso(24), checkout: iso(28), bambini: 2, trattamento: 'Mezza pensione', scontoPct: 10,
        servizi: ['Wi-Fi', 'Parcheggio', 'Culla'], extra: [{ id: 'e1-b-bici', nome: 'Noleggio biciclette', prezzo: 18, unita: 'persona' }] }),
    ],
  })
  colombo.pagamenti = [
    pagamento('e1-p1', colombo, 'rifiutato', { il: istante(-1, 17), circuito: 'Mastercard', ultime4: '5100', motivo: 'Fondi insufficienti' }),
    pagamento('e1-p2', colombo, 'autorizzato', { codiceAut: 'A7F3K2' }),
  ]

  // Accettato senza pagamento con carta (template senza Nexi).
  const turner = preventivo(2, {
    cliente: 'Mr. James Turner', email: 'j.turner@mail.uk', telefono: '+44 7700 900461', lingua: 'en', creato: data(-4),
    stato: 'Accettato', inviatoIl: dataOra(-4, 9, 40), rispostaIl: dataOra(-2, 21, 5), accettata: 'e2-a',
    terminiAccettati: 'Termini e condizioni di soggiorno (v. 2026)',
    proposte: [
      proposta('e2-a', { titolo: 'Business stay', adulti: 1, checkin: iso(12), checkout: iso(15), servizi: ['Wi-Fi', 'Parcheggio', 'Palestra'],
        extra: [{ id: 'e2-a-tr', nome: 'Transfer aeroporto', prezzo: 60, unita: 'soggiorno' }] }),
    ],
  })

  // Inviato, ma il pagamento della proposta scelta non è andato a buon fine.
  const welcome = preventivo(3, {
    cliente: 'Welcome Travel', email: 'booking@welcometravel.it', telefono: '+39 02 4455 7821', creato: data(-2),
    stato: 'Inviato', inviatoIl: dataOra(-2, 11, 0),
    proposte: [
      proposta('e3-a', { titolo: 'Gruppo standard', adulti: 8, checkin: iso(40), checkout: iso(43), servizi: ['Wi-Fi', 'Welcome drink'], scontoPct: 8 }),
      proposta('e3-b', { titolo: 'Gruppo con mezza pensione', adulti: 8, checkin: iso(40), checkout: iso(43), trattamento: 'Mezza pensione',
        servizi: ['Wi-Fi', 'Welcome drink', 'Accesso spa'], scontoPct: 8 }),
    ],
  })
  welcome.pagamenti = [
    pagamento('e3-p1', welcome, 'rifiutato', { propostaId: 'e3-b', il: istante(0, 9), circuito: 'Amex', ultime4: '0005', motivo: 'Carta scaduta', tipo: 'totale',
      importo: Math.round(conto(welcome.proposte[1]).totaleConExtra * 100) / 100 }),
  ]

  // Inviato, in scadenza domani.
  const ferrara = preventivo(4, {
    cliente: 'Sig.ra Laura Ferrara', email: 'l.ferrara@mail.it', telefono: '+39 347 220 9183', creato: data(-6),
    stato: 'Inviato', inviatoIl: dataOra(-6, 16, 20),
    proposte: [
      proposta('e4-a', { titolo: 'Relax spa', checkin: iso(18), checkout: iso(20), trattamento: 'Mezza pensione', servizi: ['Wi-Fi', 'Accesso spa'],
        extra: [{ id: 'e4-a-mass', nome: 'Massaggio di coppia', prezzo: 120, unita: 'soggiorno' }] }),
    ],
  })

  // Letto: il cliente ha aperto la mail.
  const alpitour = preventivo(5, {
    cliente: 'Alpitour Gruppi', email: 'gruppi@alpitour.it', telefono: '+39 011 1923 400', lingua: 'de', creato: data(-1),
    stato: 'Letto', inviatoIl: dataOra(-1, 15, 30), validita: '15',
    proposte: [
      proposta('e5-a', { titolo: 'Tour Sicilia — 30 pax', adulti: 30, checkin: iso(60), checkout: iso(62), trattamento: 'Pensione completa',
        servizi: ['Wi-Fi', 'Parcheggio'], scontoPct: 12, tassaMaxNotti: 5 }),
    ],
  })

  // Rifiutato dal cliente.
  const liceo = preventivo(6, {
    cliente: 'Liceo Galilei — gita', email: 'segreteria@liceogalilei.edu.it', creato: data(-9),
    stato: 'Rifiutato', inviatoIl: dataOra(-9, 12, 0), rispostaIl: dataOra(-5, 10, 45),
    proposte: [
      proposta('e6-a', { titolo: 'Gita 2 notti', adulti: 4, bambini: 18, checkin: iso(35), checkout: iso(37), trattamento: 'Pensione completa',
        servizi: ['Wi-Fi'], tassaEsentiMinori: true }),
    ],
  })

  // Scaduto: inviato e senza risposta entro la validità.
  const rotary = preventivo(7, {
    cliente: 'Gruppo Rotary Roma Sud', email: 'segreteria@rotaryromasud.it', telefono: '+39 06 5544 2210', creato: data(-12),
    stato: 'Inviato', inviatoIl: dataOra(-12, 9, 5),
    proposte: [
      proposta('e7-a', { titolo: 'Conviviale e pernottamento', adulti: 24, checkin: iso(14), checkout: iso(15), servizi: ['Wi-Fi', 'Parcheggio', 'Welcome drink'] }),
    ],
  })

  // Bozza: ancora da inviare.
  const congresso = preventivo(8, {
    cliente: 'Associazione Medici Siciliani', email: 'congressi@ams.it', lingua: 'it', creato: data(0), validita: '15',
    proposte: [
      proposta('e8-a', { titolo: 'Relatori', adulti: 6, checkin: iso(75), checkout: iso(78), servizi: ['Wi-Fi', 'Transfer aeroporto'] }),
      proposta('e8-b', { titolo: 'Relatori e accompagnatori', adulti: 12, checkin: iso(75), checkout: iso(78), trattamento: 'Mezza pensione',
        servizi: ['Wi-Fi', 'Transfer aeroporto'], scontoPct: 5 }),
    ],
  })

  return [congresso, alpitour, welcome, turner, colombo, ferrara, liceo, rotary]
}

let cache: PreventivoSoggiorno[] | null = null

/** Gli esempi, calcolati una volta per sessione (le camere vengono dal gestionale demo). */
export function esempiSoggiorno() {
  if (!cache) cache = crea()
  return cache
}
