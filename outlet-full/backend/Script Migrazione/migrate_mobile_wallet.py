"""
Migration: create config_mobile_wallet table.
Run: venv\Scripts\python.exe migrate_mobile_wallet.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

with engine.connect() as conn:
    if "config_mobile_wallet" not in tables:
        conn.execute(text("""
            CREATE TABLE config_mobile_wallet (
                id                     INTEGER PRIMARY KEY AUTOINCREMENT,
                apple_enabled          BOOLEAN DEFAULT 0,
                apple_team_id          VARCHAR(20)  DEFAULT '',
                apple_pass_type_id     VARCHAR(200) DEFAULT '',
                apple_org_name         VARCHAR(200) DEFAULT '',
                apple_cert_pem         TEXT DEFAULT '',
                apple_key_pem          TEXT DEFAULT '',
                apple_key_password     VARCHAR(200) DEFAULT '',
                apple_wwdr_pem         TEXT DEFAULT '',
                google_enabled         BOOLEAN DEFAULT 0,
                google_issuer_id       VARCHAR(100) DEFAULT '',
                google_class_id        VARCHAR(200) DEFAULT '',
                google_service_account TEXT DEFAULT ''
            )"""))
        conn.execute(text("INSERT INTO config_mobile_wallet (id) VALUES (1)"))
        conn.commit()
        print("OK config_mobile_wallet created")
    else:
        print("i  config_mobile_wallet already exists")

print("Done. Restart Flask.")
