// ─────────────────────────────────────────────────────────────────────────────
//  Menu "Amministrazione piattaforma" — mostrato nella sidenav (al posto del menu
//  utente) quando si entra nella sezione di amministrazione piattaforma dalla
//  Sibylla System Administration Console. Le pagine usano il prefisso `pa-`.
// ─────────────────────────────────────────────────────────────────────────────

export interface PAItem {
  id: string
  label: string
  page: string
}

export interface PAGroup {
  id: string
  label: string
  icon: string
  items: PAItem[]
}

export const PLATFORM_ADMIN_MENU: PAGroup[] = [
  {
    id: 'pa-gestione-clienti', label: 'Gestione Clienti', icon: 'org',
    items: [
      { id: 'pa-crea-azienda',      label: 'Crea azienda',          page: 'pa-crea-azienda' },
      { id: 'pa-aziende-mapping',   label: 'Aziende mapping',       page: 'pa-aziende-mapping' },
      { id: 'pa-gestione-aziende',  label: 'Gestione delle aziende', page: 'pa-gestione-aziende' },
      { id: 'pa-crea-deposito',     label: 'Crea Deposito',         page: 'pa-crea-deposito' },
    ],
  },
  {
    id: 'pa-amministrazione', label: 'Amministrazione', icon: 'sliders',
    items: [
      { id: 'pa-commissioni',          label: 'Commissioni',              page: 'pa-commissioni' },
      { id: 'pa-gestione-bonifici',    label: 'Gestione dei bonifici',    page: 'pa-gestione-bonifici' },
      { id: 'pa-gestione-commissioni', label: 'Gestione delle comissioni', page: 'pa-gestione-commissioni' },
      { id: 'pa-addebiti-tableau',     label: 'Gestisci addebiti tableau', page: 'pa-addebiti-tableau' },
      { id: 'pa-commissione-dinamica', label: 'Commissione Dinamica',     page: 'pa-commissione-dinamica' },
    ],
  },
  {
    id: 'pa-bookings', label: 'Bookings', icon: 'calendar',
    items: [
      { id: 'pa-tableau-extra', label: 'Tableau Extra', page: 'pa-tableau-extra' },
    ],
  },
  {
    id: 'pa-configura', label: 'Configura', icon: 'gear',
    items: [
      { id: 'pa-gestione-pagine',      label: 'Gestione Pagine',                page: 'pa-gestione-pagine' },
      { id: 'pa-soggiorno',            label: 'Soggiorno',                      page: 'pa-soggiorno' },
      { id: 'pa-codice-sconti',        label: 'Codice Sconti',                  page: 'pa-codice-sconti' },
      { id: 'pa-processi-automatici',  label: 'Gestione dei processi automatici', page: 'pa-processi-automatici' },
      { id: 'pa-gestisci-commissioni', label: 'Gestisci Commissioni',           page: 'pa-gestisci-commissioni' },
      { id: 'pa-cachemanager',         label: 'CacheManager',                   page: 'pa-cachemanager' },
    ],
  },
]

/** Voce in fondo al menu: apre il pannello in modalità Piattaforma. */
export const PLATFORM_ADMIN_PLATFORM_PAGE = 'pa-piattaforma'

/** Pagina di atterraggio quando si apre l'Amministrazione piattaforma. */
export const PLATFORM_ADMIN_HOME = 'pa-crea-azienda'

export function isPlatformAdminPage(page: string): boolean {
  return typeof page === 'string' && page.startsWith('pa-')
}

export function platformAdminLabel(page: string): string {
  for (const g of PLATFORM_ADMIN_MENU) {
    const it = g.items.find(i => i.page === page)
    if (it) return it.label
  }
  return 'Amministrazione piattaforma'
}

export function platformAdminGroupOf(page: string): string {
  for (const g of PLATFORM_ADMIN_MENU) {
    if (g.items.some(i => i.page === page)) return g.label
  }
  return ''
}
