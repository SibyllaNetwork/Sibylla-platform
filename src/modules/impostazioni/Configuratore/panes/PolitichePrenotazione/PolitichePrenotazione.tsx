import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, SelectField, TextareaField, RadioGroup, CheckboxField } from '../../../../../core/components/form'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { toast } from '../../../../../core/components/Toast/useToast'
import './PolitichePrenotazione.sass'

/**
 * Politiche di prenotazione (Configuratore).
 * Elenco unico di "documenti": ogni politica racchiude le regole
 * (pagamenti / cancellazione / mancato arrivo) e i testi multilingua (IT/EN).
 * "Crea nuova regola" apre la procedura che genera dinamicamente il documento;
 * ogni documento può essere attivato/disattivato, modificato ed eliminato.
 */
interface Politica {
  Id: number
  Nome: string
  Descrizione: string
  TerminiNome: string
  PagamentiAbilitati: boolean
  RichiediCartaGaranzia: boolean
  CancellazioneAbilitata: boolean
  MancatoArrivoAbilitato: boolean
  MancatoArrivoPercentuale: number
  TestoIt: string
  TestoEn: string
  Attivo: boolean
}

/** Modelli di partenza per il testo (dropdown "Termini e condizioni"). */
const TERMINI_TEMPLATES: { nome: string; it: string; en: string }[] = [
  {
    nome: 'Standard flessibile',
    it: 'Cancellazione gratuita fino a 3 giorni prima dell’arrivo. Nessun anticipo richiesto alla prenotazione.',
    en: 'Free cancellation up to 3 days before arrival. No advance payment required at the time of booking.',
  },
  {
    nome: 'Non rimborsabile',
    it: 'Tariffa non rimborsabile: l’intero importo viene addebitato alla prenotazione e non è previsto alcun rimborso in caso di cancellazione.',
    en: 'Non-refundable rate: the full amount is charged at booking and no refund applies in case of cancellation.',
  },
  {
    nome: 'Acconto 30%',
    it: 'È richiesto un acconto del 30% alla prenotazione a titolo di caparra confirmatoria. Il saldo è dovuto all’arrivo.',
    en: 'A 30% deposit is required at booking as a confirmatory deposit. The balance is due on arrival.',
  },
]

const EMPTY: Politica = {
  Id: 0, Nome: '', Descrizione: '', TerminiNome: '',
  PagamentiAbilitati: false, RichiediCartaGaranzia: false,
  CancellazioneAbilitata: false,
  MancatoArrivoAbilitato: false, MancatoArrivoPercentuale: 0,
  TestoIt: '', TestoEn: '', Attivo: true,
}

const FALLBACK: Politica[] = [
  { Id: 1, Nome: 'defaultNessunVincolo', Descrizione: 'Politica predefinita senza vincoli di pagamento, carta, cancellazione o no-show.', TerminiNome: '', PagamentiAbilitati: false, RichiediCartaGaranzia: false, CancellazioneAbilitata: false, MancatoArrivoAbilitato: false, MancatoArrivoPercentuale: 0, TestoIt: '', TestoEn: '', Attivo: true },
  { Id: 2, Nome: 'NON Rimborsabile', Descrizione: 'Pre prenotazioni non rimborsabili', TerminiNome: 'Non rimborsabile', PagamentiAbilitati: true, RichiediCartaGaranzia: true, CancellazioneAbilitata: false, MancatoArrivoAbilitato: true, MancatoArrivoPercentuale: 100, TestoIt: TERMINI_TEMPLATES[1].it, TestoEn: TERMINI_TEMPLATES[1].en, Attivo: true },
  { Id: 3, Nome: 'Not ref acconto 50%', Descrizione: 'Non rimborsabile con acconto', TerminiNome: 'Acconto 30%', PagamentiAbilitati: true, RichiediCartaGaranzia: false, CancellazioneAbilitata: true, MancatoArrivoAbilitato: true, MancatoArrivoPercentuale: 75, TestoIt: TERMINI_TEMPLATES[2].it, TestoEn: TERMINI_TEMPLATES[2].en, Attivo: true },
  { Id: 4, Nome: 'Pagamento Senza Pensieri', Descrizione: 'Paga a rate il tuo soggiorno', TerminiNome: 'Standard flessibile', PagamentiAbilitati: true, RichiediCartaGaranzia: false, CancellazioneAbilitata: true, MancatoArrivoAbilitato: true, MancatoArrivoPercentuale: 100, TestoIt: TERMINI_TEMPLATES[0].it, TestoEn: TERMINI_TEMPLATES[0].en, Attivo: false },
]

const pct = (n: number) => `${n.toFixed(2).replace('.', ',')}%`

/** Genera i testi IT/EN a partire dalle opzioni scelte (come "Genera Termini & Condizioni"). */
function generaTermini(f: Politica): { it: string; en: string } {
  const nome = f.Nome.trim() || 'senza nome'
  const it: string[] = [`Politica prenotazione: ${nome}.`]
  const en: string[] = [`Booking policy: ${nome}.`]

  if (f.PagamentiAbilitati) {
    it.push('È prevista la programmazione dei pagamenti con anticipo alla prenotazione.')
    en.push('Payment scheduling with an advance payment at booking is required.')
  } else {
    it.push('Non è prevista alcuna programmazione dei pagamenti. Non è richiesto alcun anticipo e il saldo è pari a 0%.')
    en.push('No payment scheduling is required. No deposit is required and the balance is 0%.')
  }

  if (f.RichiediCartaGaranzia) {
    it.push('È richiesta una carta di credito a garanzia per confermare la prenotazione.')
    en.push('A credit card guarantee is required to confirm the booking.')
  } else {
    it.push('Non è necessaria una carta di pagamento per confermare la prenotazione.')
    en.push('No payment card is needed to confirm the booking.')
  }

  if (f.CancellazioneAbilitata) {
    it.push('Sono previste penali di cancellazione secondo le condizioni indicate.')
    en.push('Cancellation penalties apply according to the stated conditions.')
  } else {
    it.push('Non è prevista alcuna penale per cancellazione.')
    en.push('No cancellation penalty is applicable.')
  }

  if (f.MancatoArrivoAbilitato) {
    it.push(`In caso di mancata presentazione (no-show) è prevista una penale del ${pct(f.MancatoArrivoPercentuale)}.`)
    en.push(`In case of no-show a penalty of ${pct(f.MancatoArrivoPercentuale)} applies.`)
  } else {
    it.push('Non è prevista alcuna penale per mancata presentazione (no-show).')
    en.push('No penalty for no-show is applicable.')
  }

  return { it: it.join(' '), en: en.join(' ') }
}

const SN = [{ value: '1', label: 'Sì' }, { value: '0', label: 'No' }]

export default function PolitichePrenotazione() {
  const [politiche, setPolitiche] = useState<Politica[]>(FALLBACK)
  const [editing, setEditing] = useState<Politica | null>(null)
  const confirm = useConfirmStore((s) => s.confirm)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ Politiche: Politica[] }>('configura/GetPolitichePrenotazione', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled && d?.Politiche?.length) setPolitiche(d.Politiche) })
      .catch(() => { /* mantiene i dati di esempio */ })
    return () => { cancelled = true }
  }, [])

  const upd = (patch: Partial<Politica>) => setEditing((e) => (e ? { ...e, ...patch } : e))

  const terminiOptions = useMemo(
    () => [{ value: '', label: '- nessuno -' }, ...TERMINI_TEMPLATES.map((t) => ({ value: t.nome, label: t.nome }))],
    [],
  )

  const applyTemplate = (nome: string) => {
    const t = TERMINI_TEMPLATES.find((x) => x.nome === nome)
    upd({ TerminiNome: nome, ...(t ? { TestoIt: t.it, TestoEn: t.en } : {}) })
  }

  const genera = () => {
    if (!editing) return
    const { it, en } = generaTermini(editing)
    upd({ TestoIt: it, TestoEn: en })
    toast.success('Testi Termini & Condizioni generati (IT/EN)')
  }

  const save = () => {
    if (!editing) return
    if (!editing.Nome.trim()) { toast.warning('Inserisci un nome per la regola'); return }
    apiFetchSibylla('configura/SetPolitichePrenotazione', { method: 'POST', body: editing }).catch(() => {})
    if (editing.Id) {
      setPolitiche((list) => list.map((p) => (p.Id === editing.Id ? editing : p)))
      toast.success(`Regola "${editing.Nome}" aggiornata`)
    } else {
      setPolitiche((list) => [...list, { ...editing, Id: Date.now() }])
      toast.success(`Regola "${editing.Nome}" creata`)
    }
    setEditing(null)
  }

  const toggleAttivo = (p: Politica) => {
    setPolitiche((list) => list.map((x) => (x.Id === p.Id ? { ...x, Attivo: !x.Attivo } : x)))
    toast.info(`Regola "${p.Nome}" ${p.Attivo ? 'disattivata' : 'attivata'}`)
  }

  const remove = async (p: Politica) => {
    const ok = await confirm({
      title: 'Elimina regola',
      message: `Eliminare la politica "${p.Nome}"? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    setPolitiche((list) => list.filter((x) => x.Id !== p.Id))
    toast.success(`Regola "${p.Nome}" eliminata`)
  }

  return (
    <div className="politiche-prenotazione">
      <div className="politiche-prenotazione__breadcrumb">
        <span>Configuratore <i className="fa-light fa-chevron-right" /> <strong>Politiche di prenotazione</strong></span>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => setEditing({ ...EMPTY })}>
          <i className="fa-light fa-circle-plus" /> Crea nuova regola
        </button>
      </div>

      <p className="politiche-prenotazione__intro">
        Elenco dei documenti di politica generati dinamicamente. Ogni regola racchiude le condizioni di pagamento,
        cancellazione e mancato arrivo con i relativi testi multilingua.
      </p>

      <div className="politiche-prenotazione__table-wrap">
        <table className="politiche-prenotazione__table">
          <thead>
            <tr>
              <th>Nome</th><th>Descrizione</th>
              <th className="politiche-prenotazione__col-c">Pagamenti</th>
              <th className="politiche-prenotazione__col-c">Cancellazione</th>
              <th className="politiche-prenotazione__col-c">Mancato arrivo</th>
              <th>Termini</th>
              <th className="politiche-prenotazione__col-c">Stato</th>
              <th className="politiche-prenotazione__col-c">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {politiche.map((p) => (
              <tr key={p.Id} className={p.Attivo ? '' : 'politiche-prenotazione__row--off'}>
                <td>{p.Nome}</td>
                <td>{p.Descrizione}</td>
                <td className="politiche-prenotazione__col-c">{p.PagamentiAbilitati ? 'Sì' : 'No'}</td>
                <td className="politiche-prenotazione__col-c">{p.CancellazioneAbilitata ? 'Sì' : 'No'}</td>
                <td className="politiche-prenotazione__col-c">{p.MancatoArrivoAbilitato ? pct(p.MancatoArrivoPercentuale) : 'Nessuna'}</td>
                <td>{p.TerminiNome || (p.TestoIt ? 'Personalizzati' : '—')}</td>
                <td className="politiche-prenotazione__col-c">
                  <span className={`politiche-prenotazione__badge ${p.Attivo ? 'is-on' : 'is-off'}`}>
                    {p.Attivo ? 'Attivo' : 'Disattivo'}
                  </span>
                </td>
                <td className="politiche-prenotazione__col-c">
                  <div className="politiche-prenotazione__actions-cell">
                    <button type="button" className="sib-btn sib-btn--icon" title={p.Attivo ? 'Disattiva' : 'Attiva'} aria-label={p.Attivo ? 'Disattiva' : 'Attiva'} onClick={() => toggleAttivo(p)}>
                      <i className={`fa-light ${p.Attivo ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    </button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Modifica" aria-label="Modifica" onClick={() => setEditing({ ...p })}>
                      <i className="fa-light fa-pen" />
                    </button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Elimina" aria-label="Elimina" onClick={() => remove(p)}>
                      <i className="fa-light fa-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {politiche.length === 0 && (
              <tr><td colSpan={8} className="politiche-prenotazione__empty">Nessuna politica configurata.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="politiche-prenotazione__modal-backdrop" onClick={() => setEditing(null)}>
          <div className="politiche-prenotazione__modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.Id ? 'Modifica regola' : 'Nuova regola'}</h3>

            <div className="politiche-prenotazione__form-top">
              <InputField name="nome" label="Nome" required value={editing.Nome} onChange={(e) => upd({ Nome: e.target.value })} placeholder="Es. Non rimborsabile" />
              <InputField name="descrizione" label="Descrizione" value={editing.Descrizione} onChange={(e) => upd({ Descrizione: e.target.value })} placeholder="Breve descrizione" />
              <SelectField name="termini" label="Termini e condizioni" value={editing.TerminiNome} options={terminiOptions} onChange={(e) => applyTemplate(e.target.value)} />
              <button type="button" className="sib-btn sib-btn--secondary politiche-prenotazione__genera" onClick={genera}>
                <i className="fa-light fa-wand-magic-sparkles" /> Genera Termini &amp; Condizioni
              </button>
            </div>

            <div className="politiche-prenotazione__group">
              <h4>Programmazione pagamenti</h4>
              <RadioGroup name="pagamenti" value={editing.PagamentiAbilitati ? '1' : '0'} options={SN} onChange={(v) => upd({ PagamentiAbilitati: v === '1' })} />
              {editing.PagamentiAbilitati && (
                <CheckboxField name="carta" label="Richiedi Carta di Credito a Garanzia" checked={editing.RichiediCartaGaranzia} onChange={(e) => upd({ RichiediCartaGaranzia: e.target.checked })} />
              )}
            </div>

            <div className="politiche-prenotazione__group">
              <h4>Condizioni di cancellazione e penali</h4>
              <RadioGroup name="cancellazione" value={editing.CancellazioneAbilitata ? '1' : '0'} options={SN} onChange={(v) => upd({ CancellazioneAbilitata: v === '1' })} />
            </div>

            <div className="politiche-prenotazione__group">
              <h4>Penalità di mancato arrivo</h4>
              <RadioGroup name="mancato" value={editing.MancatoArrivoAbilitato ? '1' : '0'} options={SN} onChange={(v) => upd({ MancatoArrivoAbilitato: v === '1' })} />
              {editing.MancatoArrivoAbilitato && (
                <InputField
                  name="percentuale" type="number" label="Percentuale penale (%)"
                  className="politiche-prenotazione__pct"
                  value={String(editing.MancatoArrivoPercentuale)}
                  onChange={(e) => upd({ MancatoArrivoPercentuale: Number(e.target.value) || 0 })}
                />
              )}
            </div>

            <div className="politiche-prenotazione__testi">
              <TextareaField name="testoIt" label="Testo italiano" rows={6} value={editing.TestoIt} onChange={(e) => upd({ TestoIt: e.target.value })} placeholder="Testo della politica in italiano" />
              <TextareaField name="testoEn" label="Testo inglese" rows={6} value={editing.TestoEn} onChange={(e) => upd({ TestoEn: e.target.value })} placeholder="Policy text in English" />
            </div>

            <div className="politiche-prenotazione__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEditing(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={save}>Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
