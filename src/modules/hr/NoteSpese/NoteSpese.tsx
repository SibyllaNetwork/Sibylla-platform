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
import { useConfirmStore } from '../../../store/useConfirmStore'
import {
  useHrGestioneStore, REPARTI_HR, CATEGORIE_SPESA, STATI_SPESA,
  nomeDipendente, repartoDipendente, fmtDataHr, eurHr,
  type NotaSpesa, type StatoSpesa,
} from '../../../store/useHrGestioneStore'
import { exportXls } from '../hrExport'
import ModaleNota from './ModaleNota'
import './NoteSpese.sass'

/**
 * Nota spese — HR › Gestione delle presenze.
 * L'ufficio del personale riceve le spese anticipate dai dipendenti, le approva o
 * le rifiuta (con motivo) e segna il rimborso quando passa in busta paga.
 */

const PAGE_SIZE = 10

const statoCls = (s: StatoSpesa) =>
  s === 'Da approvare' ? 'attesa' : s === 'Approvata' ? 'info' : s === 'Rimborsata' ? 'ok' : 'ko'

export default function NoteSpese({ navigate }: { navigate: (p: string) => void }) {
  const noteSpese = useHrGestioneStore(s => s.noteSpese)
  const setStato = useHrGestioneStore(s => s.setStatoSpesa)
  const elimina = useHrGestioneStore(s => s.eliminaSpesa)
  const confirm = useConfirmStore(s => s.confirm)
  const cf = useColFilters()

  const [stato, setStatoFiltro] = useState('')
  const [reparto, setReparto] = useState('')
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [page, setPage] = useState(1)
  const [nuova, setNuova] = useState(false)
  const [rifiuto, setRifiuto] = useState<{ row: NotaSpesa; motivo: string } | null>(null)
  const [dettaglio, setDettaglio] = useState<NotaSpesa | null>(null)

  const rows = useMemo(() => noteSpese
    .map(n => ({ ...n, dipendente: nomeDipendente(n.dipendenteId), reparto: repartoDipendente(n.dipendenteId) }))
    .filter(n => !stato || n.stato === stato)
    .filter(n => !reparto || n.reparto === reparto)
    .filter(n => (!dal || n.data >= dal) && (!al || n.data <= al))
    .filter(n =>
      cf.matchText(n.dipendente, 'dipendente') &&
      cf.matchMulti(n.categoria, 'categoria') &&
      cf.matchText(n.descrizione, 'descrizione') &&
      cf.matchMulti(n.stato, 'stato')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [noteSpese, stato, reparto, dal, al, cf.text, cf.multi])

  const sorted = useMemo(() => cf.sort ? cf.sortRows(rows) : [...rows].sort((a, b) => b.data.localeCompare(a.data)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [stato, reparto, dal, al, cf.text, cf.multi])
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const daApprovare = noteSpese.filter(n => n.stato === 'Da approvare')
  const daRimborsare = noteSpese.filter(n => n.stato === 'Approvata')
  const somma = (xs: NotaSpesa[]) => xs.reduce((s, n) => s + n.importo, 0)

  const approva = (n: NotaSpesa) => {
    setStato(n.id, 'Approvata')
    toast.success(`Spesa di ${nomeDipendente(n.dipendenteId)} approvata: ${eurHr(n.importo)} da rimborsare.`, 'Spesa approvata')
  }
  const rimborsa = async (n: NotaSpesa) => {
    const ok = await confirm({
      title: 'Segna come rimborsata',
      message: `Confermi il rimborso di ${eurHr(n.importo)} a ${nomeDipendente(n.dipendenteId)}?`,
      confirmLabel: 'Conferma rimborso',
      danger: false,
    })
    if (!ok) return
    setStato(n.id, 'Rimborsata')
    toast.success(`Rimborso di ${eurHr(n.importo)} registrato.`, 'Spesa rimborsata')
  }
  const confermaRifiuto = () => {
    if (!rifiuto || !rifiuto.motivo.trim()) return
    setStato(rifiuto.row.id, 'Rifiutata', rifiuto.motivo.trim())
    toast.info(`Spesa di ${nomeDipendente(rifiuto.row.dipendenteId)} rifiutata.`, 'Spesa rifiutata')
    setRifiuto(null)
  }
  const cancella = async (n: NotaSpesa) => {
    const ok = await confirm({ title: 'Elimina spesa', message: `Eliminare la spesa "${n.descrizione}" di ${nomeDipendente(n.dipendenteId)}?`, confirmLabel: 'Elimina' })
    if (!ok) return
    elimina(n.id)
    toast.success('Spesa eliminata.', 'Eliminata')
  }

  const apriFoglio = (n: NotaSpesa) => navigate(`hr-note-spese-mese:${n.dipendenteId}:${n.data.slice(0, 7)}`)

  const esporta = () => exportXls('nota-spese', ['Data', 'Dipendente', 'Reparto', 'Categoria', 'Descrizione', 'Giustificativo', 'Importo', 'Stato', 'Motivo rifiuto'],
    sorted.map(n => [fmtDataHr(n.data), n.dipendente, n.reparto, n.categoria, n.descrizione, n.giustificativo ?? '', eurHr(n.importo), n.stato, n.motivo ?? '']))

  const act = (tip: string, ico: string, onClick: () => void) => (
    <Tooltip text={tip}>
      <button type="button" className="nsp__act" onClick={onClick} aria-label={tip}>
        <Ico n={ico} w="solid" s={16} c="currentColor" />
      </button>
    </Tooltip>
  )

  return (
    <div className="nsp">
      <PageHead
        title="Nota spese"
        subtitle="Approva, rifiuta e rimborsa le spese anticipate dal personale"
        onBack={() => navigate('home')}
        actions={
          <>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-note-spese-mese')}>
              <i className="fa-solid fa-table-list" aria-hidden="true" /> Nota spese mensile
            </button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => setNuova(true)}>
              <Ico n="plus" s={14} c="currentColor" /> Aggiungi nota
            </button>
          </>
        }
      />

      <div className="nsp__toolbar">
        <SelectField name="stato" label="Stato" className="nsp__field" value={stato} onChange={e => setStatoFiltro(e.target.value)}
          options={[{ value: '', label: 'Tutti gli stati' }, ...STATI_SPESA.map(s => ({ value: s, label: s }))]} />
        <SelectField name="reparto" label="Reparto" className="nsp__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <DateRangeField label="Periodo" nameFrom="ns-dal" nameTo="ns-al" className="nsp__field nsp__field--periodo"
          valueFrom={dal} valueTo={al} onChangeFrom={e => setDal(e.target.value)} onChangeTo={e => setAl(e.target.value)} />
        <div className="nsp__push">
          <Tooltip text="Esporta in Excel">
            <button type="button" className="nsp__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
              <Ico n="excel" w="regular" s={16} c="#fff" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="sib-table-wrap nsp__wrap">
        <table className="sib-table nsp__table">
          <colgroup>
            <col className="nsp__col-data" />
            <col className="nsp__col-dip" />
            <col className="nsp__col-rep" />
            <col className="nsp__col-cat" />
            <col className="nsp__col-desc" />
            <col className="nsp__col-giust" />
            <col className="nsp__col-imp" />
            <col className="nsp__col-stato" />
            <col className="nsp__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Data" />{cf.th('data', 'data', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Dipendente" short="Dip." />{cf.th('dipendente', 'dipendente', { search: true, sort: true })}</span></th>
              <th><ThLabel full="Reparto" /></th>
              <th><span className="sib-colf-head"><ThLabel full="Categoria" short="Cat." />{cf.th('categoria', 'categoria', { options: CATEGORIE_SPESA })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Descrizione" />{cf.th('descrizione', 'descrizione', { search: true })}</span></th>
              <th className="nsp__c"><ThLabel full="Giustificativo" short="Giust." /></th>
              <th className="nsp__r"><span className="sib-colf-head"><ThLabel full="Importo" short="Imp." />{cf.th('importo', 'importo', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'stato', { options: STATI_SPESA })}</span></th>
              <th className="nsp__c"><ThLabel full="Azioni" /></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(n => (
              <tr key={n.id}>
                <td><TruncatedText text={fmtDataHr(n.data)} /></td>
                <td className="nsp__strong">
                  <Tooltip text="Apri la nota spese mensile">
                    <button type="button" className="nsp__link" onClick={() => apriFoglio(n)}><TruncatedText text={n.dipendente} /></button>
                  </Tooltip>
                </td>
                <td><TruncatedText text={n.reparto} /></td>
                <td><TruncatedText text={n.categoria} /></td>
                <td><TruncatedText text={n.descrizione} /></td>
                <td className="nsp__c">
                  {n.giustificativo
                    ? act(`Visualizza ${n.giustificativo}`, 'paperclip', () => setDettaglio(n))
                    : <Tooltip text="Nessun giustificativo allegato"><span className="nsp__missing"><Ico n="alert" w="solid" s={14} c="currentColor" /></span></Tooltip>}
                </td>
                <td className="nsp__r nsp__strong"><TruncatedText text={eurHr(n.importo)} /></td>
                <td>
                  <span className={`nsp__stato nsp__stato--${statoCls(n.stato)}`}>
                    {n.stato === 'Rifiutata' && n.motivo
                      ? <Tooltip text={n.motivo}><span className="nsp__stato-txt">{n.stato} <Ico n="info" w="solid" s={12} c="currentColor" /></span></Tooltip>
                      : <TruncatedText text={n.stato} />}
                  </span>
                </td>
                <td className="nsp__c">
                  <span className="nsp__acts">
                    {n.stato === 'Da approvare' && <>
                      {act('Approva', 'circle-check', () => approva(n))}
                      {act('Rifiuta', 'circle-xmark', () => setRifiuto({ row: n, motivo: '' }))}
                    </>}
                    {n.stato === 'Approvata' && act('Segna come rimborsata', 'money-bill', () => rimborsa(n))}
                    {(n.stato === 'Da approvare' || n.stato === 'Rifiutata') && act('Elimina', 'trash', () => cancella(n))}
                    <Tooltip text="Apri la nota spese mensile">
                      <button type="button" className="nsp__act" onClick={() => apriFoglio(n)} aria-label="Apri la nota spese mensile">
                        <i className="fa-solid fa-table-list" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={9} className="nsp__empty">Nessuna spesa corrisponde ai filtri impostati.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="nsp__foot">
        <span>Da approvare: <strong>{daApprovare.length}</strong> ({eurHr(somma(daApprovare))})</span>
        <span>Approvate da rimborsare: <strong>{eurHr(somma(daRimborsare))}</strong></span>
      </div>

      <div className="nsp__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <ModaleNota open={nuova} onClose={() => setNuova(false)} />

      {/* ── Rifiuto ── */}
      <Modal open={!!rifiuto} onClose={() => setRifiuto(null)} title="Rifiuta spesa" size="sm">
        {rifiuto && (
          <div className="nsp-modal">
            <p className="nsp-modal__text">
              {nomeDipendente(rifiuto.row.dipendenteId)} · {rifiuto.row.descrizione} · <strong>{eurHr(rifiuto.row.importo)}</strong>
            </p>
            <TextareaField name="ns-motivo" label="Motivo del rifiuto" required rows={3} value={rifiuto.motivo}
              hint="Il dipendente lo vedrà accanto alla spesa"
              onChange={e => setRifiuto({ ...rifiuto, motivo: e.target.value })} />
            <div className="nsp-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setRifiuto(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--danger" disabled={!rifiuto.motivo.trim()} onClick={confermaRifiuto}>Rifiuta</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Giustificativo ── */}
      <Modal open={!!dettaglio} onClose={() => setDettaglio(null)} title="Giustificativo" size="sm">
        {dettaglio && (
          <div className="nsp-modal">
            <div className="nsp-modal__doc">
              <Ico n={dettaglio.giustificativo?.endsWith('.pdf') ? 'file-pdf' : 'image'} w="solid" s={34} c="var(--color-primary)" />
              <span className="nsp-modal__filename"><TruncatedText text={dettaglio.giustificativo ?? ''} /></span>
            </div>
            <dl className="nsp-modal__meta">
              <dt>Dipendente</dt><dd>{nomeDipendente(dettaglio.dipendenteId)}</dd>
              <dt>Data</dt><dd>{fmtDataHr(dettaglio.data)}</dd>
              <dt>Categoria</dt><dd>{dettaglio.categoria}</dd>
              <dt>Importo</dt><dd>{eurHr(dettaglio.importo)}</dd>
              <dt>Stato</dt><dd>{dettaglio.stato}</dd>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}
