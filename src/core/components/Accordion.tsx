import React from 'react'

function Accordion({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`accordion ${open ? 'accordion--open' : 'accordion--closed'}`}>
      {children}
    </div>
  )
}

export default Accordion
