import React from 'react'
import ConfirmDialog from '../core/components/ConfirmDialog'
import { useSitoStore } from './useSitoStore'
import SnwWeb from './web/SnwWeb'
import SnwTotem from './totem/SnwTotem'
import { useSchermoTotem } from './schermoTotem'

/**
 * Sito Sibylla Network (nuova versione): vetrina e-commerce del turismo con
 * il design system di Platform. Due interfacce sugli stessi dati e carrello:
 * Sito web e Totem interattivo verticale per le strutture ricettive.
 * Si apre da "Disconnetti profilo" in topbar. Su uno schermo da totem
 * (verticale 9:16, vedi schermoTotem.ts) parte da solo la versione totem a
 * tutto schermo, senza cornice né comandi dell'anteprima.
 */
export default function SitoNetwork() {
  const modo = useSitoStore(s => s.modo)
  const lingua = useSitoStore(s => s.lingua)
  const dispositivo = useSchermoTotem()
  // Chiave sulla lingua: al cambio tutto il sito si ridisegna con i testi tradotti (vedi i18n)
  return (
    <React.Fragment key={lingua}>
      {dispositivo ? <SnwTotem dispositivo /> : modo === 'web' ? <SnwWeb /> : <SnwTotem />}
      <ConfirmDialog />
    </React.Fragment>
  )
}
