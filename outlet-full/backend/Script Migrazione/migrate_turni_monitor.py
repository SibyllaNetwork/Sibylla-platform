"""
Migration: add inviato_monitor + turno_corrente to comande,
           turno_idx to righe_comanda
Run: venv\Scripts\python.exe migrate_turni_monitor.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)

def add_col(conn, table, col, definition):
    cols = [c["name"] for c in inspector.get_columns(table)]
    if col not in cols:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {definition}"))
        conn.commit()
        print(f"OK {table}.{col} added")
    else:
        print(f"i  {table}.{col} already exists")

with engine.connect() as conn:
    add_col(conn, "comande",      "inviato_monitor", "BOOLEAN DEFAULT 0")
    add_col(conn, "comande",      "turno_corrente",  "INTEGER DEFAULT 0")
    add_col(conn, "righe_comanda","turno_idx",       "INTEGER DEFAULT 0")

print("Done. Restart Flask.")
