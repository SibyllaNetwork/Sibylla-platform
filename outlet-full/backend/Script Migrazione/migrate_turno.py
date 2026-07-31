"""Migration: add turno_occupato_id and pagato columns to tavoli table"""
import sys
sys.path.insert(0, '.')
from app.database import engine
from sqlalchemy import text

cols = [
    ("turno_occupato_id",  "INTEGER"),
    ("pagato",             "INTEGER DEFAULT 0"),
    ("bloccato_data",      "TEXT"),
    ("bloccato_turno_id",  "INTEGER"),
]

# Extra migration for prenotazioni table
with engine.connect() as conn_pren:
    for col, typedef in [("tavolo_unito_id", "INTEGER")]:
        try:
            conn_pren.execute(text(f"ALTER TABLE prenotazioni ADD COLUMN {col} {typedef}"))
            conn_pren.commit()
            print(f"✅ prenotazioni.{col} added")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"⚠️  prenotazioni.{col} already exists")
            else:
                print(f"❌ prenotazioni.{col}: {e}")


with engine.connect() as conn:
    for col, typedef in cols:
        try:
            conn.execute(text(f"ALTER TABLE tavoli ADD COLUMN {col} {typedef}"))
            conn.commit()
            print(f"✅ Added column: {col}")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"⚠️  Already exists: {col}")
            else:
                print(f"❌ Error on {col}: {e}")

print("\nMigration complete.")
