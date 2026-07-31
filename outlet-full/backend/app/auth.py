from functools import wraps
from datetime import datetime
from flask import request, jsonify, g
from .database import get_db
from .models import Sessione, Utente


def get_current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    if not token:
        return None
    db = get_db()
    try:
        sess = db.query(Sessione).filter(
            Sessione.token == token,
            Sessione.expires_at > datetime.utcnow()
        ).first()
        if not sess:
            return None
        # lazy="joined" nei modelli carica ruolo+permessi automaticamente
        user = db.query(Utente).filter(Utente.id == sess.utente_id).first()
        if not user:
            return None
        # Forza il caricamento mentre la sessione e' ancora aperta
        _ = user.ruolo
        if user.ruolo:
            _ = list(user.ruolo.permessi)
        return user
    finally:
        db.close()


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user or not user.attivo:
            return jsonify({"error": "Non autenticato"}), 401
        g.user = user
        return f(*args, **kwargs)
    return wrapper


def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user or not user.attivo:
            return jsonify({"error": "Non autenticato"}), 401
        if not (user.ruolo and user.ruolo.is_admin):
            return jsonify({"error": "Permessi insufficienti"}), 403
        g.user = user
        return f(*args, **kwargs)
    return wrapper


def check_page_access(pagina):
    user = get_current_user()
    if not user:
        return "nascosta"
    if user.ruolo and user.ruolo.is_admin:
        return "completa"
    if not user.ruolo:
        return "nascosta"
    perm = next((p for p in user.ruolo.permessi if p.pagina == pagina), None)
    return perm.accesso if perm else "nascosta"