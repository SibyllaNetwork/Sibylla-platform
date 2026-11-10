// ─── Magazzino della Ristorazione: client verso Op ───────────────────────────
//  Una sola funzione per tutte le azioni del § 8 della scheda
//  sibylla-op/docs/integrazione-sibylla/17-magazzino-ristorazione.md.
//
//  Ordine, come la BI (leggiBiOp) e la configurazione dell'App Op!:
//   1. in sviluppo, il client finto (§ B5.3), salvo REACT_APP_MAGAZZINO_FB_FINTO=0;
//   2. la rotta demo di Op.Api per le aziende demo (§ B5.2), senza firma;
//   3. il Portal, `POST OpApp/magazzinoFb/Esegui`, che firma e inoltra a Op.
//  I dati stanno solo in Op: qui niente copie, niente calcoli.

import { apiFetchSibylla, ApiError } from '../../../../../services/api'
import { OpApiError, opPostGrezzo, type StrutturaOp } from '../../../../appop/opApi'
import type { DatiAzione, Esito, NomeAzione, RispostaAzione } from './tipi'

/** Errore da mostrare all'utente: `detail` di Op/Portal già in italiano. */
export class MagazzinoFbErrore extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export const NON_RAGGIUNGIBILE = 'Magazzino di Op non raggiungibile.'

/** Il client finto si usa solo nella build di sviluppo: mai in produzione. */
export const CLIENT_FINTO = process.env.NODE_ENV === 'development' && process.env.REACT_APP_MAGAZZINO_FB_FINTO !== '0'

// La rotta demo vuole la struttura di Platform (id e nome): la imposta la pagina che apre il magazzino.
let strutturaDemo: StrutturaOp | null = null
export const impostaStrutturaDemo = (s: StrutturaOp | null) => { strutturaDemo = s }

// Autore e livello li mette il Portal dal token; sulla rotta demo li manda la pagina (§ B5.2).
const AUTORE_DEMO = 'Utente demo'

const detailDi = (body: unknown): string | null => {
  if (body && typeof body === 'object') {
    const b = body as { detail?: unknown; title?: unknown }
    if (typeof b.detail === 'string') return b.detail
    if (typeof b.title === 'string') return b.title
  }
  return null
}

type Esito3<T> = { ok: true; valore: T | null } | { ok: false }

/** Rotta demo. `{ ok: false }` = non è un'azienda demo o Op non risponde: si passa al Portal. */
async function viaDemo<T>(azione: string, dati: object): Promise<Esito3<T>> {
  const p = new URLSearchParams()
  if (strutturaDemo) { p.set('struttura', String(strutturaDemo.id)); p.set('nome', strutturaDemo.nome) }
  let res: Response
  try {
    res = await opPostGrezzo(`/admin/collegata/magazzino-ristorazione?${p}`, { azione, autore: AUTORE_DEMO, gestore: true, dati })
  } catch (e) {
    if (e instanceof OpApiError) return { ok: false }
    throw e
  }
  const text = await res.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = null }
  if (res.ok) return { ok: true, valore: body as T }
  // 404 con `title` = elemento mancante (§ 6); 404 senza corpo, rotta assente o "non collegata" = non è un'azienda demo.
  if (res.status === 404) {
    const b = body as { title?: unknown } | null
    if (b && typeof b.title === 'string') throw new MagazzinoFbErrore(404, b.title)
    return { ok: false }
  }
  if (res.status === 401) return { ok: false }
  throw new MagazzinoFbErrore(res.status, detailDi(body) ?? NON_RAGGIUNGIBILE)
}

async function viaPortal<T>(azione: string, dati: object): Promise<T | null> {
  try {
    return await apiFetchSibylla<T>('OpApp/magazzinoFb/Esegui', { method: 'POST', body: { azione, dati }, redirectOn401: false })
  } catch (e) {
    if (e instanceof ApiError) {
      const b = e.body as { collegata?: unknown } | null
      if (e.status === 404 && b && typeof b === 'object' && b.collegata === false) return null
      // 404 senza corpo = il Portal non espone ancora l'azione: "non raggiungibile", come un 502.
      throw new MagazzinoFbErrore(e.status, detailDi(e.body) ?? NON_RAGGIUNGIBILE)
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
  const demo = await viaDemo<RispostaAzione<A>>(azione, dati as object)
  if (demo.ok) return demo.valore
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
