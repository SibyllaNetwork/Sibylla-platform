import { useAccessStore } from '../../../store/useAccessStore'
import { isSoloRistorazione, PAGINE_HOTEL_WALLET } from '../../../navigation/filterMenu'

// ─── Food & Beverage senza hotel ──────────────────────────────────────────────
//  Le utenze di sola ristorazione (moduli Ristorazione e/o Food & Beverage, es.
//  Elena Russo, Marco Bruno) sono ristoranti separati dall'hotel: niente addebiti in camera, numeri
//  di camera, clienti hotel né wallet Sibylla. Se all'utenza si associa anche una
//  Struttura ricettiva i riferimenti tornano tutti.

/** Vero quando i riferimenti all'hotel e al wallet vanno nascosti. */
export function useFbSenzaHotel(): boolean {
  const assist           = useAccessStore(s => s.assist)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  return isSoloRistorazione(assist ? assist.moduli : profiles.find(p => p.id === currentProfileId)?.moduli)
}

/** Metodi di pagamento ammessi: senza hotel spariscono addebito camera e wallet. */
export const metodoAmmesso = (id: string, senzaHotel: boolean) => !senzaHotel || (id !== 'camera' && id !== 'wallet')

export { PAGINE_HOTEL_WALLET }
