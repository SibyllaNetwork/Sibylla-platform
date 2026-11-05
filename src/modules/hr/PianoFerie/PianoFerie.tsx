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
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, todayIsoHr, fmtDataHr,
  ferieGodute, inAttesaRichiesta, type StatoRichiesta, type RichiestaAssenza,
} from '../../../store/useHrGestioneStore'
import { usePianiFerieStore, feriePianoCorrenti, type PianoFerie as Piano, type DatiPiano } from '../../../store/usePianiFerieStore'
import { exportXls } from '../hrExport'
import ModalePiano from './ModalePiano'
import { assentiConsentiti, descriviRegole, verificaRegole, type EsitoRegola } from './regolePiano'
import GestioneRichieste from '../RichiesteFerie/GestioneRichieste'
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

/** Calendario generale: assenti nello stesso giorno oltre i quali il giorno si segnala come scoperto. */
const SOGLIA_ASSENTI = 3
const GENERALE = 'generale'

const giorniTra = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000)

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

  const [reparto, setReparto] = useState('')
  const [conAttesa, setConAttesa] = useState(true)
  const [modale, setModale] = useState<{ piano?: Piano } | null>(null)
  const [storicoOpen, setStoricoOpen] = useState(false)

  // Richieste da disegnare: le ferie del piano (dal vivo, o la fotografia se archiviato)
  // oppure tutte le assenze per il calendario generale. Approvate e, a scelta, in attesa; le rifiutate mai.
  const visibileStato = (st: StatoRichiesta) => st === 'Approvata' || (conAttesa && inAttesaRichiesta(st))
  const sulCalendario: RichiestaAssenza[] = useMemo(() => {
    if (!piano) return richieste.filter(r => visibileStato(r.stato))
    if (piano.stato === 'Archiviato') {
      return feriePianoCorrenti(richieste, piano).filter(f => visibileStato(f.stato)).map(f => ({
        id: f.richiestaId, dipendenteId: f.dipendenteId, tipo: 'Ferie' as const, dal: f.dal, al: f.al, stato: f.stato,
        createdAt: piano.archiviatoAt ?? piano.createdAt, note: richieste.find(r => r.id === f.richiestaId)?.note,
      }))
    }
    return richieste.filter(r => r.tipo === 'Ferie' && r.dal <= piano.al && r.al >= piano.dal && visibileStato(r.stato))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [richieste, piano, conAttesa])

  const gruppi = useMemo(() => REPARTI_HR
    .filter(r => !reparto || r === reparto)
    .map(r => ({ reparto: r, dipendenti: DIPENDENTI_HR.filter(d => d.reparto === r) }))
    .filter(g => g.dipendenti.length > 0), [reparto])
  const visibili = gruppi.flatMap(g => g.dipendenti)

  // Assenti per giorno (solo approvate: le richieste in attesa non scoprono ancora il turno).
  const assentiDel = (iso: string, ids: number[]) => ids.filter(id => sulCalendario.some(r => r.dipendenteId === id && r.stato === 'Approvata' && r.dal <= iso && r.al >= iso)).length
  /** Avviso sul giorno: reparti sotto la presenza minima del piano, o troppi assenti nel calendario generale. */
  const allertaGiorno = (iso: string): string | null => {
    if (piano) {
      if (iso < piano.dal || iso > piano.al || piano.regole.presenzaMinimaReparto == null) return null
      const sotto = gruppi.filter(g => assentiDel(iso, g.dipendenti.map(d => d.id)) > assentiConsentiti(g.dipendenti.length, piano.regole.presenzaMinimaReparto!)).map(g => g.reparto)
      return sotto.length ? `${sotto.join(', ')} sotto il ${piano.regole.presenzaMinimaReparto}% di presenza` : null
    }
    const n = assentiDel(iso, visibili.map(d => d.id))
    return n >= SOGLIA_ASSENTI ? `${n} assenti: controlla la copertura dei turni` : null
  }
  /** Regole personali violate nel piano aperto (giorni consecutivi, residui): la presenza del reparto sta sui giorni. */
  const violazioniDi = (dipendenteId: number): EsitoRegola[] => {
    if (!piano || piano.stato !== 'Aperto') return []
    const sue = richieste.filter(r => r.dipendenteId === dipendenteId && r.tipo === 'Ferie' && r.stato !== 'Rifiutata' && r.dal <= piano.al && r.al >= piano.dal)
    const out = sue.flatMap(r => verificaRegole(r, richieste, { ...piano, regole: { ...piano.regole, presenzaMinimaReparto: undefined } }))
    return out.filter((e, i) => out.findIndex(x => x.testo === e.testo) === i)
  }
  const segnalaDipendente = (id: number) => {
    const v = violazioniDi(id)
    return v.length ? { testo: v.map(x => x.testo).join(' '), livello: v.some(x => x.livello === 'ko') ? 'ko' as const : 'warn' as const } : null
  }

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
    exportXls('calendario-assenze',
      ['Dipendente', 'Reparto', 'Tipo', 'Dal', 'Al', 'Stato'],
      sulCalendario
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
        <SelectField name="reparto" label="Reparto" className="pfe__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <CheckboxField name="con-attesa" label="Anche da approvare" checked={conAttesa} onChange={e => setConAttesa(e.target.checked)} className="pfe__check" />
        <div className="pfe__push">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setStoricoOpen(true)}>
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Storico piani
          </button>
          <Tooltip text={inAttesa > 0 ? `${inAttesa} richieste da decidere` : 'Vai alle richieste'}>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-richieste-ferie')}>
              <Ico n="list-check" s={13} c="currentColor" /> Richieste{inAttesa > 0 ? ` (${inAttesa})` : ''}
            </button>
          </Tooltip>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="pfe__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
              <Ico n="excel" w="regular" s={16} c="#fff" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Il piano selezionato, in una striscia: periodo e termine, conteggi, regole e azioni ── */}
      {piano && rp && (
        <div className={`pfe-piano ${piano.stato === 'Archiviato' ? 'pfe-piano--arch' : ''}`}>
          <div className="pfe-piano__info">
            <span className="pfe-piano__riga">
              <span className="pfe-piano__nome">
                <i className={`fa-solid ${piano.stato === 'Archiviato' ? 'fa-box-archive' : 'fa-umbrella-beach'}`} aria-hidden="true" />{piano.nome}
              </span>
              <span className={`pfe-piano__stato pfe-piano__stato--${piano.stato === 'Archiviato' ? 'arch' : 'open'}`}>
                <i className={`fa-solid ${piano.stato === 'Archiviato' ? 'fa-lock' : 'fa-circle-check'}`} aria-hidden="true" />{piano.stato}
              </span>
              <span className="pfe-piano__meta">
                {fmtDataHr(piano.dal)} → {fmtDataHr(piano.al)}
                {scadenza && (piano.stato === 'Archiviato'
                  ? ` · richieste entro il ${fmtDataHr(scadenza)}`
                  : traGiorni! >= 0
                    ? ` · richieste entro il ${fmtDataHr(scadenza)} (${traGiorni === 0 ? 'oggi' : traGiorni === 1 ? 'domani' : `tra ${traGiorni} giorni`})`
                    : ` · termine scaduto il ${fmtDataHr(scadenza)}`)}
                {piano.stato === 'Archiviato' && piano.archiviatoAt && ` · archiviato il ${new Date(piano.archiviatoAt).toLocaleDateString('it-IT')} da ${piano.archiviatoDa}`}
              </span>
            </span>
            <span className="pfe-piano__riga pfe-piano__riga--sub">
              <span className="pfe-piano__conta">
                <strong>{rp.tot}</strong> {rp.tot === 1 ? 'richiesta' : 'richieste'}: <strong>{rp.approvate}</strong> approvate ({rp.giorniOk} gg, {rp.dipendenti} {rp.dipendenti === 1 ? 'dipendente' : 'dipendenti'})
                {rp.daApprovare > 0 && <> · <span className="pfe-piano__attesa">{rp.daApprovare} da approvare</span></>}
                {rp.alResp > 0 && <> · {rp.alResp} al responsabile</>}
                {rp.rifiutate > 0 && <> · {rp.rifiutate} rifiutate</>}
              </span>
              <Tooltip text={descriviRegole(piano.regole).join(' · ')}>
                <span className="pfe-piano__regole"><i className="fa-solid fa-scale-balanced" aria-hidden="true" />Regole del piano</span>
              </Tooltip>
              {piano.note && (
                <Tooltip text={piano.note}>
                  <span className="pfe-piano__regole"><i className="fa-solid fa-comment" aria-hidden="true" />Avviso ai dipendenti</span>
                </Tooltip>
              )}
            </span>
          </div>
          <div className="pfe-piano__acts">
            {piano.stato === 'Aperto'
              ? <>
                  <Tooltip text="Modifica il piano">
                    <button type="button" className="pfe-piano__ico" onClick={() => setModale({ piano })} aria-label="Modifica il piano"><i className="fa-solid fa-pen" /></button>
                  </Tooltip>
                  <Tooltip text="Chiudi e archivia">
                    <button type="button" className="pfe-piano__ico" onClick={() => archiviaPiano(piano)} aria-label="Chiudi e archivia"><i className="fa-solid fa-box-archive" /></button>
                  </Tooltip>
                </>
              : <Tooltip text="Riapri il piano">
                  <button type="button" className="pfe-piano__ico" onClick={() => riapriPiano(piano)} aria-label="Riapri il piano"><i className="fa-solid fa-box-open" /></button>
                </Tooltip>}
            <Tooltip text="Elimina piano">
              <button type="button" className="pfe-piano__ico" onClick={() => eliminaPiano(piano)} aria-label="Elimina piano"><i className="fa-solid fa-trash" /></button>
            </Tooltip>
          </div>
        </div>
      )}

      <GestioneRichieste
        richieste={sulCalendario}
        reparto={reparto}
        solaLettura={piano?.stato === 'Archiviato'}
        limiti={piano ? { dal: piano.dal, al: piano.al } : undefined}
        allertaGiorno={allertaGiorno}
        segnalaDipendente={segnalaDipendente}
        colonnaFinale={{ titolo: 'Residue', tooltip: "Giorni di ferie ancora disponibili nell'anno", valore: (id, anno) => {
          const d = DIPENDENTI_HR.find(x => x.id === id)
          if (!d) return null
          const res = d.ferieAnnue - ferieGodute(richieste, id, anno)
          return <span className={res <= 3 ? 'pfe__res--low' : undefined}>{res} gg</span>
        } }}
      />

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
