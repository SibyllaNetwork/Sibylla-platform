import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Modal from '../../../core/components/Modal'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { SelectField } from '../../../core/components/form'
import { exportTableToXls } from '../../../modules/sales/booking/GrigliaDisponibilita/exportGriglia'
import './WalletSibylla.sass'

interface Props { navigate: (p: string) => void }

// ─── Modello ──────────────────────────────────────────────────────────────────
// Un solo elenco di movimenti: da qui si derivano depositi, residui, VCC emesse
// e i totali delle card, così i numeri della pagina sono sempre coerenti.
type Azione = 'deposito' | 'ricarica' | 'vendita' | 'acquisto'
type TipoMov = 'Incasso' | 'Pagamento'

interface Mov {
  /** ISO locale (YYYY-MM-DDTHH:mm): ordina e si formatta per la tabella. */
  ts: string
  partner: string
  azione: Azione
  idPren: string
  struttura: string
  /** Importo lordo del movimento. */
  totale: number
  /** Commissione trattenuta da Sibylla (solo sui pagamenti). */
  commissione: number
  /** Valore della VCC emessa verso la struttura (solo sui pagamenti). */
  hotel: number
  tipo: TipoMov
  /** Pagamenti: la VCC è stata transata dalla struttura? */
  transata?: boolean
}

// Percentuale di deposito residuo sotto la quale scatta il primo sollecito:
// il valore arriva dall'anagrafica del partner (pagina "Crea deposito").
const SOGLIA_PRIMO_SOLLECITO: Record<string, number> = {
  'G2 Travel': 20,
  'Travco': 25,
  'Italcamel': 15,
  'Virtuous': 30,
  'Imperatore Travel': 20,
  'Tui Italia': 10,
}

// Commissione applicata al partner (da "Gestione delle commissioni").
const COMMISSIONE: Record<string, number> = {
  'G2 Travel': 5,
  'Travco': 6,
  'Italcamel': 5,
  'Virtuous': 4.5,
  'Imperatore Travel': 5,
  'Tui Italia': 6,
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Incasso: refill del deposito da parte del partner. */
const incasso = (ts: string, partner: string, azione: Azione, idPren: string, totale: number): Mov =>
  ({ ts, partner, azione, idPren, struttura: '—', totale, commissione: 0, hotel: 0, tipo: 'Incasso' })

/** Pagamento: vendita del partner ed emissione della VCC verso la struttura. */
const pagamento = (
  ts: string, partner: string, struttura: string, idPren: string, totale: number, transata: boolean,
): Mov => {
  const commissione = r2(totale * (COMMISSIONE[partner] ?? 5) / 100)
  return { ts, partner, azione: 'vendita', idPren, struttura, totale, commissione, hotel: r2(totale - commissione), tipo: 'Pagamento', transata }
}

const MOVIMENTI: Mov[] = [
  // ── Depositi e ricariche ──
  incasso('2026-08-24T09:10', 'G2 Travel',         'deposito', 'G2-DEP-20260824',    50000),
  incasso('2026-08-24T11:35', 'Travco',            'deposito', 'TRV-DEP-20260824',   30000),
  incasso('2026-08-25T08:50', 'Italcamel',         'deposito', 'ITC-DEP-20260825',   25000),
  incasso('2026-08-25T15:20', 'Virtuous',          'deposito', 'VIR-DEP-20260825',   15000),
  incasso('2026-08-26T10:05', 'Imperatore Travel', 'deposito', 'IMP-DEP-20260826',   12000),
  incasso('2026-08-26T16:40', 'Tui Italia',        'deposito', 'TUI-DEP-20260826',   40000),
  incasso('2026-09-08T09:15', 'G2 Travel',         'ricarica', 'G2-RIC-20260908',    20000),
  // ── Vendite: emissione VCC verso la struttura ──
  pagamento('2026-09-01T10:20', 'G2 Travel',         'Hotel Archimede',     'G2TEST-20260901-001',   4200, true),
  pagamento('2026-09-02T12:05', 'Travco',            'Hotel Miramare',      'TRAVCO-20260902-001',   9800, true),
  pagamento('2026-09-02T17:45', 'Italcamel',         'Grand Hotel Vesuvio', 'ITALCAMEL-20260902-001', 6100, false),
  pagamento('2026-09-03T09:30', 'Virtuous',          'Hotel Bellavista',    'VIRTUOUS-20260903-001', 7900, true),
  pagamento('2026-09-04T11:10', 'G2 Travel',         'Resort Le Dune',      'G2TEST-20260904-002',   3600, true),
  pagamento('2026-09-05T14:25', 'Travco',            'Hotel Archimede',     'TRAVCO-20260905-002',   7400, false),
  pagamento('2026-09-07T10:40', 'Tui Italia',        'Hotel Miramare',      'TUI-20260907-001',      5250, true),
  pagamento('2026-09-07T16:15', 'Imperatore Travel', 'Hotel Bellavista',    'IMP-20260907-001',      1980, true),
  pagamento('2026-09-08T11:50', 'Italcamel',         'Resort Le Dune',      'ITALCAMEL-20260908-002', 3200, true),
  pagamento('2026-09-09T09:05', 'Virtuous',          'Grand Hotel Vesuvio', 'VIRTUOUS-20260909-002', 4700, false),
  pagamento('2026-09-09T15:30', 'G2 Travel',         'Hotel Miramare',      'G2TEST-20260909-003',   2950, true),
  pagamento('2026-09-10T10:00', 'Travco',            'Hotel Bellavista',    'TRAVCO-20260910-003',   5200, true),
  pagamento('2026-09-10T18:20', 'Tui Italia',        'Resort Le Dune',      'TUI-20260910-002',      4500, false),
  pagamento('2026-09-11T09:45', 'Italcamel',         'Hotel Archimede',     'ITALCAMEL-20260911-003', 2000, true),
  pagamento('2026-09-11T14:35', 'Imperatore Travel', 'Grand Hotel Vesuvio', 'IMP-20260911-002',      1500, true),
  pagamento('2026-09-12T11:25', 'Travco',            'Hotel Miramare',      'TRAVCO-20260912-004',   2500, false),
  pagamento('2026-09-12T17:05', 'G2 Travel',         'Hotel Bellavista',    'G2TEST-20260912-004',   3000, true),
]

const PAGE_SIZE = 10
const AZIONE_LABEL: Record<Azione, string> = {
  deposito: 'Deposito', ricarica: 'Ricarica', vendita: 'Vendita', acquisto: 'Acquisto',
}

// `useGrouping: 'always'`: in it-IT i numeri di 4 cifre non sarebbero raggruppati
// (regola CLDR "min2") e in colonna 5100,00 € stonerebbe accanto a 12.000,00 €.
const NUM = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as any,
})
const eur = (n: number) => `${NUM.format(n)} €`
const pct = (n: number) =>
  `${n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
const dataOra = (ts: string) => {
  const [d, h] = ts.split('T')
  const [y, m, g] = d.split('-')
  return `${g}/${m}/${y}, ${h}`
}

export default function WalletSibylla({ navigate }: Props) {
  const [partner, setPartner] = useState('')
  const [tipo, setTipo] = useState('')
  const [page, setPage] = useState(1)
  const [vccOpen, setVccOpen] = useState(false)

  const partners = useMemo(
    () => Array.from(new Set(MOVIMENTI.map(m => m.partner))).sort(), [])

  // Depositi per partner: versato (incassi), residuo (versato − venduto lordo)
  // e percentuale residua confrontata con la soglia del primo sollecito.
  const depositi = useMemo(() => partners.map(p => {
    const mov = MOVIMENTI.filter(m => m.partner === p)
    const versato = mov.filter(m => m.tipo === 'Incasso').reduce((s, m) => s + m.totale, 0)
    const speso = mov.filter(m => m.tipo === 'Pagamento').reduce((s, m) => s + m.totale, 0)
    const residuo = r2(versato - speso)
    const perc = versato ? r2(residuo / versato * 100) : 0
    const soglia = SOGLIA_PRIMO_SOLLECITO[p] ?? 20
    return { partner: p, versato, residuo, perc, soglia, allerta: perc <= soglia }
  }), [partners])

  const totaleDepositi = depositi.reduce((s, d) => s + d.versato, 0)

  // VCC emesse: una per ogni pagamento verso la struttura.
  const vcc = useMemo(() => MOVIMENTI.filter(m => m.tipo === 'Pagamento')
    .sort((a, b) => a.ts.localeCompare(b.ts)), [])
  const vccImporto = r2(vcc.reduce((s, m) => s + m.hotel, 0))
  const vccNonTransate = vcc.filter(m => !m.transata)
  const vccImportoNonTransato = r2(vccNonTransate.reduce((s, m) => s + m.hotel, 0))
  // Liquidità in cassa: quanto incassato dai partner meno quanto già girato
  // alle strutture con le VCC (depositi residui + commissioni trattenute).
  const creditoTotale = r2(totaleDepositi - vccImporto)

  const filtered = useMemo(() => MOVIMENTI
    .filter(m => (!partner || m.partner === partner) && (!tipo || m.tipo === tipo))
    .sort((a, b) => b.ts.localeCompare(a.ts)), [partner, tipo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [partner, tipo])
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const esportaXls = () => {
    const header = ['Data movimento', 'Partner', 'Azione', 'ID prenotazione', 'Importo totale', 'Commissione', 'Importo hotel', 'Tipo movimento']
    const data = filtered.map(m => [
      dataOra(m.ts), m.partner, AZIONE_LABEL[m.azione], m.idPren,
      eur(m.totale), m.tipo === 'Pagamento' ? eur(m.commissione) : '—',
      m.tipo === 'Pagamento' ? eur(m.hotel) : '—', m.tipo,
    ])
    exportTableToXls('wallet-sibylla.xls', header, data, 'Wallet Sibylla')
  }

  // Tabella mostrata all'hover della card "Totale dei depositi".
  const depositiTable = (
    <span className="wsb-dep">
      <span className="wsb-dep__title">Deposito residuo per partner</span>
      <table className="wsb-dep__table">
        <thead>
          <tr>
            <th>Partner</th>
            <th className="wsb-dep__num">Versato</th>
            <th className="wsb-dep__num">Residuo</th>
            <th className="wsb-dep__num">%</th>
          </tr>
        </thead>
        <tbody>
          {depositi.map(d => (
            <tr key={d.partner} className={d.allerta ? 'wsb-dep__row--alert' : undefined}>
              <td>{d.partner}</td>
              <td className="wsb-dep__num">{eur(d.versato)}</td>
              <td className="wsb-dep__num">{eur(d.residuo)}</td>
              <td className="wsb-dep__num wsb-dep__perc">{pct(d.perc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="wsb-dep__note">In rosso i partner che hanno raggiunto la soglia del primo sollecito impostata in «Crea deposito».</span>
    </span>
  )

  return (
    <div className="wsb">
      <button type="button" className="wsb__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="wsb__head">
        <h1 className="wsb__title">Wallet Sibylla</h1>
        <p className="wsb__sub">Depositi dei partner, commissioni trattenute e VCC emesse verso le strutture.</p>
      </div>

      <div className="wsb__cards">
        <div className="sib-stat-card wsb__card">
          <span className="sib-stat-card__label">Credito totale Sibylla</span>
          <span className="sib-stat-card__value">{eur(creditoTotale)}</span>
          <span className="wsb__card-hint">Depositi residui e commissioni trattenute</span>
        </div>

        <Tooltip variant="light" position="bottom" content={depositiTable}>
          <span className="sib-stat-card wsb__card wsb__card--hover">
            <span className="sib-stat-card__label">
              Totale dei depositi <Ico n="info" s={12} c="var(--color-primary)" />
            </span>
            <span className="sib-stat-card__value">{eur(totaleDepositi)}</span>
            <span className="wsb__card-hint">Ricevuti dai partner — passa il mouse per il residuo</span>
          </span>
        </Tooltip>

        <div className="sib-stat-card wsb__card">
          <span className="sib-stat-card__label">N° VCC emesse</span>
          <span className="sib-stat-card__value">
            {vcc.length}
            <span className="wsb__card-alert">di cui {vccNonTransate.length} non transate</span>
          </span>
          <span className="wsb__card-hint">Carte virtuali emesse verso le strutture</span>
        </div>

        <button type="button" className="sib-stat-card wsb__card wsb__card--btn" onClick={() => setVccOpen(true)}>
          <span className="sib-stat-card__label">Importo VCC emesse</span>
          <span className="sib-stat-card__value">{eur(vccImporto)}</span>
          <span className="wsb__card-hint">Clicca per il dettaglio delle VCC</span>
        </button>
      </div>

      <div className="wsb__toolbar">
        <SelectField
          name="partner"
          label="Partner"
          className="wsb__field"
          value={partner}
          onChange={e => setPartner(e.target.value)}
          options={[{ value: '', label: 'Tutti' }, ...partners.map(p => ({ value: p, label: p }))]}
        />
        <SelectField
          name="tipo"
          label="Tipo movimento"
          className="wsb__field"
          value={tipo}
          onChange={e => setTipo(e.target.value)}
          options={[
            { value: '', label: 'Tutti' },
            { value: 'Incasso', label: 'Incasso' },
            { value: 'Pagamento', label: 'Pagamento' },
          ]}
        />
        <button type="button" className="sib-btn sib-btn--icon wsb__xls" aria-label="Esporta in Excel" onClick={esportaXls}>
          <i className="fa-regular fa-file-xls" aria-hidden="true" />
        </button>
      </div>

      <p className="wsb__nota">L'azione «acquisto» sarà disponibile in una fase successiva.</p>

      <div className="sib-table-wrap wsb__wrap">
        <table className="sib-table wsb__table">
          {/* Larghezze in percentuale + table-layout fixed: mai scroll orizzontale. */}
          <colgroup>
            <col className="wsb__col-data" />
            <col className="wsb__col-partner" />
            <col className="wsb__col-azione" />
            <col className="wsb__col-pren" />
            <col className="wsb__col-imp" />
            <col className="wsb__col-imp" />
            <col className="wsb__col-imp" />
            <col className="wsb__col-tipo" />
          </colgroup>
          <thead>
            <tr>
              <th><ThLabel full="Data movimento" short="Data mov." /></th>
              <th><ThLabel full="Partner" /></th>
              <th><ThLabel full="Azione" /></th>
              <th><ThLabel full="ID prenotazione" short="ID pren." /></th>
              <th className="wsb__num"><ThLabel full="Importo totale" short="Imp. totale" /></th>
              <th className="wsb__num"><ThLabel full="Commissione" short="Comm." /></th>
              <th className="wsb__num"><ThLabel full="Importo hotel" short="Imp. hotel" /></th>
              <th><ThLabel full="Tipo movimento" short="Tipo mov." /></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="wsb__empty">Nessun movimento con i filtri selezionati.</td></tr>
            )}
            {rows.map(m => (
              <tr key={`${m.ts}-${m.idPren}`}>
                <td className="wsb__nowrap">{dataOra(m.ts)}</td>
                <td className="wsb__strong"><TruncatedText text={m.partner} /></td>
                <td><span className={`wsb__badge wsb__badge--${m.azione}`}>{AZIONE_LABEL[m.azione]}</span></td>
                <td><TruncatedText text={m.idPren} /></td>
                <td className="wsb__num wsb__nowrap">{eur(m.totale)}</td>
                <td className="wsb__num wsb__nowrap wsb__comm">{m.tipo === 'Pagamento' ? eur(m.commissione) : '—'}</td>
                <td className="wsb__num wsb__nowrap wsb__hotel">{m.tipo === 'Pagamento' ? eur(m.hotel) : '—'}</td>
                <td><span className={`wsb__tipo wsb__tipo--${m.tipo === 'Incasso' ? 'in' : 'out'}`}>{m.tipo}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="wsb__pag">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal open={vccOpen} onClose={() => setVccOpen(false)} title="Importo VCC emesse" size="lg" className="wsb-vcc">
        <p className="wsb-vcc__sub">Ripartizione tra importi transati e non transati, per partner.</p>
        <div className="wsb-vcc__tot">
          <div className="wsb-vcc__box">
            <span className="wsb-vcc__box-label">Totale emesse</span>
            <span className="wsb-vcc__box-value">{eur(vccImporto)}</span>
          </div>
          <div className="wsb-vcc__box wsb-vcc__box--alert">
            <span className="wsb-vcc__box-label">Totale non transate</span>
            <span className="wsb-vcc__box-value">{eur(vccImportoNonTransato)}</span>
          </div>
        </div>
        <div className="sib-table-wrap wsb-vcc__wrap">
          <table className="sib-table wsb-vcc__table">
            <colgroup>
              <col className="wsb-vcc__col-partner" />
              <col className="wsb-vcc__col-struttura" />
              <col className="wsb-vcc__col-pren" />
              <col className="wsb-vcc__col-imp" />
              <col className="wsb-vcc__col-imp" />
            </colgroup>
            <thead>
              <tr>
                <th><ThLabel full="Partner" /></th>
                <th><ThLabel full="Struttura" /></th>
                <th><ThLabel full="ID prenotazione" short="ID pren." /></th>
                <th className="wsb__num"><ThLabel full="Transato" /></th>
                <th className="wsb__num"><ThLabel full="Non transato" short="Non trans." /></th>
              </tr>
            </thead>
            <tbody>
              {vcc.map(m => (
                <tr key={`vcc-${m.idPren}`}>
                  <td className="wsb__strong"><TruncatedText text={m.partner} /></td>
                  <td><TruncatedText text={m.struttura} /></td>
                  <td><TruncatedText text={m.idPren} /></td>
                  <td className="wsb__num wsb__nowrap wsb-vcc__ok">{m.transata ? eur(m.hotel) : '—'}</td>
                  <td className="wsb__num wsb__nowrap wsb-vcc__ko">{m.transata ? '—' : eur(m.hotel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
