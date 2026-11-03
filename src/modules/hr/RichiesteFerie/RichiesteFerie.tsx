import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Pagination from '../../../core/components/Pagination'
import Ico from '../../../core/icons/Ico'
import { SelectField, DateRangeField, TextareaField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import {
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, TIPI_ASSENZA, STATI_RICHIESTA,
  nomeDipendente, repartoDipendente, fmtDataHr, giorniLavorativi, ferieGodute, sovrapposizioni,
  type RichiestaAssenza, type TipoAssenza, type StatoRichiesta,
} from '../../../store/useHrGestioneStore'
import { exportXls } from '../hrExport'
import './RichiesteFerie.sass'

/**
 * Richieste — HR › Gestione delle presenze › Gestione delle ferie.
 * Le richieste di ferie, permessi, ROL e malattia del personale: chi le gestisce
 * vede le ferie che resterebbero al dipendente e i colleghi dello stesso reparto
 * già assenti negli stessi giorni, poi approva o rifiuta (con motivo).
 * Le richieste approvate compaiono nel Piano ferie.
 */

const PAGE_SIZE = 10
const VISTA_ATTESA = 'attesa'
const VISTA_TUTTE = 'tutte'

const statoCls = (s: StatoRichiesta) => (s === 'Da approvare' ? 'attesa' : s === 'Approvata' ? 'ok' : 'ko')

const durata = (r: Pick<RichiestaAssenza, 'tipo' | 'dal' | 'al'>) => {
  const g = giorniLavorativi(r.dal, r.al)
  return g === 1 ? '1 giorno' : `${g} giorni`
}

/** "09/11 → 15/11/2026": l'anno si ripete solo se cambia. */
const periodo = (dal: string, al: string) => {
  if (dal === al) return fmtDataHr(dal)
  const a = fmtDataHr(dal)
  return `${dal.slice(0, 4) === al.slice(0, 4) ? a.slice(0, 5) : a} → ${fmtDataHr(al)}`
}

interface Bozza { dipendenteId: string; tipo: TipoAssenza; dal: string; al: string; note: string }

export default function RichiesteFerie({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const decidi = useHrGestioneStore(s => s.decidiRichiesta)
  const aggiungi = useHrGestioneStore(s => s.aggiungiRichiesta)
  const cf = useColFilters()

  const [vista, setVista] = useState(VISTA_ATTESA)
  const [reparto, setReparto] = useState('')
  const [page, setPage] = useState(1)
  const [rifiuto, setRifiuto] = useState<{ row: RichiestaAssenza; motivo: string } | null>(null)
  const [nuova, setNuova] = useState<Bozza | null>(null)
  const [errori, setErrori] = useState<Record<string, string>>({})

  const rows = useMemo(() => richieste
    .map(r => {
      const d = DIPENDENTI_HR.find(x => x.id === r.dipendenteId)
      const giorni = giorniLavorativi(r.dal, r.al)
      const godute = ferieGodute(richieste, r.dipendenteId)
      // Residuo dopo la richiesta: per una richiesta di ferie ancora in attesa si sottraggono anche i suoi giorni.
      const residuo = (d?.ferieAnnue ?? 0) - godute - (r.tipo === 'Ferie' && r.stato === 'Da approvare' ? giorni : 0)
      return {
        ...r,
        dipendente: nomeDipendente(r.dipendenteId),
        reparto: repartoDipendente(r.dipendenteId),
        giorni,
        residuo,
        conflitti: r.stato === 'Rifiutata' ? [] : sovrapposizioni(richieste, r),
      }
    })
    .filter(r => vista === VISTA_TUTTE || r.stato === 'Da approvare')
    .filter(r => !reparto || r.reparto === reparto)
    .filter(r => cf.matchText(r.dipendente, 'dipendente') && cf.matchMulti(r.tipo, 'tipo') && cf.matchMulti(r.stato, 'stato')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [richieste, vista, reparto, cf.text, cf.multi])

  const sorted = useMemo(() => cf.sort ? cf.sortRows(rows) : [...rows].sort((a, b) => a.dal.localeCompare(b.dal)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [vista, reparto, cf.text, cf.multi])
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const inAttesa = richieste.filter(r => r.stato === 'Da approvare').length

  const approva = (r: RichiestaAssenza) => {
    decidi(r.id, 'Approvata')
    toast.success(`${r.tipo} di ${nomeDipendente(r.dipendenteId)} dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)} approvata: è nel Piano ferie.`, 'Richiesta approvata')
  }
  const confermaRifiuto = () => {
    if (!rifiuto || !rifiuto.motivo.trim()) return
    decidi(rifiuto.row.id, 'Rifiutata', rifiuto.motivo.trim())
    toast.info(`Richiesta di ${nomeDipendente(rifiuto.row.dipendenteId)} rifiutata.`, 'Richiesta rifiutata')
    setRifiuto(null)
  }

  const salvaNuova = () => {
    if (!nuova) return
    const e: Record<string, string> = {}
    if (!nuova.dipendenteId) e.dipendenteId = 'Scegli il dipendente'
    if (!nuova.dal || !nuova.al) e.periodo = 'Indica il periodo'
    setErrori(e)
    if (Object.keys(e).length) return
    aggiungi({ dipendenteId: Number(nuova.dipendenteId), tipo: nuova.tipo, dal: nuova.dal, al: nuova.al, note: nuova.note.trim() || undefined })
    toast.success('Richiesta inserita: è in attesa di approvazione.', 'Richiesta aggiunta')
    setVista(VISTA_ATTESA)
    setNuova(null)
  }

  const esporta = () => exportXls('richieste-assenze', ['Richiesta il', 'Dipendente', 'Reparto', 'Tipo', 'Dal', 'Al', 'Giorni', 'Ferie residue', 'Stato', 'Note', 'Motivo rifiuto'],
    sorted.map(r => [fmtDataHr(r.createdAt.slice(0, 10)), r.dipendente, r.reparto, r.tipo, fmtDataHr(r.dal), fmtDataHr(r.al), r.giorni, r.residuo, r.stato, r.note ?? '', r.motivo ?? '']))

  const act = (tip: string, ico: string, onClick: () => void) => (
    <Tooltip text={tip}>
      <button type="button" className="rfe__act" onClick={onClick} aria-label={tip}>
        <Ico n={ico} w="solid" s={16} c="currentColor" />
      </button>
    </Tooltip>
  )

  // Anteprima della nuova richiesta: giorni e sovrapposizioni mentre la si compila.
  const nuovaInfo = nuova && nuova.dipendenteId && nuova.dal && nuova.al ? {
    giorni: giorniLavorativi(nuova.dal, nuova.al),
    conflitti: sovrapposizioni(richieste, { id: '', dipendenteId: Number(nuova.dipendenteId), dal: nuova.dal, al: nuova.al }),
  } : null

  return (
    <div className="rfe">
      <PageHead
        title="Richieste"
        subtitle="Approva o rifiuta ferie, permessi e assenze del personale"
        onBack={() => navigate('home')}
        actions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => { setErrori({}); setNuova({ dipendenteId: '', tipo: 'Ferie', dal: '', al: '', note: '' }) }}>
            <Ico n="plus" s={14} c="currentColor" /> Nuova richiesta
          </button>
        }
      />

      <div className="rfe__toolbar">
        <SelectField name="vista" label="Vista" className="rfe__field" value={vista} onChange={e => setVista(e.target.value)}
          options={[{ value: VISTA_ATTESA, label: `Da approvare (${inAttesa})` }, { value: VISTA_TUTTE, label: 'Tutte le richieste' }]} />
        <SelectField name="reparto" label="Reparto" className="rfe__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <div className="rfe__push">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-piano-ferie')}>
            <Ico n="calendar" s={13} c="currentColor" /> Piano ferie
          </button>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="rfe__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
              <Ico n="excel" w="regular" s={16} c="#fff" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="sib-table-wrap rfe__wrap">
        <table className="sib-table rfe__table">
          <colgroup>
            <col className="rfe__col-data" />
            <col className="rfe__col-dip" />
            <col className="rfe__col-rep" />
            <col className="rfe__col-tipo" />
            <col className="rfe__col-periodo" />
            <col className="rfe__col-giorni" />
            <col className="rfe__col-residuo" />
            <col className="rfe__col-conf" />
            <col className="rfe__col-stato" />
            <col className="rfe__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Richiesta il" short="Rich. il" />{cf.th('createdAt', 'richiesta il', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Dipendente" short="Dip." />{cf.th('dipendente', 'dipendente', { search: true, sort: true })}</span></th>
              <th><ThLabel full="Reparto" /></th>
              <th><span className="sib-colf-head"><ThLabel full="Tipo" />{cf.th('tipo', 'tipo', { options: TIPI_ASSENZA })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Periodo" />{cf.th('dal', 'periodo', { sort: true })}</span></th>
              <th className="rfe__r"><ThLabel full="Giorni" /></th>
              <th className="rfe__r"><ThLabel full="Ferie residue" short="Residue" /></th>
              <th className="rfe__c"><ThLabel full="Sovrapposizioni" short="Sovrapp." /></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'stato', { options: STATI_RICHIESTA })}</span></th>
              <th className="rfe__c"><ThLabel full="Azioni" /></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id}>
                <td><TruncatedText text={fmtDataHr(r.createdAt.slice(0, 10))} /></td>
                <td className="rfe__strong">
                  <span className="rfe__dip">
                    <TruncatedText text={r.dipendente} />
                    {r.note && <Tooltip text={r.note}><span className="rfe__note"><Ico n="info" w="solid" s={12} c="currentColor" /></span></Tooltip>}
                  </span>
                </td>
                <td><TruncatedText text={r.reparto} /></td>
                <td><span className={`rfe__tipo rfe__tipo--${r.tipo.toLowerCase()}`}><TruncatedText text={r.tipo} /></span></td>
                <td><TruncatedText text={periodo(r.dal, r.al)} full={r.dal === r.al ? undefined : `dal ${fmtDataHr(r.dal)} al ${fmtDataHr(r.al)}`} /></td>
                <td className="rfe__r"><TruncatedText text={durata(r)} /></td>
                <td className={`rfe__r ${r.residuo < 0 ? 'rfe__neg' : ''}`}>
                  {r.tipo === 'Ferie'
                    ? <Tooltip text={r.stato === 'Da approvare' ? 'Giorni di ferie che restano se la richiesta viene approvata' : 'Giorni di ferie ancora disponibili nell\'anno'}><span>{r.residuo} gg</span></Tooltip>
                    : <span className="rfe__dash">-</span>}
                </td>
                <td className="rfe__c">
                  {r.conflitti.length > 0
                    ? (
                      <Tooltip text={`Assenti nello stesso reparto: ${r.conflitti.map(c => `${nomeDipendente(c.dipendenteId)} (${fmtDataHr(c.dal)} → ${fmtDataHr(c.al)})`).join(', ')}`}>
                        <span className="rfe__conflitto"><Ico n="alert" w="solid" s={14} c="currentColor" /> {r.conflitti.length}</span>
                      </Tooltip>
                    )
                    : <span className="rfe__dash">-</span>}
                </td>
                <td>
                  <span className={`rfe__stato rfe__stato--${statoCls(r.stato)}`}>
                    {r.stato === 'Rifiutata' && r.motivo
                      ? <Tooltip text={r.motivo}><span className="rfe__stato-txt">{r.stato} <Ico n="info" w="solid" s={12} c="currentColor" /></span></Tooltip>
                      : <TruncatedText text={r.stato} />}
                  </span>
                </td>
                <td className="rfe__c">
                  {r.stato === 'Da approvare'
                    ? <span className="rfe__acts">
                        {act('Approva', 'circle-check', () => approva(r))}
                        {act('Rifiuta', 'circle-xmark', () => setRifiuto({ row: r, motivo: '' }))}
                      </span>
                    : <span className="rfe__dash">-</span>}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={10} className="rfe__empty">
                {vista === VISTA_ATTESA ? 'Nessuna richiesta da approvare.' : 'Nessuna richiesta corrisponde ai filtri impostati.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rfe__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      {/* ── Rifiuto ── */}
      <Modal open={!!rifiuto} onClose={() => setRifiuto(null)} title="Rifiuta richiesta" size="sm">
        {rifiuto && (
          <div className="rfe-modal">
            <p className="rfe-modal__text">
              {nomeDipendente(rifiuto.row.dipendenteId)} · {rifiuto.row.tipo} dal {fmtDataHr(rifiuto.row.dal)} al {fmtDataHr(rifiuto.row.al)}
            </p>
            <TextareaField name="rf-motivo" label="Motivo del rifiuto" required rows={3} value={rifiuto.motivo}
              hint="Il dipendente lo vedrà nella sua richiesta"
              onChange={e => setRifiuto({ ...rifiuto, motivo: e.target.value })} />
            <div className="rfe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setRifiuto(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--danger" disabled={!rifiuto.motivo.trim()} onClick={confermaRifiuto}>Rifiuta</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Nuova richiesta (inserita dall'ufficio del personale per conto del dipendente) ── */}
      <Modal open={!!nuova} onClose={() => setNuova(null)} title="Nuova richiesta" size="md">
        {nuova && (
          <div className="rfe-modal">
            <div className="rfe-modal__grid">
              <SelectField name="rf-dip" label="Dipendente" required value={nuova.dipendenteId} error={errori.dipendenteId}
                onChange={e => setNuova({ ...nuova, dipendenteId: e.target.value })}
                options={[{ value: '', label: 'Seleziona…' }, ...DIPENDENTI_HR.map(d => ({ value: d.id, label: `${d.nome} ${d.cognome}` }))]} />
              <SelectField name="rf-tipo" label="Tipo" value={nuova.tipo}
                onChange={e => setNuova({ ...nuova, tipo: e.target.value as TipoAssenza })}
                options={TIPI_ASSENZA.map(t => ({ value: t, label: t }))} />
            </div>
            <DateRangeField label="Periodo" nameFrom="rf-dal" nameTo="rf-al" required error={errori.periodo}
              valueFrom={nuova.dal} valueTo={nuova.al}
              onChangeFrom={e => setNuova(n => n && ({ ...n, dal: e.target.value }))}
              onChangeTo={e => setNuova(n => n && ({ ...n, al: e.target.value }))} />
            {nuovaInfo && (
              <p className={`rfe-modal__info ${nuovaInfo.conflitti.length ? 'rfe-modal__info--warn' : ''}`}>
                <Ico n={nuovaInfo.conflitti.length ? 'alert' : 'info'} w="solid" s={13} c="currentColor" />
                {nuovaInfo.giorni === 1 ? '1 giorno lavorativo' : `${nuovaInfo.giorni} giorni lavorativi`}
                {nuovaInfo.conflitti.length > 0 && ` · già assenti nel reparto: ${nuovaInfo.conflitti.map(c => nomeDipendente(c.dipendenteId)).join(', ')}`}
              </p>
            )}
            <TextareaField name="rf-note" label="Note" rows={2} value={nuova.note} onChange={e => setNuova({ ...nuova, note: e.target.value })} />
            <div className="rfe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setNuova(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={salvaNuova}>Inserisci richiesta</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
