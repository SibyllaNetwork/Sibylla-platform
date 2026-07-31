"""
Patch script: adds WebMenu endpoints to main.py WITHOUT duplicating.
Run from backend directory:
  venv\Scripts\python.exe apply_web_menu_patch.py
Safe to run multiple times (idempotent).
"""
import os, re, sys, ast

MAIN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'main.py')
if not os.path.exists(MAIN_PATH):
    print("ERROR: app/main.py not found. Run from the backend directory.")
    sys.exit(1)

main = open(MAIN_PATH, encoding='utf-8').read()
original_lines = len(main.splitlines())
changed = False

# ── 1. Add imports ────────────────────────────────────────────────────────────
if 'WebMenu' not in main:
    main = main.replace(
        'Stampante, VoceMenuStampante, Monitor, VoceMenuMonitor,',
        'Stampante, VoceMenuStampante, Monitor, VoceMenuMonitor,\n    WebMenu, WebMenuVoce,'
    )
    print("  + WebMenu/WebMenuVoce imported")
    changed = True
else:
    print("  . WebMenu already imported")

# ── 2. nel_web_menu in update_voce ───────────────────────────────────────────
if 'nel_web_menu' not in main:
    idx = main.find('def update_voce(vid):')
    if idx >= 0:
        end = main.find('\n@app.', idx + 1)
        fn = main[idx:end]
        last_commit = fn.rfind('db.commit()')
        if last_commit >= 0:
            new_fn = (fn[:last_commit] +
                      'if "nel_web_menu" in d: v.nel_web_menu = bool(d["nel_web_menu"])\n        ' +
                      fn[last_commit:])
            main = main[:idx] + new_fn + main[end:]
            print("  + nel_web_menu handling in update_voce")
            changed = True
else:
    print("  . nel_web_menu already present")

# ── 3. Web Menu API endpoints ─────────────────────────────────────────────────
if '/api/web-menu' not in main:
    WEB_MENU_CODE = (
        '\n'
        '# -- Web Menu ---------------------------------------------------------------\n'
        '\n'
        '@app.get("/api/web-menu")\n'
        'def get_web_menus():\n'
        '    db = get_db()\n'
        '    try:\n'
        '        q = db.query(WebMenu)\n'
        '        if request.args.get("outlet_id"):\n'
        '            q = q.filter(WebMenu.outlet_id==int(request.args["outlet_id"]))\n'
        '        return ok([m.to_dict() for m in q.all()])\n'
        '    finally: db.close()\n'
        '\n'
        '\n'
        '@app.post("/api/web-menu")\n'
        'def create_web_menu():\n'
        '    db = get_db()\n'
        '    try:\n'
        '        d = body()\n'
        '        nome = (d.get("nome") or "").strip()\n'
        '        if not nome: return err("Nome obbligatorio")\n'
        '        import re as _re, uuid\n'
        '        base = _re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")\n'
        '        slug = base + "-" + uuid.uuid4().hex[:6]\n'
        '        m = WebMenu(nome=nome, slug=slug,\n'
        '                    outlet_id=int(d["outlet_id"]) if d.get("outlet_id") else None,\n'
        '                    titolo=d.get("titolo",""), sottotitolo=d.get("sottotitolo",""),\n'
        '                    logo_url=d.get("logo_url",""),\n'
        '                    colore_primario=d.get("colore_primario","#204769"),\n'
        '                    colore_sfondo=d.get("colore_sfondo","#f8f9fa"),\n'
        '                    colore_testo=d.get("colore_testo","#1a1a2a"),\n'
        '                    colore_card=d.get("colore_card","#ffffff"),\n'
        '                    font_famiglia=d.get("font_famiglia","\'Inter\',\'Segoe UI\',sans-serif"),\n'
        '                    mostra_prezzi=bool(d.get("mostra_prezzi",True)),\n'
        '                    mostra_allergeni=bool(d.get("mostra_allergeni",True)),\n'
        '                    nota_piede=d.get("nota_piede",""),\n'
        '                    attivo=bool(d.get("attivo",True)),\n'
        '                    data_dal=d.get("data_dal"), data_al=d.get("data_al"),\n'
        '                    servizio=d.get("servizio","Tutti"))\n'
        '        db.add(m); db.commit(); db.refresh(m)\n'
        '        return ok(m.to_dict())\n'
        '    except Exception as e: db.rollback(); return err(str(e))\n'
        '    finally: db.close()\n'
        '\n'
        '\n'
        '@app.put("/api/web-menu/<int:mid>")\n'
        'def update_web_menu(mid):\n'
        '    db = get_db()\n'
        '    try:\n'
        '        m = db.get(WebMenu, mid)\n'
        '        if not m: return err("Non trovato", 404)\n'
        '        d = body()\n'
        '        for k in ("nome","titolo","sottotitolo","logo_url","colore_primario","colore_sfondo",\n'
        '                   "colore_testo","colore_card","font_famiglia","mostra_prezzi","mostra_allergeni",\n'
        '                   "nota_piede","attivo","data_dal","data_al","servizio"):\n'
        '            if k in d: setattr(m, k, d[k])\n'
        '        if "outlet_id" in d:\n'
        '            m.outlet_id = int(d["outlet_id"]) if d["outlet_id"] else None\n'
        '        if "voci" in d:\n'
        '            for v in m.voci: db.delete(v)\n'
        '            db.flush()\n'
        '            for i, vd in enumerate(d["voci"]):\n'
        '                db.add(WebMenuVoce(web_menu_id=mid,\n'
        '                    voce_menu_id=int(vd["voce_menu_id"]) if vd.get("voce_menu_id") else None,\n'
        '                    categoria=vd.get("categoria",""), nome=vd.get("nome",""),\n'
        '                    descrizione=vd.get("descrizione",""), prezzo=vd.get("prezzo"),\n'
        '                    allergeni=vd.get("allergeni",""), etichette=vd.get("etichette",""),\n'
        '                    immagine_url=vd.get("immagine_url",""), ordine=i))\n'
        '        db.commit(); db.refresh(m)\n'
        '        return ok(m.to_dict())\n'
        '    except Exception as e: db.rollback(); return err(str(e))\n'
        '    finally: db.close()\n'
        '\n'
        '\n'
        '@app.delete("/api/web-menu/<int:mid>")\n'
        'def delete_web_menu(mid):\n'
        '    db = get_db()\n'
        '    try:\n'
        '        m = db.get(WebMenu, mid)\n'
        '        if not m: return err("Non trovato", 404)\n'
        '        db.delete(m); db.commit()\n'
        '        return ok({"deleted": mid})\n'
        '    except Exception as e: db.rollback(); return err(str(e))\n'
        '    finally: db.close()\n'
        '\n'
        '\n'
        '@app.get("/menu/<slug>")\n'
        'def public_web_menu(slug):\n'
        '    db = get_db()\n'
        '    try:\n'
        '        m = db.query(WebMenu).filter(WebMenu.slug==slug, WebMenu.attivo==True).first()\n'
        '        if not m:\n'
        '            return ("<html><body style=\'font-family:sans-serif;text-align:center;padding:80px\'>"\n'
        '                    "<h2>Menu non trovato</h2></body></html>"), 404, {"Content-Type":"text/html"}\n'
        '        data = m.to_dict()\n'
        '        cp=data["colore_primario"]; cs=data["colore_sfondo"]\n'
        '        ct=data["colore_testo"];   cc=data["colore_card"]\n'
        '        ff=data["font_famiglia"]\n'
        '        cats = {}\n'
        '        for v in data["voci"]:\n'
        '            cats.setdefault(v["categoria"], []).append(v)\n'
        '        cat_html = ""\n'
        '        for cat, voci in cats.items():\n'
        '            items = ""\n'
        '            for v in voci:\n'
        '                price = ""\n'
        '                if data["mostra_prezzi"] and v.get("prezzo") is not None:\n'
        '                    price = \'<span class="price">\\u20ac%.2f</span>\' % v["prezzo"]\n'
        '                desc = (\'<p class="desc">%s</p>\' % v["descrizione"]) if v.get("descrizione") else ""\n'
        '                img  = (\'<img src="%s" alt="%s" class="item-img"/>\' % (v["immagine_url"], v["nome"])) if v.get("immagine_url") else ""\n'
        '                badges = ""\n'
        '                for tag in (v.get("etichette") or "").split(","):\n'
        '                    tag = tag.strip()\n'
        '                    if tag: badges += \'<span class="badge">%s</span>\' % tag\n'
        '                allg = ""\n'
        '                if data["mostra_allergeni"] and v.get("allergeni"):\n'
        '                    allg = \'<div class="allg">&#127806; %s</div>\' % v["allergeni"]\n'
        '                items += (\'<div class="item">%s<div class="item-body">\'\n'
        '                          \'<div class="item-top"><span class="item-name">%s</span>%s</div>\'\n'
        '                          \'%s<div class="item-foot">%s%s</div></div></div>\' % (img,v["nome"],price,desc,badges,allg))\n'
        '            cat_html += \'<div class="cat-section"><h2 class="cat-title">%s</h2><div class="items">%s</div></div>\' % (cat,items)\n'
        '        logo_html = (\'<img src="%s" alt="logo" class="logo"/>\' % data["logo_url"]) if data.get("logo_url") else ""\n'
        '        piede = (\'<div class="footer-note">%s</div>\' % data["nota_piede"]) if data.get("nota_piede") else ""\n'
        '        sub   = ("<p>%s</p>" % data["sottotitolo"]) if data.get("sottotitolo") else ""\n'
        '        title = data.get("titolo") or data["nome"]\n'
        '        css = ("*{margin:0;padding:0;box-sizing:border-box}"\n'
        '               "body{font-family:%s;background:%s;color:%s;min-height:100vh}"\n'
        '               ".hero{background:%s;color:#fff;padding:32px 20px 24px;text-align:center}"\n'
        '               ".logo{max-height:80px;max-width:200px;object-fit:contain;margin-bottom:14px;border-radius:8px}"\n'
        '               ".hero h1{font-size:clamp(22px,5vw,36px);font-weight:900;margin-bottom:6px}"\n'
        '               ".hero p{font-size:14px;opacity:.85;max-width:500px;margin:0 auto}"\n'
        '               ".menu-body{max-width:720px;margin:0 auto;padding:24px 16px 40px}"\n'
        '               ".cat-section{margin-bottom:32px}"\n'
        '               ".cat-title{font-size:20px;font-weight:800;color:%s;margin-bottom:14px;padding-bottom:6px;border-bottom:2.5px solid rgba(0,0,0,.12);text-transform:uppercase;letter-spacing:.5px}"\n'
        '               ".items{display:flex;flex-direction:column;gap:12px}"\n'
        '               ".item{background:%s;border-radius:14px;overflow:hidden;display:flex;box-shadow:0 1px 6px rgba(0,0,0,.07);border:1px solid rgba(0,0,0,.06)}"\n'
        '               ".item-img{width:110px;height:110px;object-fit:cover;flex-shrink:0}"\n'
        '               ".item-body{flex:1;padding:12px 14px;display:flex;flex-direction:column;gap:4px}"\n'
        '               ".item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}"\n'
        '               ".item-name{font-size:15px;font-weight:700;flex:1;line-height:1.3}"\n'
        '               ".price{font-size:16px;font-weight:900;color:%s;white-space:nowrap;flex-shrink:0}"\n'
        '               ".desc{font-size:12px;opacity:.7;line-height:1.5}"\n'
        '               ".item-foot{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:4px}"\n'
        '               ".badge{background:%s22;color:%s;border:1px solid %s33;border-radius:20px;font-size:10px;font-weight:700;padding:2px 8px}"\n'
        '               ".allg{font-size:10px;opacity:.5;font-style:italic}"\n'
        '               ".footer-note{text-align:center;font-size:11px;opacity:.6;padding:20px 16px 40px;line-height:1.7;border-top:1px solid rgba(0,0,0,.08);margin-top:16px}"\n'
        '               "@media(max-width:480px){.item-img{width:90px;height:90px}.item-name{font-size:14px}}"\n'
        '               ) % (ff,cs,ct,cp,cp,cc,cp,cp,cp,cp)\n'
        '        html = ("<!DOCTYPE html><html lang=\'it\'><head>"\n'
        '                "<meta charset=\'UTF-8\'><meta name=\'viewport\' content=\'width=device-width,initial-scale=1\'>"\n'
        '                "<title>%s</title><style>%s</style></head><body>"\n'
        '                "<div class=\'hero\'>%s<h1>%s</h1>%s</div>"\n'
        '                "<div class=\'menu-body\'>%s</div>%s</body></html>") % (title,css,logo_html,title,sub,cat_html,piede)\n'
        '        return html, 200, {"Content-Type":"text/html; charset=utf-8"}\n'
        '    finally: db.close()\n'
        '\n'
        '\n'
    )

    insert_before = '# ── Monitor KDS'
    if insert_before not in main:
        insert_before = '@app.get("/api/utenti")'
    main = main.replace(insert_before, WEB_MENU_CODE + insert_before, 1)
    print("  + Web Menu endpoints + /menu/<slug> added")
    changed = True
else:
    print("  . Web Menu endpoints already present")

# ── 4. data_dal/servizio in create_web_menu ───────────────────────────────────
if 'data_dal' not in main:
    main = main.replace(
        'attivo=bool(d.get("attivo",True)))',
        'attivo=bool(d.get("attivo",True)),\n'
        '                    data_dal=d.get("data_dal"), data_al=d.get("data_al"),\n'
        '                    servizio=d.get("servizio","Tutti"))',
        1
    )
    print("  + data_dal/al/servizio in create_web_menu")
    changed = True

# ── 5. Validate and save ──────────────────────────────────────────────────────
if not changed:
    print("Nothing to patch — already up to date.")
    sys.exit(0)

try:
    ast.parse(main)
except SyntaxError as e:
    print(f"SYNTAX ERROR at line {e.lineno}: {e.msg}")
    print("File NOT saved. Please report this error.")
    sys.exit(1)

open(MAIN_PATH, 'w', encoding='utf-8').write(main)
print(f"\nDone! main.py: {original_lines} -> {len(main.splitlines())} lines")
print("Next steps:")
print("  1. venv\\Scripts\\python.exe migrate_web_menu.py")
print("  2. restart.bat")
