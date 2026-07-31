"""
Migration: create monitor table
Run: venv\Scripts\python.exe migrate_monitor.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

with engine.connect() as conn:
    if "monitor" not in tables:
        conn.execute(text("""
            CREATE TABLE monitor (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                nome          VARCHAR(100) NOT NULL,
                reparto       VARCHAR(50)  DEFAULT 'cucina',
                outlet_id     INTEGER REFERENCES outlets(id),
                slug          VARCHAR(100) UNIQUE,
                colore_sfondo VARCHAR(20)  DEFAULT '#1a1a2e',
                colore_testo  VARCHAR(20)  DEFAULT '#ffffff',
                attivo        BOOLEAN DEFAULT 1
            )
        """))
        conn.commit()
        print("OK monitor table created")
    else:
        print("i  monitor already exists")

print("Done. Restart Flask.")
