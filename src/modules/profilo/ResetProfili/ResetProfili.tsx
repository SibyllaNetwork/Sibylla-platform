import React from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import './ResetProfili.sass'

export default function ResetProfili({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="reset-profili">
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader title="Reset profili" subtitle="Ripristina le impostazioni dei profili utente dell'organizzazione"/>

      <div className="reset-profili__stub">
        <div className="reset-profili__stub-badge">
          <div className="reset-profili__stub-dot" />
        </div>
        <h2 className="reset-profili__stub-title">Reset profili</h2>
        <p className="reset-profili__stub-msg">Questa pagina sarà sviluppata nel prossimo sprint.</p>
      </div>
    </div>
  )
}
