// ─── Pagine operative in versione tablet ──────────────────────────────────────
//  Le pagine del servizio che su tablet vanno a tutto schermo, nell'ordine in
//  cui le usa la sala. Sono le stesse per tutte le utenze (stand alone o con
//  l'hotel): cambia solo il dispositivo.
export const PAGINE_TABLET = [
  { page: 'fb-dashboard',       label: 'Dashboard',    ico: 'fa-gauge-high' },
  { page: 'sala-ristorante',    label: 'Sala',         ico: 'fa-chair' },
  { page: 'gest-comanda',       label: 'Comande',      ico: 'fa-receipt' },
  { page: 'libro-prenotazioni', label: 'Prenotazioni', ico: 'fa-book' },
  { page: 'ospiti-giorno',      label: 'Ospiti',       ico: 'fa-user-group' },
  { page: 'fb-kds',             label: 'Cucina',       ico: 'fa-fire-burner' },
  { page: 'fb-cassa',           label: 'Cassa',        ico: 'fa-cash-register' },
] as const
