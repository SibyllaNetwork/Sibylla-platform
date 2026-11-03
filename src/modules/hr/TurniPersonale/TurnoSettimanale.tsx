import React from 'react'
import clsx from 'clsx'
import TruncatedText from '../../../core/components/TruncatedText'
import { DIPENDENTI_HR, REPARTI_HR, useHrGestioneStore } from '../../../store/useHrGestioneStore'
import {
  GIORNI_BREVI, assenzaDi, giorniSettimana, giornoMese, type Assegnazioni,
} from '../../../store/useTurniPersonaleStore'
import './TurnoSettimanale.sass'

/**
 * Turno settimanale in sola lettura: dipendenti per reparto × giorni.
 * È la "visualizzazione digitale" aperta dal pulsante "Visualizza turno" della
 * notifica che ricevono i dipendenti (nessun download: il PDF ha il suo pulsante).
 */
export default function TurnoSettimanale({ lunedi, assegnazioni }: { lunedi: string; assegnazioni: Assegnazioni }) {
  const richieste = useHrGestioneStore(s => s.richieste)
  const giorni = giorniSettimana(lunedi)

  return (
    <div className="tsv">
      <table className="sib-table tsv__table">
        <colgroup>
          <col className="tsv__col-dip" />
          {giorni.map(g => <col key={g} className="tsv__col-day" />)}
          <col className="tsv__col-tot" />
        </colgroup>
        <thead>
          <tr>
            <th>Dipendente</th>
            {giorni.map((g, i) => (
              <th key={g} className="tsv__c">
                <span className="tsv__wd">{GIORNI_BREVI[i]}</span>
                <span className="tsv__dm">{giornoMese(g)}</span>
              </th>
            ))}
            <th className="tsv__c">Giorni</th>
          </tr>
        </thead>
        <tbody>
          {REPARTI_HR.map(rep => {
            const staff = DIPENDENTI_HR.filter(d => d.reparto === rep)
            return (
              <React.Fragment key={rep}>
                <tr className="tsv__group"><td colSpan={9}>{rep}</td></tr>
                {staff.map(d => {
                  const tot = giorni.filter(g => (assegnazioni[g] ?? []).includes(d.id)).length
                  return (
                    <tr key={d.id}>
                      <td><TruncatedText text={`${d.nome} ${d.cognome}`} className="tsv__name" /></td>
                      {giorni.map(g => {
                        const inTurno = (assegnazioni[g] ?? []).includes(d.id)
                        const a = assenzaDi(richieste, d.id, g)
                        const assente = a && !a.inAttesa
                        return (
                          <td key={g} className={clsx('tsv__c', inTurno && 'tsv__on', !inTurno && assente && 'tsv__abs')}>
                            {inTurno ? <i className="fa-solid fa-check" aria-label="In turno" /> : assente ? a!.tipo : <span className="tsv__riposo">Riposo</span>}
                          </td>
                        )
                      })}
                      <td className="tsv__c tsv__tot">{tot}</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
