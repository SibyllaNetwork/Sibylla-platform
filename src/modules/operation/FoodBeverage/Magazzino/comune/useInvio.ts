// ─── Magazzino ristorazione: invio con chiave anti-doppioni ──────────────────
//  § 8.0: ogni azione che crea porta una `id_operazione` generata al primo
//  tentativo e riusata identica in "Riprova"; la chiave si butta solo quando
//  l'invio è riuscito (o era un doppione, che vale come riuscito).

import { useCallback, useRef, useState } from 'react'
import { messaggioErrore, nuovaIdOperazione, riuscito } from '../api/magazzinoFbOp'
import type { Esito } from '../api/tipi'

export interface Invio {
  inCorso: boolean
  /** Messaggio da mostrare: `error_message` di Op o errore di rete. */
  errore: string | null
  /** true dopo un errore di rete: il pulsante diventa "Riprova" (stessa chiave). Con un errore di Op si corregge e si rimanda. */
  daRiprovare: boolean
  esegui: (fn: (idOperazione: string) => Promise<Esito>) => Promise<Esito | null>
  /** Nuovo modulo: nuova chiave e niente errori. */
  azzera: () => void
}

export function useInvio(): Invio {
  const chiave = useRef<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [rete, setRete] = useState(false)

  const esegui = useCallback(async (fn: (id: string) => Promise<Esito>) => {
    if (!chiave.current) chiave.current = nuovaIdOperazione()
    setInCorso(true)
    setErrore(null)
    setRete(false)
    try {
      const e = await fn(chiave.current)
      if (riuscito(e)) { chiave.current = null; return e }
      setErrore(e.error_message || 'Operazione non riuscita.')
      return null
    } catch (err) {
      // Errore di rete o di Op: l'esito non si conosce, si riprova con la stessa chiave.
      setErrore(messaggioErrore(err))
      setRete(true)
      return null
    } finally {
      setInCorso(false)
    }
  }, [])

  const azzera = useCallback(() => { chiave.current = null; setErrore(null); setRete(false) }, [])

  return { inCorso, errore, daRiprovare: rete, esegui, azzera }
}
