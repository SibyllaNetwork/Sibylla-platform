import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Ico from '../../../core/icons/Ico'
import { SelectField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { toast } from '../../../core/components/Toast/useToast'
import {
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, fmtDataHr, saldoRol, saldoFerie,
} from '../../../store/useHrGestioneStore'
import { exportXls } from '../hrExport'
import { usePianiFerieStore } from '../../../store/usePianiFerieStore'
import GestioneRichieste, { arricchisciRichiesta, durata, fmtOre, VISTA_RESP } from './GestioneRichieste'
import './RichiesteFerie.sass'

/**
 * Richieste — HR › Gestione delle presenze › Gestione ferie e permessi.
 * Le richieste di ferie, permessi, ROL e malattia del personale: chi le gestisce
 * vede le ferie che resterebbero al dipendente e i colleghi dello stesso reparto
 * già assenti negli stessi giorni, poi approva o rifiuta (con motivo).
 * Le richieste arrivano dai dipendenti tramite l'App Op!: l'HR non ne crea di
 * nuove, le gestisce. Su ogni richiesta può modificarne tutti i valori
 * (dipendente, tipo, periodo, ore, note, stato), approvarla, rifiutarla o
 * eliminarla. Le richieste approvate compaiono nel Piano ferie.
 * ROL: si chiedono a ore (o a giornate da 8 h) e scalano dal monte ore annuo
 * maturato secondo il contratto; "Saldo ROL" mostra maturate, godute, in
 * attesa e residue di ogni dipendente; "Saldo ferie" lo stesso in giorni lavorativi.
 * Vista a calendario: una riga per dipendente, ogni richiesta sui suoi giorni;
 * il clic su una richiesta apre il dettaglio con tutte le azioni.
 */



const VISTA_ATTESA = 'attesa'
const VISTA_TUTTE = 'tutte'

// L'HR decide sulle "Da approvare" (già passate dal responsabile); "Al responsabile"
// sono le ferie e i ROL ancora fermi al primo livello dell'iter, nell'App Op!.
const VISTE = [
  { value: 'attesa', label: 'Da approvare' },
  { value: VISTA_RESP, label: 'Al responsabile' },
  { value: 'Approvata', label: 'Approvate' },
  { value: 'Rifiutata', label: 'Rifiutate' },
  { value: 'tutte', label: 'Tutte' },
]


export default function RichiesteFerie({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const piani = usePianiFerieStore(s => s.piani)
  const decidi = useHrGestioneStore(s => s.decidiRichiesta)
  const confirm = useConfirmStore(s => s.confirm)
  // Saldo annuo per dipendente: ferie in giorni, ROL in ore.
  const [saldo, setSaldo] = useState<'ferie' | 'rol' | null>(null)

  // Sul calendario si parte da tutte le richieste del mese; le schede filtrano per stato.
  const [vista, setVista] = useState(VISTA_TUTTE)
  const [reparto, setReparto] = useState('')

  const rows = useMemo(() => richieste
    .map(r => arricchisciRichiesta(r, richieste, piani))
    .filter(r => vista === VISTA_TUTTE || (vista === VISTA_ATTESA ? r.stato === 'Da approvare' : r.stato === vista))
    .filter(r => !reparto || r.reparto === reparto),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [richieste, piani, vista, reparto])

  const sorted = useMemo(() => [...rows].sort((a, b) => a.dal.localeCompare(b.dal)), [rows])
  const inAttesa = richieste.filter(r => r.stato === 'Da approvare').length
  const contaVista = (v: string) => v === VISTA_TUTTE ? richieste.length : v === VISTA_ATTESA ? inAttesa : richieste.filter(r => r.stato === v).length
  // Richieste da approvare che Sibylla valuta senza problemi (sul filtro reparto attivo).
  const consigliate = rows.filter(r => r.valutazione?.livello === 'ok')

  const approvaConsigliate = async () => {
    const ok = await confirm({
      title: 'Approva le richieste consigliate',
      message: <>Sibylla non vede conflitti in <strong>{consigliate.length === 1 ? '1 richiesta' : `${consigliate.length} richieste`}</strong>: {consigliate.map(r => `${r.dipendente} (${r.tipo.toLowerCase()})`).join(', ')}. Le approvi tutte?</>,
      confirmLabel: 'Approva', danger: false,
    })
    if (!ok) return
    consigliate.forEach(r => decidi(r.id, 'Approvata'))
    toast.success(`${consigliate.length === 1 ? '1 richiesta approvata' : `${consigliate.length} richieste approvate`}: sono nel Piano ferie.`, 'Richieste approvate')
  }

  const esporta = () => exportXls('richieste-assenze', ['Richiesta il', 'Dipendente', 'Reparto', 'Tipo', 'Dal', 'Al', 'Durata', 'Residuo', 'Stato', 'Note', 'Motivo rifiuto'],
    sorted.map(r => [fmtDataHr(r.createdAt.slice(0, 10)), r.dipendente, r.reparto, r.tipo, fmtDataHr(r.dal), fmtDataHr(r.al), durata(r),
      r.tipo === 'Ferie' ? `${r.residuo} gg` : r.tipo === 'ROL' ? fmtOre(r.residuo) : '', r.stato, r.note ?? '', r.motivo ?? '']))

  const fmtGg = (g: number) => g === 1 ? '1 g' : `${g} gg`
  const righeSaldo = (k: 'ferie' | 'rol') => DIPENDENTI_HR.map(d => ({ d, s: k === 'rol' ? saldoRol(richieste, d.id) : saldoFerie(richieste, d.id) }))
  const fmtSaldo = (k: 'ferie' | 'rol', n: number) => k === 'rol' ? fmtOre(n) : fmtGg(n)
  const esportaSaldo = (k: 'ferie' | 'rol') => exportXls(k === 'rol' ? 'saldo-rol' : 'saldo-ferie',
    ['Dipendente', 'Reparto', k === 'rol' ? 'Maturate (h)' : 'Maturate (gg)', 'Godute', 'In attesa', 'Residue'],
    righeSaldo(k).map(({ d, s: x }) => [`${d.nome} ${d.cognome}`, d.reparto, x.maturate, x.godute, x.inAttesa, x.residue]))


  return (
    <div className="rfe">
      <PageHead
        title="Richieste"
        subtitle="Ferie e ROL arrivano qui dopo l'approvazione del responsabile di reparto: l'ufficio del personale dà quella definitiva"
        onBack={() => navigate('home')}
      />

      <div className="rfe__toolbar">
        <div className="rfe__tabs" role="tablist" aria-label="Vista">
          {VISTE.map(v => (
            <button key={v.value} type="button" role="tab" aria-selected={vista === v.value}
              className={`rfe__tab ${vista === v.value ? 'rfe__tab--on' : ''}`} onClick={() => setVista(v.value)}>
              {v.label}<span className={`rfe__tab-n ${v.value === VISTA_ATTESA && inAttesa > 0 ? 'rfe__tab-n--hot' : ''}`}>{contaVista(v.value)}</span>
            </button>
          ))}
        </div>
        <SelectField name="reparto" label="Reparto" className="rfe__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <div className="rfe__push">
          {consigliate.length > 0 && (
            <Tooltip text="Approva in un colpo le richieste senza conflitti nel reparto e con saldo sufficiente">
              <button type="button" className="sib-btn sib-btn--secondary rfe__smart" onClick={approvaConsigliate}>
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Approva consigliate ({consigliate.length})
              </button>
            </Tooltip>
          )}
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSaldo('ferie')}>
            <i className="fa-solid fa-umbrella-beach" aria-hidden="true" /> Saldo ferie
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSaldo('rol')}>
            <i className="fa-solid fa-hourglass-half" aria-hidden="true" /> Saldo ROL
          </button>
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

      <GestioneRichieste richieste={rows} reparto={reparto} />

      {/* ── Saldo annuo per dipendente: ferie (giorni) o ROL (ore) ── */}
      <Modal open={!!saldo} onClose={() => setSaldo(null)} title={`${saldo === 'rol' ? 'Saldo ROL' : 'Saldo ferie'} ${new Date().getFullYear()}`} size="lg">
        {saldo && (
          <div className="rfe-modal">
            <p className="rfe-modal__text">
              {saldo === 'rol'
                ? 'Ore di riduzione orario maturate nell\'anno secondo il contratto, godute con le richieste approvate e ancora da approvare.'
                : 'Giorni lavorativi di ferie maturati nell\'anno secondo il contratto, goduti con le richieste approvate e ancora da approvare.'}
            </p>
            <div className="sib-table-wrap rfe__wrap">
              <table className="sib-table rfe__table rfe__saldo">
                <colgroup>
                  <col className="rfe__scol-dip" /><col className="rfe__scol-rep" />
                  <col className="rfe__scol-n" /><col className="rfe__scol-n" /><col className="rfe__scol-n" /><col className="rfe__scol-n" />
                </colgroup>
                <thead>
                  <tr>
                    <th><ThLabel full="Dipendente" /></th>
                    <th><ThLabel full="Reparto" /></th>
                    <th className="rfe__r"><ThLabel full="Maturate" /></th>
                    <th className="rfe__r"><ThLabel full="Godute" /></th>
                    <th className="rfe__r"><ThLabel full="In attesa" /></th>
                    <th className="rfe__r"><ThLabel full="Residue" /></th>
                  </tr>
                </thead>
                <tbody>
                  {righeSaldo(saldo).map(({ d, s: x }) => (
                    <tr key={d.id}>
                      <td className="rfe__strong"><TruncatedText text={`${d.nome} ${d.cognome}`} /></td>
                      <td><TruncatedText text={d.reparto} /></td>
                      <td className="rfe__r">{fmtSaldo(saldo, x.maturate)}</td>
                      <td className="rfe__r">{fmtSaldo(saldo, x.godute)}</td>
                      <td className="rfe__r">{x.inAttesa ? fmtSaldo(saldo, x.inAttesa) : <span className="rfe__dash">-</span>}</td>
                      <td className={`rfe__r rfe__strong ${x.residue < 0 ? 'rfe__neg' : ''}`}>
                        {x.inAttesa && x.residue - x.inAttesa < 0
                          ? <Tooltip text={`Se approvi quelle in attesa restano ${fmtSaldo(saldo, x.residue - x.inAttesa)}`}><span className="rfe__saldo-warn">{fmtSaldo(saldo, x.residue)} <Ico n="alert" w="solid" s={12} c="currentColor" /></span></Tooltip>
                          : fmtSaldo(saldo, x.residue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rfe-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => esportaSaldo(saldo)}>
                <i className="fa-regular fa-file-xls" aria-hidden="true" /> Esporta in Excel
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => setSaldo(null)}>Chiudi</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
