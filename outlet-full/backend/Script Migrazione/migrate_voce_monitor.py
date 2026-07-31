"""
Migration: add colore_griglia to monitor, create voce_menu_monitor table
Run: venv\Scripts\python.exe migrate_voce_monitor.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

with engine.connect() as conn:
    # Add colore_griglia to monitor table
    cols = [c["name"] for c in inspector.get_columns("monitor")] if "monitor" in tables else []
    if "monitor" in tables and "colore_griglia" not in cols:
        conn.execute(text("ALTER TABLE monitor ADD COLUMN colore_griglia VARCHAR(20) DEFAULT '#2a2a3e'"))
        conn.commit()
        print("OK monitor.colore_griglia added")
    else:
        print("i  monitor.colore_griglia already present or table missing")

    # Create voce_menu_monitor table
    if "voce_menu_monitor" not in tables:
        conn.execute(text("""
            CREATE TABLE voce_menu_monitor (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                voce_id       INTEGER NOT NULL REFERENCES voci_menu(id) ON DELETE CASCADE,
                monitor_id    INTEGER REFERENCES monitor(id) ON DELETE CASCADE,
                tutti_monitor BOOLEAN DEFAULT 0
            )
        """))
        conn.commit()
        print("OK voce_menu_monitor table created")
    else:
        print("i  voce_menu_monitor already exists")

    # Add colore_header to monitor
    cols_m = [c["name"] for c in inspector.get_columns("monitor")] if "monitor" in tables else []
    if "monitor" in tables and "colore_header" not in cols_m:
        conn.execute(text("ALTER TABLE monitor ADD COLUMN colore_header VARCHAR(20) DEFAULT '#ffffff'"))
        conn.commit()
        print("OK monitor.colore_header added")
    else:
        print("i  monitor.colore_header already present or table missing")

print("Done. Restart Flask.")
