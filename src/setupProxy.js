// Proxy di sviluppo (CRA): instrada le chiamate relative dell'Outlet Manager
// (/api/*) verso il backend Flask remoto, così la sub-app vendorizzata funziona
// same-origin senza CORS e senza modificarne il codice.
//
// La platform usa un backend ASSOLUTO (REACT_APP_API_URL → localhost:5289),
// quindi non usa /api in modo relativo: nessun conflitto.
//
// In PRODUZIONE replicare questo instradamento a livello di web server
// (nginx/host della platform): /api → backend Outlet, con iniezione del token SSO.
const { createProxyMiddleware } = require('http-proxy-middleware')

const OUTLET_BACKEND = process.env.OUTLET_PROXY_TARGET || 'https://outlet.sibyllanetwork.it'

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: OUTLET_BACKEND,
      changeOrigin: true,
      secure: true,
    }),
  )
}
