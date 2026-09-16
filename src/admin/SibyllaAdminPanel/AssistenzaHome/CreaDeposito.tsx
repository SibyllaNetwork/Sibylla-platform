// ─── Anagrafiche e depositi ───────────────────────────────────────────────────
//  Le stesse aziende clienti lette in due modi, uno per tab:
//   • Anagrafiche — chi è l'azienda: dati fiscali, sede, contatti
//   • Depositi    — quanto ha a credito, le soglie di sollecito, la commissione
//  La scheda azienda è una sola e le contiene entrambe: si apre dall'una o
//  dall'altra tabella, perché il record è lo stesso.
import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Modal from '../../../core/components/Modal'
import { InputField, SelectField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { toast } from '../../../core/components/Toast/useToast'
import './CreaDeposito.sass'

interface Props {
  navigate: (p: string) => void
}

interface Azienda {
  id: number
  // ── Dati azienda ──
  ragione: string
  indirizzo: string
  via: string
  citta: string
  cap: string
  nazione: string
  email: string
  telefono: string
  piva: string
  cf: string
  sdi: string
  pec: string
  partner: string
  // ── Referenti e soglie ──
  sales: string
  mailFinance: string
  mailSales: string
  primoSollecito: number
  secondoSollecito: number
  stopSales: number
  commissione: number
  baseAmount: string
  sorgente: string
  /** Codice alfanumerico con cui la sorgente identifica l'azienda. */
  resId: string
  // ── Deposito ──
  deposito: number
}

/** Canale di provenienza della prenotazione (ResID_Source Vertical Booking). */
const SORGENTI = ['Vertical Booking', 'Booking.com', 'Expedia', 'Sito diretto', 'XML partner']

const az = (
  id: number, ragione: string, sales: string, deposito: number,
  primo: number, secondo: number, stop: number, comm: number,
  mailFinance: string, mailSales: string, partner = '',
  extra: Partial<Azienda> = {},
): Azienda => ({
  id, ragione, partner, sales, deposito,
  primoSollecito: primo, secondoSollecito: secondo, stopSales: stop, commissione: comm,
  mailFinance, mailSales,
  indirizzo: '', via: '', citta: '', cap: '', nazione: 'Italia',
  email: mailFinance, telefono: '', piva: '', cf: '', sdi: '', pec: '',
  baseAmount: '', sorgente: SORGENTI[0], resId: '',
  ...extra,
})

const SEED: Azienda[] = [
  az(1, 'DOTW', 'Pellegrini', 500, 15, 10, 0, 2, 'mail@mail.it', 'mail@mail.it', '', {
    via: 'Via Torino 12', citta: 'Milano', cap: '20123', piva: 'IT01234567890',
    telefono: '+39 02 1122334', sdi: 'SUBM70N', pec: 'dotw@pec.it', resId: 'VB7K4Q2A',
  }),
  az(2, 'Azienda test', 'mail@mail.it', 99700, 0, 0, 0, 0, 'mail@mail.it', 'mail@mail.it', '', { resId: 'VB1D9X30' }),
  az(3, 'Virtuous', 'Fabrizio Guidoni', 99882, 15, 10, 0, 0, 'mail@gmail.com', 'mail@gmail.com', '', {
    via: 'Viale Europa 8', citta: 'Roma', cap: '00144', piva: 'IT09876543210', telefono: '+39 06 5544332', resId: 'VB55TR81',
  }),
  az(4, 'azienda test', 'mario', 0, 15, 20, 15, 0, 'mail@mail.it', 'mail@mail.it', '', { resId: 'VB2M6L07' }),
  az(5, 'Travco', 'Alessandro Ubaldi', 99888, 15, 10, 0, 0, 'aubaldi@mail.it', 'aubaldi@mail.it', '', {
    via: 'Corso Vittorio 44', citta: 'Napoli', cap: '80133', piva: 'IT11223344556', resId: 'VB8N3C45',
  }),
  az(6, 'webbeds', 'pellegrino', 99381, 15, 10, 0, 2, 'pellegrino@mail.it', 'sales@test.it', '', {
    citta: 'Dubai', nazione: 'Emirati Arabi Uniti', resId: 'WB40KP12',
  }),
  az(7, 'Travltino', 'mail@test.com', 99608, 15, 10, 0, 2, 'mail@test.com', 'mail@test.com', '', { resId: 'VB77BZ09' }),
  az(8, 'G2 TEST VCC', 'FEDERICO REA', 98706, 85, 90, 100, 4,
    'f.poliziani@sibyllanetwork.com', 'f.poliziani@sibyllanetwork.com', '', { resId: 'G2V5X108' }),
  az(9, 'SERHS', '', -3044.47, 0, 0, 0, 0, '', '', 'SERHS', {
    citta: 'Barcellona', nazione: 'Spagna', resId: 'SRH3092B',
  }),
  az(10, 'Expedia', 'a.capoccetti@sibyllanetwork.com', 5000, 30, 20, 10, 0,
    'a.capoccetti@sibyllanetwork.com', 'a.capoccetti@sibyllanetwork.com', '', {
      citta: 'Seattle', nazione: 'Stati Uniti', sorgente: 'Expedia', resId: 'EXP6A20D',
  }),
  az(11, 'ITALCAMEL', 'Rossi Mario', 12500, 10, 5, 0, 3, 'finance@italcamel.it', 'm.rossi@italcamel.it', '', {
    via: 'Via del Mare 3', citta: 'Rimini', cap: '47921', piva: 'IT55667788990', telefono: '+39 0541 223344', resId: 'VB09LM34',
  }),
  az(12, 'Tui Italia', 'Rossi Mario', 145000, 20, 10, 5, 2, 'finance@tuitalia.it', 'm.rossi@tuitalia.it', '', {
    via: 'Via Melchiorre Gioia 8', citta: 'Milano', cap: '20124', piva: 'IT33445566778', resId: 'TUI71K05',
  }),
  az(13, 'Imperatore Travel', 'Bianchi Anna', 26780.4, 15, 10, 0, 2.5,
    'finance@imperatoretravel.it', 'a.bianchi@imperatoretravel.it', '', {
      via: 'Via Marina 1', citta: 'Napoli', cap: '80133', piva: 'IT99887766554', resId: 'IMP4C812',
  }),
  az(14, 'Hassab srl', 'Bianchi Anna', 7320, 15, 10, 0, 0,
    'amministrazione@hassab.it', 'a.bianchi@hassab.it', '', { citta: 'Alessandria d’Egitto', nazione: 'Egitto', resId: 'HSB2903F',
  }),
  az(15, 'Ovest Destination Italy', '', 3400.75, 0, 0, 0, 0,
    'finance@ovestdestination.it', '', 'Ovest Destination Italy', { citta: 'Torino', cap: '10121', resId: 'OVD5511A',
  }),
  az(16, 'Debus snc', 'Verdi Luca', 58.9, 0, 0, 0, 0, '', 'l.verdi@debus.it', '', {
    citta: 'Bergamo', cap: '24122', piva: 'IT12312312311', resId: 'DBS7420C',
  }),
  az(17, 'Tui Poland', '', 980.5, 0, 0, 0, 0, 'finance@tuipoland.pl', '', '', {
    citta: 'Varsavia', nazione: 'Polonia', resId: 'TUP3308E',
  }),
  az(18, 'test58', '', 0, 0, 0, 0, 0, '', '', 'test58', { resId: 'TST5801K' }),
]

const PAGE_SIZE = 10
// Etichetta con cui le celle vuote entrano nei filtri a imbuto.
const VUOTO = '—'

const euro = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€'
const perc = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

const ROLLING_PARTNERS = [
  { partner: '-', deposito: '0,00€', stato: 'Ongoing' },
  { partner: 'Ovest Destination Italy', deposito: '0,00€', stato: 'Ongoing' },
  { partner: 'test58', deposito: '0,00€', stato: 'Ongoing' },
]

// ── Scheda azienda ────────────────────────────────────────────────────────────
//  Gli stessi campi del modulo originale, in due sezioni: prima chi è l'azienda,
//  poi chi la segue e con quali soglie.
type Campo = { k: keyof Azienda; label: string; span?: 2; ph?: string; req?: boolean; num?: boolean }

const CAMPI_AZIENDA: Campo[] = [
  { k: 'ragione',   label: 'Ragione sociale', req: true, ph: 'Inserisci nome azienda' },
  { k: 'indirizzo', label: 'Indirizzo', span: 2, ph: 'Digita almeno 3 caratteri' },
  { k: 'via',       label: 'Via e numero civico' },
  { k: 'citta',     label: 'Città' },
  { k: 'cap',       label: 'CAP' },
  { k: 'nazione',   label: 'Nazione' },
  { k: 'email',     label: 'E-mail' },
  { k: 'telefono',  label: 'Telefono' },
  { k: 'piva',      label: 'P. IVA' },
  { k: 'cf',        label: 'Codice fiscale' },
  { k: 'sdi',       label: 'Codice destinatario (SDI)' },
  { k: 'pec',       label: 'PEC' },
  { k: 'partner',   label: 'Nome ditta / Partner', ph: 'Inserisci nome partner' },
]

const CAMPI_REFERENTI: Campo[] = [
  { k: 'sales',            label: 'Sales Manager', req: true, ph: 'Inserisci sales manager' },
  { k: 'mailFinance',      label: 'Email Finance', req: true, ph: 'Inserisci email finance' },
  { k: 'mailSales',        label: 'Email Sales Manager', req: true, ph: 'Inserisci email sales manager' },
  { k: 'primoSollecito',   label: 'Primo sollecito', req: true, num: true },
  { k: 'secondoSollecito', label: 'Secondo sollecito', req: true, num: true },
  { k: 'stopSales',        label: 'Stop sales', req: true, num: true },
  { k: 'commissione',      label: 'Commissione', num: true },
  { k: 'baseAmount',       label: 'Base Amount' },
]

const vuota = (id: number): Azienda => ({
  id, ragione: '', indirizzo: '', via: '', citta: '', cap: '', nazione: '',
  email: '', telefono: '', piva: '', cf: '', sdi: '', pec: '', partner: '',
  sales: '', mailFinance: '', mailSales: '',
  primoSollecito: 0, secondoSollecito: 0, stopSales: 0, commissione: 0,
  baseAmount: '', sorgente: '', resId: '', deposito: 0,
})

type Tab = 'anagrafiche' | 'depositi'

export default function CreaDeposito({ navigate }: Props) {
  const [aziende, setAziende] = useState<Azienda[]>(SEED)
  const [tab, setTab] = useState<Tab>('anagrafiche')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const confirm = useConfirmStore(s => s.confirm)
  // Filtri per colonna: imbuto (scelte multiple), lente (testo), ordinamento.
  const cf = useColFilters()

  // Le scelte dell'imbuto seguono i valori realmente presenti in tabella.
  const partnerOpt = useMemo(
    () => Array.from(new Set(aziende.map(r => r.partner || VUOTO))).sort(), [aziende])
  const salesOpt = useMemo(
    () => Array.from(new Set(aziende.map(r => r.sales || VUOTO))).sort(), [aziende])
  const nazioneOpt = useMemo(
    () => Array.from(new Set(aziende.map(r => r.nazione || VUOTO))).sort(), [aziende])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return aziende.filter(r =>
      (!q
        || r.ragione.toLowerCase().includes(q)
        || r.partner.toLowerCase().includes(q)
        || r.sales.toLowerCase().includes(q)) &&
      cf.matchText(r.ragione, 'ragione') &&
      cf.matchMulti(r.partner || VUOTO, 'partner') &&
      cf.matchMulti(r.sales || VUOTO, 'sales') &&
      cf.matchMulti(r.nazione || VUOTO, 'nazione') &&
      cf.matchText(`${r.mailFinance} ${r.mailSales}`, 'mail') &&
      cf.matchText(r.piva, 'piva')
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aziende, search, cf.text, cf.multi])

  const sorted = useMemo(() => cf.sortRows(filtered),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, tab, cf.text, cf.multi])
  const rows = sorted.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  // ── Modali ────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [noteRow, setNoteRow] = useState<Azienda | null>(null)
  const [noteText, setNoteText] = useState('')
  const [detailRow, setDetailRow] = useState<Azienda | null>(null)
  const [depRow, setDepRow] = useState<Azienda | null>(null)
  const [depImporto, setDepImporto] = useState('')
  const [depData, setDepData] = useState('')
  const [rollingOpen, setRollingOpen] = useState(false)
  const [txRow, setTxRow] = useState<Azienda | null>(null)   // Dettaglio transazioni
  const [txFrom, setTxFrom] = useState('')
  const [txTo, setTxTo] = useState('')
  const [histRow, setHistRow] = useState<Azienda | null>(null) // Storico deposito
  const [scheda, setScheda] = useState<Azienda | null>(null)   // Scheda azienda
  const [nuova, setNuova] = useState(false)

  const setCampo = (k: keyof Azienda, v: string, num?: boolean) =>
    setScheda(s => s && ({ ...s, [k]: num ? (Number(v.replace(',', '.')) || 0) : v }))

  const apriNuova = () => {
    setScheda(vuota(Math.max(0, ...aziende.map(a => a.id)) + 1))
    setNuova(true)
  }
  const apriScheda = (a: Azienda) => { setScheda({ ...a }); setNuova(false) }

  const salvaScheda = () => {
    if (!scheda) return
    if (!scheda.ragione.trim()) { toast.warning('La ragione sociale è obbligatoria.', 'Scheda incompleta'); return }
    setAziende(list => list.some(a => a.id === scheda.id)
      ? list.map(a => a.id === scheda.id ? scheda : a)
      : [...list, scheda])
    toast.success(`Anagrafica «${scheda.ragione}» ${nuova ? 'creata' : 'aggiornata'}.`, 'Salvato')
    setScheda(null)
  }

  const eliminaAzienda = async (a: Azienda) => {
    const ok = await confirm({
      message: a.deposito
        ? `Eliminare «${a.ragione}»? Ha un deposito di ${euro(a.deposito)}.`
        : `Eliminare l’anagrafica di «${a.ragione}»?`,
      confirmLabel: 'Elimina',
    })
    if (!ok) return
    setAziende(list => list.filter(x => x.id !== a.id))
    toast.info(`«${a.ragione}» eliminata.`)
  }

  const openNote = (a: Azienda) => { setNoteRow(a); setNoteText(notes[a.id] || '') }
  const saveNote = () => {
    if (!noteRow) return
    setNotes(n => ({ ...n, [noteRow.id]: noteText }))
    toast.success(`Note aggiornate per ${noteRow.ragione}.`, 'Note salvate')
    setNoteRow(null)
  }
  const openDeposito = (a: Azienda) => {
    setDepRow(a); setDepImporto(''); setDepData(new Date().toISOString().slice(0, 10))
  }
  const saveDeposito = () => {
    if (!depRow || !depImporto.trim() || !depData.trim()) return
    const importo = Number(depImporto.replace(',', '.')) || 0
    setAziende(list => list.map(a => a.id === depRow.id ? { ...a, deposito: a.deposito + importo } : a))
    toast.success(`Deposito di ${euro(importo)} registrato per ${depRow.ragione}.`, 'Deposito inserito')
    setDepRow(null)
  }

  const campo = (f: Campo) => (
    <div key={f.k} className={`cdp-ag__f${f.span === 2 ? ' cdp-ag__f--2' : ''}`}>
      <InputField
        name={f.k}
        label={f.label}
        required={f.req}
        type={f.num ? 'number' : 'text'}
        value={String(scheda?.[f.k] ?? '')}
        placeholder={f.ph}
        onChange={e => setCampo(f.k, e.target.value, f.num)}
      />
    </div>
  )

  return (
    <div className="cdp">
      <button type="button" className="cdp__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>

      <div className="cdp__head">
        <div className="cdp__head-txt">
          <h1 className="cdp__title">Anagrafiche e depositi</h1>
          <p className="cdp__sub">Le aziende clienti: chi sono, quanto hanno a credito, con quali soglie di sollecito.</p>
        </div>
        <div className="cdp__head-act">
          <button type="button" className="cdp__btn cdp__btn--ghost" onClick={() => setRollingOpen(true)}>
            <Ico n="refresh" s={13} c="#8a6d1f" /> Rolling partner
          </button>
          <button type="button" className="cdp__btn" onClick={apriNuova}>
            <Ico n="plus" s={13} c="#fff" /> Crea anagrafica azienda
          </button>
        </div>
      </div>

      {/* Due letture dello stesso record: chi è l'azienda, e quanto ha a credito */}
      <div className="cdp__tabs" role="tablist">
        {([['anagrafiche', 'Anagrafiche'], ['depositi', 'Depositi']] as const).map(([id, label]) => (
          <button
            key={id} type="button" role="tab" aria-selected={tab === id}
            className={`cdp__tab ${tab === id ? 'is-on' : ''}`}
            onClick={() => setTab(id)}
          >{label}</button>
        ))}
      </div>

      <div className="cdp__toolbar">
        <div className="cdp__search">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca azienda, partner o referente…"
            aria-label="Cerca azienda"
          />
          <Ico n="search" s={14} c="var(--color-text-disabled)" />
        </div>
        <span className="cdp__conta">{sorted.length} {sorted.length === 1 ? 'azienda' : 'aziende'}</span>
        {tab === 'depositi' && (
          <span className="cdp__tot-dep">
            Depositi in essere <strong>{euro(sorted.reduce((a, r) => a + r.deposito, 0))}</strong>
          </span>
        )}
      </div>

      {/* ── Anagrafiche ─────────────────────────────────────────────────────── */}
      {tab === 'anagrafiche' && (
        <div className="sib-table-wrap cdp__wrap">
          <table className="sib-table cdp__table">
            {/* Larghezze in percentuale + table-layout fixed: nessuno scroll orizzontale. */}
            <colgroup>
              <col className="cdp__col-ragione" />
              <col className="cdp__col-partner" />
              <col className="cdp__col-piva" />
              <col className="cdp__col-piva" />
              <col className="cdp__col-sdi" />
              <col className="cdp__col-pec" />
              <col className="cdp__col-via" />
              <col className="cdp__col-citta" />
              <col className="cdp__col-naz" />
              <col className="cdp__col-tel" />
              <col className="cdp__col-resid" />
              <col className="cdp__col-azioni-a" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head"><ThLabel full="Ragione sociale" short="Rag. sociale" />{cf.th('ragione', 'ragione sociale', { search: true })}</span></th>
                <th><span className="sib-colf-head"><ThLabel full="Partner" />{cf.th('partner', 'partner', { options: partnerOpt })}</span></th>
                <th><span className="sib-colf-head"><ThLabel full="Partita IVA" short="P. IVA" />{cf.th('piva', 'partita iva', { search: true })}</span></th>
                <th><ThLabel full="Codice fiscale" short="Cod. fisc." /></th>
                <th><ThLabel full="Codice destinatario" short="SDI" /></th>
                <th><ThLabel full="PEC" /></th>
                <th><ThLabel full="Via e numero civico" short="Via e n. civ." /></th>
                <th><ThLabel full="Città" /></th>
                <th><span className="sib-colf-head"><ThLabel full="Nazione" />{cf.th('nazione', 'nazione', { options: nazioneOpt })}</span></th>
                <th><ThLabel full="Telefono" short="Tel." /></th>
                <th><ThLabel full="ResID source" short="ResID" /></th>
                <th className="cdp__th-c"><ThLabel full="Azioni" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={12} className="cdp__empty">Nessuna azienda con i filtri selezionati.</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="cdp__rag"><TruncatedText text={r.ragione} /></td>
                  <td><TruncatedText text={r.partner || VUOTO} /></td>
                  <td><TruncatedText text={r.piva || VUOTO} /></td>
                  <td><TruncatedText text={r.cf || VUOTO} /></td>
                  <td><TruncatedText text={r.sdi || VUOTO} /></td>
                  <td><TruncatedText text={r.pec || r.email || VUOTO} /></td>
                  <td><TruncatedText text={r.via || VUOTO} /></td>
                  <td><TruncatedText text={[r.cap, r.citta].filter(Boolean).join(' ') || VUOTO} /></td>
                  <td><TruncatedText text={r.nazione || VUOTO} /></td>
                  <td><TruncatedText text={r.telefono || VUOTO} /></td>
                  <td>
                    {r.resId
                      ? <Tooltip text={r.sorgente || 'Sorgente non indicata'}><code className="cdp__resid">{r.resId}</code></Tooltip>
                      : VUOTO}
                  </td>
                  <td className="cdp__c">
                    <div className="cdp__actions">
                      <Tooltip text="Dettaglio anagrafica">
                        <button type="button" className="cdp__mini" onClick={() => setDetailRow(r)}>
                          <Ico n="info" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Modifica la scheda">
                        <button type="button" className="cdp__mini" onClick={() => apriScheda(r)}>
                          <Ico n="edit" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Vai al deposito">
                        <button type="button" className="cdp__mini" onClick={() => setTab('depositi')}>
                          <Ico n="money-bill" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Elimina">
                        <button type="button" className="cdp__mini" onClick={() => eliminaAzienda(r)}>
                          <Ico n="trash" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Depositi ────────────────────────────────────────────────────────── */}
      {tab === 'depositi' && (
        <div className="sib-table-wrap cdp__wrap">
          <table className="sib-table cdp__table">
            <colgroup>
              <col className="cdp__col-ragione" />
              <col className="cdp__col-partner" />
              <col className="cdp__col-sales" />
              <col className="cdp__col-deposito" />
              <col className="cdp__col-sollecito" />
              <col className="cdp__col-sollecito" />
              <col className="cdp__col-stop" />
              <col className="cdp__col-comm" />
              <col className="cdp__col-mail2" />
              <col className="cdp__col-note" />
              <col className="cdp__col-azioni" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head"><ThLabel full="Ragione sociale" short="Rag. sociale" />{cf.th('ragione', 'ragione sociale', { search: true })}</span></th>
                <th><span className="sib-colf-head"><ThLabel full="Partner" />{cf.th('partner', 'partner', { options: partnerOpt })}</span></th>
                <th><span className="sib-colf-head"><ThLabel full="Sales manager" short="Sales mgr." />{cf.th('sales', 'sales manager', { options: salesOpt })}</span></th>
                <th className="cdp__dep"><ThLabel full="Deposito" /></th>
                <th><ThLabel full="Primo sollecito" short="1° sollecito" /></th>
                <th><ThLabel full="Secondo sollecito" short="2° sollecito" /></th>
                <th><ThLabel full="Stop sales" /></th>
                <th><ThLabel full="Commissione" short="Comm." /></th>
                <th><span className="sib-colf-head"><ThLabel full="E-mail finance e sales" short="E-mail" />{cf.th('mail', 'indirizzi e-mail', { search: true })}</span></th>
                <th className="cdp__th-c"><ThLabel full="Note" /></th>
                <th className="cdp__th-c"><ThLabel full="Azioni" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={11} className="cdp__empty">Nessuna azienda con i filtri selezionati.</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="cdp__rag"><TruncatedText text={r.ragione} /></td>
                  <td><TruncatedText text={r.partner || VUOTO} /></td>
                  <td><TruncatedText text={r.sales || VUOTO} /></td>
                  <td className="cdp__nowrap cdp__dep">
                    <div className="cdp__dep-cell">
                      <span className={`cdp__val ${r.deposito < 0 ? 'is-neg' : ''}`}>{euro(r.deposito)}</span>
                      <Tooltip text="Storico del deposito">
                        <button type="button" className="cdp__mini" onClick={() => setHistRow(r)}>
                          <Ico n="clock" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="cdp__nowrap cdp__num"><span className="cdp__val">{perc(r.primoSollecito)}</span></td>
                  <td className="cdp__nowrap cdp__num"><span className="cdp__val">{perc(r.secondoSollecito)}</span></td>
                  <td className="cdp__nowrap cdp__num"><span className="cdp__val">{perc(r.stopSales)}</span></td>
                  <td className="cdp__nowrap cdp__num"><span className="cdp__val">{perc(r.commissione)}</span></td>
                  <td>
                    {/* Le due mail stanno nella stessa colonna: finance e sales si
                        leggono insieme, come nella scheda dell'azienda */}
                    <span className="cdp__mails">
                      <TruncatedText text={`F: ${r.mailFinance || VUOTO}`} />
                      <TruncatedText text={`SM: ${r.mailSales || VUOTO}`} />
                    </span>
                  </td>
                  <td className="cdp__c">
                    <Tooltip text={notes[r.id] || 'Nessuna nota'}>
                      <button type="button" className="cdp__mini" onClick={() => openNote(r)}>
                        <Ico n="file" s={14} c={notes[r.id] ? '#8a6d1f' : 'var(--color-text-disabled)'} />
                      </button>
                    </Tooltip>
                  </td>
                  <td className="cdp__c">
                    <div className="cdp__actions">
                      <Tooltip text="Dettaglio anagrafica">
                        <button type="button" className="cdp__mini" onClick={() => setDetailRow(r)}>
                          <Ico n="info" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Modifica la scheda">
                        <button type="button" className="cdp__mini" onClick={() => apriScheda(r)}>
                          <Ico n="edit" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Inserisci deposito">
                        <button type="button" className="cdp__mini" onClick={() => openDeposito(r)}>
                          <Ico n="money-bill" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Dettaglio transazioni">
                        <button type="button" className="cdp__mini" onClick={() => { setTxRow(r); setTxFrom(''); setTxTo('') }}>
                          <Ico n="layers" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Invia sollecito">
                        <button
                          type="button" className="cdp__mini"
                          onClick={() => toast.success(`Sollecito inviato a ${r.ragione}.`, 'Sollecito')}
                        >
                          <Ico n="bell" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Scrivi all’azienda">
                        <button
                          type="button" className="cdp__mini"
                          onClick={() => toast.success(`Messaggio inviato a ${r.mailFinance || r.ragione}.`, 'E-mail')}
                        >
                          <Ico n="email" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Elimina">
                        <button type="button" className="cdp__mini" onClick={() => eliminaAzienda(r)}>
                          <Ico n="trash" s={13} c="var(--color-text-inactive)" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cdp__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      {/* ── Scheda azienda ──────────────────────────────────────────────────── */}
      <Modal
        open={scheda !== null}
        onClose={() => setScheda(null)}
        title={nuova ? 'Crea anagrafica azienda' : `Anagrafica — ${scheda?.ragione ?? ''}`}
        size="lg"
      >
        {scheda && (
          <div className="cdp-modal">
            <h3 className="cdp-modal__sez">Dati azienda</h3>
            <div className="cdp-ag">
              {CAMPI_AZIENDA.map(campo)}
            </div>

            <h3 className="cdp-modal__sez">Referenti e soglie</h3>
            <div className="cdp-ag">
              {CAMPI_REFERENTI.map(campo)}
              <div className="cdp-ag__f">
                <InputField
                  name="resId"
                  label="ResID source"
                  value={scheda.resId}
                  placeholder="es. VB7K4Q2A"
                  onChange={e => setCampo('resId', e.target.value.toUpperCase())}
                />
              </div>
              <div className="cdp-ag__f">
                <SelectField
                  name="sorgente"
                  label="ResID_Source Vertical Booking"
                  value={scheda.sorgente}
                  options={[{ value: '', label: 'Seleziona sorgente' },
                    ...SORGENTI.map(s => ({ value: s, label: s }))]}
                  onChange={e => setCampo('sorgente', e.target.value)}
                />
              </div>
            </div>

            <p className="cdp-modal__hint">
              <Ico n="info" s={13} c="#8a6d1f" />
              Le note restano consultabili ma non modificabili da questa pagina.
            </p>

            <div className="cdp-modal__actions">
              <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setScheda(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={salvaScheda}>Salva</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={noteRow !== null} onClose={() => setNoteRow(null)} title="Modifica note" size="md">
        <div className="cdp-modal">
          <label className="cdp-modal__label">Note</label>
          <textarea
            className="cdp-modal__textarea"
            rows={5}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Inserire note"
          />
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setNoteRow(null)}>Chiudi</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={saveNote}>Salva</button>
          </div>
        </div>
      </Modal>

      <Modal open={detailRow !== null} onClose={() => setDetailRow(null)} title="Dettaglio anagrafica" size="md">
        <div className="cdp-modal">
          <div className="cdp-modal__grid">
            <div className="cdp-modal__detail"><span>Ragione sociale</span><b>{detailRow?.ragione}</b></div>
            <div className="cdp-modal__detail"><span>Partner</span><b>{detailRow?.partner || VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>Sales manager</span><b>{detailRow?.sales || VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>P. IVA</span><b>{detailRow?.piva || VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>Sede</span><b>{[detailRow?.via, detailRow?.citta, detailRow?.nazione].filter(Boolean).join(', ') || VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>Telefono</span><b>{detailRow?.telefono || VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>Deposito</span><b>{detailRow ? euro(detailRow.deposito) : VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>Commissione</span><b>{detailRow ? perc(detailRow.commissione) : VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>Sorgente</span><b>{detailRow?.sorgente || VUOTO}</b></div>
            <div className="cdp-modal__detail"><span>ResID source</span><b>{detailRow?.resId || VUOTO}</b></div>
          </div>
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setDetailRow(null)}>Chiudi</button>
            {detailRow && (
              <button
                type="button" className="sib-btn sib-btn--primary"
                onClick={() => { const r = detailRow; setDetailRow(null); apriScheda(r) }}
              >Modifica</button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={depRow !== null} onClose={() => setDepRow(null)} title="Inserisci deposito" size="md">
        <div className="cdp-modal">
          <div className="cdp-modal__row">
            <div className="cdp-modal__field">
              <label>Importo *</label>
              <input type="number" value={depImporto} onChange={e => setDepImporto(e.target.value)} placeholder="0,00" />
            </div>
            <div className="cdp-modal__field">
              <label>Data *</label>
              <input type="date" value={depData} onChange={e => setDepData(e.target.value)} />
            </div>
          </div>
          {depRow && (
            <p className="cdp-modal__hint">
              <Ico n="info" s={13} c="#8a6d1f" />
              Deposito attuale di {depRow.ragione}: <b>{euro(depRow.deposito)}</b>
            </p>
          )}
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setDepRow(null)}>Chiudi</button>
            <button
              type="button" className="sib-btn sib-btn--primary"
              disabled={!depImporto.trim() || !depData.trim()} onClick={saveDeposito}
            >Salva</button>
          </div>
        </div>
      </Modal>

      <Modal open={rollingOpen} onClose={() => setRollingOpen(false)} title="Rolling Deposit Partner" size="lg">
        <div className="cdp-modal">
          <table className="cdp-modal__table">
            <thead>
              <tr><th>Partner</th><th>Deposito</th><th>Stato</th></tr>
            </thead>
            <tbody>
              {ROLLING_PARTNERS.map((p, i) => (
                <tr key={i}><td>{p.partner}</td><td>{p.deposito}</td><td>{p.stato}</td></tr>
              ))}
              <tr className="cdp-modal__tot"><td>Totale</td><td>0,00€</td><td /></tr>
            </tbody>
          </table>
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setRollingOpen(false)}>Chiudi</button>
            <button
              type="button" className="sib-btn sib-btn--primary"
              onClick={() => { toast.success('Esportazione avviata.', 'Rolling Deposit'); setRollingOpen(false) }}
            >Scarica</button>
          </div>
        </div>
      </Modal>

      <Modal open={txRow !== null} onClose={() => setTxRow(null)} title="Dettaglio transazioni" size="lg">
        <div className="cdp-modal">
          <div className="cdp-modal__filters">
            <div className="cdp-modal__field">
              <label>Data Inizio</label>
              <input type="date" value={txFrom} onChange={e => setTxFrom(e.target.value)} />
            </div>
            <div className="cdp-modal__field">
              <label>Data Fine</label>
              <input type="date" value={txTo} onChange={e => setTxTo(e.target.value)} />
            </div>
            <button type="button" className="cdp-modal__dl" title="Esporta" onClick={() => toast.success('Esportazione avviata.', 'Transazioni')}>
              <Ico n="file" s={16} c="#fff" />
            </button>
          </div>
          <table className="cdp-modal__table">
            <thead>
              <tr><th>Cod. Prenotazione</th><th>Importo</th><th>Data transazione</th><th>Tipo transazione</th></tr>
            </thead>
            <tbody>
              <tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal open={histRow !== null} onClose={() => setHistRow(null)} title={`Deposito — ${histRow?.ragione ?? ''}`} size="lg">
        <div className="cdp-modal">
          <table className="cdp-modal__table">
            <thead>
              <tr><th>Importo</th><th>Data transazione</th><th>Tipo transazione</th><th>Modifica</th></tr>
            </thead>
            <tbody>
              <tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
