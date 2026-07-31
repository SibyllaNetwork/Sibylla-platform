"""
Patch: adds Apple Wallet + Google Wallet endpoints to main.py.
Run from backend directory:
  venv\Scripts\python.exe apply_mobile_wallet_patch.py
Safe to run multiple times (idempotent).
"""
import os, sys, ast, re

MAIN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'main.py')
if not os.path.exists(MAIN_PATH):
    print("ERROR: app/main.py not found"); sys.exit(1)

main = open(MAIN_PATH, encoding='utf-8').read()

if '/api/mobile-wallet-config' in main:
    print("Already patched."); sys.exit(0)

# --- Import ConfigMobileWallet ---
if 'ConfigMobileWallet' not in main:
    m = re.search(r'from \.models import \(', main)
    if m:
        end = main.find('\n)', m.start())
        before = main[m.start():end]
        last_line = [l for l in before.splitlines() if l.strip()][-1]
        if not last_line.rstrip().endswith(','):
            main = main.replace(last_line + '\n)', last_line.rstrip() + ',\n    ConfigMobileWallet\n)', 1)
        else:
            main = main[:end] + '\n    ConfigMobileWallet' + main[end:]
        print("  + ConfigMobileWallet imported")
    else:
        main = 'from app.models import ConfigMobileWallet\n' + main

code_lines = [
    '',
    '# -- Mobile Wallet (Apple + Google) ----------------------------------------',
    '',
    "@app.get('/api/mobile-wallet-config')",
    'def get_mobile_wallet_config():',
    '    db = get_db()',
    '    try:',
    '        cfg = db.get(ConfigMobileWallet, 1)',
    '        if not cfg:',
    '            cfg = ConfigMobileWallet(id=1); db.add(cfg); db.commit(); db.refresh(cfg)',
    '        return ok(cfg.to_dict())',
    '    finally: db.close()',
    '',
    '',
    "@app.put('/api/mobile-wallet-config')",
    'def update_mobile_wallet_config():',
    '    db = get_db()',
    '    try:',
    '        d = body()',
    '        cfg = db.get(ConfigMobileWallet, 1)',
    '        if not cfg:',
    '            cfg = ConfigMobileWallet(id=1); db.add(cfg)',
    '        text_fields = [',
    "            'apple_team_id','apple_pass_type_id','apple_org_name',",
    "            'apple_key_password','google_issuer_id','google_class_id',",
    "            'apple_enabled','google_enabled',",
    '        ]',
    '        for k in text_fields:',
    '            if k in d: setattr(cfg, k, d[k])',
    '        # PEM/JSON fields: only update if not placeholder',
    "        for k in ('apple_cert_pem','apple_key_pem','apple_wwdr_pem','google_service_account'):",
    "            if d.get(k) and d[k] != '***': setattr(cfg, k, d[k])",
    '        db.commit(); db.refresh(cfg)',
    '        return ok(cfg.to_dict())',
    '    except Exception as e: db.rollback(); return err(str(e))',
    '    finally: db.close()',
    '',
    '',
    "@app.get('/api/mobile-wallet/apple/<int:wid>')",
    'def generate_apple_pass(wid):',
    '    """Generate .pkpass file for an Apple Wallet pass."""',
    '    db = get_db()',
    '    try:',
    '        cfg = db.get(ConfigMobileWallet, 1)',
    '        if not cfg or not cfg.apple_enabled:',
    "            return err('Apple Wallet non configurato o non abilitato')",
    '        w = db.get(Wallet, wid)',
    "        if not w: return err('Wallet non trovato')",
    '        c = w.cliente',
    '        import zipfile, hashlib, json, io, tempfile, os',
    '        from cryptography.hazmat.primitives import hashes, serialization',
    '        from cryptography.hazmat.primitives.serialization import pkcs7',
    '        from cryptography import x509',
    '        # Build pass.json',
    '        saldo_str = "EUR %.2f" % (w.saldo or 0)',
    '        nome = ((c.nome + " " + (c.cognome or "")).strip()) if c else "Cliente"',
    '        pass_json = {',
    '            "formatVersion": 1,',
    '            "passTypeIdentifier": cfg.apple_pass_type_id,',
    '            "serialNumber": "wallet-" + str(w.id),',
    '            "teamIdentifier": cfg.apple_team_id,',
    '            "organizationName": cfg.apple_org_name or "Outlet Manager",',
    '            "description": "Wallet " + w.etichetta,',
    '            "foregroundColor": "rgb(255,255,255)",',
    '            "backgroundColor": "rgb(45,90,123)",',
    '            "labelColor": "rgb(200,220,240)",',
    '            "storeCard": {',
    '                "primaryFields": [{"key":"balance","label":"Saldo disponibile","value":saldo_str,"currencyCode":"EUR"}],',
    '                "secondaryFields": [{"key":"name","label":"Intestatario","value":nome}],',
    '                "auxiliaryFields": [{"key":"wallet","label":"Wallet","value":w.etichetta}],',
    '                "backFields": [{"key":"token","label":"Token","value":w.token}]',
    '            },',
    '            "barcodes": [{"message":w.token,"format":"PKBarcodeFormatQR","messageEncoding":"iso-8859-1","altText":"QR Wallet"}],',
    '        }',
    '        if w.data_scadenza:',
    '            pass_json["expirationDate"] = w.data_scadenza + "T23:59:59Z"',
    '        pass_json_bytes = json.dumps(pass_json, ensure_ascii=False).encode("utf-8")',
    '        # Create manifest (SHA1 hashes)',
    '        manifest = {"pass.json": hashlib.sha1(pass_json_bytes).hexdigest()}',
    '        # Minimal 1x1 transparent PNG for icon (required by Apple)',
    '        import base64',
    "        tiny_png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')",
    '        manifest["icon.png"] = hashlib.sha1(tiny_png).hexdigest()',
    '        manifest_bytes = json.dumps(manifest).encode("utf-8")',
    '        # Sign manifest with Apple certificate',
    '        cert = x509.load_pem_x509_certificate(cfg.apple_cert_pem.encode())',
    '        key  = serialization.load_pem_private_key(',
    '            cfg.apple_key_pem.encode(),',
    '            password=cfg.apple_key_password.encode() if cfg.apple_key_password else None',
    '        )',
    '        wwdr = x509.load_pem_x509_certificate(cfg.apple_wwdr_pem.encode())',
    '        signature = (',
    '            pkcs7.PKCS7SignatureBuilder()',
    '            .set_data(manifest_bytes)',
    '            .add_signer(cert, key, hashes.SHA256())',
    '            .add_certificate(wwdr)',
    '            .sign(serialization.Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature])',
    '        )',
    '        # Bundle into .pkpass (zip)',
    '        buf = io.BytesIO()',
    '        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:',
    '            zf.writestr("pass.json",    pass_json_bytes)',
    '            zf.writestr("manifest.json",manifest_bytes)',
    '            zf.writestr("signature",    signature)',
    '            zf.writestr("icon.png",     tiny_png)',
    '        buf.seek(0)',
    '        fname = "wallet-%d.pkpass" % w.id',
    '        from flask import Response',
    '        return Response(buf.getvalue(),',
    '            mimetype="application/vnd.apple.pkpass",',
    "            headers={'Content-Disposition': 'attachment; filename=' + fname})",
    '    except ImportError:',
    "        return err('Installa cryptography: pip install cryptography')",
    '    except Exception as e: return err(str(e))',
    '    finally: db.close()',
    '',
    '',
    "@app.get('/api/mobile-wallet/google/<int:wid>')",
    'def generate_google_wallet_url(wid):',
    '    """Generate Google Wallet save URL (JWT signed)."""',
    '    db = get_db()',
    '    try:',
    '        cfg = db.get(ConfigMobileWallet, 1)',
    '        if not cfg or not cfg.google_enabled:',
    "            return err('Google Wallet non configurato o non abilitato')",
    '        w = db.get(Wallet, wid)',
    "        if not w: return err('Wallet non trovato')",
    '        c = w.cliente',
    '        import json, time',
    '        try:',
    '            import jwt',
    '        except ImportError:',
    "            return err('Installa PyJWT: pip install PyJWT')",
    '        sa = json.loads(cfg.google_service_account)',
    '        nome = ((c.nome + " " + (c.cognome or "")).strip()) if c else "Cliente"',
    '        saldo_str = "EUR %.2f" % (w.saldo or 0)',
    '        issuer_id = cfg.google_issuer_id',
    '        class_id  = cfg.google_class_id or (issuer_id + ".wallet_class")',
    '        object_id = issuer_id + ".wallet_obj_" + str(w.id)',
    '        now = int(time.time())',
    '        # Generic pass object',
    '        generic_object = {',
    '            "id": object_id,',
    '            "classId": class_id,',
    '            "genericType": "GENERIC_TYPE_UNSPECIFIED",',
    '            "hexBackgroundColor": "#2d5a7b",',
    '            "logo": {"sourceUri": {"uri": "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=" + w.token}},',
    '            "cardTitle": {"defaultValue": {"language": "it", "value": "Wallet Digitale"}},',
    '            "subheader": {"defaultValue": {"language": "it", "value": nome}},',
    '            "header": {"defaultValue": {"language": "it", "value": w.etichetta}},',
    '            "textModulesData": [{"id":"saldo","header":"Saldo","body":saldo_str}],',
    '            "barcode": {"type":"QR_CODE","value":w.token,"alternateText":"QR Wallet"},',
    '            "state": "ACTIVE",',
    '        }',
    '        if w.data_scadenza:',
    '            generic_object["validTimeInterval"] = {"end": {"date": w.data_scadenza}}',
    '        payload = {',
    '            "iss": sa["client_email"],',
    '            "aud": "google",',
    '            "typ": "savetowallet",',
    '            "iat": now,',
    '            "payload": {"genericObjects": [generic_object]},',
    '            "origins": [],',
    '        }',
    '        token = jwt.encode(payload, sa["private_key"], algorithm="RS256")',
    '        save_url = "https://pay.google.com/gp/v/save/" + (token if isinstance(token,str) else token.decode())',
    '        return ok({"url": save_url})',
    '    except Exception as e: return err(str(e))',
    '    finally: db.close()',
    '',
    '',
]

code = '\n'.join(code_lines)

for marker in ['# -- Email Config', '# -- Clienti', '# -- Web Menu', '# -- Monitor KDS', '@app.get("/api/utenti")']:
    if marker in main:
        main = main.replace(marker, code + marker, 1)
        print('  + Mobile wallet endpoints added before:', marker[:40])
        break

try:
    ast.parse(main)
except SyntaxError as e:
    ls = main.splitlines()
    print(f'SYNTAX ERROR line {e.lineno}: {e.msg}')
    for i, l in enumerate(ls[max(0,e.lineno-3):e.lineno+3], e.lineno-2):
        print(f'  {i}: {l[:100]}')
    sys.exit(1)

open(MAIN_PATH, 'w', encoding='utf-8').write(main)
print(f'Done! {len(main.splitlines())} lines. Run migrate_mobile_wallet.py then restart.bat')
