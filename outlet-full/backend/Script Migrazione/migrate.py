"""
Script di migrazione — aggiunge colonna is_vip alla tabella prenotazioni
Eseguire UNA SOLA VOLTA dalla cartella backend con il venv attivato:
  python migrate.py
"""
import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), "outlet_manager.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Controlla se la colonna esiste già
    cur.execute("PRAGMA table_info(prenotazioni)")
    cols = [row[1] for row in cur.fetchall()]
    print(f"Colonne attuali: {cols}")

    if "is_vip" not in cols:
        cur.execute("ALTER TABLE prenotazioni ADD COLUMN is_vip BOOLEAN DEFAULT 0")
        conn.commit()
        print("✅ Colonna is_vip aggiunta con successo")
    else:
        print("ℹ️  Colonna is_vip già presente — nessuna modifica")

    conn.close()

if __name__ == "__main__":
    migrate()
