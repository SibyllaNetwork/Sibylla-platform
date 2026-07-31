"""
Migration: create clienti, wallets, wallet_transazioni tables.
Run: venv\Scripts\python.exe migrate_wallet.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

with engine.connect() as conn:
    if "clienti" not in tables:
        conn.execute(text("""
            CREATE TABLE clienti (
                id                   INTEGER PRIMARY KEY AUTOINCREMENT,
                nome                 VARCHAR(100) NOT NULL,
                cognome              VARCHAR(100) DEFAULT '',
                email                VARCHAR(200) DEFAULT '',
                telefono             VARCHAR(50)  DEFAULT '',
                note                 TEXT         DEFAULT '',
                categoria_cliente_id INTEGER REFERENCES categorie_cliente(id),
                created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
            )"""))
        conn.commit(); print("OK clienti")
    else: print("i  clienti exists")

    if "wallets" not in tables:
        conn.execute(text("""
            CREATE TABLE wallets (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id    INTEGER NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
                outlet_id     INTEGER REFERENCES outlets(id),
                etichetta     VARCHAR(100) DEFAULT 'Wallet',
                saldo         REAL DEFAULT 0.0,
                token         VARCHAR(64) UNIQUE,
                attivo        BOOLEAN DEFAULT 1,
                data_scadenza VARCHAR(10),
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            )"""))
        conn.commit(); print("OK wallets")
    else: print("i  wallets exists")

    if "wallet_transazioni" not in tables:
        conn.execute(text("""
            CREATE TABLE wallet_transazioni (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_id  INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
                tipo       VARCHAR(20) NOT NULL,
                importo    REAL NOT NULL,
                note       VARCHAR(500) DEFAULT '',
                comanda_id INTEGER REFERENCES comande(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )"""))
        conn.commit(); print("OK wallet_transazioni")
    else: print("i  wallet_transazioni exists")

print("Done. Restart Flask.")
