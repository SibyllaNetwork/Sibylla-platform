import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  TEMPLATE_DEFAULT, TEMPLATE_PRONTI, normalizza, type TemplateSoggiorno,
} from '../modules/sales/preventivi/CreaPreventivo/templateSoggiorno'

// ─── Template personalizzati della mail del preventivo di soggiorno ──────────
//  I template pronti sono fissi (templateSoggiorno.ts); quelli creati dal
//  cliente con l'editor stanno qui. Mock persistito: il BE li salverà per
//  struttura/organizzazione.

interface TemplatePreventivoState {
  personali: TemplateSoggiorno[]
  salva: (t: TemplateSoggiorno) => void
  elimina: (id: string) => void
}

export const useTemplatePreventivoStore = create<TemplatePreventivoState>()(
  persist(
    (set) => ({
      personali: [],
      salva: (t) => set((s) => {
        const v = { ...t, pronto: false, aggiornato: new Date().toLocaleDateString('it-IT') }
        return {
          personali: s.personali.some((x) => x.id === t.id)
            ? s.personali.map((x) => (x.id === t.id ? v : x))
            : [v, ...s.personali],
        }
      }),
      elimina: (id) => set((s) => ({ personali: s.personali.filter((x) => x.id !== id) })),
    }),
    { name: 'sibylla.template-preventivo', version: 1 },
  ),
)

/** Template per id fra pronti e personali (sempre completo); default se non c'è più. */
export function templateDi(id: string | undefined, personali = useTemplatePreventivoStore.getState().personali): TemplateSoggiorno {
  const t = TEMPLATE_PRONTI.find((x) => x.id === id) ?? personali.find((x) => x.id === id)
  return t ? normalizza(t) : TEMPLATE_DEFAULT
}

export const useTemplate = (id: string | undefined) => {
  const personali = useTemplatePreventivoStore((s) => s.personali)
  return useMemo(() => templateDi(id, personali), [id, personali])
}
