"""
Migration: make comande.tavolo_id nullable (SQLite table recreation)
Run from backend\ directory: venv\Scripts\python.exe migrate_comande_nullable.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text, inspect

with engine.connect() as conn:
    # Check if already done (inspect columns)
    inspector = inspect(engine)
    cols = {c['name']: c for c in inspector.get_columns('comande')}
    
    # Check current nullable state of tavolo_id
    tav_nullable = cols.get('tavolo_id', {}).get('nullable', True)
    print(f"tavolo_id nullable: {tav_nullable}")
    
    if tav_nullable:
        print("✅ tavolo_id already nullable — no action needed")
    else:
        print("🔄 Recreating comande table with nullable tavolo_id...")
        try:
            # SQLite: recreate table to change NOT NULL constraint
            conn.execute(text("PRAGMA foreign_keys=OFF"))
            
            # Create new table with nullable tavolo_id
            conn.execute(text("""
                CREATE TABLE comande_new (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    tavolo_id       INTEGER REFERENCES tavoli(id),
                    turno_id        INTEGER,
                    outlet_id       INTEGER REFERENCES outlets(id),
                    cat_cliente_id  INTEGER REFERENCES categorie_cliente(id),
                    numero          VARCHAR(10),
                    status          VARCHAR(30) DEFAULT 'aperta',
                    coperti         INTEGER DEFAULT 0,
                    note            TEXT,
                    totale          FLOAT DEFAULT 0.0,
                    tipo_chiusura   VARCHAR(30),
                    created_at      DATETIME,
                    closed_at       DATETIME
                )
            """))
            
            # Copy all existing data
            conn.execute(text("""
                INSERT INTO comande_new 
                    (id, tavolo_id, turno_id, numero, status, coperti, note, 
                     totale, tipo_chiusura, created_at, closed_at)
                SELECT id, tavolo_id, turno_id, numero, status, coperti, note, 
                       totale, tipo_chiusura, created_at, closed_at
                FROM comande
            """))
            
            # Drop old, rename new
            conn.execute(text("DROP TABLE comande"))
            conn.execute(text("ALTER TABLE comande_new RENAME TO comande"))
            conn.execute(text("PRAGMA foreign_keys=ON"))
            conn.commit()
            print("✅ comande.tavolo_id is now nullable")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error: {e}")
            raise

print("\nDone. Restart Flask.")
