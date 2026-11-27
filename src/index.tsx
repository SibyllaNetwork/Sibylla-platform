import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.sass';
import App from './App';
import { KioskPage, isKioskPath } from './modules/hr/Timbrature/Kiosk';
import reportWebVitals from './reportWebVitals';
import './tailwind.css';
import './styles/catalyst-overrides.css'
import { eSchermoTotem, apriSitoNetwork } from './core/sitoNetwork'

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
// La navigazione interna dell'app non usa l'URL: l'unico indirizzo con una
// pagina propria è il kiosk di timbratura (/kiosk?p=<postazione>), aperto sul
// tablet o sul monitor all'ingresso del personale, senza sidenav né topbar.
// Su uno schermo da totem si va direttamente al sito Sibylla Network (totem)
if (!isKioskPath() && eSchermoTotem()) apriSitoNetwork(true)

root.render(
  <React.StrictMode>
    {isKioskPath() ? <KioskPage /> : <App />}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
