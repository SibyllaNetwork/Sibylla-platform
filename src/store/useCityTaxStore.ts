import { create } from 'zustand'
import type { CityTaxStato } from '../modules/finance/ReportCityTax/cityTaxExcel'

// Stato di pagamento della tassa di soggiorno per singolo ospite, registrato al
// check-out (pop-up motivo del mancato pagamento). Alimenta le colonne Stato e
// Motivazione dell'Excel City Tax.

export interface CityTaxRecord { stato: CityTaxStato; motivazione?: string }

interface CityTaxState {
  records: Record<string, CityTaxRecord>
  setRecord: (key: string, rec: CityTaxRecord) => void
}

export const useCityTaxStore = create<CityTaxState>((set) => ({
  records: {},
  setRecord: (key, rec) => set((s) => ({ records: { ...s.records, [key]: rec } })),
}))
