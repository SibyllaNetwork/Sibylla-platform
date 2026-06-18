import React, { useState } from 'react'
import Ico from '../../../core/icons/Ico'
import Tooltip from '../../../core/components/Tooltip'
import { toast } from '../../../core/components/Toast/useToast'
import './ProcessiAutomatici.sass'

interface Props { navigate: (p: string) => void }

type Stato = 'running' | 'paused' | 'stopped'
interface Processo { id: number; nome: string; descrizione: string; quando: string; stato: Stato }

const SEED: Processo[] = [
  { id: 1, nome: 'Report PickUp Notification process', descrizione: 'Job per invio report PickUp agli utenti configurati', quando: '9 : 0', stato: 'running' },
  { id: 2, nome: 'Tableau Booking Prerolling process', descrizione: 'Job per invio notifiche prenotazioni Tableau in scadenza', quando: '21 : 50', stato: 'running' },
]

const STATO_LABEL: Record<Stato, string> = { running: 'In esecuzione', paused: 'In pausa', stopped: 'Fermo' }

export default function ProcessiAutomatici({ navigate }: Props) {
  const [rows, setRows] = useState<Processo[]>(SEED)

  const update = (p: Processo, stato: Stato, msg: string) => {
    setRows(prev => prev.map(r => r.id === p.id ? { ...r, stato } : r))
    toast.success(`${msg}: «${p.nome}».`, 'Processo automatico')
  }

  return (
    <div className="prc">
      <button type="button" className="prc__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="prc__head">
        <h1 className="prc__title">Gestione dei processi automatici</h1>
        <p className="prc__sub">Avvia, metti in pausa, ferma o riavvia i job pianificati.</p>
      </div>

      <div className="sib-table-wrap prc__wrap">
        <table className="sib-table prc__table">
          <thead>
            <tr>
              <th>Nome</th>
              <th className="prc__c">Descrizione</th>
              <th className="prc__c">Quando</th>
              <th className="prc__c">Stato</th>
              <th className="prc__c prc__th-actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id}>
                <td className="prc__name">{p.nome}</td>
                <td className="prc__c">{p.descrizione}</td>
                <td className="prc__c prc__when">{p.quando}</td>
                <td className="prc__c">
                  <span className={`prc__stato prc__stato--${p.stato}`}>{STATO_LABEL[p.stato]}</span>
                </td>
                <td className="prc__c">
                  <div className="prc__actions">
                    {p.stato !== 'running' && (
                      <Tooltip text={p.stato === 'paused' ? 'Riprendi' : 'Avvia'}>
                        <button type="button" className="prc__btn prc__btn--play" onClick={() => update(p, 'running', p.stato === 'paused' ? 'Processo ripreso' : 'Processo avviato')}><Ico n="play" s={12} c="#fff" /></button>
                      </Tooltip>
                    )}
                    {p.stato === 'running' && (
                      <Tooltip text="Pausa">
                        <button type="button" className="prc__btn prc__btn--pause" onClick={() => update(p, 'paused', 'Processo in pausa')}><Ico n="pause" s={12} c="#fff" /></button>
                      </Tooltip>
                    )}
                    {p.stato !== 'stopped' && (
                      <Tooltip text="Stop">
                        <button type="button" className="prc__btn prc__btn--stop" onClick={() => update(p, 'stopped', 'Processo fermato')}><Ico n="stop" s={12} c="#fff" /></button>
                      </Tooltip>
                    )}
                    <Tooltip text="Riavvia">
                      <button type="button" className="prc__btn prc__btn--restart" onClick={() => update(p, 'running', 'Processo riavviato')}><Ico n="refresh" s={12} c="#fff" /></button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
