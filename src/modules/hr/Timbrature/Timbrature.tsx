import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { DatePickerField, InputField, SelectField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { REPARTI_HR } from '../../../store/useHrGestioneStore'
import {
  DIPENDENTI_PRESENZE, useGiornataPresenze, useRegistroPresenzeStore, type DipendentePresenze,
} from '../../../store/useRegistroPresenzeStore'
import {
  chiaveGiorno, festivitaNazionale, fmtOre, GSETT, hhmmToMin, isoDi, MESI_LUNGHI, minToHHMM, repartoIcon,
  type Timbratura, type VersoTimbratura,
} from '../_presenze/presenze.model'
import { POSTAZIONI } from '../_presenze/ModaleTimbrature'
import { exportXls } from '../hrExport'
import '../_presenze/RegistroMensile.sass'
import './Timbrature.sass'

/**
 * Timbrature — HR › Gestione delle presenze.
 * Lo storico delle entrate e uscite del personale, con lo stesso stile a
 * griglia del Registro presenze (vista dettagliata): un riquadro per
 * dipendente con i giorni del mese in colonna e, per riga, ogni coppia
 * entrata/uscita e le ore lavorate. Clic su un orario per correggerlo o
 * eliminarlo, doppio clic su una casella vuota per aggiungere la timbratura.
 * QR di timbratura, kiosk e app dipendenti sono in «Qr Code & kiosk».
 */

interface FormTimbratura {
  /** Timbratura in modifica: giorno e id d'origine. */
  orig?: { dipId: number; iso: string; id: string }
  dipId: string
  data: string
  ora: string
  verso: VersoTimbratura
  postazione: string
  note: string
}

interface Coppia { entrata?: Timbratura; uscita?: Timbratura }

interface GiornoTimbr {
  iso: string
  n: number
  dow: number
  oggi: boolean
  futuro: boolean
  festivita: string | null
  coppie: Coppia[]
  lavorati: number
  manuale: boolean
}

const fmtData = (iso: string) => iso.split('-').reverse().join('/')
const MESI_BREVI = MESI_LUNGHI.map((m) => m.slice(0, 3).toLowerCase())
const ORDINALI = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª']

/** Timbrature del giorno in coppie entrata → uscita, in ordine d'orario. */
function coppieDi(timbrature: Timbratura[]): Coppia[] {
  const out: Coppia[] = []
  ;[...timbrature].sort((a, b) => a.min - b.min).forEach((t) => {
    const ultima = out[out.length - 1]
    if (t.verso === 'entrata' || !ultima || ultima.uscita) out.push(t.verso === 'entrata' ? { entrata: t } : { uscita: t })
    else ultima.uscita = t
  })
  return out
}

const lavoratiDi = (coppie: Coppia[]) => coppie.reduce((s, c) => s + (c.entrata && c.uscita ? Math.max(0, c.uscita.min - c.entrata.min) : 0), 0)

export default function Timbrature({ navigate }: { navigate: (p: string) => void }) {
  const giornata = useGiornataPresenze()
  const timbratureManuali = useRegistroPresenzeStore((s) => s.timbrature)
  const impostaTimbrature = useRegistroPresenzeStore((s) => s.impostaTimbrature)
  const confirm = useConfirmStore((s) => s.confirm)

  const oggi = new Date()
  const oggiIso = isoDi(oggi)
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth())
  const [reparto, setReparto] = useState('')
  const [cerca, setCerca] = useState('')
  const [form, setForm] = useState<FormTimbratura | null>(null)

  const nudgeMese = (d: number) => {
    const x = new Date(anno, mese + d, 1)
    setAnno(x.getFullYear()); setMese(x.getMonth())
  }
  const vaiAOggi = () => { setAnno(oggi.getFullYear()); setMese(oggi.getMonth()) }

  const dipendenti = useMemo(() => DIPENDENTI_PRESENZE.filter((d) =>
    (!reparto || d.reparto === reparto) &&
    (!cerca.trim() || `${d.nome} ${d.cognome}`.toLowerCase().includes(cerca.trim().toLowerCase()))), [reparto, cerca])

  // Giorni del mese per dipendente (fino a oggi: le timbrature future non esistono ancora).
  const mesePerDip = useMemo(() => {
    const nGiorni = new Date(anno, mese + 1, 0).getDate()
    const m = new Map<number, GiornoTimbr[]>()
    dipendenti.forEach((dip) => {
      const giorni: GiornoTimbr[] = []
      for (let n = 1; n <= nGiorni; n++) {
        const d = new Date(anno, mese, n)
        const iso = isoDi(d)
        const futuro = iso > oggiIso
        const coppie = futuro ? [] : coppieDi(giornata(dip.id, iso).timbrature)
        giorni.push({
          iso, n, dow: d.getDay(), oggi: iso === oggiIso, futuro, festivita: festivitaNazionale(d),
          coppie, lavorati: lavoratiDi(coppie), manuale: !!timbratureManuali[chiaveGiorno(dip.id, iso)],
        })
      }
      m.set(dip.id, giorni)
    })
    return m
  }, [dipendenti, anno, mese, oggiIso, giornata, timbratureManuali])

  // ── Nuova / modifica / elimina ──
  const nuova = (dipId = '', data = oggiIso, verso: VersoTimbratura = 'entrata') => setForm({
    dipId, data, ora: data === oggiIso ? minToHHMM(oggi.getHours() * 60 + oggi.getMinutes()) : verso === 'entrata' ? '09:00' : '18:00',
    verso, postazione: 'inserita dall\'HR', note: '',
  })
  const modifica = (dip: DipendentePresenze, iso: string, t: Timbratura) => setForm({
    orig: { dipId: dip.id, iso, id: t.id },
    dipId: String(dip.id), data: iso, ora: minToHHMM(t.min), verso: t.verso, postazione: t.postazione, note: t.note ?? '',
  })

  function salva() {
    if (!form || !form.dipId || !form.data || !form.ora) return
    const dipId = Number(form.dipId)
    const voce: Timbratura = {
      id: form.orig?.id ?? `t${Date.now()}`,
      min: hhmmToMin(form.ora), verso: form.verso, postazione: form.postazione, note: form.note.trim() || undefined,
    }
    const stessoGiorno = form.orig && form.orig.dipId === dipId && form.orig.iso === form.data
    if (form.orig && !stessoGiorno) {
      // Spostata su un altro giorno o dipendente: esce dalla giornata d'origine.
      const o = form.orig
      impostaTimbrature(chiaveGiorno(o.dipId, o.iso), giornata(o.dipId, o.iso).timbrature.filter((t) => t.id !== o.id))
    }
    const lista = giornata(dipId, form.data).timbrature
    impostaTimbrature(chiaveGiorno(dipId, form.data), stessoGiorno ? lista.map((t) => (t.id === voce.id ? voce : t)) : [...lista, voce])
    const nome = DIPENDENTI_PRESENZE.find((d) => d.id === dipId)
    toast.success(`${voce.verso === 'entrata' ? 'Entrata' : 'Uscita'} delle ${form.ora} di ${nome?.nome} ${nome?.cognome} ${form.orig ? 'aggiornata' : 'registrata'}.`, form.orig ? 'Timbratura modificata' : 'Timbratura aggiunta')
    setForm(null)
  }

  async function elimina() {
    if (!form?.orig) return
    const o = form.orig
    const dip = DIPENDENTI_PRESENZE.find((d) => d.id === o.dipId)
    const t = giornata(o.dipId, o.iso).timbrature.find((x) => x.id === o.id)
    if (!dip || !t) return
    const ok = await confirm({
      title: 'Elimina timbratura',
      message: `Eliminare l'${t.verso} delle ${minToHHMM(t.min)} del ${fmtData(o.iso)} di ${dip.nome} ${dip.cognome}? La presenza della giornata verrà ricalcolata.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    impostaTimbrature(chiaveGiorno(o.dipId, o.iso), giornata(o.dipId, o.iso).timbrature.filter((x) => x.id !== o.id))
    toast.success('Timbratura eliminata.', 'Eliminata')
    setForm(null)
  }

  function esporta() {
    const righe: string[][] = []
    dipendenti.forEach((dip) => (mesePerDip.get(dip.id) ?? []).forEach((g) => g.coppie.forEach((c) => {
      ;[c.entrata, c.uscita].forEach((t) => t && righe.push([
        `${dip.nome} ${dip.cognome}`, dip.reparto, t.verso === 'entrata' ? 'Entrata' : 'Uscita', fmtData(g.iso), minToHHMM(t.min), t.postazione, t.note ?? '',
      ]))
    })))
    exportXls(`timbrature_${anno}-${String(mese + 1).padStart(2, '0')}`, ['Dipendente', 'Reparto', 'Tipo', 'Data', 'Ora', 'Postazione', 'Note'], righe)
  }

  return (
    <div className="tmb">
      <PageHead
        title="Timbrature"
        subtitle="Storico delle entrate e uscite del personale, giorno per giorno"
        onBack={() => navigate('home')}
        actions={
          <div className="tmb__head-actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-qr-kiosk')}>
              <i className="fa-solid fa-qrcode" aria-hidden="true" />Qr Code & kiosk
            </button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => nuova()}>
              <i className="fa-solid fa-plus" aria-hidden="true" />Nuova timbratura
            </button>
          </div>
        }
      />

      <div className="tmb__toolbar">
        <SelectField name="reparto" label="Reparto" className="tmb__f-rep" value={reparto} onChange={(e) => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map((r) => ({ value: r, label: r }))]} />
        <InputField name="ricerca" label="Cerca" className="tmb__f-cerca" placeholder="Cerca dipendente" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        <div className="tmb__tools">
          <div className="tmb__periodo">
            <Tooltip text="Mese precedente">
              <button type="button" className="tmb__per-btn" aria-label="Mese precedente" onClick={() => nudgeMese(-1)}>
                <i className="fa-solid fa-chevron-left" />
              </button>
            </Tooltip>
            <span className="tmb__per-label">{MESI_LUNGHI[mese]} {anno}</span>
            <Tooltip text="Mese successivo">
              <button type="button" className="tmb__per-btn" aria-label="Mese successivo" onClick={() => nudgeMese(1)}>
                <i className="fa-solid fa-chevron-right" />
              </button>
            </Tooltip>
          </div>
          <button type="button" className="sib-btn sib-btn--ghost tmb__oggi" onClick={vaiAOggi}>Oggi</button>
          <Tooltip text="Timbrature del mese in Excel">
            <button type="button" className="tmb__icon-btn" onClick={esporta} disabled={!dipendenti.length} aria-label="Timbrature del mese in Excel">
              <i className="fa-regular fa-file-xls" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="rpm">
        <div className="rpm__legend" aria-label="Legenda">
          <span className="rpm__leg"><span className="tmb__leg-dot tmb__leg-dot--in" aria-hidden="true" />Entrata</span>
          <span className="rpm__leg"><span className="tmb__leg-dot tmb__leg-dot--out" aria-hidden="true" />Uscita</span>
          <span className="rpm__leg"><i className="fa-solid fa-triangle-exclamation tmb__warn" aria-hidden="true" />Timbratura mancante</span>
          <span className="rpm__legend-end">
            <span className="rpm__leg"><i className="fa-solid fa-pen" aria-hidden="true" />Inserita o corretta dall'HR</span>
          </span>
        </div>

        {dipendenti.map((dip) => {
          const giorni = mesePerDip.get(dip.id) ?? []
          const righeCoppie = Math.max(1, ...giorni.map((g) => g.coppie.length))
          const nTimbr = giorni.reduce((s, g) => s + g.coppie.reduce((k, c) => k + (c.entrata ? 1 : 0) + (c.uscita ? 1 : 0), 0), 0)
          const daApp = giorni.reduce((s, g) => s + g.coppie.reduce((k, c) => k + [c.entrata, c.uscita].filter((t) => t?.postazione === 'App Op!').length, 0), 0)
          const mancanti = giorni.filter((g) => !g.oggi && g.coppie.some((c) => !c.entrata || !c.uscita)).length
          const manuali = giorni.filter((g) => g.manuale && g.coppie.length).length
          const oreTot = giorni.reduce((s, g) => s + g.lavorati, 0)
          return (
            <section key={dip.id} className="rpm__card">
              <header className="rpm__head">
                <span className="rpm__avatar rpm__avatar--ini">{dip.nome[0]}{dip.cognome[0]}</span>
                <span className="rpm__nome">{dip.nome} {dip.cognome}</span>
                <span className="rpm__reparto"><i className={`fa-solid ${repartoIcon(dip.reparto)}`} aria-hidden="true" />{dip.reparto}</span>
              </header>

              <table className="rpm__grid tmb__grid">
                <colgroup>
                  <col className="rpm__c-label" />
                  {giorni.map((g) => <col key={g.iso} />)}
                  <col className="rpm__c-tot" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="row">Giorno</th>
                    {giorni.map((g) => (
                      <th key={g.iso} className={cls(g)}>
                        {g.festivita ? <Tooltip text={g.festivita}><span className="rpm__fest">{g.n}</span></Tooltip> : g.n}
                      </th>
                    ))}
                    <th className="rpm__tot-col">Totale</th>
                  </tr>
                  <tr className="rpm__r-gsett">
                    <th scope="row">G. sett.</th>
                    {giorni.map((g) => <th key={g.iso} className={cls(g)}>{GSETT[g.dow]}</th>)}
                    <th className="rpm__tot-col" />
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: righeCoppie }).flatMap((_, k) => (['entrata', 'uscita'] as const).map((verso) => (
                    <tr key={`${k}-${verso}`} className={verso === 'uscita' && k < righeCoppie - 1 ? 'tmb__r-sep' : undefined}>
                      <th scope="row">{righeCoppie > 1 ? `${ORDINALI[k] ?? `${k + 1}ª`} ${verso}` : verso === 'entrata' ? 'Entrata' : 'Uscita'}</th>
                      {giorni.map((g) => {
                        const c = g.coppie[k]
                        const t = c?.[verso]
                        // Coppia iniziata ma senza l'altra metà (escluso oggi, con il dipendente ancora dentro).
                        const manca = !!c && !t && !(g.oggi && verso === 'uscita')
                        return (
                          <td key={g.iso} className={`${cls(g)}${g.futuro ? ' tmb__cell--fut' : ' tmb__cell'}`}
                            onDoubleClick={() => !g.futuro && !t && nuova(String(dip.id), g.iso, verso)}>
                            {t ? (
                              <Tooltip content={<CellaTooltip t={t} iso={g.iso} anno={anno} />}>
                                <button type="button" className={`tmb__time ${verso === 'entrata' ? 'rpm__in' : 'rpm__out'}`}
                                  aria-label={`Modifica ${verso} delle ${minToHHMM(t.min)} del ${fmtData(g.iso)}`} onClick={() => modifica(dip, g.iso, t)}>
                                  {minToHHMM(t.min)}
                                  {g.manuale && <i className="fa-solid fa-pen rpm__mod" aria-hidden="true" />}
                                </button>
                              </Tooltip>
                            ) : manca ? (
                              <Tooltip text={`${verso === 'entrata' ? 'Entrata' : 'Uscita'} mancante: doppio clic per aggiungerla`}>
                                <i className="fa-solid fa-triangle-exclamation tmb__warn" aria-label={`${verso} mancante`} />
                              </Tooltip>
                            ) : null}
                          </td>
                        )
                      })}
                      <td className="rpm__tot-col" />
                    </tr>
                  )))}
                  <tr className="tmb__r-ore">
                    <th scope="row">Ore</th>
                    {giorni.map((g) => (
                      <td key={g.iso} className={`${cls(g)} tmb__cell--ro`}>{g.lavorati > 0 && fmtOreBreve(g.lavorati)}</td>
                    ))}
                    <td className="rpm__tot-col">{oreTot > 0 && fmtOreBreve(oreTot)}</td>
                  </tr>
                </tbody>
              </table>

              <footer className="rpm__foot">
                <div className="rpm__tot">
                  <span><b className="rpm__tot-ord">{nTimbr}</b> {nTimbr === 1 ? 'Timbratura' : 'Timbrature'}</span>
                  <span><b className="rpm__tot-ord">{fmtOre(oreTot)}</b> Lavorate</span>
                  {daApp > 0 && <span><b className="rpm__tot-per">{daApp}</b> Dall'App Op!</span>}
                  {mancanti > 0 && <span><b className="rpm__tot-ano">{mancanti}</b> {mancanti === 1 ? 'Giorno con timbratura mancante' : 'Giorni con timbrature mancanti'}</span>}
                  {manuali > 0 && <span className="rpm__tot-mod"><i className="fa-solid fa-pen" aria-hidden="true" /> {manuali} {manuali === 1 ? 'giorno modificato' : 'giorni modificati'}</span>}
                </div>
                <span className="rpm__hint">Clic su un orario per modificarlo · doppio clic su una casella vuota per aggiungere</span>
              </footer>
            </section>
          )
        })}

        {dipendenti.length === 0 && <div className="rpm__empty">Nessun dipendente per i filtri selezionati.</div>}
      </div>

      {/* ── Nuova / modifica timbratura ── */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.orig ? 'Modifica timbratura' : 'Nuova timbratura'} size="md">
        {form && (
          <div className="tmb-form">
            <SelectField name="dipendente" label="Dipendente" required value={form.dipId} onChange={(e) => setForm({ ...form, dipId: e.target.value })}
              placeholder="Scegli il dipendente"
              options={DIPENDENTI_PRESENZE.map((d) => ({ value: String(d.id), label: `${d.cognome} ${d.nome} · ${d.reparto}` }))} />
            <div className="tmb-form__grid">
              <DatePickerField name="data" label="Data" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              <DatePickerField name="ora" label="Ora" type="time" value={form.ora} onChange={(e) => setForm({ ...form, ora: e.target.value })} />
              <SelectField name="tipo" label="Tipo" value={form.verso} onChange={(e) => setForm({ ...form, verso: e.target.value as VersoTimbratura })}
                options={[{ value: 'entrata', label: 'Entrata' }, { value: 'uscita', label: 'Uscita' }]} />
            </div>
            <SelectField name="postazione" label="Postazione" value={form.postazione} onChange={(e) => setForm({ ...form, postazione: e.target.value })}
              options={Array.from(new Set([...POSTAZIONI, form.postazione])).map((p) => ({ value: p, label: p }))} />
            <InputField name="note" label="Note (opzionale)" placeholder="Es. recupero, timbratura dimenticata…" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
            {form.data > oggiIso && (
              <p className="tmb__hint tmb__hint--warn">La data è nel futuro: la timbratura comparirà nello storico da quel giorno.</p>
            )}
            <div className="tmb-form__actions">
              {form.orig && (
                <button type="button" className="sib-btn sib-btn--ghost tmb-form__del" onClick={elimina}>
                  <i className="fa-solid fa-trash" aria-hidden="true" />Elimina
                </button>
              )}
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={salva} disabled={!form.dipId || !form.data || !form.ora}>
                {form.orig ? 'Salva modifiche' : 'Aggiungi timbratura'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/** "8h 30'" → compatto per la cella: "8:30". */
const fmtOreBreve = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

function cls(g: GiornoTimbr) {
  return [g.festivita || g.dow === 0 || g.dow === 6 ? 'rpm__we' : '', g.oggi ? 'rpm__oggi' : ''].filter(Boolean).join(' ')
}

function CellaTooltip({ t, iso, anno }: { t: Timbratura; iso: string; anno: number }): React.ReactElement {
  const [, m, g] = iso.split('-').map(Number)
  return (
    <span className="rpm__tip">
      <span className="rpm__tip-t">{t.verso === 'entrata' ? 'Entrata' : 'Uscita'} delle {minToHHMM(t.min)} · {g} {MESI_BREVI[m - 1]} {anno}</span>
      <span>Postazione: {t.postazione}</span>
      {t.note && <span>{t.note}</span>}
    </span>
  )
}
