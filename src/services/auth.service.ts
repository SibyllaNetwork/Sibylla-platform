/**
 * Auth contro il proxy ASP.NET Core in `Portal/SibyllaApiProxy/`.
 *
 * Endpoint:
 *  - POST {BASE_URL}/Auth/signin   body { email, pw, app_code, latitude, longitude }
 *  - POST {BASE_URL}/login/signout (deprecato, lascio fallback per compatibilità)
 *
 * Il proxy esegue lui SHA-256 sulla password (`Criptografy.HashPassword`)
 * prima di chiamare la API Sibylla, quindi qui la mandiamo in chiaro su HTTPS
 * (in dev sopra HTTP localhost).
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5289';
const APP_CODE = process.env.REACT_APP_APP_CODE || 'sibylla-platform';
const TOKEN_KEY = 'sibylla_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

interface SigninPayload {
  email: string;
  pw: string;
  app_code: string;
  latitude?: number;
  longitude?: number;
}

interface SigninResponse {
  /** Il proxy ritorna `Ok(ContentResult)`; il vero JWT è in `content`. */
  content?: string;
  contentType?: string;
  statusCode?: number;
}

function extractToken(payload: unknown): string {
  if (typeof payload === 'string') return payload.replace(/^"|"$/g, '');
  if (payload && typeof payload === 'object') {
    const obj = payload as SigninResponse & { token?: string };
    if (typeof obj.content === 'string' && obj.content.length > 0) {
      return obj.content.replace(/^"|"$/g, '');
    }
    if (typeof obj.token === 'string') return obj.token;
  }
  throw new Error('Token non presente nella risposta del server');
}

export async function login(username: string, password: string): Promise<string> {
  const body: SigninPayload = {
    email: username,
    pw: password,
    app_code: APP_CODE,
  };
  const res = await fetch(`${BASE_URL}/Auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Credenziali non valide${text ? ` — ${text}` : ''}`);
  }
  const contentType = res.headers.get('Content-Type') ?? '';
  let parsed: unknown;
  if (contentType.includes('application/json')) {
    parsed = await res.json();
  } else {
    parsed = await res.text();
  }
  const token = extractToken(parsed);
  saveToken(token);
  return token;
}

export async function logout(): Promise<void> {
  removeToken();
  // Il proxy non espone ancora un endpoint logout; il client lo dimentica.
}
