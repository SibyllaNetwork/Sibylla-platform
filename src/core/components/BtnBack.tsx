import React from 'react'

const BtnBack = ({ onClick, label = 'Indietro' }: { onClick: () => void; label?: string }) => (
  <button type="button" className="sib-btn sib-btn--back" onClick={onClick}>
    <i className="fa-duotone fa-arrow-left text-[12px]" aria-hidden="true" />
    {label}
  </button>
)

export default BtnBack
