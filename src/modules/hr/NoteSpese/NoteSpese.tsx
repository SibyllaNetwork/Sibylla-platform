import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Pagination from '../../../core/components/Pagination'
import Ico from '../../../core/icons/Ico'
import { SelectField, DateRangeField, TextareaField, CheckboxField } from '../../../core/components/form'
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
import BarraSelezione from '../_selezione/BarraSelezione'
import { useSelezione } from '../_selezione/useSelezione'
import './NoteSpese.sass'

/**
 * Nota spese — HR › Gestione delle presenze.
 * L'ufficio del personale riceve le spese anticipate dai dipendenti (inserite
 * dall'App Op! con la ricevuta): le corregge in ogni valore, le approva o le
 * rifiuta (con motivo), segna il rimborso quando passa in busta paga, le elimina.
 * Ogni intervento resta nello storico della nota.
 */

const PAGE_SIZE = 10

/** Ultima correzione dell'HR, se c'è. */
const ultimaModifica = (n: NotaSpesa) => [...(n.storico ?? [])].reverse().find(e => e.azione === 'Modificata')

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
  const [inModifica, setInModifica] = useState<NotaSpesa | null>(null)
  // Rifiuto di una o più spese (selezione multipla): un solo motivo per tutte.
  const [rifiuto, setRifiuto] = useState<{ rows: NotaSpesa[]; motivo: string } | null>(null)
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
  const sel = useSelezione(pageRows.map(n => n.id), [stato, reparto, dal, al, cf.text, cf.multi])
  const { tieni } = sel
  useEffect(() => { tieni(noteSpese.map(n => n.id)) }, [noteSpese, tieni])
  const selezionate = noteSpese.filter(n => sel.has(n.id))
  const selDaApprovare = selezionate.filter(n => n.stato === 'Da approvare' || n.stato === 'Rifiutata')
  // Senza ricevuta una spesa non si approva in blocco: va controllata una per una.
  const selApprovabili = selDaApprovare.filter(n => n.giustificativo)
  const selDaRifiutare = selezionate.filter(n => n.stato === 'Da approvare' || n.stato === 'Approvata')
  const selDaRimborsare = selezionate.filter(n => n.stato === 'Approvata')

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
    rifiuto.rows.forEach(n => setStato(n.id, 'Rifiutata', rifiuto.motivo.trim()))
    toast.info(rifiuto.rows.length === 1
      ? `Spesa di ${nomeDipendente(rifiuto.rows[0].dipendenteId)} rifiutata.`
      : `${rifiuto.rows.length} spese rifiutate.`, rifiuto.rows.length === 1 ? 'Spesa rifiutata' : 'Spese rifiutate')
    setRifiuto(null)
    if (rifiuto.rows.length > 1) sel.svuota()
  }
  const cancella = async (n: NotaSpesa) => {
    const ok = await confirm({
      title: 'Elimina spesa',
      message: `Eliminare la spesa "${n.descrizione}" di ${nomeDipendente(n.dipendenteId)} (${eurHr(n.importo)})?${n.stato === 'Rimborsata' ? ' È già stata rimborsata: il rimborso resta in busta paga, ma la spesa sparirà dalla nota.' : ''} L'operazione non si può annullare.`,
      confirmLabel: 'Elimina',
    })
    if (!ok) return
    elimina(n.id)
    toast.success('Spesa eliminata.', 'Eliminata')
  }

  // ── Azioni sulle righe selezionate ──
  const approvaSelezionate = async () => {
    const conRicevuta = selApprovabili
    const senza = selDaApprovare.length - conRicevuta.length
    const ok = await confirm({
      title: conRicevuta.length === 1 ? 'Approva la spesa' : `Approva ${conRicevuta.length} spese`,
      message: `Approvi ${conRicevuta.length === 1 ? 'la spesa selezionata' : `${conRicevuta.length} spese`} per ${eurHr(somma(conRicevuta))}?${senza ? ` ${senza === 1 ? 'Una spesa senza ricevuta resta' : `${senza} spese senza ricevuta restano`} da controllare.` : ''}`,
      confirmLabel: 'Approva', danger: false,
    })
    if (!ok) return
    conRicevuta.forEach(n => setStato(n.id, 'Approvata'))
    toast.success(`${conRicevuta.length === 1 ? '1 spesa approvata' : `${conRicevuta.length} spese approvate`}: ${eurHr(somma(conRicevuta))} da rimborsare.`, 'Spese approvate')
    sel.svuota()
  }
  const rimborsaSelezionate = async () => {
    const xs = selDaRimborsare
    const ok = await confirm({
      title: 'Segna come rimborsate',
      message: `Confermi il rimborso di ${xs.length === 1 ? '1 spesa' : `${xs.length} spese`} per ${eurHr(somma(xs))}?`,
      confirmLabel: 'Conferma rimborso', danger: false,
    })
    if (!ok) return
    xs.forEach(n => setStato(n.id, 'Rimborsata'))
    toast.success(`Rimborso di ${eurHr(somma(xs))} registrato.`, 'Spese rimborsate')
    sel.svuota()
  }
  const eliminaSelezionate = async () => {
    const xs = selezionate
    const rimborsate = xs.filter(n => n.stato === 'Rimborsata').length
    const ok = await confirm({
      title: xs.length === 1 ? 'Elimina spesa' : `Elimina ${xs.length} spese`,
      message: `Elimini ${xs.length === 1 ? 'la spesa selezionata' : `${xs.length} spese`} (${eurHr(somma(xs))})?${rimborsate ? ` ${rimborsate === 1 ? 'Una è già rimborsata' : `${rimborsate} sono già rimborsate`}: il rimborso resta in busta paga.` : ''} L'operazione non si può annullare.`,
      confirmLabel: 'Elimina',
    })
    if (!ok) return
    xs.forEach(n => elimina(n.id))
    toast.info(xs.length === 1 ? 'Spesa eliminata.' : `${xs.length} spese eliminate.`, 'Spese eliminate')
    sel.svuota()
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
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-note-spese-mese')}>
            <i className="fa-solid fa-table-list" aria-hidden="true" /> Nota spese mensile
          </button>
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

      <BarraSelezione n={sel.n} nome={['spesa', 'spese']} onSvuota={sel.svuota} azioni={[
        { label: 'Approva', icona: 'fa-circle-check', quante: selApprovabili.length, onClick: approvaSelezionate },
        { label: 'Rifiuta', icona: 'fa-circle-xmark', quante: selDaRifiutare.length, onClick: () => setRifiuto({ rows: selDaRifiutare, motivo: '' }) },
        { label: 'Segna rimborsate', icona: 'fa-money-bill', quante: selDaRimborsare.length, onClick: rimborsaSelezionate },
        { label: 'Elimina', icona: 'fa-trash', quante: sel.n, onClick: eliminaSelezionate, pericolo: true },
      ]} />

      <div className="sib-table-wrap nsp__wrap">
        <table className="sib-table nsp__table">
          <colgroup>
            <col className="nsp__col-sel" />
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
              <th className="nsp__c">
                <CheckboxField name="ns-sel-all" ariaLabel="Seleziona le spese della pagina" className="nsp__check"
                  checked={sel.tutteVisibili} indeterminate={sel.parziale} disabled={!pageRows.length} onChange={sel.toggleVisibili} />
              </th>
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
              <tr key={n.id} className={sel.has(n.id) ? 'nsp__row--sel' : undefined}>
                <td className="nsp__c">
                  <CheckboxField name={`ns-sel-${n.id}`} ariaLabel={`Seleziona la spesa di ${n.dipendente}`} className="nsp__check"
                    checked={sel.has(n.id)} onChange={() => sel.toggle(n.id)} />
                </td>
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
                  <span className="nsp__stato-cell">
                  <span className={`nsp__stato nsp__stato--${statoCls(n.stato)}`}>
                    {n.stato === 'Rifiutata' && n.motivo
                      ? <Tooltip text={n.motivo}><span className="nsp__stato-txt">{n.stato} <Ico n="info" w="solid" s={12} c="currentColor" /></span></Tooltip>
                      : <TruncatedText text={n.stato} />}
                  </span>
                  {ultimaModifica(n) && (
                    <Tooltip text={`Modificata da ${ultimaModifica(n)!.autore} il ${new Date(ultimaModifica(n)!.at).toLocaleDateString('it-IT')}: ${ultimaModifica(n)!.modifiche?.join('; ') ?? ''}`}>
                      <span className="nsp__mod" aria-label="Modificata dall'HR"><i className="fa-solid fa-pen" aria-hidden="true" /></span>
                    </Tooltip>
                  )}
                  </span>
                </td>
                <td className="nsp__c">
                  <span className="nsp__acts">
                    {act('Modifica', 'edit', () => setInModifica(n))}
                    {(n.stato === 'Da approvare' || n.stato === 'Rifiutata') && act('Approva', 'circle-check', () => approva(n))}
                    {(n.stato === 'Da approvare' || n.stato === 'Approvata') && act('Rifiuta', 'circle-xmark', () => setRifiuto({ rows: [n], motivo: '' }))}
                    {n.stato === 'Approvata' && act('Segna come rimborsata', 'money-bill', () => rimborsa(n))}
                    {act('Elimina', 'trash', () => cancella(n))}
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={10} className="nsp__empty">Nessuna spesa corrisponde ai filtri impostati.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="nsp__foot">
        <span>Da approvare: <strong>{daApprovare.length}</strong> ({eurHr(somma(daApprovare))})</span>
        <span>Approvate da rimborsare: <strong>{eurHr(somma(daRimborsare))}</strong></span>
      </div>

      <div className="nsp__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <ModaleNota nota={inModifica} onClose={() => setInModifica(null)} />

      {/* ── Rifiuto ── */}
      <Modal open={!!rifiuto} onClose={() => setRifiuto(null)} title={rifiuto && rifiuto.rows.length > 1 ? `Rifiuta ${rifiuto.rows.length} spese` : 'Rifiuta spesa'} size="sm">
        {rifiuto && (
          <div className="nsp-modal">
            {rifiuto.rows.length === 1
              ? <p className="nsp-modal__text">
                  {nomeDipendente(rifiuto.rows[0].dipendenteId)} · {rifiuto.rows[0].descrizione} · <strong>{eurHr(rifiuto.rows[0].importo)}</strong>
                </p>
              : <ul className="nsp-modal__lista">
                  {rifiuto.rows.map(n => <li key={n.id}>{nomeDipendente(n.dipendenteId)} · {n.descrizione} · {eurHr(n.importo)}</li>)}
                </ul>}
            <TextareaField name="ns-motivo" label="Motivo del rifiuto" required rows={3} value={rifiuto.motivo}
              hint={rifiuto.rows.length > 1 ? 'Lo stesso motivo va a tutti i dipendenti selezionati' : 'Il dipendente lo vedrà accanto alla spesa'}
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
