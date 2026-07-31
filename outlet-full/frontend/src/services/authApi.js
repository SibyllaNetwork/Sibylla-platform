const TOKEN_KEY = "outlet_token";

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear:    () => localStorage.removeItem(TOKEN_KEY),
};

const BASE = "";

async function authReq(method, path, data) {
  const token = authStorage.getToken();
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (data !== undefined) opts.body = JSON.stringify(data);
  const r = await fetch(BASE + path, opts);
  const json = await r.json();
  if (r.status === 401) {
    authStorage.clear();
    window.location.reload();
    throw new Error("Sessione scaduta");
  }
  if (!r.ok) throw new Error(json.error || `Errore ${r.status}`);
  return json;
}

export const authApi = {
  login:    (username, password) => authReq("POST", "/api/auth/login", { username, password }),
  logout:   () => authReq("POST", "/api/auth/logout"),
  me:       () => authReq("GET",  "/api/auth/me"),

  // Ruoli
  getRuoli:     ()         => authReq("GET",    "/api/ruoli?include_permessi=1"),
  getRuolo:     (id)       => authReq("GET",    `/api/ruoli/${id}`),
  createRuolo:  (d)        => authReq("POST",   "/api/ruoli", d),
  updateRuolo:  (id, d)    => authReq("PUT",    `/api/ruoli/${id}`, d),
  deleteRuolo:  (id)       => authReq("DELETE", `/api/ruoli/${id}`),
  getPagine:    ()         => authReq("GET",    "/api/pagine-sistema"),

  // Utenti
  getUtenti:       ()         => authReq("GET",    "/api/utenti"),
  createUtente:    (d)        => authReq("POST",   "/api/utenti", d),
  updateUtente:    (id, d)    => authReq("PUT",    `/api/utenti/${id}`, d),
  deleteUtente:    (id)       => authReq("DELETE", `/api/utenti/${id}`),
  resetPassword:   (id, pwd)  => authReq("POST",   `/api/utenti/${id}/reset-password`, { password: pwd }),
};
