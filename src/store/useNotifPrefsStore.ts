import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Preferenze di ricezione notifiche gestite dal Configuratore notifiche.
// `reportPickup` abilita la notifica "Report Pickup" nel menu campanella:
// se disattivata, la notifica (e quindi l'accesso al report) non viene mostrata.
interface NotifPrefsState {
  reportPickup: boolean
  setReportPickup: (v: boolean) => void
  // `reportCityTax` abilita la notifica "Report City Tax" (disponibilità del
  // report settimanale della tassa di soggiorno). Se disattivata, la notifica
  // e l'accesso al report dalla campanella non vengono mostrati.
  reportCityTax: boolean
  setReportCityTax: (v: boolean) => void
}

export const useNotifPrefsStore = create<NotifPrefsState>()(
  persist(
    (set) => ({
      reportPickup: true,
      setReportPickup: (v) => set({ reportPickup: v }),
      reportCityTax: true,
      setReportCityTax: (v) => set({ reportCityTax: v }),
    }),
    { name: 'sibylla.notif-prefs' },
  ),
)
