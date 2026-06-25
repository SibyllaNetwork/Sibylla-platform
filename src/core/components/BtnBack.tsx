import React from 'react'
import { useNavBack } from '../../store/useNavBack'

// `onClick` opzionale: se assente, "Indietro" torna alla pagina precedente
// (stack di navigazione registrato dal dashboard), non alla home.
const BtnBack = ({ onClick, label = 'Indietro' }: { onClick?: () => void; label?: string }) => {
  const goBack = useNavBack(s => s.goBack)
  const handle = onClick ?? (() => goBack?.())
  return (
    <button type="button" className="sib-btn sib-btn--back" onClick={handle}>
      <i className="fa-duotone fa-arrow-left text-[12px]" aria-hidden="true" />
      {label}
    </button>
  )
}

export default BtnBack
