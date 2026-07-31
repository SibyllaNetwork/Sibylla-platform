"""
Migration: create stampanti + voce_menu_stampanti tables
Run: venv\Scripts\python.exe migrate_stampanti.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

with engine.connect() as conn:
    # Stampanti table
    if "stampanti" not in tables:
        conn.execute(text("""
            CREATE TABLE stampanti (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nome        VARCHAR(100) NOT NULL,
                ip_address  VARCHAR(50),
                protocollo  VARCHAR(50) DEFAULT 'epson',
                tipo        VARCHAR(50) DEFAULT 'produzione',
                outlet_id   INTEGER REFERENCES outlets(id),
                attiva      BOOLEAN DEFAULT 1
            )
        """))
        conn.commit()
        print("✅ stampanti table created")
    else:
        print("ℹ️  stampanti already exists")

    # VoceMenuStampante table
    if "voce_menu_stampanti" not in tables:
        conn.execute(text("""
            CREATE TABLE voce_menu_stampanti (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                voce_id      INTEGER NOT NULL REFERENCES voci_menu(id) ON DELETE CASCADE,
                stampante_id INTEGER NOT NULL REFERENCES stampanti(id) ON DELETE CASCADE,
                outlet_id    INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
                contesto     VARCHAR(50) DEFAULT 'reparto_produzione'
            )
        """))
        conn.commit()
        print("✅ voce_menu_stampanti table created")
    else:
        print("ℹ️  voce_menu_stampanti already exists")

print("\nDone. Restart Flask.")
