import { useEffect } from 'react'
import { useStrutturaCorrente, schedaStruttura } from './useStrutturaCorrente'
import { useFbStore } from '../store/useFbStore'
import { useSaleStore } from '../store/useSaleStore'

/**
 * Tiene la sezione Food & Beverage agganciata alla struttura selezionata in
 * alto: cambiando cliente o struttura, outlet, sale, tavoli, comande,
 * prenotazioni, cassa, menu e personale diventano quelli della nuova struttura.
 * Va montato una volta sola, alla radice dell'app.
 */
export function useFbStrutturaSync() {
  const { struttura } = useStrutturaCorrente()

  useEffect(() => {
    if (!struttura) return
    const scheda = schedaStruttura(struttura)
    useFbStore.getState().attivaStruttura({
      nome: struttura,
      categoria: scheda?.categoria,
      classificazione: scheda?.classificazione,
      citta: scheda?.citta,
      email: scheda?.email,
    })
    // Dopo l'F&B: le sale si costruiscono sull'anagrafica appena attivata.
    useSaleStore.getState().caricaStruttura(struttura)
  }, [struttura])
}
