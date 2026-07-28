import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import FormActions from '../../../core/components/FormActions'
import {
  InputField, SelectField, RadioGroup, CheckboxField, SearchField,
  DatePickerField, TextareaField,
} from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import './NuovoContoPassante.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tipologia = 'cliente' | 'agenzia'

interface Addebito {
  id: number
  data: string        // ISO (yyyy-mm-dd), formato dell'input date
  servizio: string    // codice del catalogo servizi
  descrizione: string
  qta: number
  prezzo: number      // imponibile unitario (€)
  iva: number         // aliquota %
}

interface Anagrafica {
  nome: string
  tipologia: Tipologia
  segmento: string
  piva?: string
  referente?: string
  email?: string
  telefono?: string
}

interface Anticipo {
  id: number
  documento: string
  data: string        // dd/mm/yyyy
  intestatario: string
  modalita: string
  residuo: number
}

interface Servizio {
  code: string
  label: string
  prezzo: number
  iva: number
}

// ─── DATI DI RIFERIMENTO ──────────────────────────────────────────────────────

const SEGMENTI = ['Individuale', 'Gruppo', 'Corporate', 'Leisure', 'B2B', 'OTA']

const IVA_OPTS = [22, 10, 4, 0]

const TIPOLOGIA_OPTIONS = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'agenzia', label: 'Agenzia' },
]

// Catalogo dei servizi addebitabili su un conto passante: scegliendo la voce si
// precompilano descrizione, prezzo di listino e aliquota IVA.
const SERVIZI: Servizio[] = [
  { code: 'bar',        label: 'Bar',                prezzo: 8.50,  iva: 10 },
  { code: 'ristorante', label: 'Ristorante',         prezzo: 35.00, iva: 10 },
  { code: 'colazione',  label: 'Colazione',          prezzo: 18.00, iva: 10 },
  { code: 'spa',        label: 'SPA / Benessere',    prezzo: 45.00, iva: 22 },
  { code: 'parcheggio', label: 'Parcheggio',         prezzo: 15.00, iva: 22 },
  { code: 'transfer',   label: 'Transfer',           prezzo: 60.00, iva: 10 },
  { code: 'lavanderia', label: 'Lavanderia',         prezzo: 12.00, iva: 22 },
  { code: 'noleggio',   label: 'Noleggio bici',      prezzo: 20.00, iva: 22 },
  { code: 'citytax',    label: 'Tassa di soggiorno', prezzo: 3.00,  iva: 0  },
  { code: 'altro',      label: 'Altro',              prezzo: 0,     iva: 22 },
]

// Anagrafiche suggerite sul campo Nominativo (in produzione: ricerca su API).
const ANAGRAFICHE: Anagrafica[] = [
  { nome: 'Ovest Destination Italy', tipologia: 'agenzia', segmento: 'B2B',       piva: 'IT02458711002',  referente: 'Sara Conti',      email: 'booking@ovestdestination.it', telefono: '+39 06 4478112' },
  { nome: 'Sud Travel Agency',       tipologia: 'agenzia', segmento: 'B2B',       piva: 'IT03987441209',  referente: 'Nicola Ferrara',  email: 'ops@sudtravel.it',            telefono: '+39 080 5567341' },
  { nome: 'Nord Incoming',           tipologia: 'agenzia', segmento: 'B2B',       piva: 'IT01277339021',  referente: 'Elisa Moretti',   email: 'gruppi@nordincoming.com',     telefono: '+39 011 2298744' },
  { nome: 'Booking.com',             tipologia: 'agenzia', segmento: 'OTA',       piva: 'NL805734958B01' },
  { nome: 'Expedia',                 tipologia: 'agenzia', segmento: 'OTA',       piva: 'IE9825368F' },
  { nome: 'Tour Operator Egnazia',   tipologia: 'agenzia', segmento: 'Gruppo',    piva: 'IT04412870748',  referente: 'Pietro Lombardi', email: 'gruppi@egnazia.tours',        telefono: '+39 080 4823311' },
  { nome: 'Sibylla Network S.r.l.',  tipologia: 'agenzia', segmento: 'Corporate', piva: 'IT02914560366',  referente: 'Ufficio viaggi',  email: 'travel@sibyllanetwork.com',   telefono: '+39 059 7412200' },
  { nome: 'Marco Bianchi',           tipologia: 'cliente', segmento: 'Individuale', email: 'marco.bianchi@gmail.com',  telefono: '+39 335 6641209' },
  { nome: 'Anna Verdi',              tipologia: 'cliente', segmento: 'Individuale', email: 'anna.verdi@libero.it',     telefono: '+39 347 2298110' },
  { nome: 'Famiglia Rossi',          tipologia: 'cliente', segmento: 'Leisure',     email: 'g.rossi@outlook.it',       telefono: '+39 320 5541277' },
  { nome: 'Luca Ferri',              tipologia: 'cliente', segmento: 'Leisure',     email: 'luca.ferri@fastwebnet.it', telefono: '+39 349 8871402' },
  { nome: 'Comitiva Alpe Adria',     tipologia: 'cliente', segmento: 'Gruppo',      referente: 'Klaus Mayer', email: 'info@alpeadria.group', telefono: '+43 660 3311209' },
]

// Anticipi già incassati e non ancora abbinati a un conto.
const ANTICIPI: Anticipo[] = [
  { id: 1, documento: 'C-0041/FG 2026', data: '18/04/2026', intestatario: 'Ovest Destination Italy', modalita: 'Bonifico', residuo: 150.00 },
  { id: 2, documento: 'C-0042/FG 2026', data: '19/04/2026', intestatario: 'Marco Bianchi',           modalita: 'Contanti', residuo: 50.00 },
  { id: 3, documento: 'C-0043/FG 2026', data: '20/04/2026', intestatario: 'Comitiva Alpe Adria',     modalita: 'Nexi',     residuo: 480.00 },
  { id: 4, documento: 'C-0044/FG 2026', data: '21/04/2026', intestatario: 'Tour Operator Egnazia',   modalita: 'Bonifico', residuo: 1200.00 },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const eur = (v: number) =>
  v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const todayIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ISO (yyyy-mm-dd) → dd/mm/yyyy
const fmtData = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const rigaImponibile = (a: Addebito) => (a.prezzo || 0) * (a.qta || 0)
const rigaIva        = (a: Addebito) => rigaImponibile(a) * (a.iva || 0) / 100
const rigaTotale     = (a: Addebito) => rigaImponibile(a) + rigaIva(a)

// ─── CARD DI SEZIONE ──────────────────────────────────────────────────────────

// Card di sezione: header con icona + titolo (blu Platform), nota opzionale e
// azioni allineate a destra; corpo con i campi.
function Card({ icon, title, note, actions, children }: {
  icon: string
  title: string
  note?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="ncp__card">
      <header className="ncp__card-head">
        <span className="ncp__card-title">
          <i className={`fa-duotone ${icon}`} aria-hidden="true" /> {title}
          {note && <span className="ncp__card-note">{note}</span>}
        </span>
        {actions && <span className="ncp__card-actions">{actions}</span>}
      </header>
      <div className="ncp__card-body">{children}</div>
    </section>
  )
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function NuovoContoPassante({ navigate }: { navigate: (p: string) => void }) {
  const confirm = useConfirmStore((s) => s.confirm)

  // ── Intestatario ────────────────────────────────────────────────────────────
  const [tipologia, setTipologia] = useState<Tipologia>('agenzia')
  const [nominativo, setNominativo] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const [segmento, setSegmento] = useState('')
  const [piva, setPiva] = useState('')
  const [referente, setReferente] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dataApertura, setDataApertura] = useState(todayIso())
  const [note, setNote] = useState('')

  // ── Anticipo ────────────────────────────────────────────────────────────────
  const [collegaAnticipo, setCollegaAnticipo] = useState(false)
  const [anticipoId, setAnticipoId] = useState<number | null>(null)
  const [cercaAnticipo, setCercaAnticipo] = useState('')

  // ── Addebiti ────────────────────────────────────────────────────────────────
  const [addebiti, setAddebiti] = useState<Addebito[]>([])
  const [selected, setSelected] = useState<number[]>([])

  // Suggerimenti anagrafica filtrati per tipologia + testo digitato.
  const suggerimenti = useMemo(() => {
    const q = nominativo.toLowerCase().trim()
    return ANAGRAFICHE
      .filter((a) => a.tipologia === tipologia)
      .filter((a) => !q || a.nome.toLowerCase().includes(q))
      .slice(0, 6)
  }, [nominativo, tipologia])

  const cambiaTipologia = (v: Tipologia) => {
    setTipologia(v)
    // I dati caricati non appartengono più alla tipologia selezionata.
    setNominativo(''); setSegmento(''); setPiva('')
    setReferente(''); setEmail(''); setTelefono('')
  }

  const scegliAnagrafica = (a: Anagrafica) => {
    setNominativo(a.nome)
    setSegmento(a.segmento)
    setPiva(a.piva ?? '')
    setReferente(a.referente ?? '')
    setEmail(a.email ?? '')
    setTelefono(a.telefono ?? '')
    setComboOpen(false)
  }

  const anticipiFiltrati = useMemo(() => {
    const q = cercaAnticipo.toLowerCase().trim()
    if (!q) return ANTICIPI
    return ANTICIPI.filter((a) =>
      a.documento.toLowerCase().includes(q) ||
      a.intestatario.toLowerCase().includes(q) ||
      a.modalita.toLowerCase().includes(q) ||
      a.data.includes(q) ||
      a.residuo.toFixed(2).includes(q),
    )
  }, [cercaAnticipo])

  const anticipoSel = ANTICIPI.find((a) => a.id === anticipoId) ?? null

  const toggleCollegaAnticipo = (on: boolean) => {
    setCollegaAnticipo(on)
    if (!on) { setAnticipoId(null); setCercaAnticipo('') }
  }

  // ── Addebiti: azioni ────────────────────────────────────────────────────────
  const aggiungiAddebito = () => setAddebiti((p) => [...p, {
    id: Math.max(0, ...p.map((a) => a.id)) + 1,
    data: dataApertura, servizio: '', descrizione: '', qta: 1, prezzo: 0, iva: 22,
  }])

  const setAddebito = (id: number, patch: Partial<Addebito>) =>
    setAddebiti((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  // Scegliendo il servizio si precompilano descrizione, prezzo e IVA di listino
  // (una descrizione già personalizzata dall'utente non viene sovrascritta).
  const setServizio = (id: number, code: string) => {
    const s = SERVIZI.find((x) => x.code === code)
    setAddebiti((p) => p.map((a) => {
      if (a.id !== id) return a
      if (!s) return { ...a, servizio: '' }
      const descrizioneAuto = !a.descrizione || SERVIZI.some((x) => x.label === a.descrizione)
      return {
        ...a,
        servizio: code,
        descrizione: descrizioneAuto ? s.label : a.descrizione,
        prezzo: a.prezzo || s.prezzo,
        iva: s.iva,
      }
    }))
  }

  const duplicaAddebito = (id: number) =>
    setAddebiti((p) => {
      const i = p.findIndex((a) => a.id === id)
      if (i < 0) return p
      const copia = { ...p[i], id: Math.max(0, ...p.map((a) => a.id)) + 1 }
      return [...p.slice(0, i + 1), copia, ...p.slice(i + 1)]
    })

  const toggleAddebito = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAll = () =>
    setSelected((p) => (p.length === addebiti.length ? [] : addebiti.map((a) => a.id)))

  const eliminaAddebito = async (id: number) => {
    if (await confirm({ message: 'Rimuovere questo addebito dal conto?', danger: true })) {
      setAddebiti((p) => p.filter((a) => a.id !== id))
      setSelected((p) => p.filter((x) => x !== id))
    }
  }

  const eliminaSelezionati = async () => {
    const n = selected.length
    const message = n === 1
      ? 'Rimuovere l’addebito selezionato dal conto?'
      : `Rimuovere i ${n} addebiti selezionati dal conto?`
    if (await confirm({ message, danger: true })) {
      setAddebiti((p) => p.filter((a) => !selected.includes(a.id)))
      setSelected([])
    }
  }

  // ── Totali ──────────────────────────────────────────────────────────────────
  const imponibile = addebiti.reduce((s, a) => s + rigaImponibile(a), 0)
  const ivaTot = addebiti.reduce((s, a) => s + rigaIva(a), 0)
  const totale = imponibile + ivaTot
  // Dell'anticipo si scala al massimo il totale del conto: l'eventuale eccedenza
  // resta a credito sul documento originario.
  const anticipoScalato = collegaAnticipo && anticipoSel ? Math.min(anticipoSel.residuo, totale) : 0
  const saldo = totale - anticipoScalato

  const canSave = nominativo.trim() !== '' && segmento !== '' && addebiti.length > 0

  return (
    <div className="ncp">
      <PageHead
        onBack={() => navigate('conti-passanti')}
        title="Nuovo conto passante"
        subtitle="Apri un conto per un cliente o un'agenzia esterna, con eventuale anticipo e lista addebiti"
      />

      {/* ── Intestatario ───────────────────────────────────────────────────── */}
      <Card icon="fa-address-card" title="Intestatario">
        <div className="ncp__grid ncp__grid--4">
          <RadioGroup
            name="tipologia" label="Tipologia"
            options={TIPOLOGIA_OPTIONS}
            value={tipologia}
            onChange={(v) => cambiaTipologia(v as Tipologia)}
          />

          {/* Nominativo con suggerimenti dall'anagrafica */}
          <div className="ncp__combo">
            <InputField
              name="nominativo" label="Nominativo" required
              placeholder={tipologia === 'agenzia' ? 'Cerca agenzia…' : 'Cerca cliente…'}
              iconLeft="fa-light fa-magnifying-glass"
              value={nominativo}
              onChange={(e) => { setNominativo(e.target.value); setComboOpen(true) }}
              onFocus={() => setComboOpen(true)}
            />
            {comboOpen && suggerimenti.length > 0 && (
              <>
                <div className="ncp__combo-overlay" onClick={() => setComboOpen(false)} />
                <ul className="ncp__combo-list">
                  {suggerimenti.map((a) => (
                    <li key={a.nome}>
                      <button type="button" className="ncp__combo-opt" onClick={() => scegliAnagrafica(a)}>
                        <span className="ncp__combo-name">{a.nome}</span>
                        <span className="ncp__combo-meta">{a.segmento}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <SelectField
            name="segmento" label="Segmento" required
            placeholder="Seleziona"
            value={segmento}
            onChange={(e) => setSegmento(e.target.value)}
            options={SEGMENTI.map((s) => ({ value: s, label: s }))}
          />

          <DatePickerField
            name="data-apertura" label="Data apertura"
            value={dataApertura}
            onChange={(e) => setDataApertura(e.target.value)}
          />

          {tipologia === 'agenzia' && (
            <InputField
              name="piva" label="Partita IVA"
              placeholder="IT00000000000"
              value={piva}
              onChange={(e) => setPiva(e.target.value)}
            />
          )}

          <InputField
            name="referente" label="Referente"
            placeholder="Nome e cognome"
            value={referente}
            onChange={(e) => setReferente(e.target.value)}
          />

          <InputField
            name="email" label="Email" type="email"
            placeholder="nome@dominio.it"
            iconLeft="fa-light fa-envelope"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <InputField
            name="telefono" label="Telefono" type="tel"
            placeholder="+39 …"
            iconLeft="fa-light fa-phone"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        <TextareaField
          name="note" label="Note interne" rows={2}
          placeholder="Indicazioni per il front office (facoltative)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="ncp__note"
        />
      </Card>

      {/* ── Anticipo ───────────────────────────────────────────────────────── */}
      <Card
        icon="fa-hand-holding-dollar" title="Anticipo" note="facoltativo"
        actions={collegaAnticipo && anticipoSel && (
          <span className="ncp__chip">
            <i className="fa-solid fa-link" aria-hidden="true" />
            {anticipoSel.documento} · {eur(anticipoSel.residuo)}
            <button
              type="button" className="ncp__chip-x"
              aria-label="Scollega anticipo"
              onClick={() => setAnticipoId(null)}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </span>
        )}
      >
        <CheckboxField
          name="collega-anticipo"
          label="Collega un anticipo già incassato a questo conto"
          hint="L'importo residuo viene scalato dal saldo da incassare."
          checked={collegaAnticipo}
          onChange={(e) => toggleCollegaAnticipo(e.target.checked)}
        />

        {collegaAnticipo ? (
          <div className="ncp__anticipo-fields">
            <div className="ncp__field ncp__field--search">
              <label className="ncp__label" htmlFor="cerca-anticipo">Cerca anticipo</label>
              <SearchField
                name="cerca-anticipo"
                placeholder="Documento o intestatario"
                value={cercaAnticipo}
                onChange={(e) => setCercaAnticipo(e.target.value)}
                onClear={() => setCercaAnticipo('')}
              />
            </div>

            <div className="sib-table-wrap">
              <table className="sib-table ncp__table ncp__table--anticipi">
                <thead>
                  <tr>
                    <th className="ncp__th-check" />
                    <th>Documento</th>
                    <th className="ncp__th-data">Data</th>
                    <th>Intestatario</th>
                    <th className="ncp__th-mod">Modalità</th>
                    <th className="ncp__th-num">Residuo</th>
                  </tr>
                </thead>
                <tbody>
                  {anticipiFiltrati.length === 0 ? (
                    <tr><td colSpan={6} className="sib-empty">Nessun anticipo per i criteri selezionati.</td></tr>
                  ) : anticipiFiltrati.map((a) => (
                    <tr
                      key={a.id}
                      className={'ncp__row-pick' + (anticipoId === a.id ? ' ncp__row--sel' : '')}
                      onClick={() => setAnticipoId(anticipoId === a.id ? null : a.id)}
                    >
                      <td className="ncp__td-center">
                        <input
                          type="radio" className="sib-radio" name="anticipo"
                          checked={anticipoId === a.id}
                          onChange={() => setAnticipoId(a.id)}
                          aria-label={`Collega ${a.documento}`}
                        />
                      </td>
                      <td>{a.documento}</td>
                      <td className="ncp__td-center ncp__td-data">{a.data}</td>
                      <td>{a.intestatario}</td>
                      <td className="ncp__td-center">{a.modalita}</td>
                      <td className="ncp__td-num">{eur(a.residuo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="ncp__hint">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            Attiva l'opzione per collegare un anticipo esistente e scalarlo dal totale del conto.
          </p>
        )}
      </Card>

      {/* ── Lista addebiti ─────────────────────────────────────────────────── */}
      <Card
        icon="fa-receipt" title="Lista addebiti"
        actions={
          <>
            {selected.length > 0 && (
              <button type="button" className="sib-btn sib-btn--danger-outline sib-btn--sm" onClick={eliminaSelezionati}>
                <i className="fa-solid fa-trash" aria-hidden="true" /> Elimina selezionati ({selected.length})
              </button>
            )}
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={aggiungiAddebito}>
              <i className="fa-solid fa-circle-plus" aria-hidden="true" /> Aggiungi addebito
            </button>
          </>
        }
      >
        <div className="sib-table-wrap">
          <table className="sib-table ncp__table ncp__table--addebiti">
            <thead>
              <tr>
                <th className="ncp__th-check">
                  <input
                    type="checkbox" className="sib-checkbox"
                    checked={addebiti.length > 0 && selected.length === addebiti.length}
                    onChange={toggleAll}
                    disabled={addebiti.length === 0}
                    aria-label="Seleziona tutti gli addebiti"
                  />
                </th>
                <th className="ncp__th-data">Data</th>
                <th className="ncp__th-serv">Servizio</th>
                <th>Descrizione</th>
                <th className="ncp__th-qta">Qtà</th>
                <th className="ncp__th-num">Prezzo unit.</th>
                <th className="ncp__th-iva">IVA</th>
                <th className="ncp__th-num">Totale</th>
                <th className="ncp__th-act">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {addebiti.length === 0 ? (
                <tr>
                  <td colSpan={9} className="ncp__empty">
                    <i className="fa-duotone fa-receipt ncp__empty-ico" aria-hidden="true" />
                    <span>Nessun addebito sul conto.</span>
                    <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm ncp__empty-btn" onClick={aggiungiAddebito}>
                      <i className="fa-solid fa-circle-plus" aria-hidden="true" /> Aggiungi addebito
                    </button>
                  </td>
                </tr>
              ) : addebiti.map((a) => (
                <tr key={a.id} className={selected.includes(a.id) ? 'ncp__row--sel' : ''}>
                  <td className="ncp__td-center">
                    <input
                      type="checkbox" className="sib-checkbox"
                      checked={selected.includes(a.id)}
                      onChange={() => toggleAddebito(a.id)}
                      aria-label={`Seleziona addebito del ${fmtData(a.data)}`}
                    />
                  </td>
                  <td>
                    <input
                      type="date" className="sib-input ncp__cell ncp__cell-data"
                      value={a.data}
                      onChange={(e) => setAddebito(a.id, { data: e.target.value })}
                      aria-label="Data addebito"
                    />
                  </td>
                  <td>
                    <select
                      className="sib-select ncp__cell"
                      value={a.servizio}
                      onChange={(e) => setServizio(a.id, e.target.value)}
                      title={SERVIZI.find((s) => s.code === a.servizio)?.label}
                      aria-label="Servizio"
                    >
                      <option value="">Seleziona</option>
                      {SERVIZI.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      className="sib-input ncp__cell"
                      value={a.descrizione}
                      title={a.descrizione || undefined}
                      placeholder="Descrizione della voce"
                      onChange={(e) => setAddebito(a.id, { descrizione: e.target.value })}
                      aria-label="Descrizione"
                    />
                  </td>
                  <td>
                    <input
                      type="number" min={1} step={1}
                      className="sib-input ncp__cell ncp__cell--num ncp__cell-qta"
                      value={a.qta}
                      onChange={(e) => setAddebito(a.id, { qta: Math.max(1, Number(e.target.value || 1)) })}
                      aria-label="Quantità"
                    />
                  </td>
                  <td>
                    <div className="ncp__euro">
                      <input
                        type="number" min={0} step={0.01}
                        className="sib-input ncp__cell ncp__cell--num ncp__cell-prezzo"
                        value={a.prezzo}
                        onChange={(e) => setAddebito(a.id, { prezzo: Number(e.target.value || 0) })}
                        aria-label="Prezzo unitario imponibile"
                      />
                      <span className="ncp__euro-sfx">€</span>
                    </div>
                  </td>
                  <td>
                    <select
                      className="sib-select ncp__cell ncp__cell-iva"
                      value={a.iva}
                      onChange={(e) => setAddebito(a.id, { iva: Number(e.target.value) })}
                      aria-label="Aliquota IVA"
                    >
                      {IVA_OPTS.map((v) => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </td>
                  <td className="ncp__td-num ncp__td-tot">{eur(rigaTotale(a))}</td>
                  <td className="ncp__td-center">
                    <div className="ncp__row-act">
                      <Tooltip text="Duplica addebito">
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Duplica" onClick={() => duplicaAddebito(a.id)}>
                          <i className="fa-solid fa-copy" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Rimuovi addebito">
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Rimuovi" onClick={() => eliminaAddebito(a.id)}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {addebiti.length > 0 && (
              <tfoot>
                <tr className="ncp__foot">
                  <td colSpan={5}>{addebiti.length === 1 ? '1 addebito' : `${addebiti.length} addebiti`}</td>
                  <td className="ncp__td-num">{eur(imponibile)}</td>
                  <td className="ncp__td-center">{eur(ivaTot)}</td>
                  <td className="ncp__td-num ncp__td-tot">{eur(totale)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Riepilogo economico del conto */}
        <div className="ncp__summary">
          <div className="ncp__sum-item">
            <span className="ncp__sum-k">Imponibile</span>
            <span className="ncp__sum-v">{eur(imponibile)}</span>
          </div>
          <div className="ncp__sum-item">
            <span className="ncp__sum-k">IVA</span>
            <span className="ncp__sum-v">{eur(ivaTot)}</span>
          </div>
          <div className="ncp__sum-item">
            <span className="ncp__sum-k">Totale conto</span>
            <span className="ncp__sum-v">{eur(totale)}</span>
          </div>
          {anticipoScalato > 0 && (
            <div className="ncp__sum-item ncp__sum-item--neg">
              <span className="ncp__sum-k">Anticipo collegato</span>
              <span className="ncp__sum-v">− {eur(anticipoScalato)}</span>
            </div>
          )}
          <div className="ncp__sum-item ncp__sum-item--tot">
            <span className="ncp__sum-k">Saldo da incassare</span>
            <span className="ncp__sum-v">{eur(saldo)}</span>
          </div>
          <button
            type="button" className="sib-btn sib-btn--secondary ncp__pay"
            disabled={saldo <= 0}
            onClick={() => navigate('cassa')}
          >
            <i className="fa-solid fa-credit-card" aria-hidden="true" /> Incassa ora
          </button>
        </div>
      </Card>

      <FormActions
        onCancel={() => navigate('conti-passanti')}
        onConfirm={() => navigate('conti-passanti')}
        confirmLabel="Salva conto"
        confirmIcon="fa-floppy-disk"
        confirmDisabled={!canSave}
      />
    </div>
  )
}
