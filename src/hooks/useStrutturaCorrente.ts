import { useEffect, useMemo, useState } from 'react'
import { CLIENTS_INIT } from '../admin/SibyllaAdminPanel/constants'
import { schedaDemo, idStruttura } from '../core/demo/struttureDemo'
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

  // Strutture del profilo caricato: le sue (struttureIds, es. un gruppo di ristoranti) o la sola di appartenenza.
  const profiloStrutture = useMemo(() => {
    if (!profilo) return []
    const ids = profilo.struttureIds
    return ids?.length ? CLIENTS_INIT.filter(c => ids.includes(c.id)).map(c => c.nome) : profilo.cliente ? [profilo.cliente] : []
  }, [profilo])

  const struttura = assist
    ? (assistStrutture.includes(activeStruttura) ? activeStruttura : assistStrutture[0])
    // Profilo con più strutture: quella scelta dalla select, se è fra le sue.
    : profiloStrutture.length > 1
      ? (profiloStrutture.includes(activeStruttura) ? activeStruttura : profilo?.cliente ?? profiloStrutture[0])
      // Fuori dall'assistenza la struttura deve essere dell'organizzazione (quella
      // ricordata potrebbe essere di un cliente assistito in precedenza).
      : profilo?.cliente ?? (struttureOrg.includes(activeStruttura) ? activeStruttura : struttureOrg[0] ?? activeStruttura)

  // Strutture tra cui si può scegliere: quelle del cliente assistito, quelle del
  // profilo caricato, altrimenti quelle dell'organizzazione.
  const elenco = assist ? assistStrutture : profiloStrutture.length ? profiloStrutture : struttureOrg

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

/** Schede demo delle strutture del cliente corrente (portafoglio). */
export function useStruttureCliente() {
  const { elenco } = useStrutturaCorrente()
  return useMemo(() => elenco.map(schedaDemo), [elenco])
}

/**
 * Per le pagine del ciclo revenue (sales, finance, purchasing): id della
 * struttura selezionata in alto (null = tutte), che la segue quando cambia.
 */
export function useStrutturaIdRevenue() {
  const { struttura } = useStrutturaCorrente()
  const schede = useStruttureCliente()
  const conCamere = schede.some(s => s.nome === struttura && s.camere > 0)
  const iniziale = conCamere ? idStruttura(struttura) : null
  const [id, setId] = useState<number | null>(iniziale)
  useEffect(() => { setId(iniziale) }, [iniziale])
  return [id, setId] as const
}
