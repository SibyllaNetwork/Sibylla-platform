#!/bin/bash
set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        OUTLET MANAGER  v1.0          ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ─── BACKEND ────────────────────────────────────────────────────────────────
echo "[1/4] Configurazione backend Python..."
cd backend

if [ ! -d venv ]; then
    python3 -m venv venv
    echo "  Virtualenv creato."
fi

source venv/bin/activate

echo "[2/4] Installazione dipendenze..."
pip install -q -r requirements.txt

if [ ! -f .env ]; then
    cp .env.example .env
    echo "  File .env creato da .env.example"
fi

echo "[3/4] Avvio Backend Flask su :8000 ..."
python -m flask --app app.main run --port 8000 --debug &
BACKEND_PID=$!
cd ..

# ─── FRONTEND ───────────────────────────────────────────────────────────────
echo "[4/4] Avvio Frontend React su :3000 ..."
cd frontend
if [ ! -d node_modules ]; then
    echo "  Prima installazione npm..."
    npm install
fi
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "  ✓ Avvio completato!"
echo "  ┌────────────────────────────────────────┐"
echo "  │  Backend  →  http://localhost:8000     │"
echo "  │  Frontend →  http://localhost:3000     │"
echo "  └────────────────────────────────────────┘"
echo ""
echo "  Premi Ctrl+C per fermare entrambi i servizi."

wait $BACKEND_PID $FRONTEND_PID
