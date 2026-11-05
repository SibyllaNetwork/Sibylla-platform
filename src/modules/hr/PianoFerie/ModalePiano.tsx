import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import { InputField, DateRangeField, DatePickerField, TextareaField, CheckboxField } from '../../../core/components/form'
import { fmtDataHr, isoOf } from '../../../store/useHrGestioneStore'
import { REGOLE_DEFAULT, type DatiPiano, type PianoFerie } from '../../../store/usePianiFerieStore'
import './ModalePiano.sass'

/**
 * Nuovo / Modifica piano ferie: nome, periodo, termine per le richieste dall'App Op!,
 * regole (giorni consecutivi, presenza minima per reparto, giorni residui e saldo
 * negativo concedibile solo dall'HR) e avviso ai dipendenti. Modelli rapidi per le feste
 * ricorrenti (il prossimo Natale, Pasqua, estate, Ferragosto).
 */

/** Domenica di Pasqua (algoritmo gregoriano anonimo). */
function pasqua(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(y, mese - 1, giorno, 12)
}
const sposta = (d: Date, g: number) => { const x = new Date(d); x.setDate(x.getDate() + g); return x }

/** Modelli: il prossimo periodo che non è ancora finito. */
function modelli(oggi = new Date()) {
  const y = oggi.getFullYear()
  const iso = isoOf(oggi)
  const prossimo = (f: (y: number) => { dal: string; al: string; scad: string }) => (f(y).al >= iso ? { ...f(y), y } : { ...f(y + 1), y: y + 1 })
  const p = (nome: string, f: (y: number) => { dal: string; al: string; scad: string }) => { const r = prossimo(f); return { nome: `${nome} ${r.y}`, ...r } }
  return [
    p('Natale', y => ({ dal: `${y}-12-01`, al: `${y + 1}-01-07`, scad: `${y}-11-20` })),
    p('Pasqua', y => { const e = pasqua(y); return { dal: isoOf(sposta(e, -7)), al: isoOf(sposta(e, 2)), scad: isoOf(sposta(e, -30)) } }),
    p('Estate', y => ({ dal: `${y}-06-01`, al: `${y}-09-30`, scad: `${y}-04-30` })),
    p('Ferragosto', y => ({ dal: `${y}-08-01`, al: `${y}-08-31`, scad: `${y}-06-30` })),
  ]
}

interface Props {
  open: boolean
  /** Piano da modificare; assente = nuovo. */
  piano?: PianoFerie
  /** Gli altri piani aperti, per avvisare delle sovrapposizioni. */
  altriAperti: PianoFerie[]
  onClose: () => void
  onSalva: (d: DatiPiano) => void
}

export default function ModalePiano({ open, piano, altriAperti, onClose, onSalva }: Props) {
  const [nome, setNome] = useState('')
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [scad, setScad] = useState('')
  const [consec, setConsec] = useState('')
  const [presenza, setPresenza] = useState('')
  const [entroResidui, setEntroResidui] = useState(true)
  const [negativo, setNegativo] = useState('0')
  const [note, setNote] = useState('')
  const [errori, setErrori] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setNome(piano?.nome ?? '')
    setDal(piano?.dal ?? '')
    setAl(piano?.al ?? '')
    setScad(piano?.scadenzaRichieste ?? '')
    const g = piano?.regole ?? REGOLE_DEFAULT
    setConsec(g.maxGiorniConsecutivi != null ? String(g.maxGiorniConsecutivi) : '')
    setPresenza(g.presenzaMinimaReparto != null ? String(g.presenzaMinimaReparto) : '')
    setEntroResidui(g.entroResidui)
    setNegativo(String(g.negativoMax))
    setNote(piano?.note ?? '')
    setErrori({})
  }, [open, piano])

  const usaModello = (m: ReturnType<typeof modelli>[number]) => {
    setNome(m.nome); setDal(m.dal); setAl(m.al); setScad(m.scad); setErrori({})
  }

  const sovrapposti = dal && al ? altriAperti.filter(p => p.dal <= al && p.al >= dal) : []

  const salva = () => {
    const e: Record<string, string> = {}
    const intero = (v: string) => v.trim() === '' ? undefined : Number(v)
    const nConsec = intero(consec), nPres = intero(presenza), nNeg = intero(negativo) ?? 0
    if (!nome.trim()) e.nome = 'Dai un nome al piano, ad esempio "Natale 2026"'
    if (!dal || !al) e.periodo = 'Indica il periodo del piano'
    else if (al < dal) e.periodo = 'La data di fine precede quella di inizio'
    if (scad && dal && scad > dal) e.scad = 'Il termine per le richieste deve cadere prima dell\'inizio del piano'
    if (nConsec != null && (!Number.isInteger(nConsec) || nConsec < 1)) e.consec = 'Un numero intero di giorni, almeno 1'
    if (nPres != null && (!Number.isInteger(nPres) || nPres < 0 || nPres > 100)) e.presenza = 'Una percentuale da 0 a 100'
    if (entroResidui && (!Number.isInteger(nNeg) || nNeg < 0)) e.negativo = 'Un numero intero di giorni, 0 se mai'
    setErrori(e)
    if (Object.keys(e).length) return
    onSalva({ nome: nome.trim(), dal, al, scadenzaRichieste: scad || undefined, regole: { maxGiorniConsecutivi: nConsec, presenzaMinimaReparto: nPres, entroResidui, negativoMax: entroResidui ? nNeg : 0 }, note: note.trim() || undefined })
  }

  return (
    <Modal open={open} onClose={onClose} title={piano ? 'Modifica piano ferie' : 'Nuovo piano ferie'} size="md">
      <div className="pfm">
        {!piano && (
          <div className="pfm__modelli">
            <span className="pfm__label">Modelli rapidi</span>
            <div className="pfm__chips">
              {modelli().map(m => (
                <button key={m.nome} type="button" className="pfm__chip" onClick={() => usaModello(m)}>
                  <i className="fa-solid fa-umbrella-beach" aria-hidden="true" /> {m.nome}
                </button>
              ))}
            </div>
          </div>
        )}
        <InputField name="pf-nome" label="Nome del piano" required value={nome} error={errori.nome}
          placeholder="Natale 2026" onChange={e => setNome(e.target.value)} />
        <DateRangeField label="Periodo" nameFrom="pf-dal" nameTo="pf-al" required error={errori.periodo}
          valueFrom={dal} valueTo={al}
          onChangeFrom={e => setDal(e.target.value)} onChangeTo={e => setAl(e.target.value)} />
        <p className="pfm__hint">
          <i className="fa-solid fa-circle-info" aria-hidden="true" /> Nel piano contano solo le ferie che i dipendenti chiedono per questo periodo; i giorni che escono dal periodo non vengono registrati.
        </p>
        {sovrapposti.length > 0 && (
          <p className="pfm__hint pfm__hint--warn">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Si sovrappone a {sovrapposti.map(p => `«${p.nome}» (${fmtDataHr(p.dal)} → ${fmtDataHr(p.al)})`).join(', ')}: le stesse ferie compariranno in entrambi.
          </p>
        )}
        <DatePickerField name="pf-scad" label="Richieste entro il" value={scad} max={dal || undefined} error={errori.scad}
          hint="Facoltativo: termine mostrato ai dipendenti nell'App Op!" onChange={e => setScad(e.target.value)} className="pfm__scad" />

        {/* ── Regole del piano ── */}
        <fieldset className="pfm__regole">
          <legend className="pfm__label">Regole del piano</legend>
          <div className="pfm__grid">
            <InputField name="pf-consec" label="Giorni consecutivi massimi" type="number" min={1} step={1} value={consec} error={errori.consec}
              placeholder="Nessun limite" hint="Giorni di calendario di fila per persona, richieste attaccate comprese"
              onChange={e => setConsec(e.target.value)} />
            <InputField name="pf-presenza" label="Presenza minima per reparto (%)" type="number" min={0} max={100} step={5} value={presenza} error={errori.presenza}
              placeholder="Nessun limite" hint="Quota del reparto che deve restare in servizio ogni giorno"
              onChange={e => setPresenza(e.target.value)} />
          </div>
          <CheckboxField name="pf-residui" label="Le ferie restano entro i giorni residui della persona" checked={entroResidui}
            onChange={e => setEntroResidui(e.target.checked)} />
          {entroResidui && (
            <InputField name="pf-negativo" label="Saldo negativo concedibile (giorni)" type="number" min={0} step={1} value={negativo} error={errori.negativo}
              hint="Oltre i residui si va in negativo solo con l'approvazione dell'ufficio del personale; 0 = mai"
              onChange={e => setNegativo(e.target.value)} className="pfm__neg" />
          )}
        </fieldset>
        <TextareaField name="pf-note" label="Avviso ai dipendenti" rows={2} value={note}
          hint="Lo vedono nell'App Op! quando chiedono le ferie del periodo" onChange={e => setNote(e.target.value)} />
        <div className="pfm__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>{piano ? 'Salva modifiche' : 'Crea piano'}</button>
        </div>
      </div>
    </Modal>
  )
}
