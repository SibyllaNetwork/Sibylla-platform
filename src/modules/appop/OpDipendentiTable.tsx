import React from 'react'
import StatusBadge from '../../core/components/StatusBadge'
import Tooltip from '../../core/components/Tooltip'
import TruncatedText from '../../core/components/TruncatedText'
import { labelLivello, nomeReparto } from './opCatalogo'
import { formatoData, type DipendenteOp } from './opApi'
import './OpDipendentiTable.sass'

interface Props {
  dipendenti: DipendenteOp[]
  onModifica: (d: DipendenteOp) => void
  onInvito: (d: DipendenteOp) => void
  onBlocco?: (d: DipendenteOp) => void
  onElimina?: (d: DipendenteOp) => void
}

const STATI = {
  attivo: { variant: 'success', label: 'Attivo' },
  invitato: { variant: 'info', label: 'Invitato' },
  bloccato: { variant: 'error', label: 'Bloccato' },
} as const

// ─── UTENZE DELL'APP OP! ──────────────────────────────────────────────────────
//  Elenco delle utenze con grado, reparti, stato dell'accesso e azioni. Le azioni
//  distruttive (blocco, eliminazione) le conferma chi usa il componente.
export default function OpDipendentiTable({ dipendenti, onModifica, onInvito, onBlocco, onElimina }: Props) {
  return (
    <div className="sib-table-wrap op-dipendenti">
      <table className="sib-table">
        <colgroup>
          <col className="op-dipendenti__c-nome" /><col className="op-dipendenti__c-email" /><col className="op-dipendenti__c-grado" />
          <col className="op-dipendenti__c-reparti" /><col className="op-dipendenti__c-stato" /><col className="op-dipendenti__c-azioni" />
        </colgroup>
        <thead>
          <tr><th>Nome</th><th>Email</th><th>Grado</th><th>Reparti</th><th>Stato</th><th className="op-dipendenti__th-azioni">Azioni</th></tr>
        </thead>
        <tbody>
          {dipendenti.length === 0 && (
            <tr><td colSpan={6} className="op-dipendenti__vuoto">Nessuna utenza: creane una per invitare il primo dipendente.</td></tr>
          )}
          {dipendenti.map(d => {
            const reparti = d.reparti.map(r => `${nomeReparto(r)}${d.responsabileReparti.includes(r) ? ' (resp.)' : ''}`).join(', ')
            const grado = `${labelLivello(d.livello)}${d.hr ? ' · HR' : ''}`
            const stato = STATI[d.stato]
            return (
              <tr key={d.id}>
                <td><TruncatedText text={`${d.nome} ${d.cognome}`} className="op-dipendenti__testo" /></td>
                <td><TruncatedText text={d.email} className="op-dipendenti__testo" /></td>
                <td><TruncatedText text={grado} className="op-dipendenti__testo" /></td>
                <td><TruncatedText text={reparti} className="op-dipendenti__testo" /></td>
                <td>
                  <Tooltip text={d.stato === 'invitato' ? `Invito valido fino al ${formatoData(d.invitoScadeIl)}` : `Ultimo accesso: ${formatoData(d.ultimoAccesso)}`}>
                    <StatusBadge variant={stato.variant}>{stato.label}</StatusBadge>
                  </Tooltip>
                </td>
                <td className="op-dipendenti__azioni">
                  <Tooltip text="Modifica">
                    <button type="button" className="op-dipendenti__btn" aria-label={`Modifica ${d.nome} ${d.cognome}`} onClick={() => onModifica(d)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                  </Tooltip>
                  {d.stato !== 'attivo' && d.stato !== 'bloccato' && (
                    <Tooltip text="Invia di nuovo l’invito">
                      <button type="button" className="op-dipendenti__btn" aria-label={`Invita ${d.nome} ${d.cognome}`} onClick={() => onInvito(d)}>
                        <i className="fa-solid fa-paper-plane" />
                      </button>
                    </Tooltip>
                  )}
                  {onBlocco && (
                    <Tooltip text={d.stato === 'bloccato' ? 'Sblocca l’accesso' : 'Blocca l’accesso'}>
                      <button type="button" className="op-dipendenti__btn" aria-label={`${d.stato === 'bloccato' ? 'Sblocca' : 'Blocca'} ${d.nome} ${d.cognome}`} onClick={() => onBlocco(d)}>
                        <i className={d.stato === 'bloccato' ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'} />
                      </button>
                    </Tooltip>
                  )}
                  {onElimina && (
                    <Tooltip text="Elimina l’account">
                      <button type="button" className="op-dipendenti__btn" aria-label={`Elimina ${d.nome} ${d.cognome}`} onClick={() => onElimina(d)}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
