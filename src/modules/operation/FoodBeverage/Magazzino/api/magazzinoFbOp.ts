// ─── Magazzino della Ristorazione: client ────────────────────────────────────
//  Una sola funzione per tutte le azioni del § 8 della scheda 17 di sibylla-op.
//  I dati stanno nel database di Sibylla Platform: le pagine parlano solo col
//  Portal (`POST OpApp/magazzinoFb/Esegui`, docs/portal-magazzino-ristorazione.md).
//
//  Senza un Portal configurato (build pubblicata senza REACT_APP_API_URL, come
//  la demo su Vercel) e nella build di sviluppo si usa il client finto: dati
//  dimostrativi in memoria, che si perdono ricaricando la pagina. Con il Portal
//  configurato il client finto non si usa mai (salvo REACT_APP_MAGAZZINO_FB_FINTO=1).

import { apiFetchSibylla, ApiError } from '../../../../../services/api'
import type { StrutturaOp } from '../../../../appop/opApi'
import type { DatiAzione, Esito, NomeAzione, RispostaAzione } from './tipi'

/** Errore da mostrare all'utente: `detail` del Portal già in italiano. */
export class MagazzinoFbErrore extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export const NON_RAGGIUNGIBILE = 'Magazzino non raggiungibile.'

const PORTAL_CONFIGURATO = !!process.env.REACT_APP_API_URL
const FORZA = process.env.REACT_APP_MAGAZZINO_FB_FINTO

/**
 * Dati dimostrativi: nella build di sviluppo (salvo REACT_APP_MAGAZZINO_FB_FINTO=0) e nelle build pubblicate senza
 * Portal (demo su Vercel). Con il Portal configurato si usano solo i dati veri.
 */
export const CLIENT_FINTO = FORZA === '1'
  || (FORZA !== '0' && (process.env.NODE_ENV === 'development' || !PORTAL_CONFIGURATO))

/** Nella demo pubblicata (non in sviluppo) le pagine mostrano che i dati sono dimostrativi. */
export const DATI_DIMOSTRATIVI = CLIENT_FINTO && process.env.NODE_ENV !== 'development'

// Struttura scelta in alto: il client finto ne usa id e nome, così la demo mostra il ristorante giusto.
let strutturaDemo: StrutturaOp | null = null
export const impostaStrutturaDemo = (s: StrutturaOp | null) => { strutturaDemo = s }
export const strutturaCorrenteDemo = () => strutturaDemo

const detailDi = (body: unknown): string | null => {
  if (body && typeof body === 'object') {
    const b = body as { detail?: unknown; title?: unknown }
    if (typeof b.detail === 'string') return b.detail
    if (typeof b.title === 'string') return b.title
  }
  return null
}

async function viaPortal<T>(azione: string, dati: object): Promise<T | null> {
  try {
    return await apiFetchSibylla<T>('OpApp/magazzinoFb/Esegui', { method: 'POST', body: { azione, dati }, redirectOn401: false })
  } catch (e) {
    if (e instanceof ApiError) {
      const b = e.body as { collegata?: unknown } | null
      if (e.status === 404 && b && typeof b === 'object' && b.collegata === false) return null
      // 404 senza corpo o col titolo generico = il Portal non espone ancora l'azione: "non raggiungibile", come un 502.
      const d = detailDi(e.body)
      throw new MagazzinoFbErrore(e.status, d && d !== 'Not Found' ? d : NON_RAGGIUNGIBILE)
    }
    throw new MagazzinoFbErrore(0, NON_RAGGIUNGIBILE)
  }
}

/**
 * Esegue un'azione del magazzino ristorazione di Op. `null` = azienda non collegata a Op.
 * Le azioni che modificano tornano sempre un `Esito` (anche con `success: false`): lo gestisce il chiamante.
 */
export async function magazzinoFbOp<A extends NomeAzione>(azione: A, dati: DatiAzione<A>): Promise<RispostaAzione<A> | null> {
  if (CLIENT_FINTO) {
    const { eseguiFinto } = await import('./clientFinto')
    return eseguiFinto(azione, dati)
  }
  return viaPortal<RispostaAzione<A>>(azione, dati as object)
}

/** Come `magazzinoFbOp`, ma per le pagine già aperte: l'azienda è collegata, un `null` è un errore. */
export async function eseguiMag<A extends NomeAzione>(azione: A, dati: DatiAzione<A>): Promise<RispostaAzione<A>> {
  const r = await magazzinoFbOp(azione, dati)
  if (r === null) throw new MagazzinoFbErrore(404, 'Il magazzino della ristorazione non è attivo per la tua azienda.')
  return r
}

/** Esito di un'azione che modifica: `duplicato` vale come successo (era un "Riprova"). */
export const riuscito = (e: Esito) => e.success || e.duplicato

/** Chiave anti-doppioni: generata al primo tentativo e riusata identica nei "Riprova". */
export function nuovaIdOperazione(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Messaggio di un errore qualsiasi, per toast e riquadri. */
export const messaggioErrore = (e: unknown) => (e instanceof MagazzinoFbErrore ? e.message : NON_RAGGIUNGIBILE)
