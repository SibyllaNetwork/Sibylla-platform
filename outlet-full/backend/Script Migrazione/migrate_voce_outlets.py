"""Migration: voce_menu_outlets, prezzi_speciali.outlet_id, comande columns"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # 1. voce_menu_outlets
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS voce_menu_outlets (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                voce_id   INTEGER NOT NULL REFERENCES voci_menu(id)   ON DELETE CASCADE,
                outlet_id INTEGER NOT NULL REFERENCES outlets(id)      ON DELETE CASCADE
            )
        """))
        conn.commit()
        print("✅ voce_menu_outlets created")
    except Exception as e:
        print(f"⚠️  voce_menu_outlets: {e}")

    # 2. outlet_id on prezzi_speciali
    try:
        conn.execute(text("ALTER TABLE prezzi_speciali ADD COLUMN outlet_id INTEGER REFERENCES outlets(id) ON DELETE CASCADE"))
        conn.commit()
        print("✅ prezzi_speciali.outlet_id added")
    except Exception as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            print("⚠️  prezzi_speciali.outlet_id already exists")
        else:
            print(f"❌ prezzi_speciali.outlet_id: {e}")

    # 3. Make prezzi_speciali.categoria_cliente_id nullable (app-level enforcement for SQLite)
    print("ℹ️  prezzi_speciali.categoria_cliente_id nullable enforced at app level")

    # 4. outlet_id on comande (for outlets without tables)
    try:
        conn.execute(text("ALTER TABLE comande ADD COLUMN outlet_id INTEGER REFERENCES outlets(id)"))
        conn.commit()
        print("✅ comande.outlet_id added")
    except Exception as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            print("⚠️  comande.outlet_id already exists")
        else:
            print(f"❌ comande.outlet_id: {e}")

    # 5. cat_cliente_id on comande
    try:
        conn.execute(text("ALTER TABLE comande ADD COLUMN cat_cliente_id INTEGER REFERENCES categorie_cliente(id)"))
        conn.commit()
        print("✅ comande.cat_cliente_id added")
    except Exception as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            print("⚠️  comande.cat_cliente_id already exists")
        else:
            print(f"❌ comande.cat_cliente_id: {e}")

    # 6. tavolo_id is now nullable for new records (SQLite constraint not alterable)
    print("ℹ️  comande.tavolo_id nullable enforced at app level for new records")

    # 6-bis. ordine on voci_menu
    try:
        conn.execute(text("ALTER TABLE voci_menu ADD COLUMN ordine INTEGER DEFAULT 0"))
        conn.commit()
        print("✅ voci_menu.ordine added")
    except Exception as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            print("⚠️  voci_menu.ordine already exists")
        else:
            print(f"❌ voci_menu.ordine: {e}")

print("\nDone. Restart Flask.")
