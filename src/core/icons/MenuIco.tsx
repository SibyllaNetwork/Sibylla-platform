// ─── MENU ICO ─────────────────────────────────────────────────────────────────
// Icone della navigazione sidebar — Font Awesome Pro (Kit JS)
//
// API:  <MenuIco id="sales" s={14} c="rgba(255,255,255,0.65)" />
//
// Props:
//   id — id della voce menu (corrisponde a item.id in menu.ts)
//   s  — dimensione px (default 14)
//   c  — colore CSS (default rgba(255,255,255,0.4))
//   w  — weight: 'light' | 'regular' | 'solid' | 'thin' (default 'regular')
//
// Per aggiungere una nuova icona:
//   1. Cerca il nome su fontawesome.com/icons
//   2. Aggiungi una riga nella sezione appropriata di MENU_MAP

import React from 'react'

type IcoWeight = 'duotone' | 'light' | 'regular' | 'solid' | 'thin'

interface MenuIcoProps {
  id: string
  s?:  number
  c?:  string
  w?:  IcoWeight
  c2?: string
}

// ── Mappa id menu → classe FA ─────────────────────────────────────────────────

const MENU_MAP: Record<string, string> = {

  // ══ MACRO AREE (depth 2) ══════════════════════════════════════════════════
  'executive':              'fa-gauge-high',
  'sales':                  'fa-chart-line',
  'operation':              'fa-desktop',
  'purchasing':             'fa-cart-shopping',
  'hr':                     'fa-users',
  'finance':                'fa-coins',

  // ══ PROFILO (depth 2) ═════════════════════════════════════════════════════
  'modifica-profilo':       'fa-pen-to-square',
  'portafoglio':            'fa-briefcase',
  'scadenzario':            'fa-calendar-days',
  'gestisci-org':           'fa-sitemap',
  'gest-notifiche':         'fa-bell',
  'registro-sistema':       'fa-server',
  'dispositivi':            'fa-mobile-screen',

  // ══ PROFILO — Portafoglio (depth 3) ═══════════════════════════════════════
  'portafoglio-aziendale':  'fa-building-user',
  'portafoglio-personale':  'fa-user',

  // ══ PROFILO — Gestisci organizzazione (depth 3) ═══════════════════════════
  'reset-profili':          'fa-arrow-rotate-left',
  'ruoli-funzioni':         'fa-user-tag',
  'organigramma':           'fa-diagram-project',

  // ══ EXECUTIVE (depth 3) ═══════════════════════════════════════════════════
  'i-miei-business':        'fa-building',
  'i-miei-ristoranti':      'fa-utensils',
  'executive-overview':     'fa-eye',
  'business-centre':        'fa-buildings',
  'giornale-impresa':       'fa-book-open',
  'analisi-dist-exec':      'fa-chart-column',
  'gest-strategie':         'fa-chess',
  'cabina-controllo':       'fa-table-cells-large',

  // ══ SALES (depth 3) ═══════════════════════════════════════════════════════
  'analisi-dist-sales':     'fa-chart-column',
  'pricing-intelligence':   'fa-tag',
  'e-distribution':         'fa-globe',
  'gest-booking':           'fa-calendar-check',
  'gest-servizi':           'fa-bell-concierge',
  'gest-ricavi':            'fa-sack-dollar',
  'sales-overview':         'fa-chart-pie',

  // ══ OPERATION (depth 3) ═══════════════════════════════════════════════════
  'front-office':           'fa-building-columns',
  'food-beverage':          'fa-utensils',
  'gest-conti':             'fa-file-invoice',
  'gest-movimenti':         'fa-money-bill-transfer',
  'gest-documenti':         'fa-file-lines',
  'appop':                  'fa-mobile-screen-button',
  'ordine-servizio':        'fa-clipboard-list',

  // ══ PURCHASING (depth 3) ══════════════════════════════════════════════════
  'gest-acquisti':          'fa-bag-shopping',
  'gest-magazzino':         'fa-warehouse',
  'analisi-acquisti':       'fa-chart-pie',

  // ══ HR (depth 3) ══════════════════════════════════════════════════════════
  'registro-presenze':      'fa-clock',
  'turni-personale':        'fa-calendar-clock',
  'gest-anagrafiche':       'fa-address-book',
  'premio-performance':     'fa-trophy',
  'hr-overview':            'fa-eye',

  // ══ FINANCE (depth 3) ═════════════════════════════════════════════════════
  'gest-costi':             'fa-circle-minus',
  'controllo-gestione':     'fa-sliders',
  'budget-complessivo':     'fa-calculator',
  'revisione-budget':       'fa-rotate',
  'benchmark-fin':          'fa-ranking-star',
  'flusso-cassa':           'fa-wave-square',
  'archivio-contratti':     'fa-box-archive',

  // ══ IMPOSTAZIONI (depth 3) ════════════════════════════════════════════════
  'configuratore':          'fa-sliders',
  'il-mio-business':        'fa-house',

  // ══ DEPTH 4 — sotto-sezioni ═══════════════════════════════════════════════
  // Sales — Gestione delle strategie
  'pianifica-strat':            'fa-map',
  'calendario-master':          'fa-calendar-star',

  // Sales — Pricing Intelligence
  'sugg-data-driven':           'fa-lightbulb',
  'screening-open':             'fa-magnifying-glass-dollar',
  'pricing-benchmark':          'fa-scale-balanced',
  'pick-up':                    'fa-arrow-trend-up',
  'occ-analysis':               'fa-chart-pie',
  'adr-analysis':               'fa-euro-sign',

  // Sales — E-distribution
  'tariffe-disp':               'fa-tags',
  'prenotazioni-ids':           'fa-globe',
  'forecast-trends':            'fa-chart-line',
  'base-rate-builder':          'fa-hammer',

  // Sales — Gestione del booking
  'tableau-book':               'fa-table-list',
  'analisi-booking':            'fa-chart-line',
  'allocazione-risorse':        'fa-bars-staggered',
  'griglia-disp':               'fa-table',
  'griglia-disp-estesa':        'fa-table-cells-large',
  'assegnazione-book':          'fa-people-arrows',
  'voip':                       'fa-phone',
  'gest-chiamate':              'fa-headset',

  // Sales — Gestione dei servizi
  'crea-servizio':              'fa-circle-plus',
  'i-miei-servizi':             'fa-list-check',
  'gest-preventivi':            'fa-file-invoice',

  // Sales — Gestione dei ricavi
  'budget-ricavi':              'fa-money-bill-trend-up',
  'imposta-dist':               'fa-globe',
  'componi-annunci':            'fa-bullhorn',
  'budget-trends':              'fa-chart-bar',
  'contratti-vendita':          'fa-file-contract',

  // Operation — Front office
  'board':                      'fa-grid-2',
  'acquisti-servizi':           'fa-cart-plus',
  'gest-ospiti':                'fa-people-roof',

  // Operation — Food & Beverage
  'gest-comanda':               'fa-receipt',
  'sala-ristorante':            'fa-utensils',
  'libro-prenotazioni':         'fa-book',
  'ospiti-giorno':              'fa-users',

  // Operation — Gestione Conti
  'conti-aperti':               'fa-folder-open',
  'conti-passanti':             'fa-receipt',
  'conti-chiusi':               'fa-folder-closed',
  'nuovo-conto-passante':       'fa-file-circle-plus',

  // Operation — Gestione Movimenti
  'cassa':                      'fa-cash-register',
  'movimenti-attesa':           'fa-hourglass-half',
  'movimenti-soggiorno':        'fa-bed',

  // Operation — AppOp!
  'stato-camere':               'fa-broom',
  'segnalazioni':               'fa-bell-on',
  'assegnazioni-incarichi':     'fa-clipboard-list',
  'maintenance-analysis':       'fa-wrench',

  // Purchasing — Gestione centro acquisti
  'forniture':                  'fa-boxes-stacked',
  'acquisti-rete':              'fa-network-wired',
  'agora-purch':                'fa-handshake',
  'contratti-acquisto':         'fa-file-contract',

  // Purchasing — Gestione del magazzino
  'crea-magazzino':             'fa-warehouse',
  'movimenti-scorte':           'fa-right-left',
  'chiusure':                   'fa-lock',

  // Purchasing — Analisi acquisti
  'panoramica-acquisti':        'fa-chart-pie',
  'fatturazione-passiva':       'fa-file-invoice-dollar',

  // HR — Gestione anagrafiche
  'crea-anagrafica':            'fa-user-plus',
  'archivio-personale':         'fa-folder-open',
  'profile-analysis':           'fa-id-card',

  // HR — Premio performance
  'assegna-obiettivo':          'fa-bullseye',
  'monitoraggio-perf':          'fa-chart-line',

  // Finance — Gestione costi
  'budget-costi':               'fa-money-bill',
  'centro-costo':               'fa-bullseye',
  'cost-analysis':              'fa-chart-pie',

  // Finance — Controllo gestione
  'finance-overview':           'fa-eye',
  'verifiche-analitiche':       'fa-magnifying-glass-chart',
  'break-even':                 'fa-scale-balanced',
  'profit-analysis':            'fa-circle-dollar',

  // Finance — Revisione budget
  'simulatore':                 'fa-flask',
  'wif-analysis':               'fa-circle-question',

  // Finance — Flusso di cassa
  'monitoraggio-cassa':         'fa-eye',

  // Impostazioni — Il mio business
  'crea-struttura':             'fa-building-circle-arrow-right',
  'inventario-camere':          'fa-bed-front',
  'crea-outlet':                'fa-store',
  'riepilogo-bacheche':         'fa-clipboard-list',
  'sale-tavoli':                'fa-chair',

  // Impostazioni — Registro di sistema
  'log-sistema':                'fa-list',
  'monitoraggio-canali':        'fa-tower-broadcast',
  'interfacce':                 'fa-arrow-right-arrow-left',

  // Impostazioni — Dispositivi
  'totem':                      'fa-display',
  'i-miei-totem':               'fa-display',
  'gest-advertising':           'fa-rectangle-ad',

  // ══ GIORNALE IMPRESA — pagine foglia senza icona dedicata ═════════════════
  // Coprono i titoli delle card "page" della vista estesa (tutti i tab),
  // così MenuIco non ripiega mai sul dot di fallback.
  // Sales
  'crea-strategia':             'fa-chess-knight',
  'modifica-strategia':         'fa-chess',
  'calendario-strategie':       'fa-calendar-days',
  'monthly-trend':              'fa-chart-line',
  'grand-total':                'fa-calculator',
  'cal-annuale':                'fa-calendar',
  'piani-tar':                  'fa-money-check-dollar',
  'maggiorazioni':              'fa-percent',
  'crea-preventivo':            'fa-file-circle-plus',
  'i-miei-preventivi':          'fa-file-invoice',
  'budget-analysis':            'fa-chart-column',
  'segment-analysis':           'fa-chart-pie',
  'miei-contratti-v':           'fa-file-contract',
  'inserisci-contratto-v':      'fa-file-signature',
  'crea-azienda-v':             'fa-building-circle-plus',
  // Operation
  'arrivi-partenze':            'fa-arrows-left-right',
  'ospiti-in-casa':             'fa-house-user',
  'anagrafiche-op':             'fa-address-card',
  'schedine':                   'fa-passport',
  'rilevamento-presenze':       'fa-user-check',
  'analisi-occ':                'fa-chart-pie',
  // Purchasing
  'servizi':                    'fa-bell-concierge',
  'crea-azienda-a':             'fa-building-circle-plus',
  'agora-announcements-manage': 'fa-bullhorn',
  'crea-acquisto':              'fa-cart-plus',
  'agora-accommodations':       'fa-hotel',
  'agora-home':                 'fa-house',
  'preliminare':                'fa-clipboard-check',
  'registro-chiusure':          'fa-rectangle-list',
  'crea-prodotto':              'fa-box',
  'lista-prodotti':             'fa-boxes-stacked',
  // HR
  'agora-academy':              'fa-graduation-cap',
  // Finance
  'ledger-analysis':            'fa-book-open',
  'cashflow':                   'fa-money-bill-wave',
  'profit-trend':               'fa-arrow-trend-up',
}

export default function MenuIco({ id, s = 14, c = 'rgba(255,255,255,0.4)', c2, w = 'duotone' }: MenuIcoProps) {
  const faName = MENU_MAP[id]

  if (!faName) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[MenuIco] icona non trovata: "${id}" — aggiungi a MENU_MAP in MenuIco.tsx`)
    }
    // Fallback: dot SVG (non dipende da FA)
    const dotSize = Math.max(4, Math.round(s * 0.35))
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s,
        flexShrink: 0,
      }}>
        <span style={{
          width: dotSize, height: dotSize,
          borderRadius: '50%',
          background: c,
          flexShrink: 0,
          display: 'inline-block',
        }} />
      </span>
    )
  }

  return (
    <i
      className={`fa-${w} ${faName}`}
      style={{ fontSize: s, color: c, flexShrink: 0, ...(c2 && w === 'duotone' ? { '--fa-primary-color': c, '--fa-secondary-color': c2 } as any : {}) }}
    />
  )
}
