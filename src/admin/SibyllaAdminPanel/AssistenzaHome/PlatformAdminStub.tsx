import React from 'react'
import Ico from '../../../core/icons/Ico'
import BtnBack from '../../../core/components/BtnBack'
import { platformAdminLabel, platformAdminGroupOf } from '../../../navigation/platformAdminMenu'
import './PlatformAdminStub.sass'

interface Props {
  page: string
  navigate: (p: string) => void
}

/*
 * PlatformAdminStub — contenuto (parte centrale) di una voce del menu
 * Amministrazione piattaforma. Segnaposto in attesa dell'implementazione delle
 * singole funzioni.
 */
export default function PlatformAdminStub({ page, navigate }: Props) {
  return (
    <div className="pa-stub">
      {/* Indietro: come le altre pagine di Amministrazione piattaforma, torna alla Console */}
      <div className="pa-stub__bar">
        <BtnBack onClick={() => navigate('sibylla-admin')} />
      </div>
      <div className="pa-stub__body">
        <span className="pa-stub__ico"><Ico n="sliders" s={26} c="var(--color-text-disabled)" /></span>
        <h2 className="pa-stub__title">{platformAdminLabel(page)}</h2>
        <p className="pa-stub__sub">{platformAdminGroupOf(page)} · sezione in preparazione</p>
      </div>
    </div>
  )
}
