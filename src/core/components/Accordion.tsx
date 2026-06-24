import React from 'react'

// Apertura/chiusura fluida: anima `grid-template-rows` 0fr→1fr (all'altezza
// REALE del contenuto), evitando gli scatti del vecchio max-height fisso.
function Accordion({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`accordion ${open ? 'accordion--open' : 'accordion--closed'}`}>
      <div className="accordion__inner">{children}</div>
    </div>
  )
}

export default Accordion
