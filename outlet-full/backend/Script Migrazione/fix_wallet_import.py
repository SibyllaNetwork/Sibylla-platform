"""
Fix definitivo: inietta l'import di Cliente/Wallet/WalletTransazione
direttamente prima della funzione create_cliente in main.py.
Esegui dalla cartella backend:
  venv\Scripts\python.exe fix_wallet_import.py
"""
import os, sys, ast

MAIN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'main.py')
if not os.path.exists(MAIN_PATH):
    print("ERRORE: app/main.py non trovato.")
    sys.exit(1)

main = open(MAIN_PATH, encoding='utf-8').read()
print(f"Letto: {len(main.splitlines())} righe")

IMPORT_LINE = 'from app.models import Cliente, Wallet, WalletTransazione'

# Already there at module level?
if IMPORT_LINE in main:
    print("Import gia' presente — controlla che Flask sia riavviato.")
    sys.exit(0)

# Check partial
if 'Cliente' in main:
    print("'Cliente' trovato nel file (forse import parziale).")

# Inject right before def create_cliente (guaranteed to be there)
TARGET = 'def create_cliente():'
if TARGET not in main:
    print("ERRORE: 'def create_cliente():' non trovato in main.py")
    print("Probabilmente apply_wallet_patch.py non e' stato eseguito.")
    print("Esegui prima: venv\\Scripts\\python.exe apply_wallet_patch.py")
    sys.exit(1)

# Insert import on the line before the function
main = main.replace(
    TARGET,
    IMPORT_LINE + '\n\n' + TARGET,
    1  # solo la prima occorrenza
)

try:
    ast.parse(main)
except SyntaxError as e:
    print(f"ERRORE SINTASSI riga {e.lineno}: {e.msg} — file NON salvato.")
    sys.exit(1)

open(MAIN_PATH, 'w', encoding='utf-8').write(main)
print(f"OK! Import aggiunto. File: {len(main.splitlines())} righe.")
print(">>> Esegui restart.bat <<<")
