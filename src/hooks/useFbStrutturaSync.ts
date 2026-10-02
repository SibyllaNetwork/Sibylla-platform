import { useEffect } from 'react'
import { useStrutturaCorrente, schedaStruttura } from './useStrutturaCorrente'
import { useFbStore } from '../store/useFbStore'
import { useSaleStore } from '../store/useSaleStore'
import { applicaStrutturaPms } from '../modules/operation/_data/pmsDemo'

/**
 * Tiene i dati demo agganciati alla struttura selezionata in alto: cambiando
 * cliente o struttura, la sezione Food & Beverage (outlet, sale, tavoli,
 * comande, prenotazioni, cassa, menu, personale) e il front office (camere,
 * prenotazioni e ospiti di Planner, Arrivi e partenze, Ospiti in casa)
 * diventano quelli della nuova struttura.
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
    applicaStrutturaPms({
      nome: struttura,
      categoria: scheda?.categoria,
      classificazione: scheda?.classificazione,
      camere: scheda ? Number(scheda.camere) : undefined,
    })
  }, [struttura])
}
