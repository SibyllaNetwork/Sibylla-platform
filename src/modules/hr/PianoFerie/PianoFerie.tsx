import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import Ico from '../../../core/icons/Ico'
import { SelectField, CheckboxField } from '../../../core/components/form'
import {
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, TIPI_ASSENZA, isoOf, todayIsoHr, fmtDataHr,
  ferieGodute, type RichiestaAssenza, type TipoAssenza,
} from '../../../store/useHrGestioneStore'
import { exportXls } from '../hrExport'
import './PianoFerie.sass'

/**
 * Piano ferie — HR › Gestione delle presenze › Gestione ferie e permessi.
 * Calendario del mese per dipendente, raggruppato per reparto: mostra le assenze
 * approvate in "Richieste" (e, a scelta, quelle ancora da approvare) e conta
 * gli assenti di ogni giorno per vedere subito i giorni scoperti.
 */

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GG = ['D', 'L', 'M', 'M', 'G', 'V', 'S']
/** Assenti nello stesso giorno oltre i quali il giorno si segnala come scoperto. */
const SOGLIA_ASSENTI = 3

const tipoCls = (t: TipoAssenza) => t.toLowerCase()

export default function PianoFerie({ navigate }: { navigate: (p: string) => void }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const [mese, setMese] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [reparto, setReparto] = useState('')
  const [conAttesa, setConAttesa] = useState(true)
  const oggi = todayIsoHr()

  const giorni = useMemo(() => {
    const n = new Date(mese.y, mese.m + 1, 0).getDate()
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(mese.y, mese.m, i + 1, 12)
      return { iso: isoOf(d), n: i + 1, wd: d.getDay() }
    })
  }, [mese])

  const primo = giorni[0].iso
  const ultimo = giorni[giorni.length - 1].iso

  // Assenze del mese visibili: approvate + (a scelta) da approvare; le rifiutate mai.
  const assenze = useMemo(() => richieste.filter(r =>
    (r.stato === 'Approvata' || (conAttesa && r.stato === 'Da approvare')) && r.dal <= ultimo && r.al >= primo),
  [richieste, conAttesa, primo, ultimo])

  const assenzaDi = (dipendenteId: number, iso: string): RichiestaAssenza | undefined =>
    assenze.find(r => r.dipendenteId === dipendenteId && r.dal <= iso && r.al >= iso && (r.stato === 'Approvata' || conAttesa))

  const gruppi = useMemo(() => REPARTI_HR
    .filter(r => !reparto || r === reparto)
    .map(r => ({ reparto: r, dipendenti: DIPENDENTI_HR.filter(d => d.reparto === r) }))
    .filter(g => g.dipendenti.length > 0), [reparto])
  const visibili = gruppi.flatMap(g => g.dipendenti)

  // Assenti per giorno (solo approvate: le richieste in attesa non scoprono ancora il turno).
  const assentiDel = (iso: string) => visibili.filter(d => {
    const a = assenzaDi(d.id, iso)
    return a && a.stato === 'Approvata'
  }).length

  const cambiaMese = (delta: number) => setMese(({ y, m }) => {
    const d = new Date(y, m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const isMeseCorrente = mese.y === new Date().getFullYear() && mese.m === new Date().getMonth()

  const esporta = () => exportXls(`piano-ferie-${mese.y}-${String(mese.m + 1).padStart(2, '0')}`,
    ['Dipendente', 'Reparto', 'Tipo', 'Dal', 'Al', 'Stato'],
    assenze
      .filter(r => visibili.some(d => d.id === r.dipendenteId))
      .sort((a, b) => a.dal.localeCompare(b.dal))
      .map(r => {
        const d = DIPENDENTI_HR.find(x => x.id === r.dipendenteId)!
        return [`${d.nome} ${d.cognome}`, d.reparto, r.tipo, fmtDataHr(r.dal), fmtDataHr(r.al), r.stato]
      }))

  const inAttesa = richieste.filter(r => r.stato === 'Da approvare').length

  return (
    <div className="pfe">
      <PageHead
        title="Piano ferie"
        subtitle="Le assenze del personale nel mese, reparto per reparto"
        onBack={() => navigate('home')}
        actions={
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('hr-richieste-ferie')}>
            <Ico n="list-check" s={13} c="currentColor" /> Richieste{inAttesa > 0 ? ` (${inAttesa} da approvare)` : ''}
          </button>
        }
      />

      <div className="pfe__toolbar">
        <div className="pfe__nav">
          <Tooltip text="Mese precedente">
            <button type="button" className="pfe__nav-btn" onClick={() => cambiaMese(-1)} aria-label="Mese precedente">
              <Ico n="back" w="solid" s={13} c="currentColor" />
            </button>
          </Tooltip>
          <span className="pfe__mese">{MESI[mese.m]} {mese.y}</span>
          <Tooltip text="Mese successivo">
            <button type="button" className="pfe__nav-btn" onClick={() => cambiaMese(1)} aria-label="Mese successivo">
              <Ico n="chevr" w="solid" s={13} c="currentColor" />
            </button>
          </Tooltip>
          {!isMeseCorrente && (
            <button type="button" className="sib-btn sib-btn--ghost pfe__oggi" onClick={() => { const d = new Date(); setMese({ y: d.getFullYear(), m: d.getMonth() }) }}>
              Mese corrente
            </button>
          )}
        </div>
        <SelectField name="reparto" label="Reparto" className="pfe__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <CheckboxField name="con-attesa" label="Mostra le richieste da approvare" checked={conAttesa} onChange={e => setConAttesa(e.target.checked)} className="pfe__check" />
        <div className="pfe__push">
          <ul className="pfe__legend">
            {TIPI_ASSENZA.map(t => <li key={t}><span className={`pfe__sw pfe__sw--${tipoCls(t)}`} />{t}</li>)}
            {conAttesa && <li><span className="pfe__sw pfe__sw--attesa" />Da approvare</li>}
          </ul>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="pfe__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
              <Ico n="excel" w="regular" s={16} c="#fff" />
            </button>
          </Tooltip>
        </div>
      </div>

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
                <th key={g.iso} className={`pfe__th-day ${g.wd === 0 ? 'pfe__dom' : ''} ${g.iso === oggi ? 'pfe__today' : ''}`}>
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
                        const a = assenzaDi(d.id, gg.iso)
                        const cls = `pfe__day ${gg.wd === 0 ? 'pfe__dom' : ''} ${gg.iso === oggi ? 'pfe__today' : ''}`
                        if (!a) return <td key={gg.iso} className={cls} />
                        const tip = `${d.nome} ${d.cognome} · ${a.tipo} ${a.dal === a.al ? `il ${fmtDataHr(a.dal)}` : `dal ${fmtDataHr(a.dal)} al ${fmtDataHr(a.al)}`}${a.stato === 'Da approvare' ? ' · da approvare' : ''}${a.note ? ` · ${a.note}` : ''}`
                        return (
                          <td key={gg.iso} className={cls}>
                            <Tooltip text={tip}>
                              <span className={`pfe__bar pfe__bar--${tipoCls(a.tipo)} ${a.stato === 'Da approvare' ? 'pfe__bar--attesa' : ''} ${a.dal === gg.iso ? 'pfe__bar--start' : ''} ${a.al === gg.iso ? 'pfe__bar--end' : ''}`} />
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
                const cls = `pfe__day ${g.wd === 0 ? 'pfe__dom' : ''} ${n >= SOGLIA_ASSENTI ? 'pfe__tot--warn' : ''}`
                return (
                  <td key={g.iso} className={cls}>
                    {n > 0 && (n >= SOGLIA_ASSENTI
                      ? <Tooltip text={`${n} assenti il ${fmtDataHr(g.iso)}: controlla la copertura dei turni`}><span>{n}</span></Tooltip>
                      : n)}
                  </td>
                )
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
