"""Migration: create web_menu and web_menu_voci tables.
Run: venv\\Scripts\\python.exe migrate_web_menu.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

with engine.connect() as conn:
    if "web_menu" not in tables:
        conn.execute(text("""
            CREATE TABLE web_menu (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                nome            VARCHAR(100) NOT NULL,
                slug            VARCHAR(100) UNIQUE,
                outlet_id       INTEGER REFERENCES outlets(id),
                titolo          VARCHAR(200),
                sottotitolo     VARCHAR(500),
                logo_url        TEXT,
                colore_primario VARCHAR(20) DEFAULT '#204769',
                colore_sfondo   VARCHAR(20) DEFAULT '#f8f9fa',
                colore_testo    VARCHAR(20) DEFAULT '#1a1a2a',
                colore_card     VARCHAR(20) DEFAULT '#ffffff',
                font_famiglia   VARCHAR(100) DEFAULT '''Inter'',''Segoe UI'',sans-serif',
                mostra_prezzi   BOOLEAN DEFAULT 1,
                mostra_allergeni BOOLEAN DEFAULT 1,
                nota_piede      TEXT,
                attivo          BOOLEAN DEFAULT 1
            )"""))
        conn.commit(); print("OK web_menu")
    else: print("i  web_menu exists")

    if "web_menu_voci" not in tables:
        conn.execute(text("""
            CREATE TABLE web_menu_voci (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                web_menu_id  INTEGER NOT NULL REFERENCES web_menu(id) ON DELETE CASCADE,
                voce_menu_id INTEGER REFERENCES voci_menu(id) ON DELETE SET NULL,
                categoria    VARCHAR(100) NOT NULL,
                nome         VARCHAR(200) NOT NULL,
                descrizione  TEXT,
                prezzo       REAL,
                allergeni    VARCHAR(500),
                etichette    VARCHAR(200),
                immagine_url TEXT,
                ordine       INTEGER DEFAULT 0
            )"""))
        conn.commit(); print("OK web_menu_voci")
    else: print("i  web_menu_voci exists")

    # Add validity and servizio to web_menu
    if "web_menu" in tables:
        wm_cols = [c["name"] for c in inspector.get_columns("web_menu")]
        for col, dflt in [("data_dal","NULL"),("data_al","NULL"),("servizio","'Tutti'")]:
            if col not in wm_cols:
                conn.execute(text(f"ALTER TABLE web_menu ADD COLUMN {col} VARCHAR(50) DEFAULT {dflt}"))
                conn.commit(); print(f"OK web_menu.{col}")
            else: print(f"i  web_menu.{col} exists")

    # Add nel_web_menu to voci_menu
    if "voci_menu" in tables:
        vm_cols = [c["name"] for c in inspector.get_columns("voci_menu")]
        if "nel_web_menu" not in vm_cols:
            conn.execute(text("ALTER TABLE voci_menu ADD COLUMN nel_web_menu BOOLEAN DEFAULT 0"))
            conn.commit(); print("OK voci_menu.nel_web_menu")
        else: print("i  voci_menu.nel_web_menu exists")

print("Done. Restart Flask.")
