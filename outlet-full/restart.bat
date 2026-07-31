@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     OUTLET MANAGER — Riavvio Rapido      ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Chiudi eventuali istanze precedenti ─────────────────────────────────────
echo [*] Chiudo processi precedenti...
taskkill /f /fi "WINDOWTITLE eq Outlet Manager — Backend*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Outlet Manager — Frontend*" >nul 2>&1

:: Attendi che si chiudano
timeout /t 2 /nobreak >nul

:: ── Verifica che il venv esista ─────────────────────────────────────────────
if not exist "backend\venv\Scripts\activate.bat" (
    echo  ERRORE: virtualenv non trovato.
    echo  Esegui start.bat la prima volta per creare l'ambiente.
    pause & exit /b 1
)

:: ── Backend ──────────────────────────────────────────────────────────────────
echo [1] Avvio Backend Flask su http://localhost:8000 ...
start "Outlet Manager — Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python -m flask --app app.main run --port 8000 --debug"

:: Pausa breve per dare tempo al backend di partire prima del frontend
timeout /t 3 /nobreak >nul

:: ── Frontend ─────────────────────────────────────────────────────────────────
echo [2] Avvio Frontend React su http://localhost:3000 ...
start "Outlet Manager — Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo  ✓ Riavvio in corso...
echo  ┌────────────────────────────────────────────┐
echo  │  Backend  →  http://localhost:8000         │
echo  │  Frontend →  http://localhost:3000         │
echo  │                                            │
echo  │  Chiudi le finestre per fermare i servizi  │
echo  └────────────────────────────────────────────┘
echo.

:: Apri browser dopo 5 secondi
timeout /t 5 /nobreak >nul
start http://localhost:3000

exit
