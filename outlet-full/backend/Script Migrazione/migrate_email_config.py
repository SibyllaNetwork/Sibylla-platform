"""
Migration: create config_email table.
Run: venv\Scripts\python.exe migrate_email_config.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

with engine.connect() as conn:
    if "config_email" not in tables:
        conn.execute(text("""
            CREATE TABLE config_email (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                smtp_host       VARCHAR(200) DEFAULT '',
                smtp_port       INTEGER      DEFAULT 587,
                smtp_user       VARCHAR(200) DEFAULT '',
                smtp_password   VARCHAR(500) DEFAULT '',
                smtp_from_email VARCHAR(200) DEFAULT '',
                smtp_from_name  VARCHAR(200) DEFAULT 'Outlet Manager',
                use_tls         BOOLEAN      DEFAULT 1,
                use_ssl         BOOLEAN      DEFAULT 0,
                attivo          BOOLEAN      DEFAULT 0
            )"""))
        # Insert default row (id=1)
        conn.execute(text("INSERT INTO config_email (id) VALUES (1)"))
        conn.commit()
        print("OK config_email created with default row")
    else:
        print("i  config_email already exists")

print("Done. Restart Flask.")
