import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Ico from '../../../core/icons/Ico'
import { SelectField, CheckboxField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import {
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, TIPI_ASSENZA, isoOf, todayIsoHr, fmtDataHr,
  ferieGodute, inAttesaRichiesta, type TipoAssenza, type StatoRichiesta,
} from '../../../store/useHrGestioneStore'
import { usePianiFerieStore, feriePianoCorrenti, type PianoFerie as Piano, type DatiPiano } from '../../../store/usePianiFerieStore'
import { exportXls } from '../hrExport'
import ModalePiano from './ModalePiano'
import './PianoFerie.sass'

/**
 * Piano ferie — HR › Gestione delle presenze › Gestione ferie e permessi.
 * L'ufficio del personale crea un piano per ogni periodo festivo (es. "Natale 2026"
 * dal 1° dicembre al 7 gennaio, con il termine entro cui chiedere le ferie dall'App
 * Op!): nel piano contano solo le ferie che cadono nel periodo. Il calendario mostra
 * i mesi del piano, reparto per reparto, e segnala i giorni in cui un reparto supera
 * gli assenti consentiti. A periodo gestito il piano si chiude e resta nello storico
 * con la fotografia delle ferie a quella data. Il "calendario generale" mostra
 * invece tutte le assenze del mese, senza piano.
 */

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GG = ['D', 'L', 'M', 'M', 'G', 'V', 'S']
/** Calendario generale: assenti nello stesso giorno oltre i quali il giorno si segnala come scoperto. */
const SOGLIA_ASSENTI = 3
const GENERALE = 'generale'

const tipoCls = (t: TipoAssenza) => t.toLowerCase()
const ym = (iso: string) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 })
const giorniTra = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000)

/** Assenza da disegnare: le richieste dal vivo o la fotografia di un piano archiviato. */
interface Assenza { id: string; dipendenteId: number; tipo: TipoAssenza; dal: string; al: string; stato: StatoRichiesta; note?: string }

/** Mesi (anno, mese) che il periodo tocca. */
function mesiDel(dal: string, al: string) {
  const out: { y: number; m: number }[] = []
  let { y, m } = ym(dal)
  const fine = ym(al)
  while (y < fine.y || (y === fine.y && m <= fine.m)) { out.push({ y, m }); m++; if (m > 11) { m = 0; y++ } }
  return out
}

export default function PianoFerie({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const piani = usePianiFerieStore(s => s.piani)
  const { crea, modifica, archivia, riapri, elimina } = usePianiFerieStore()
  const confirm = useConfirmStore(s => s.confirm)
  const oggi = todayIsoHr()

  // Piano mostrato: di default quello aperto più vicino a oggi, altrimenti il calendario generale.
  const aperti = useMemo(() => piani.filter(p => p.stato === 'Aperto').sort((a, b) => a.dal.localeCompare(b.dal)), [piani])
  const archiviati = useMemo(() => piani.filter(p => p.stato === 'Archiviato').sort((a, b) => b.dal.localeCompare(a.dal)), [piani])
  const [pianoId, setPianoId] = useState(() => {
    const ps = usePianiFerieStore.getState().piani.filter(p => p.stato === 'Aperto').sort((a, b) => a.dal.localeCompare(b.dal))
    return (ps.find(p => p.al >= todayIsoHr()) ?? ps[0])?.id ?? GENERALE
  })
  const piano = piani.find(p => p.id === pianoId)
  useEffect(() => { if (pianoId !== GENERALE && !piano) setPianoId(GENERALE) }, [pianoId, piano])

  const [mese, setMese] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [reparto, setReparto] = useState('')
  const [conAttesa, setConAttesa] = useState(true)
  const [modale, setModale] = useState<{ piano?: Piano } | null>(null)
  const [storicoOpen, setStoricoOpen] = useState(false)

  // Mesi navigabili: quelli del piano; scegliendo un piano si parte dal mese di oggi se ci cade, altrimenti dal primo.
  const mesiPiano = useMemo(() => piano ? mesiDel(piano.dal, piano.al) : null, [piano])
  useEffect(() => {
    if (!piano) return
    const ms = mesiDel(piano.dal, piano.al)
    const ora = ym(oggi)
    setMese(ms.find(x => x.y === ora.y && x.m === ora.m) ?? ms[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pianoId])
  const idxMese = mesiPiano ? mesiPiano.findIndex(x => x.y === mese.y && x.m === mese.m) : -1

  const giorni = useMemo(() => {
    const n = new Date(mese.y, mese.m + 1, 0).getDate()
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(mese.y, mese.m, i + 1, 12)
      const iso = isoOf(d)
      return { iso, n: i + 1, wd: d.getDay(), fuori: !!piano && (iso < piano.dal || iso > piano.al) }
    })
  }, [mese, piano])
  const primo = giorni[0].iso
  const ultimo = giorni[giorni.length - 1].iso

  // Le ferie del piano (dal vivo o archiviate) oppure tutte le assenze per il calendario generale.
  const fonte: Assenza[] = useMemo(() => {
    if (!piano) return richieste.map(r => ({ id: r.id, dipendenteId: r.dipendenteId, tipo: r.tipo, dal: r.dal, al: r.al, stato: r.stato, note: r.note }))
    return feriePianoCorrenti(richieste, piano).map(f => ({
      id: f.richiestaId, dipendenteId: f.dipendenteId, tipo: 'Ferie' as const, dal: f.dal, al: f.al, stato: f.stato,
      note: richieste.find(r => r.id === f.richiestaId)?.note,
    }))
  }, [richieste, piano])

  // Visibili nel mese: approvate + (a scelta) in attesa; le rifiutate mai.
  const assenze = useMemo(() => fonte.filter(r =>
    (r.stato === 'Approvata' || (conAttesa && inAttesaRichiesta(r.stato))) && r.dal <= ultimo && r.al >= primo),
  [fonte, conAttesa, primo, ultimo])
  const assenzaDi = (dipendenteId: number, iso: string) => assenze.find(r => r.dipendenteId === dipendenteId && r.dal <= iso && r.al >= iso)

  const gruppi = useMemo(() => REPARTI_HR
    .filter(r => !reparto || r === reparto)
    .map(r => ({ reparto: r, dipendenti: DIPENDENTI_HR.filter(d => d.reparto === r) }))
    .filter(g => g.dipendenti.length > 0), [reparto])
  const visibili = gruppi.flatMap(g => g.dipendenti)

  // Assenti per giorno (solo approvate: le richieste in attesa non scoprono ancora il turno).
  const assentiDel = (iso: string, ids = visibili.map(d => d.id)) => ids.filter(id => assenzaDi(id, iso)?.stato === 'Approvata').length
  /** Reparti oltre gli assenti massimi del piano in quel giorno. */
  const scopertiDel = (iso: string) => piano
    ? gruppi.filter(g => assentiDel(iso, g.dipendenti.map(d => d.id)) > piano.maxAssentiReparto).map(g => g.reparto)
    : []

  const cambiaMese = (delta: number) => {
    if (mesiPiano) { const t = mesiPiano[idxMese + delta]; if (t) setMese(t); return }
    setMese(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  }
  const puoPrima = mesiPiano ? idxMese > 0 : true
  const puoDopo = mesiPiano ? idxMese < mesiPiano.length - 1 : true
  const isMeseCorrente = mese.y === new Date().getFullYear() && mese.m === new Date().getMonth()

  // ── Riepilogo del piano ──
  const riepilogo = (p: Piano) => {
    const xs = feriePianoCorrenti(richieste, p)
    const conta = (f: (s: StatoRichiesta) => boolean) => xs.filter(x => f(x.stato))
    const ok = conta(s => s === 'Approvata')
    return {
      tot: xs.length,
      approvate: ok.length,
      giorniOk: ok.reduce((s, x) => s + x.giorni, 0),
      daApprovare: conta(s => s === 'Da approvare').length,
      alResp: conta(s => s === 'Al responsabile').length,
      rifiutate: conta(s => s === 'Rifiutata').length,
      dipendenti: new Set(ok.map(x => x.dipendenteId)).size,
    }
  }

  // ── Azioni sul piano ──
  const salvaPiano = (d: DatiPiano) => {
    if (modale?.piano) {
      modifica(modale.piano.id, d)
      toast.success(`Piano «${d.nome}» aggiornato.`, 'Piano modificato')
    } else {
      const id = crea(d)
      setPianoId(id)
      toast.success(`«${d.nome}» è aperto: i dipendenti possono chiedere le ferie del periodo dall'App Op!${d.scadenzaRichieste ? ` entro il ${fmtDataHr(d.scadenzaRichieste)}` : ''}.`, 'Piano creato')
    }
    setModale(null)
  }
  const archiviaPiano = async (p: Piano) => {
    const r = riepilogo(p)
    const aperte = r.daApprovare + r.alResp
    const ok = await confirm({
      title: 'Chiudi e archivia',
      message: <>Chiudi «{p.nome}» e lo salvi nello storico? Resta la fotografia di oggi: <strong>{r.approvate} ferie approvate ({r.giorniOk} gg)</strong>.{aperte > 0 && <> Attenzione, {aperte === 1 ? 'una richiesta è' : `${aperte} richieste sono`} ancora da decidere.</>}</>,
      confirmLabel: 'Archivia', danger: false,
    })
    if (!ok) return
    archivia(p.id, richieste)
    toast.success(`«${p.nome}» è nello storico dei piani.`, 'Piano archiviato')
  }
  const riapriPiano = async (p: Piano) => {
    const ok = await confirm({
      title: 'Riapri il piano',
      message: `Riapri «${p.nome}»? Torna a mostrare le ferie dal vivo e la fotografia dell'archiviazione viene sostituita alla prossima chiusura.`,
      confirmLabel: 'Riapri', danger: false,
    })
    if (!ok) return
    riapri(p.id)
    toast.info(`«${p.nome}» è di nuovo aperto.`, 'Piano riaperto')
  }
  const eliminaPiano = async (p: Piano) => {
    const ok = await confirm({
      title: 'Elimina piano',
      message: `Eliminare il piano «${p.nome}»? Le richieste di ferie dei dipendenti restano in Richieste, si perde solo il piano${p.stato === 'Archiviato' ? ' e la sua fotografia nello storico' : ''}. L'operazione non si può annullare.`,
      confirmLabel: 'Elimina',
    })
    if (!ok) return
    elimina(p.id)
    setPianoId(GENERALE)
    toast.info(`Piano «${p.nome}» eliminato.`, 'Piano eliminato')
  }

  const esportaPiano = (p: Piano) => exportXls(`piano-ferie_${p.nome.toLowerCase().replace(/\s+/g, '-')}`,
    ['Dipendente', 'Reparto', 'Dal', 'Al', 'Giorni lavorativi', 'Stato'],
    feriePianoCorrenti(richieste, p).sort((a, b) => a.dal.localeCompare(b.dal)).map(f => {
      const d = DIPENDENTI_HR.find(x => x.id === f.dipendenteId)!
      return [`${d.nome} ${d.cognome}`, d.reparto, fmtDataHr(f.dal), fmtDataHr(f.al), f.giorni, f.stato]
    }))
  const esporta = () => {
    if (piano) { esportaPiano(piano); return }
    exportXls(`piano-ferie-${mese.y}-${String(mese.m + 1).padStart(2, '0')}`,
      ['Dipendente', 'Reparto', 'Tipo', 'Dal', 'Al', 'Stato'],
      assenze
        .filter(r => visibili.some(d => d.id === r.dipendenteId))
        .sort((a, b) => a.dal.localeCompare(b.dal))
        .map(r => {
          const d = DIPENDENTI_HR.find(x => x.id === r.dipendenteId)!
          return [`${d.nome} ${d.cognome}`, d.reparto, r.tipo, fmtDataHr(r.dal), fmtDataHr(r.al), r.stato]
        }))
  }

  const inAttesa = richieste.filter(r => inAttesaRichiesta(r.stato)).length
  const rp = piano ? riepilogo(piano) : null
  const scadenza = piano?.scadenzaRichieste
  const traGiorni = scadenza ? giorniTra(oggi, scadenza) : null

  return (
    <div className="pfe">
      <PageHead
        title="Piano ferie"
        subtitle={piano ? `${piano.nome}: le ferie chieste per il periodo, reparto per reparto` : 'Le assenze del personale nel mese, reparto per reparto'}
        onBack={() => navigate('home')}
        actions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setModale({})}>
            <Ico n="plus" s={14} c="currentColor" /> Nuovo piano ferie
          </button>
        }
      />

      <div className="pfe__toolbar">
        <SelectField name="piano" label="Piano" className="pfe__field pfe__field--piano" value={pianoId} onChange={e => setPianoId(e.target.value)}
          options={[
            ...aperti.map(p => ({ value: p.id, label: `${p.nome} · aperto` })),
            ...archiviati.map(p => ({ value: p.id, label: `${p.nome} · archiviato` })),
            { value: GENERALE, label: 'Calendario generale (tutte le assenze)' },
          ]} />
        <div className="pfe__nav">
          <Tooltip text="Mese precedente">
            <button type="button" className="pfe__nav-btn" disabled={!puoPrima} onClick={() => cambiaMese(-1)} aria-label="Mese precedente">
              <Ico n="back" w="solid" s={13} c="currentColor" />
            </button>
          </Tooltip>
          <span className="pfe__mese">{MESI[mese.m]} {mese.y}</span>
          <Tooltip text="Mese successivo">
            <button type="button" className="pfe__nav-btn" disabled={!puoDopo} onClick={() => cambiaMese(1)} aria-label="Mese successivo">
              <Ico n="chevr" w="solid" s={13} c="currentColor" />
            </button>
          </Tooltip>
          {!piano && !isMeseCorrente && (
            <button type="button" className="sib-btn sib-btn--ghost pfe__oggi" onClick={() => { const d = new Date(); setMese({ y: d.getFullYear(), m: d.getMonth() }) }}>
              Mese corrente
            </button>
          )}
        </div>
        <SelectField name="reparto" label="Reparto" className="pfe__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <CheckboxField name="con-attesa" label="Mostra le richieste da approvare" checked={conAttesa} onChange={e => setConAttesa(e.target.checked)} className="pfe__check" />
        <div className="pfe__push">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setStoricoOpen(true)}>
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Storico piani
          </button>
          <Tooltip text={inAttesa > 0 ? `${inAttesa} richieste da decidere` : 'Vai alle richieste'}>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-richieste-ferie')}>
              <Ico n="list-check" s={13} c="currentColor" /> Richieste{inAttesa > 0 ? ` (${inAttesa})` : ''}
            </button>
          </Tooltip>
        </div>
        <div className="pfe__legend-row">
          <ul className="pfe__legend">
            {(piano ? ['Ferie' as TipoAssenza] : TIPI_ASSENZA).map(t => <li key={t}><span className={`pfe__sw pfe__sw--${tipoCls(t)}`} />{t}</li>)}
            {conAttesa && <li><span className="pfe__sw pfe__sw--attesa" />Da approvare</li>}
            {piano && <li><span className="pfe__sw pfe__sw--fuori" />Fuori dal piano</li>}
          </ul>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="pfe__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
              <Ico n="excel" w="regular" s={16} c="#fff" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Il piano selezionato: periodo, termine, riepilogo e azioni ── */}
      {piano && rp && (
        <div className={`pfe-piano ${piano.stato === 'Archiviato' ? 'pfe-piano--arch' : ''}`}>
          <div className="pfe-piano__info">
            <span className="pfe-piano__nome">
              <i className={`fa-solid ${piano.stato === 'Archiviato' ? 'fa-box-archive' : 'fa-umbrella-beach'}`} aria-hidden="true" />
              {piano.nome}
              <span className={`pfe-piano__badge pfe-piano__badge--${piano.stato === 'Archiviato' ? 'arch' : 'open'}`}>{piano.stato === 'Archiviato' ? 'Archiviato' : 'Aperto'}</span>
            </span>
            <span className="pfe-piano__meta">
              Dal {fmtDataHr(piano.dal)} al {fmtDataHr(piano.al)}
              {scadenza && (piano.stato === 'Archiviato'
                ? ` · richieste entro il ${fmtDataHr(scadenza)}`
                : traGiorni! >= 0
                  ? ` · richieste entro il ${fmtDataHr(scadenza)} (${traGiorni === 0 ? 'oggi' : traGiorni === 1 ? 'domani' : `tra ${traGiorni} giorni`})`
                  : ` · termine per le richieste scaduto il ${fmtDataHr(scadenza)}`)}
              {` · max ${piano.maxAssentiReparto} ${piano.maxAssentiReparto === 1 ? 'assente' : 'assenti'} per reparto`}
              {piano.stato === 'Archiviato' && piano.archiviatoAt && ` · archiviato il ${new Date(piano.archiviatoAt).toLocaleDateString('it-IT')} da ${piano.archiviatoDa}`}
            </span>
            <span className="pfe-piano__conta">
              <strong>{rp.tot}</strong> {rp.tot === 1 ? 'richiesta' : 'richieste'}: <strong>{rp.approvate}</strong> approvate ({rp.giorniOk} gg, {rp.dipendenti} {rp.dipendenti === 1 ? 'dipendente' : 'dipendenti'})
              {rp.daApprovare > 0 && <> · <span className="pfe-piano__attesa">{rp.daApprovare} da approvare</span></>}
              {rp.alResp > 0 && <> · {rp.alResp} al responsabile</>}
              {rp.rifiutate > 0 && <> · {rp.rifiutate} rifiutate</>}
            </span>
            {piano.note && <span className="pfe-piano__note"><i className="fa-solid fa-comment" aria-hidden="true" /> {piano.note}</span>}
          </div>
          <div className="pfe-piano__acts">
            {piano.stato === 'Aperto'
              ? <>
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModale({ piano })}>
                    <i className="fa-solid fa-pen" aria-hidden="true" /> Modifica
                  </button>
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => archiviaPiano(piano)}>
                    <i className="fa-solid fa-box-archive" aria-hidden="true" /> Chiudi e archivia
                  </button>
                </>
              : <button type="button" className="sib-btn sib-btn--secondary" onClick={() => riapriPiano(piano)}>
                  <i className="fa-solid fa-box-open" aria-hidden="true" /> Riapri
                </button>}
            <Tooltip text="Elimina piano">
              <button type="button" className="pfe-piano__del" onClick={() => eliminaPiano(piano)} aria-label="Elimina piano">
                <i className="fa-solid fa-trash" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <div className="sib-table-wrap pfe__wrap">
        <table className={`sib-table pfe__table pfe__table--d${giorni.length}`}>
          <colgroup>
            <col className="pfe__col-nome" />
            {giorni.map(g => <col key={g.iso} className="pfe__col-day" />)}
            <col className="pfe__col-res" />
          </colgroup>
          <thead>
            <tr>
              <th className="pfe__th-nome">Dipendente</th>
              {giorni.map(g => (
                <th key={g.iso} className={`pfe__th-day ${g.wd === 0 ? 'pfe__dom' : ''} ${g.iso === oggi ? 'pfe__today' : ''} ${g.fuori ? 'pfe__fuori' : ''}`}>
                  <span className="pfe__wd">{GG[g.wd]}</span>
                  <span className="pfe__dn">{g.n}</span>
                </th>
              ))}
              <th className="pfe__r"><Tooltip text="Giorni di ferie ancora disponibili nell'anno"><span>Residue</span></Tooltip></th>
            </tr>
          </thead>
          <tbody>
            {gruppi.map(g => (
              <React.Fragment key={g.reparto}>
                <tr className="pfe__group"><td colSpan={giorni.length + 2}>{g.reparto}</td></tr>
                {g.dipendenti.map(d => {
                  const residuo = d.ferieAnnue - ferieGodute(richieste, d.id, mese.y)
                  return (
                    <tr key={d.id}>
                      <td className="pfe__nome"><TruncatedText text={`${d.nome} ${d.cognome}`} /></td>
                      {giorni.map(gg => {
                        const cls = `pfe__day ${gg.wd === 0 ? 'pfe__dom' : ''} ${gg.iso === oggi ? 'pfe__today' : ''} ${gg.fuori ? 'pfe__fuori' : ''}`
                        const a = gg.fuori ? undefined : assenzaDi(d.id, gg.iso)
                        if (!a) return <td key={gg.iso} className={cls} />
                        const tip = `${d.nome} ${d.cognome} · ${a.tipo} ${a.dal === a.al ? `il ${fmtDataHr(a.dal)}` : `dal ${fmtDataHr(a.dal)} al ${fmtDataHr(a.al)}`}${a.stato === 'Al responsabile' ? ' · dal responsabile di reparto' : a.stato === 'Da approvare' ? ' · da approvare' : ''}${a.note ? ` · ${a.note}` : ''}`
                        return (
                          <td key={gg.iso} className={cls}>
                            <Tooltip text={tip}>
                              <span className={`pfe__bar pfe__bar--${tipoCls(a.tipo)} ${inAttesaRichiesta(a.stato) ? 'pfe__bar--attesa' : ''} ${a.dal === gg.iso ? 'pfe__bar--start' : ''} ${a.al === gg.iso ? 'pfe__bar--end' : ''}`} />
                            </Tooltip>
                          </td>
                        )
                      })}
                      <td className={`pfe__r pfe__res ${residuo <= 3 ? 'pfe__res--low' : ''}`}>{residuo} gg</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="pfe__tot">
              <td className="pfe__nome">Assenti</td>
              {giorni.map(g => {
                const n = assentiDel(g.iso)
                const scoperti = scopertiDel(g.iso)
                const warn = piano ? scoperti.length > 0 : n >= SOGLIA_ASSENTI
                const cls = `pfe__day ${g.wd === 0 ? 'pfe__dom' : ''} ${g.fuori ? 'pfe__fuori' : ''} ${warn ? 'pfe__tot--warn' : ''}`
                return (
                  <td key={g.iso} className={cls}>
                    {n > 0 && (warn
                      ? <Tooltip text={piano
                          ? `${fmtDataHr(g.iso)}: ${scoperti.join(', ')} oltre ${piano.maxAssentiReparto} ${piano.maxAssentiReparto === 1 ? 'assente' : 'assenti'}`
                          : `${n} assenti il ${fmtDataHr(g.iso)}: controlla la copertura dei turni`}><span>{n}</span></Tooltip>
                      : n)}
                  </td>
                )
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <ModalePiano open={!!modale} piano={modale?.piano} onClose={() => setModale(null)} onSalva={salvaPiano}
        altriAperti={aperti.filter(p => p.id !== modale?.piano?.id)} />

      {/* ── Storico dei piani ── */}
      <Modal open={storicoOpen} onClose={() => setStoricoOpen(false)} title="Storico piani ferie" size="xl">
        <div className="pfe-sto">
          <div className="sib-table-wrap">
            <table className="sib-table pfe-sto__table">
              <colgroup>
                <col className="pfe-sto__col-nome" /><col className="pfe-sto__col-per" /><col className="pfe-sto__col-stato" />
                <col className="pfe-sto__col-n" /><col className="pfe-sto__col-n" /><col className="pfe-sto__col-chiuso" /><col className="pfe-sto__col-az" />
              </colgroup>
              <thead>
                <tr>
                  <th><ThLabel full="Piano" /></th>
                  <th><ThLabel full="Periodo" /></th>
                  <th><ThLabel full="Stato" /></th>
                  <th className="pfe-sto__r"><Tooltip text="Ferie approvate nel piano"><span>Approvate</span></Tooltip></th>
                  <th className="pfe-sto__r"><Tooltip text="Giorni lavorativi di ferie approvati"><span>Giorni</span></Tooltip></th>
                  <th><ThLabel full="Archiviato" /></th>
                  <th className="pfe-sto__c"><ThLabel full="Azioni" /></th>
                </tr>
              </thead>
              <tbody>
                {[...aperti, ...archiviati].map(p => {
                  const r = riepilogo(p)
                  return (
                    <tr key={p.id}>
                      <td className="pfe-sto__strong"><TruncatedText text={p.nome} /></td>
                      <td><TruncatedText text={`${fmtDataHr(p.dal)} → ${fmtDataHr(p.al)}`} /></td>
                      <td><span className={`pfe-sto__stato pfe-sto__stato--${p.stato === 'Aperto' ? 'open' : 'arch'}`}>{p.stato}</span></td>
                      <td className="pfe-sto__r">{r.approvate}</td>
                      <td className="pfe-sto__r">{r.giorniOk} gg</td>
                      <td>{p.archiviatoAt ? new Date(p.archiviatoAt).toLocaleDateString('it-IT') : <span className="pfe-sto__dash">-</span>}</td>
                      <td className="pfe-sto__c">
                        <span className="pfe-sto__acts">
                          <Tooltip text="Apri il piano">
                            <button type="button" className="pfe-sto__act" aria-label={`Apri ${p.nome}`} onClick={() => { setPianoId(p.id); setStoricoOpen(false) }}>
                              <i className="fa-solid fa-eye" aria-hidden="true" />
                            </button>
                          </Tooltip>
                          <Tooltip text="Esporta in Excel">
                            <button type="button" className="pfe-sto__act" aria-label={`Esporta ${p.nome}`} onClick={() => esportaPiano(p)}>
                              <i className="fa-regular fa-file-xls" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {!piani.length && <tr><td colSpan={7} className="pfe-sto__empty">Nessun piano ferie: creane uno con «Nuovo piano ferie».</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pfe-sto__foot">
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => setStoricoOpen(false)}>Chiudi</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
