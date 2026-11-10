// ─── Ordini ai fornitori: ordini ancora da ricevere ──────────────────────────
//  Per Ricevi merce: gli ordini inviati o arrivati in parte della struttura, da
//  collegare al carico. Il residuo di ogni riga (ordinato − arrivato) arriva
//  dall'azione `ordine`; qui si legge soltanto.

import { useEffect, useState } from 'react'
import { eseguiMag } from '../api/magazzinoFbOp'
import type { Ordine, OrdineSintesi } from '../api/tipi'

export function useOrdiniAperti(idStruttura: number) {
  const [ordini, setOrdini] = useState<OrdineSintesi[]>([])
  useEffect(() => {
    let annullato = false
    Promise.all([
      eseguiMag('ordini', { id_struttura: idStruttura, stato: 'inviato' }),
      eseguiMag('ordini', { id_struttura: idStruttura, stato: 'parziale' }),
    ])
      .then(([a, b]) => { if (!annullato) setOrdini([...a, ...b]) })
      .catch(() => { if (!annullato) setOrdini([]) })
    return () => { annullato = true }
  }, [idStruttura])
  return ordini
}

/** Righe ancora da ricevere di un ordine. */
export const residui = (o: Ordine) => o.righe
  .map(r => ({ ...r, residuo: Math.round((r.quantita - r.ricevuta) * 1000) / 1000 }))
  .filter(r => r.residuo > 0)
