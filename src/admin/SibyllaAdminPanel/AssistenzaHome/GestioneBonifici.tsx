import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Modal from '../../../core/components/Modal'
import { SelectField, DatePickerField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import './GestioneBonifici.sass'

interface Props { navigate: (p: string) => void }

interface Bon {
  id: number; azienda: string; data: string; causale: string; idPagamento: string
  pagatore: string; importo: string; stato: 'Pending' | 'Incasso'; incassatoDa: string
}

const SEED: Bon[] = [
  { id: 1, azienda: 'Sibylla', data: '2026-06-18 07:04', causale: 'RWB-ZBP7ZSNG-COD3', idPagamento: 'a23fc836-3124-4661-9333-09658f289424', pagatore: 'Rossi Mario', importo: '10,00', stato: 'Pending', incassatoDa: 'Rossi Mario' },
  { id: 2, azienda: 'Sibylla', data: '2026-06-10 01:10', causale: 'RWB-BFO0OVEF-COD3', idPagamento: '82c4821a-abcf-4747-9869-ec065f3ee70a', pagatore: 'Rossi Mario', importo: '20,00', stato: 'Pending', incassatoDa: 'Rossi Mario' },
  { id: 3, azienda: 'Sibylla', data: '2026-06-08 03:32', causale: 'RWB-2M2HK6K8-COD3', idPagamento: 'c20b471a-bf3b-429b-b39c-85efef984f5d', pagatore: 'Rossi Mario', importo: '1000,00', stato: 'Incasso', incassatoDa: 'Rossi Mario' },
  { id: 4, azienda: 'Sibylla', data: '2026-06-04 06:58', causale: 'RWB-U0OQAOV9-COD3', idPagamento: '1a91293b-64f7-4076-aa2b-8373450a2f0d', pagatore: 'Rossi Mario', importo: '10,00', stato: 'Incasso', incassatoDa: 'Rossi Mario' },
  { id: 5, azienda: 'Sibylla', data: '2026-06-03 01:26', causale: 'RWB-24YNCHIB-COD3', idPagamento: '0179cd41-7dda-42a4-a4b6-a992bba04b2e', pagatore: 'Rossi Mario', importo: '50,00', stato: 'Incasso', incassatoDa: 'Rossi Mario' },
  { id: 6, azienda: 'G.A.R-SRL', data: '2026-06-01 08:50', causale: 'RWB-EBHK12O6-COD1', idPagamento: '53d7d6cf-280f-40ec-a0cc-cb9fc80d66da', pagatore: 'Pieri Matteo', importo: '150,00', stato: 'Pending', incassatoDa: 'Pieri Matteo' },
  { id: 7, azienda: 'G.A.R-SRL', data: '2026-06-01 08:47', causale: 'RWB-7BN81QHM-COD1', idPagamento: '9073b768-6afb-4b9e-9572-9619cd08ee5e', pagatore: 'Pieri Matteo', importo: '150,00', stato: 'Incasso', incassatoDa: 'Pieri Matteo' },
  { id: 8, azienda: 'Sibylla', data: '2026-05-28 01:11', causale: 'RWB-T7MVMWJV-COD3', idPagamento: 'a6786521-25b5-4ed6-9def-351868d989fa', pagatore: 'Rossi Mario', importo: '2000,00', stato: 'Incasso', incassatoDa: 'Rossi Mario' },
  { id: 9, azienda: 'Sibylla', data: '2026-05-19 02:43', causale: 'RWB-UE0MKG62-COD3', idPagamento: 'ef6190de-c87d-43d5-b9b9-ab25b13e109d', pagatore: 'Rossi Mario', importo: '150,00', stato: 'Incasso', incassatoDa: 'Rossi Mario' },
  { id: 10, azienda: 'G.A.R-SRL', data: '2026-05-15 07:40', causale: 'RWB-O9077BJD-COD1', idPagamento: '710d79e2-745a-4fca-80df-88ed9aa3ac45', pagatore: 'Pieri Matteo', importo: '1500,00', stato: 'Pending', incassatoDa: 'Pieri Matteo' },
]
const BONIFICI: Bon[] = [
  ...SEED,
  ...Array.from({ length: 20 }, (_, i) => ({
    id: 100 + i,
    azienda: i % 2 ? 'G.A.R-SRL' : 'Sibylla',
    data: `2026-04-${String((i % 27) + 1).padStart(2, '0')} 0${i % 9}:0${i % 6}`,
    causale: `RWB-DEMO${1000 + i}-COD${(i % 3) + 1}`,
    idPagamento: `demo-${1000 + i}-0000-0000-000000000000`,
    pagatore: i % 2 ? 'Pieri Matteo' : 'Rossi Mario',
    importo: `${(i + 1) * 25},00`,
    stato: (i % 3 === 0 ? 'Pending' : 'Incasso') as Bon['stato'],
    incassatoDa: i % 2 ? 'Pieri Matteo' : 'Rossi Mario',
  })),
]
const AZIENDE = ['Sibylla', 'G.A.R-SRL', 'Reservation Hotel Italy']
const PAGATORI = Array.from(new Set(BONIFICI.map(b => b.pagatore))).sort()
const STATI = ['Pending', 'Incasso']
const PAGE_SIZE = 10

export default function GestioneBonifici({ navigate }: Props) {
  const [rowsAll, setRowsAll] = useState<Bon[]>(BONIFICI)
  const [azienda, setAzienda] = useState('')
  const [data, setData] = useState('')
  const [page, setPage] = useState(1)
  // Filtri per colonna: imbuto (scelte multiple), lente (testo), ordinamento.
  const cf = useColFilters()

  const filtered = useMemo(() => rowsAll.filter(b => {
    if (azienda && b.azienda !== azienda) return false
    if (data && !b.data.startsWith(data)) return false
    return cf.matchMulti(b.azienda, 'azienda')
      && cf.matchMulti(b.pagatore, 'pagatore')
      && cf.matchMulti(b.stato, 'stato')
      && cf.matchMulti(b.incassatoDa, 'incassatoDa')
      && cf.matchText(b.causale, 'causale')
      && cf.matchText(b.idPagamento, 'idPagamento')
      && cf.matchText(b.importo, 'importo')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rowsAll, azienda, data, cf.text, cf.multi])

  const sorted = useMemo(() => cf.sortRows(filtered),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [azienda, data, cf.text, cf.multi])
  const rows = sorted.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  const [approveRow, setApproveRow] = useState<Bon | null>(null)
  const confirmApprove = () => {
    if (!approveRow) return
    setRowsAll(prev => prev.map(x => x.id === approveRow.id ? { ...x, stato: 'Incasso' } : x))
    toast.success(`Pagamento ${approveRow.causale} approvato.`, 'Pagamento approvato')
    setApproveRow(null)
  }

  const [editRow, setEditRow] = useState<Bon | null>(null)
  const [newImporto, setNewImporto] = useState('')
  const confirmImporto = () => {
    if (!editRow || !newImporto.trim()) return
    setRowsAll(prev => prev.map(x => x.id === editRow.id ? { ...x, importo: newImporto.trim() } : x))
    toast.success(`Importo aggiornato a ${newImporto.trim()} € per ${editRow.causale}.`, 'Importo modificato')
    setEditRow(null)
  }

  return (
    <div className="gbf">
      <button type="button" className="gbf__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="gbf__head">
        <h1 className="gbf__title">Gestione dei bonifici</h1>
        <p className="gbf__sub">Verifica i bonifici ricevuti e conferma gli incassi.</p>
      </div>

      <div className="gbf__toolbar">
        <SelectField
          name="azienda"
          label="Azienda"
          className="gbf__field"
          value={azienda}
          onChange={e => setAzienda(e.target.value)}
          options={[{ value: '', label: 'Tutti' }, ...AZIENDE.map(a => ({ value: a, label: a }))]}
        />
        <DatePickerField
          name="data"
          label="Data"
          className="gbf__field"
          value={data}
          onChange={e => setData(e.target.value)}
        />
      </div>

      <div className="sib-table-wrap gbf__wrap">
        <table className="sib-table gbf__table">
          {/* Larghezze in percentuale + table-layout fixed: la tabella si adatta
              sempre allo spazio disponibile, senza mai scrollare in orizzontale. */}
          <colgroup>
            <col className="gbf__col-azienda" />
            <col className="gbf__col-data" />
            <col className="gbf__col-causale" />
            <col className="gbf__col-id" />
            <col className="gbf__col-pagatore" />
            <col className="gbf__col-importo" />
            <col className="gbf__col-stato" />
            <col className="gbf__col-incassato" />
            <col className="gbf__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Azienda" />{cf.th('azienda', 'azienda', { options: AZIENDE })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Data" />{cf.th('data', 'data', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Causale" />{cf.th('causale', 'causale', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="ID pagamento" short="ID pag." />{cf.th('idPagamento', 'ID pagamento', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Pagatore" />{cf.th('pagatore', 'pagatore', { options: PAGATORI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Importo" />{cf.th('importo', 'importo', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'stato', { options: STATI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Incassato da" short="Incass. da" />{cf.th('incassatoDa', 'incassato da', { options: PAGATORI })}</span></th>
              <th className="gbf__th-actions"><ThLabel full="Azioni" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id}>
                <td className="gbf__strong"><TruncatedText text={b.azienda} /></td>
                <td><TruncatedText text={b.data} /></td>
                <td><TruncatedText text={b.causale} /></td>
                <td className="gbf__id"><TruncatedText text={b.idPagamento} /></td>
                <td><TruncatedText text={b.pagatore} /></td>
                <td><TruncatedText text={`${b.importo} €`} /></td>
                <td><span className={`gbf__stato gbf__stato--${b.stato === 'Pending' ? 'pending' : 'ok'}`}>{b.stato}</span></td>
                <td><TruncatedText text={b.incassatoDa} /></td>
                <td className="gbf__actions">
                  {b.stato === 'Pending' && (
                    <>
                      <Tooltip text="Modifica importo">
                        <button type="button" className="gbf__icon" onClick={() => { setEditRow(b); setNewImporto('') }}><Ico n="edit" s={13} c="var(--color-text-inactive)" /></button>
                      </Tooltip>
                      <Tooltip text="Approva pagamento">
                        <button type="button" className="gbf__icon" onClick={() => setApproveRow(b)}><Ico n="thumbs-up" s={13} c="var(--color-text-inactive)" /></button>
                      </Tooltip>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gbf__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <Modal open={editRow !== null} onClose={() => setEditRow(null)} title="Modifica l'importo" size="md">
        <div className="gbf-modal">
          <p className="gbf-modal__q">
            Sei sicuro di voler modificare l'importo da <b>{editRow?.importo}</b> a
            <input
              className="gbf-modal__inp"
              value={newImporto}
              onChange={e => setNewImporto(e.target.value)}
              placeholder="0,00"
              onKeyDown={e => { if (e.key === 'Enter') confirmImporto() }}
            /> ?
          </p>
          <div className="gbf-modal__actions">
            <button type="button" className="gbf-modal__btn gbf-modal__btn--proceed" disabled={!newImporto.trim()} onClick={confirmImporto}>Procedi</button>
            <button type="button" className="gbf-modal__btn gbf-modal__btn--cancel" onClick={() => setEditRow(null)}>Annulla</button>
          </div>
        </div>
      </Modal>

      <Modal open={approveRow !== null} onClose={() => setApproveRow(null)} title="Approva il pagamento" size="md">
        <div className="gbf-modal">
          <p className="gbf-modal__q">Sei sicuro di voler approvare bonifico su <b>{approveRow?.importo}</b>?</p>
          <div className="gbf-modal__actions">
            <button type="button" className="gbf-modal__btn gbf-modal__btn--proceed" onClick={confirmApprove}>Procedi</button>
            <button type="button" className="gbf-modal__btn gbf-modal__btn--cancel" onClick={() => setApproveRow(null)}>Annulla</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
