@echo off
chcp 65001 >nul

:: ── RIGA FONDAMENTALE: posiziona nella cartella del .bat ──────────────────
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        OUTLET MANAGER  v1.0          ║
echo  ╚══════════════════════════════════════╝
echo.

:: ─── BACKEND ────────────────────────────────────────────────────────────────
echo [1/4] Controllo ambiente Python 3.12...
if not exist "C:\Python312\python.exe" (
    echo  ERRORE: Python 3.12 non trovato in C:\Python312\
    echo  Controlla il percorso e aggiorna questo file.
    pause & exit /b 1
)
C:\Python312\python.exe --version

echo [2/4] Configurazione virtualenv backend...
cd backend
if not exist venv (
    C:\Python312\python.exe -m venv venv
    echo  Virtualenv creato.
)
call venv\Scripts\activate.bat

echo [3/4] Installazione dipendenze backend...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo  ERRORE durante l'installazione delle dipendenze!
    pause & exit /b 1
)

echo [4/4] Copia .env se non esiste...
if not exist .env copy .env.example .env >nul

echo.
echo  Avvio Backend Flask su http://localhost:8000 ...
start "Outlet_Manager — Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python -m flask --app app.main run --port 8000 --debug"
cd ..

:: ─── FRONTEND ───────────────────────────────────────────────────────────────
echo  Avvio Frontend React su http://localhost:3000 ...
cd frontend
if not exist node_modules (
    echo  Prima installazione npm — potrebbe richiedere qualche minuto...
    call npm install
    if errorlevel 1 (
        echo  ERRORE durante npm install!
        pause & exit /b 1
    )
)
start "Outlet_Manager — Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"
cd ..

echo.
echo  ✓ Avvio completato!
echo  ┌────────────────────────────────────────┐
echo  │  Backend  →  http://localhost:8000     │
echo  │  Frontend →  http://localhost:3000     │
echo  └────────────────────────────────────────┘
echo.
echo  Il browser si aprirà automaticamente tra qualche secondo.
pause