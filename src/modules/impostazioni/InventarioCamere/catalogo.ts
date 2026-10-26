// ─── Catalogo camere (condiviso da Inventario camere e Configurazione camera) ──

export const TIPI = ['Singola', 'Doppia', 'Twin', 'Matrimoniale', 'Tripla', 'Quadrupla', 'Family', 'Suite', 'Accessibile', 'DUS']
export const MAX_CAPACITA = 8
export const MAX_LETTI_EXTRA = 3
export const MAX_GALLERY = 6
export const MAX_DESCRIZIONE = 500

export const ospiti = (n: number) => `${n} ${n === 1 ? 'ospite' : 'ospiti'}`
export const lettiExtra = (n: number) => `${n} ${n === 1 ? 'letto extra' : 'letti extra'}`

// Caratteristiche raggruppate, ognuna con la sua icona (Font Awesome light).
export const AMENITY_GROUPS: { titolo: string; icona: string; voci: [string, string][] }[] = [
  {
    titolo: 'Comfort e dotazioni', icona: 'fa-couch', voci: [
      ['Aria condizionata', 'fa-snowflake'], ['Riscaldamento', 'fa-temperature-half'], ['TV a schermo piatto', 'fa-tv'],
      ['Insonorizzazione', 'fa-volume-xmark'], ['Scrivania', 'fa-briefcase'], ['Armadio o guardaroba', 'fa-shirt'],
      ['Cassaforte', 'fa-vault'], ['Presa elettrica vicino al letto', 'fa-plug'], ['Bollitore elettrico', 'fa-mug-hot'],
    ],
  },
  {
    titolo: 'Bagno', icona: 'fa-bath', voci: [
      ['Bagno privato', 'fa-bath'], ['Bagno in comune', 'fa-restroom'], ['Vasca', 'fa-hot-tub-person'], ['Bidet', 'fa-toilet'],
      ['Accappatoio', 'fa-vest'], ['Asciugamani', 'fa-layer-group'], ['Asciugacapelli', 'fa-wind'],
      ['Prodotti da bagno in omaggio', 'fa-pump-soap'], ['Pantofole', 'fa-shoe-prints'],
    ],
  },
  {
    titolo: 'Spazi esterni e servizi', icona: 'fa-bell-concierge', voci: [
      ['Balcone', 'fa-door-open'], ['Terrazza', 'fa-umbrella-beach'], ['Colazione', 'fa-mug-saucer'], ['Vino/champagne', 'fa-wine-glass'],
      ['Reception h24', 'fa-bell-concierge'], ['Dep. bagagli', 'fa-suitcase'], ['Accesso disabili', 'fa-wheelchair'],
    ],
  },
]
