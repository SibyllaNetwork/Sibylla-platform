import React from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import './Organigramma.sass'

export default function Organigramma({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="organigramma">
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader title="Organigramma" subtitle="Visualizza la struttura gerarchica dell'organizzazione"/>

      <div className="organigramma__stub">
        <div className="organigramma__stub-badge">
          <div className="organigramma__stub-dot" />
        </div>
        <h2 className="organigramma__stub-title">Organigramma</h2>
        <p className="organigramma__stub-msg">Questa pagina sarà sviluppata nel prossimo sprint.</p>
      </div>
    </div>
  )
}
