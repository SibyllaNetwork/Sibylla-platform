import { useEffect, useMemo, useState } from 'react'
import { CLIENTS_INIT } from '../admin/SibyllaAdminPanel/constants'
import { useOrgStore } from '../store/useOrgStore'
import { useAccessStore, profiloDellaStruttura } from '../store/useAccessStore'

/**
 * La struttura mostrata in alto a sinistra nella sidenav, con la stessa regola
 * dello switcher:
 *  - in assistenza: una delle strutture del cliente impersonato (se sono più
 *    di una si sceglie dallo switcher);
 *  - con un profilo caricato: la struttura del profilo;
 *  - altrimenti: la struttura attiva dell'organizzazione.
 *
 * È la sorgente unica per chi deve "seguire" la struttura selezionata (la
 * sidenav e i dati della sezione Food & Beverage).
 */
export function useStrutturaCorrente() {
  const activeStruttura  = useOrgStore(s => s.activeStruttura)
  const struttureOrg     = useOrgStore(s => s.strutture)
  const assist           = useAccessStore(s => s.assist)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)

  const profilo = useMemo(() => {
    if (assist?.struttureIds.length === 1) return profiloDellaStruttura(assist.struttureIds[0], profiles)
    return currentProfileId ? profiles.find(p => p.id === currentProfileId) : undefined
  }, [assist, currentProfileId, profiles])

  const assistStrutture = useMemo(
    () => (assist ? CLIENTS_INIT.filter(c => assist.struttureIds.includes(c.id)).map(c => c.nome) : []),
    [assist],
  )

  const struttura = assist
    ? (assistStrutture.includes(activeStruttura) ? activeStruttura : assistStrutture[0])
    // Fuori dall'assistenza la struttura deve essere dell'organizzazione (quella
    // ricordata potrebbe essere di un cliente assistito in precedenza).
    : profilo?.cliente ?? (struttureOrg.includes(activeStruttura) ? activeStruttura : struttureOrg[0] ?? activeStruttura)

  // Strutture tra cui si può scegliere: quelle del cliente assistito, quella del
  // profilo caricato, altrimenti quelle dell'organizzazione.
  const elenco = assist ? assistStrutture : profilo?.cliente ? [profilo.cliente] : struttureOrg

  return { struttura, profilo, assistStrutture, elenco }
}

/**
 * Per i menu "Struttura" delle pagine: stato locale che parte dalla struttura
 * selezionata in alto (e la segue quando cambia), con le opzioni delle sole
 * strutture del cliente corrente.
 */
export function useStrutturaPagina() {
  const { struttura, elenco } = useStrutturaCorrente()
  const [sel, setSel] = useState(struttura)
  useEffect(() => { setSel(struttura) }, [struttura])
  const opzioni = useMemo(() => elenco.map(s => ({ value: s, label: s })), [elenco])
  return [sel, setSel, opzioni, elenco] as const
}

/** Scheda anagrafica della struttura (se è fra i clienti configurati). */
export const schedaStruttura = (nome: string) => CLIENTS_INIT.find(c => c.nome === nome)
