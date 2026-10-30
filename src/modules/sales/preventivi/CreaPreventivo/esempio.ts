// ─── Preventivo di esempio per anteprime ed editor dei template ──────────────
//  Due proposte costruite sui dati veri della struttura: camere libere nel
//  periodo assegnate in automatico, con le loro tariffe.

import type { PreventivoSoggiorno, PropostaSoggiorno } from '../../../../store/usePreventiviSoggiornoStore'
import { assegnaAutomatico, camereDaNumeri, camereLibere } from './disponibilita'
import { templateDi } from '../../../../store/useTemplatePreventivoStore'

const uid = () => Math.random().toString(36).slice(2, 10)
const isoTra = (giorni: number) => {
  const d = new Date(); d.setDate(d.getDate() + giorni)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FOTO = {
  doppia: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=70&auto=format&fit=crop',
  family: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=70&auto=format&fit=crop',
}

/** Camere della proposta assegnate in automatico sulle libere del periodo. */
export function conCamereAssegnate(q: PropostaSoggiorno, struttura: string): PropostaSoggiorno {
  const scelte = assegnaAutomatico(camereLibere(struttura, q.checkin, q.checkout), q.adulti + q.bambini)
  return { ...q, assegnazione: 'automatica', camere: camereDaNumeri(scelte, q.camere) }
}

export function preventivoEsempio(struttura: string, templateId?: string, opts: { foto?: boolean } = {}): PreventivoSoggiorno {
  const base = (p: Partial<PropostaSoggiorno>): PropostaSoggiorno => ({
    id: uid(), titolo: '', assegnazione: 'automatica', checkin: isoTra(21), checkout: isoTra(24), adulti: 2, bambini: 0,
    camere: [], trattamento: 'Pernottamento e colazione', servizi: ['Wi-Fi', 'Parcheggio'], extra: [],
    scontoPct: 0, tassaImporto: 3.5, tassaMaxNotti: 7, tassaEsentiMinori: true, ...p,
  })
  const proposte = [
    base({
      titolo: 'Weekend per due', servizi: ['Wi-Fi', 'Late check-out', 'Welcome drink'],
      extra: [{ id: uid(), nome: 'Cena romantica', prezzo: 90, unita: 'soggiorno' }, { id: uid(), nome: 'Percorso spa', prezzo: 45, unita: 'persona' }],
    }),
    base({
      titolo: 'Famiglia', checkout: isoTra(25), bambini: 2, trattamento: 'Mezza pensione', scontoPct: 10,
      servizi: ['Wi-Fi', 'Parcheggio', 'Culla'], extra: [{ id: uid(), nome: 'Noleggio biciclette', prezzo: 18, unita: 'persona' }],
    }),
  ].map((q) => conCamereAssegnate(q, struttura))
  if (opts.foto) {
    proposte.forEach((q, i) => q.camere.forEach((c) => { c.immagine = i ? FOTO.family : FOTO.doppia }))
  }
  return {
    id: uid(), codice: 'PRV-S100', struttura, cliente: '', email: '', telefono: '', templateId,
    messaggio: templateDi(templateId).testi.lettera, validita: '7', creato: new Date().toLocaleDateString('it-IT'),
    stato: 'Bozza', proposte,
  }
}
