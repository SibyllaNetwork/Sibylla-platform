@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  Correzione struttura per Vite...
echo.

:: ── 1. index.html va nella ROOT di frontend (non in public\) ────────────────
if exist "frontend\public\index.html" (
    echo [1] Sposto index.html da public\ alla root di frontend...
    copy /y "frontend\public\index.html" "frontend\index.html" >nul
)

:: ── 2. Aggiorna index.html con il tag script corretto per Vite ───────────────
echo [2] Scrivo index.html corretto per Vite...
(
echo ^<!DOCTYPE html^>
echo ^<html lang="it"^>
echo   ^<head^>
echo     ^<meta charset="UTF-8" /^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0" /^>
echo     ^<title^>Outlet Manager^</title^>
echo   ^</head^>
echo   ^<body^>
echo     ^<div id="root"^>^</div^>
echo     ^<script type="module" src="/src/main.jsx"^>^</script^>
echo   ^</body^>
echo ^</html^>
) > "frontend\index.html"

:: ── 3. Crea main.jsx in src\ (entry point Vite) ─────────────────────────────
echo [3] Creo frontend\src\main.jsx ...
(
echo import React from "react";
echo import ReactDOM from "react-dom/client";
echo import "./styles/global.css";
echo import App from "./App";
echo.
echo ReactDOM.createRoot^(document.getElementById^("root"^)^).render^(
echo   ^<React.StrictMode^>
echo     ^<App /^>
echo   ^</React.StrictMode^>
echo ^);
) > "frontend\src\main.jsx"

:: ── 4. Rimuovi vecchio index.js se esiste ───────────────────────────────────
if exist "frontend\src\index.js" (
    echo [4] Rimuovo il vecchio src\index.js...
    del "frontend\src\index.js"
)

:: ── 5. Rimuovi .env del frontend se esiste (era per react-scripts) ──────────
if exist "frontend\.env" (
    echo [5] Rimuovo frontend\.env ^(non serve con Vite^)...
    del "frontend\.env"
)

:: ── 6. Scrivi vite.config.js ─────────────────────────────────────────────────
echo [6] Scrivo vite.config.js...
(
echo import { defineConfig } from 'vite'
echo import react from '@vitejs/plugin-react'
echo.
echo export default defineConfig^({
echo   plugins: [react^(^)],
echo   server: {
echo     port: 3000,
echo     open: true,
echo     proxy: {
echo       '/api': {
echo         target: 'http://localhost:8000',
echo         changeOrigin: true,
echo       }
echo     }
echo   }
echo }^)
) > "frontend\vite.config.js"

:: ── 7. Scrivi package.json Vite ──────────────────────────────────────────────
echo [7] Scrivo package.json con Vite...
(
echo {
echo   "name": "outlet-manager",
echo   "version": "1.0.0",
echo   "private": true,
echo   "type": "module",
echo   "dependencies": {
echo     "react": "^18.3.1",
echo     "react-dom": "^18.3.1"
echo   },
echo   "devDependencies": {
echo     "@vitejs/plugin-react": "^4.3.1",
echo     "vite": "^5.4.2"
echo   },
echo   "scripts": {
echo     "start": "vite --port 3000 --open",
echo     "build": "vite build",
echo     "preview": "vite preview"
echo   }
echo }
) > "frontend\package.json"

:: ── 8. Cancella node_modules per reinstallazione pulita ─────────────────────
if exist "frontend\node_modules" (
    echo [8] Cancello node_modules ^(reinstallazione pulita^)...
    rmdir /s /q "frontend\node_modules"
)

echo.
echo  ✓ Struttura corretta!
echo.
echo  Ora lancia start.bat per avviare il progetto.
echo  ^(la prima volta npm install scarica Vite — circa 30 secondi^)
echo.
pause