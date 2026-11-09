// ─── NOTIFICHE DELLA RISTORAZIONE ─────────────────────────────────────────────
//  Per l'utenza stand alone (sola ristorazione) la campanella parla del
//  ristorante: prenotazioni, ospiti con allergie, tavoli in attesa, scorte,
//  food cost, cassa, menu del giorno. Sono lette dallo stato F&B della
//  struttura selezionata, quindi cambiano con il ristorante.
import { useMemo } from 'react'
import { useFbStore, totaleConto, SALE } from '../store/useFbStore'
import { SOGLIA_FOOD_COST, oggiISO } from '../modules/operation/FoodBeverage/fb.model'

export interface NotificaRistorazione {
  id: number
  sev: 'error' | 'warning' | 'info'
  title: string
  text: string
  ref: string
  date: string
  page: string
  label: string
}

const eur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const minutiFa = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  return ((d.getHours() * 60 + d.getMinutes()) - (h * 60 + m) + 1440) % 1440
}

export function useNotificheRistorazione(attive: boolean): NotificaRistorazione[] {
  const strutt       = useFbStore(s => s.strutturaDemo)
  const contesto     = useFbStore(s => s.contesto)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const comande      = useFbStore(s => s.comande)
  const tavoli       = useFbStore(s => s.tavoli)
  const ingredienti  = useFbStore(s => s.ingredienti)
  const ricette      = useFbStore(s => s.ricette)
  const voci         = useFbStore(s => s.voci)
  const chiusure     = useFbStore(s => s.chiusure)
  const menuGiorno   = useFbStore(s => s.menuGiorno)

  return useMemo(() => {
    if (!attive) return []
    const oggi = oggiISO()
    const out: NotificaRistorazione[] = []
    const idSale = SALE.filter(s => s.outletId === contesto.outletId).map(s => s.id)
    const pren = prenotazioni
      .filter(p => p.data === oggi && p.outletId === contesto.outletId && p.stato !== 'annullata')
      .sort((a, b) => b.id - a.id)

    // Ultima prenotazione arrivata (web o telefono) per il servizio di oggi.
    const nuova = pren.find(p => p.stato === 'in-attesa' || p.stato === 'confermata')
    if (nuova) out.push({
      id: 7001, sev: 'info', title: 'Nuova prenotazione',
      text: `${nuova.ospite} · ${nuova.pax} coperti alle ${nuova.ora}${nuova.origine === 'web' ? ', dal sito' : ''}.`,
      ref: `${pren.length} prenotazioni oggi · ${pren.reduce((a, p) => a + p.pax, 0)} coperti`,
      date: 'Oggi 10:42', page: 'libro-prenotazioni', label: 'Apri il libro prenotazioni',
    })

    // Ospiti con allergie o esigenze alimentari: la cucina deve saperlo prima.
    const allergie = pren.filter(p => /allerg|celiac|intoller|vegetarian|vegan/i.test(p.note))
    if (allergie.length) out.push({
      id: 7002, sev: 'warning', title: 'Esigenze alimentari a tavola',
      text: allergie.slice(0, 2).map(p => `${p.ospite} (${p.ora}): ${p.note.toLowerCase()}`).join(' · ')
        + (allergie.length > 2 ? ` e altre ${allergie.length - 2}` : ''),
      ref: '', date: 'Oggi 11:05', page: 'ospiti-giorno', label: 'Vedi gli ospiti del giorno',
    })

    // Tavolo che aspetta da più tempo il conto o la portata.
    const aperte = comande.filter(c => c.stato === 'aperta' && idSale.includes(c.salaId))
    const attesa = aperte.map(c => ({ c, min: minutiFa(c.apertaAlle) })).sort((a, b) => b.min - a.min)[0]
    if (attesa && attesa.min > 45) {
      const t = tavoli.find(x => x.id === attesa.c.tavoloId)
      out.push({
        id: 7003, sev: 'warning', title: `Tavolo ${t?.numero ?? ''} al tavolo da ${attesa.min} minuti`,
        text: `${attesa.c.coperti} coperti, conto aperto ${eur(totaleConto(attesa.c))}: verifica portate e conto con ${attesa.c.cameriere.replace(/\.$/, "")}.`,
        ref: '', date: `Oggi ${attesa.c.apertaAlle}`, page: 'sala-ristorante', label: 'Vai in sala',
      })
    }

    // No show della giornata.
    const noShow = pren.filter(p => p.stato === 'no-show')
    if (noShow.length) out.push({
      id: 7004, sev: 'error', title: noShow.length === 1 ? 'Prenotazione non presentata' : `${noShow.length} prenotazioni non presentate`,
      text: `${noShow.map(p => `${p.ospite} (${p.pax} pax)`).slice(0, 2).join(', ')}: tavoli liberabili per il walk-in.`,
      ref: '', date: 'Oggi 13:20', page: 'libro-prenotazioni', label: 'Apri il libro prenotazioni',
    })

    // Scorte di magazzino sotto il minimo.
    const sotto = ingredienti.filter(i => i.scorta > 0 && i.giacenza <= i.scorta)
    if (sotto.length) out.push({
      id: 7005, sev: 'warning', title: sotto.length === 1 ? 'Scorta sotto il minimo' : `${sotto.length} ingredienti sotto scorta`,
      text: `${sotto.slice(0, 3).map(i => i.nome).join(', ')}${sotto.length > 3 ? '…' : ''}: riordina prima del servizio serale.`,
      ref: '', date: 'Oggi 08:30', page: 'fb-ingredienti', label: 'Apri il listino ingredienti',
    })

    // Piatti con il food cost oltre la soglia.
    const costi = new Map(ingredienti.map(i => [i.id, i.costo]))
    const alti = voci.filter(v => {
      const c = (ricette[v.id] ?? []).reduce((a, r) => a + (costi.get(r.ingredienteId) ?? 0) * r.qta, 0)
      return c > 0 && v.prezzo > 0 && (c / v.prezzo) * 100 > SOGLIA_FOOD_COST
    })
    if (alti.length) out.push({
      id: 7006, sev: 'info', title: 'Food cost oltre soglia',
      text: `${alti.length} voci superano il ${SOGLIA_FOOD_COST}% di materia prima: ${alti.slice(0, 2).map(v => v.nome).join(', ')}${alti.length > 2 ? '…' : ''}.`,
      ref: '', date: 'Ieri 23:10', page: 'fb-food-cost', label: 'Apri Food cost e margini',
    })

    // Chiusura di cassa di ieri.
    const ieri = chiusure[0]
    if (ieri) {
      const tot = Object.values(ieri.incassi).reduce((a, n) => a + n, 0)
      const scarto = (ieri.contato ?? 0) - (ieri.fondo + ieri.incassi.contanti)
      out.push({
        id: 7007, sev: Math.abs(scarto) > 0.5 ? 'warning' : 'info',
        title: 'Chiusura di cassa registrata',
        text: `Incassato ${eur(tot)}${Math.abs(scarto) > 0.5 ? `, differenza nel cassetto di ${eur(scarto)}` : ', cassetto in pari'}.`,
        ref: '', date: 'Ieri 23:45', page: 'fb-cassa', label: 'Apri Cassa e chiusure',
      })
    }

    // Menu del giorno da pubblicare.
    if (!menuGiorno.some(m => m.data === oggi)) out.push({
      id: 7008, sev: 'info', title: 'Menu del giorno da pubblicare',
      text: 'Il menu di oggi non è ancora pubblicato: sala e menu online mostrano la carta standard.',
      ref: '', date: 'Oggi 09:00', page: 'fb-menu-giorno', label: 'Componi il menu del giorno',
    })
    return out
    // strutt: cambia il ristorante → si rileggono le notifiche
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attive, strutt, contesto.outletId, prenotazioni, comande, tavoli, ingredienti, ricette, voci, chiusure, menuGiorno])
}
