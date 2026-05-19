/**
 * Client API condiviso verso `Portal/SibyllaApiProxy/`.
 *
 * - Inietta automaticamente `Authorization: Bearer <token>` se presente.
 * - Decodifica JSON (o restituisce text) e tira `ApiError` con `status` su !ok.
 * - Su 401, rimuove il token e ricarica la pagina (forza il login flow).
 */

import { getToken, removeToken } from './auth.service';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5289';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string
  ) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Default `true`. Per le rotte pubbliche (login) passare `false`. */
  authRequired?: boolean;
  /** Su 401, di default rimuoviamo il token e ricarichiamo. */
  redirectOn401?: boolean;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    body,
    headers,
    authRequired = true,
    redirectOn401 = true,
    ...rest
  } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      payload = body;
    } else {
      finalHeaders.set('Content-Type', 'application/json');
      payload = JSON.stringify(body);
    }
  }

  if (authRequired) {
    const token = getToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers: finalHeaders,
    body: payload,
  });

  if (res.status === 401 && redirectOn401) {
    // Forziamo il re-login solo se c'era davvero un token in localStorage
    // (sessione scaduta). In DEV bypass o utente mai loggato, lasciamo che
    // sia il chiamante a gestire l'errore con il proprio fallback — niente
    // reload loop sulla LoginPage.
    const hadToken = !!getToken();
    if (hadToken) {
      removeToken();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    throw new ApiError(401, null, 'Non autorizzato');
  }

  if (!res.ok) {
    let parsed: unknown = null;
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    throw new ApiError(res.status, parsed, `API ${res.status} su ${endpoint}`);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

/**
 * Helper per i controller del backend di dominio (`Portal/SibyllaApi/`)
 * inoltrati attraverso il catch-all proxy <c>/Sibylla/{**path}</c>.
 *
 * Esempio:
 *   apiFetchSibylla<ScadenzaDto[]>('scadenze/Get', { method: 'POST', body: filter })
 *
 * Equivale a:
 *   apiFetch<ScadenzaDto[]>('/Sibylla/scadenze/Get', { method: 'POST', body: filter })
 */
export function apiFetchSibylla<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const cleanPath = path.replace(/^\//, '');
  return apiFetch<T>(`/Sibylla/${cleanPath}`, options);
}

