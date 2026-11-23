import React from 'react'
import ConfirmDialog from '../core/components/ConfirmDialog'
import { useSitoStore } from './useSitoStore'
import SnwWeb from './web/SnwWeb'
import SnwTotem from './totem/SnwTotem'

/**
 * Sito Sibylla Network (nuova versione): vetrina e-commerce del turismo con
 * il design system di Platform. Due interfacce sugli stessi dati e carrello:
 * Sito web e Totem interattivo verticale per le strutture ricettive.
 * Si apre da "Disconnetti profilo" in topbar.
 */
export default function SitoNetwork() {
  const modo = useSitoStore(s => s.modo)
  return (
    <>
      {modo === 'web' ? <SnwWeb /> : <SnwTotem />}
      <ConfirmDialog />
    </>
  )
}
