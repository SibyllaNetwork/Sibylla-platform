// useCheckoutStore — trasporta i dati del pagamento dal carrello alla pagina di
// pagamento (importo, acconto, metodo). Stato volatile lato client.
import { create } from 'zustand'

export type MetodoPagamento = 'wallet' | 'carta'

interface CheckoutState {
  totale: number          // totale ordine (IVA inclusa)
  acconto: boolean        // true = si paga solo l'acconto
  accontoPct: number      // percentuale acconto (es. 0.30)
  metodo: MetodoPagamento
  setCheckout: (data: Partial<Omit<CheckoutState, 'setCheckout'>>) => void
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  totale: 0,
  acconto: false,
  accontoPct: 0.30,
  metodo: 'carta',
  setCheckout: (data) => set(data),
}))
