import React from 'react'
import './FbImpostazioni.sass'

export default function FbImpostazioni() {
  return (
    <div className="fb-impostazioni">
      <div className="fb-impostazioni__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> Food &amp; Beverage <i className="fa-light fa-chevron-right" /> <strong>Impostazioni</strong>
      </div>
      <div className="fb-impostazioni__empty">
        <i className="fa-light fa-gear" />
        <p>Configurazione del modulo Food &amp; Beverage in arrivo.</p>
      </div>
    </div>
  )
}
