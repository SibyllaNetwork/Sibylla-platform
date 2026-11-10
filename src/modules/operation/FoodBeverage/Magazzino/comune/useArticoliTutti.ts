// ─── Magazzino ristorazione: tutti gli articoli attivi ───────────────────────
//  Per le scelte "articolo" di righe, ricette e conte: legge `articoli` a
//  pagine da 200 (il massimo del § 8.0) finché non li ha tutti.

import { useCallback, useEffect, useState } from 'react'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Articolo } from '../api/tipi'

export function useArticoliTutti() {
  const [articoli, setArticoli] = useState<Articolo[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    let annullato = false
    ;(async () => {
      try {
        const tutti: Articolo[] = []
        for (let pagina = 1; ; pagina++) {
          const r = await eseguiMag('articoli', { pagina, per_pagina: 200 })
          tutti.push(...r.righe)
          if (tutti.length >= r.totale || r.righe.length === 0) break
        }
        if (!annullato) { setArticoli(tutti); setErrore(null) }
      } catch (e) {
        if (!annullato) setErrore(messaggioErrore(e))
      }
    })()
    return () => { annullato = true }
  }, [giro])

  const ricarica = useCallback(() => setGiro(g => g + 1), [])
  return { articoli, errore, ricarica }
}
