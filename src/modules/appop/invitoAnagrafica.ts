import { useMemo } from 'react'
import { appOpSibylla, type FonteAppOp } from './appOpSibylla'
import type { DipendenteOp, InvitoOp, StrutturaOp } from './opApi'
import { CLIENTS_INIT } from '../../admin/SibyllaAdminPanel/constants'
import { useStrutturaCorrente } from '../../hooks/useStrutturaCorrente'
import { useAnagraficaOpStore, type AbilitazioneOp } from '../../store/useAnagraficaOpStore'

// ─── Invito all'App Op! dall'anagrafica del personale ────────────────────────
//  Usato dalla sezione «App Op!» di Crea anagrafica personale e dall'azione
//  «Invita Op!» dell'Archivio del personale. Crea l'utenza del dipendente
//  nell'App Op! della struttura corrente (o la ritrova per email aziendale) e
//  invia il token di invito all'email aziendale: con quel codice il dipendente
//  attiva il proprio accesso in app come dipendente dell'azienda.
//  Stesse API del Configuratore › App Op! (Op.Api → Portal → dati di prova).

export const emailValida = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())

/** La struttura corrente nel formato dell'App Op! (null = organizzazione). */
export function useStrutturaOp(): StrutturaOp | null {
  const { struttura } = useStrutturaCorrente()
  return useMemo(() => {
    const c = CLIENTS_INIT.find(x => x.nome === struttura)
    return c ? { id: c.id, nome: c.nome } : null
  }, [struttura])
}

export interface StatoOpDipendente {
  fonte: FonteAppOp
  dipendente: DipendenteOp | null
}

const trova = (lista: DipendenteOp[], abil: AbilitazioneOp) =>
  lista.find(d => (abil.opId != null && d.id === abil.opId) || d.email.toLowerCase() === abil.emailAziendale.trim().toLowerCase()) ?? null

/** Fonte della configurazione App Op! e utenza già esistente del dipendente. */
export async function leggiStatoOp(abil: AbilitazioneOp, struttura: StrutturaOp | null): Promise<StatoOpDipendente> {
  const c = await appOpSibylla.leggi(struttura)
  return { fonte: c.fonte, dipendente: trova(c.dipendenti, abil) }
}

/**
 * Invia (o reinvia) il token di invito. Se l'utenza non esiste la crea con
 * grado, reparti e permessi dell'abilitazione; altrimenti rigenera l'invito
 * (un nuovo invito annulla il precedente). Registra l'esito nell'anagrafica.
 */
export async function invitaDipendenteOp(
  anagraficaId: string,
  persona: { nome: string; cognome: string },
  abil: AbilitazioneOp,
  struttura: StrutturaOp | null,
): Promise<InvitoOp> {
  if (!emailValida(abil.emailAziendale)) throw new Error('Inserisci un’email aziendale valida: è lì che arriva il token di invito.')
  if (!persona.nome.trim() || !persona.cognome.trim()) throw new Error('Nome e cognome del dipendente sono obbligatori.')
  if (abil.reparti.length === 0) throw new Error('Scegli almeno un reparto dell’App Op!.')

  const { fonte, dipendente } = await leggiStatoOp(abil, struttura)
  let invito: InvitoOp | null
  let opId = dipendente?.id
  if (dipendente) {
    invito = await appOpSibylla.invita(dipendente.id, fonte, struttura)
  } else {
    invito = (await appOpSibylla.salvaUtente(null, {
      nome: persona.nome.trim(), cognome: persona.cognome.trim(), email: abil.emailAziendale.trim(),
      livello: abil.livello, reparti: abil.reparti,
      responsabileReparti: abil.responsabile ? abil.reparti : [],
      hr: abil.hr, inviaInvito: true,
    }, fonte, struttura)).invito
    opId = (await leggiStatoOp(abil, struttura)).dipendente?.id
  }
  if (!invito) throw new Error('L’App Op! non ha restituito il codice di invito.')

  useAnagraficaOpStore.getState().set(anagraficaId, {
    ...abil, abilitato: true, opId,
    ultimoInvito: { emailMascherata: invito.emailMascherata, scadeIl: invito.scadeIl, inviatoIl: new Date().toISOString() },
  })
  return invito
}
