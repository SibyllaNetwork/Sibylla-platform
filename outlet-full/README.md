# 🍽️ Outlet Manager — v1.0

Sistema completo di gestione outlet per strutture alberghiere e ristorazione.
Sviluppato con **React 18** (frontend) + **Python Flask** (backend) + **SQLite** (database locale).

> ### ⚠️ Leggere prima: ruolo di questa cartella in `sibylla-platform`
>
> Questo è il **progetto originale**, conservato nel repo della platform come sorgente
> di verità del back-end e come riferimento del front-end. Dentro la platform:
>
> | Cartella | Stato |
> |---|---|
> | `backend/` | **In uso.** È il back-end della sezione Food & Beverage. Ci si lavora qui. |
> | `frontend/` | **Superato**, solo riferimento. Le pagine sono state ricreate in React dentro `src/modules/operation/Outlet/` della platform. |
>
> Quindi **non** si avvia `start.sh` (tirerebbe su anche il frontend Vite su :3000, in
> conflitto con la platform). Si avvia **solo il backend**, e come front-end si usa la
> platform col proxy `/api`:
>
> ```bash
> # 1. backend (Python 3.11 o 3.12 — NON 3.13/3.14)
> cd outlet-full/backend
> python3 -m venv venv && source venv/bin/activate
> pip install -r requirements.txt
> cp .env.example .env
> python -m flask --app app.main run --port 8000 --debug
>
> # 2. platform, con /api instradato al backend locale
> cd ../..
> OUTLET_PROXY_TARGET=http://localhost:8000 npm start
> ```
>
> `venv/`, `node_modules/`, `dist/`, `.env` e `*.db` **non** sono versionati: il database
> si rigenera vuoto al primo avvio (14 allergeni EU + 3 tipi menu + utente
> `admin` / `admin123`), `.env` si copia da `.env.example`.
>
> Contesto, debito noto, decisioni aperte e roadmap: **`../docs/food-beverage.md`**.

---

## ✅ Funzionalità incluse

### Sezione Operativa
| Pagina | Descrizione |
|--------|-------------|
| **Sala Ristorante** | Griglia tavoli con stati colorati, context menu rapido, statistiche sala in tempo reale |
| **Libro Prenotazioni** | Calendario + form prenotazione + timeline per turno |
| **Gestione Sala** | Interfaccia POS: categorie → voci → comanda → chiusura conto |

### Configurazione completa
| Pagina | Descrizione |
|--------|-------------|
| **Outlet** | Punti vendita (ristorante, bar, boutique...) |
| **Sale e Tavoli** | Sale per outlet + tavoli con colori rango |
| **Turni di Servizio** | Colazione / Pranzo / Cena con orari e copertura max |
| **Allergeni** | 14 allergeni EU pre-caricati + personalizzati |
| **Tipi Menu** | Food / Beverage / Cantina (categorizzazione macro) |
| **Categorie Menu** | Antipasti, Primi, Secondi, Dolci, Vini... con emoji e colore |
| **Categorie Cliente** | Ospiti hotel, esterni, VIP con % sconto default |
| **Voci Menu** | Multilingua IT/EN/DE/FR, allergeni, prezzi speciali per categoria cliente |
| **Menu del Giorno** | Composizione da voci esistenti, prezzo fisso o somma voci |

---

## 🚀 Avvio rapido

### Prerequisiti
- **Python 3.11+** (non usare Python 3.14 — usa 3.11 o 3.12)
- **Node.js 18+**
- Windows / macOS / Linux

### Windows — doppio click
```
start.bat
```

### macOS / Linux
```bash
chmod +x start.sh
./start.sh
```

### Accesso
- Frontend: **http://localhost:3000**
- Backend API: **http://localhost:8000**

---

## 📁 Struttura progetto

```
outlet-manager/
├── backend/
│   ├── app/
│   │   ├── main.py        ← Flask app + tutti gli endpoint REST
│   │   ├── models.py      ← Modelli SQLAlchemy (14 tabelle)
│   │   └── database.py    ← Configurazione SQLite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← Layout sidebar + routing
│   │   ├── pages/
│   │   │   ├── ConfigPages.jsx  ← 9 pagine di configurazione
│   │   │   └── OperativoPages.jsx ← Sala, Prenotazioni, Gestione
│   │   ├── components/
│   │   │   └── UI.jsx           ← Componenti riutilizzabili
│   │   └── services/
│   │       └── api.js           ← Chiamate REST verso Flask
│   └── package.json
├── start.bat          ← Avvio Windows
├── start.sh           ← Avvio macOS/Linux
├── docker-compose.yml ← Avvio via Docker
└── README.md
```

---

## 🗄️ Database (SQLite — file locale)

Il database viene creato automaticamente al primo avvio in:
```
backend/outlet_manager.db
```

**Tabelle create:**
- `outlets` — punti vendita
- `sale` — sale per outlet
- `tavoli` — tavoli per sala
- `ranghi` — gruppi camerieri
- `turni` — turni di servizio
- `allergeni` — 14 EU + custom
- `tipi_menu` — Food / Beverage / Cantina
- `categorie_menu` — Antipasti, Primi...
- `categorie_cliente` — Ospiti, esterni, VIP
- `voci_menu` — tutti gli articoli
- `prezzi_speciali` — prezzi per categoria cliente
- `menu_del_giorno` — menu giornalieri
- `prenotazioni` — prenotazioni ristorante
- `comande` + `righe_comanda` — ordini POS

**Dati pre-caricati al primo avvio:**
- 14 allergeni standard EU (codici A–N)
- 3 tipi menu: Food, Beverage, Cantina

---

## 🔌 API REST (integrazione con software esterno)

Tutti gli endpoint sono disponibili su `http://localhost:8000/api/`

```
GET/POST   /api/outlets
GET/POST   /api/outlets/<id>/sale
GET/POST   /api/sale/<id>/tavoli
PUT/PATCH  /api/tavoli/<id>
GET/POST   /api/turni
GET/POST   /api/allergeni
GET/POST   /api/tipi-menu
GET/POST   /api/categorie-menu
GET/POST   /api/categorie-cliente
GET/POST   /api/voci-menu
GET/POST   /api/menu-del-giorno
GET/POST   /api/prenotazioni
GET/POST   /api/comande
POST       /api/comande/<id>/chiudi
GET        /api/sala/<id>/stats
GET        /api/dashboard
```

---

## 🐳 Docker (opzionale)

```bash
docker-compose up --build
```
Frontend: http://localhost:3000
Backend: http://localhost:8000

---

## 🔮 Prossimi sviluppi (non inclusi)

- [ ] JWT Authentication / multi-utente
- [ ] Stampante fiscale (scontrino / fattura)
- [ ] KDS — Kitchen Display System via WebSocket
- [ ] Carta vini interattiva
- [ ] Integrazione PMS hotel (conto camera)
- [ ] Report fatturato giornaliero/mensile esportabile

---

## ⚠️ Note Python

**Usa Python 3.11 o 3.12.** Python 3.14 non è compatibile con SQLAlchemy.

Verifica versione:
```
python --version
```

Se hai più versioni installate, modifica `start.bat` sostituendo `python` con `py -3.11` o `py -3.12`.
