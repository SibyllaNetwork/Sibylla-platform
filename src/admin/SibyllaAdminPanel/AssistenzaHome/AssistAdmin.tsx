import React from 'react'
import Ico from '../../../core/icons/Ico'
import { useAccessStore } from '../../../store/useAccessStore'
import SibyllaAdminPanel from '../SibyllaAdminPanel'
import './AssistAdmin.sass'

interface Props {
  navigate: (p: string) => void
}

/*
 * AssistAdmin — Admin Panel del cliente assistito, caricato nella parte centrale
 * mantenendo invariate la sidenav e la header (tema oro) dell'app. Mostra il
 * pannello sul tab Clienti, intestato al cliente e limitato alle sue strutture.
 */
export default function AssistAdmin({ navigate }: Props) {
  const assist = useAccessStore(s => s.assist)

  if (!assist) {
    return (
      <div className="assist-admin__empty">
        <Ico n="layers" s={26} c="var(--color-text-disabled)" />
        <p>Nessun cliente selezionato.</p>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('sibylla-admin')}>
          Vai alla Console
        </button>
      </div>
    )
  }

  return (
    <div className="assist-admin">
      <SibyllaAdminPanel
        embedded
        lockedMode="clients"
        brandTitle="Admin Panel"
        clientsTitle={assist.nome}
        structureIds={assist.struttureIds}
      />
    </div>
  )
}
