"""Script di emergenza: pulisce tutti i link tavolo_unito_id orfani nel DB"""
import sys
sys.path.insert(0, '.')
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Leggi situazione attuale
    result = conn.execute(text(
        "SELECT id, numero, status, tavolo_unito_id FROM tavoli "
        "WHERE tavolo_unito_id IS NOT NULL ORDER BY numero"
    )).fetchall()
    
    print(f"Tavoli con tavolo_unito_id impostato: {len(result)}")
    for row in result:
        print(f"  T.{row[1]} (id={row[0]}) status={row[2]} → unito_a={row[3]}")
    
    # Pulisci TUTTI i link su tavoli disponibili
    r1 = conn.execute(text(
        "UPDATE tavoli SET tavolo_unito_id = NULL "
        "WHERE status = 'disponibile' AND tavolo_unito_id IS NOT NULL"
    ))
    conn.commit()
    print(f"\n✅ Ripristinati {r1.rowcount} tavoli disponibili (rimosso tavolo_unito_id)")
    
    # Verifica rimasti
    result2 = conn.execute(text(
        "SELECT id, numero, status, tavolo_unito_id FROM tavoli "
        "WHERE tavolo_unito_id IS NOT NULL ORDER BY numero"
    )).fetchall()
    print(f"Tavoli ancora con link: {len(result2)}")
    for row in result2:
        print(f"  T.{row[1]} status={row[2]} → {row[3]}")

print("\nDone.")
