"""
Patch: adds ConfigEmail endpoints to main.py.
Run from backend directory:
  venv\Scripts\python.exe apply_email_patch.py
"""
import os, sys, ast, re

MAIN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'main.py')
if not os.path.exists(MAIN_PATH):
    print("ERROR: app/main.py not found"); sys.exit(1)

main = open(MAIN_PATH, encoding='utf-8').read()

if '/api/email-config' in main:
    print("Already patched."); sys.exit(0)

# --- Add ConfigEmail import (handle no trailing comma on last import line) ---
if 'ConfigEmail' not in main:
    # Find the closing paren of the from .models import ( ... ) block
    idx_import = main.find('from .models import (')
    if idx_import >= 0:
        idx_close = main.find('\n)', idx_import)
        # Get the last non-empty line before the closing paren
        before_close = main[idx_import:idx_close]
        last_import_line = [l for l in before_close.splitlines() if l.strip()][-1]
        if not last_import_line.rstrip().endswith(','):
            # Add trailing comma to last import, then insert ConfigEmail
            old_last = last_import_line
            new_last  = last_import_line.rstrip() + ','
            main = main.replace(old_last + '\n)', new_last + '\n    ConfigEmail\n)', 1)
        else:
            main = main[:idx_close] + '\n    ConfigEmail' + main[idx_close:]
        print("  + ConfigEmail imported")
    else:
        main = 'from app.models import ConfigEmail\n' + main
        print("  + ConfigEmail standalone import")

# --- Build endpoints ---
email_lines = [
    '',
    '# -- Email Config -----------------------------------------------------------',
    '',
    "@app.get('/api/email-config')",
    'def get_email_config():',
    '    db = get_db()',
    '    try:',
    '        cfg = db.get(ConfigEmail, 1)',
    '        if not cfg:',
    '            cfg = ConfigEmail(id=1); db.add(cfg); db.commit(); db.refresh(cfg)',
    '        return ok(cfg.to_dict())',
    '    finally: db.close()',
    '',
    '',
    "@app.put('/api/email-config')",
    'def update_email_config():',
    '    db = get_db()',
    '    try:',
    '        d = body()',
    '        cfg = db.get(ConfigEmail, 1)',
    '        if not cfg:',
    '            cfg = ConfigEmail(id=1); db.add(cfg)',
    "        for k in ('smtp_host','smtp_port','smtp_user','smtp_from_email',",
    "                  'smtp_from_name','use_tls','use_ssl','attivo'):",
    '            if k in d: setattr(cfg, k, d[k])',
    "        if d.get('smtp_password') and d['smtp_password'] != '***':",
    "            cfg.smtp_password = d['smtp_password']",
    '        db.commit(); db.refresh(cfg)',
    '        return ok(cfg.to_dict())',
    '    except Exception as e: db.rollback(); return err(str(e))',
    '    finally: db.close()',
    '',
    '',
    'def _send_email(cfg, to_email, to_name, subject, html_body):',
    '    import smtplib',
    '    from email.mime.multipart import MIMEMultipart',
    '    from email.mime.text import MIMEText',
    "    msg = MIMEMultipart('alternative')",
    "    frm = (cfg.smtp_from_name or 'Outlet Manager') + ' <' + (cfg.smtp_from_email or '') + '>'",
    "    msg['From'] = frm",
    "    msg['To'] = (to_name + ' <' + to_email + '>') if to_name else to_email",
    "    msg['Subject'] = subject",
    "    msg.attach(MIMEText(html_body, 'html', 'utf-8'))",
    '    port = int(cfg.smtp_port or 587)',
    '    if cfg.use_ssl:',
    '        s = smtplib.SMTP_SSL(cfg.smtp_host, port, timeout=15)',
    '    else:',
    '        s = smtplib.SMTP(cfg.smtp_host, port, timeout=15)',
    '        if cfg.use_tls: s.starttls()',
    '    if cfg.smtp_user and cfg.smtp_password:',
    '        s.login(cfg.smtp_user, cfg.smtp_password)',
    '    s.sendmail(cfg.smtp_from_email, to_email, msg.as_string())',
    '    s.quit()',
    '',
    '',
    "@app.post('/api/email-config/test')",
    'def test_email():',
    '    db = get_db()',
    '    try:',
    '        cfg = db.get(ConfigEmail, 1)',
    "        if not cfg or not cfg.attivo: return err('Configurazione email non attiva')",
    '        d = body()',
    "        to = d.get('to_email') or cfg.smtp_from_email",
    '        html = (',
    '            "<html><body style=\'font-family:sans-serif;padding:20px\'>"',
    '            "<h2>Test Email Outlet Manager</h2>"',
    '            "<p>La configurazione SMTP funziona correttamente.</p>"',
    '            "</body></html>"',
    '        )',
    "        _send_email(cfg, to, '', 'Test Email - Outlet Manager', html)",
    "        return ok({'sent': True, 'to': to})",
    '    except Exception as e: return err(str(e))',
    '    finally: db.close()',
    '',
    '',
    "@app.post('/api/email-config/send-wallet')",
    'def send_wallet_email():',
    '    db = get_db()',
    '    try:',
    '        cfg = db.get(ConfigEmail, 1)',
    '        if not cfg or not cfg.attivo:',
    "            return err('Servizio email non configurato. Vai in Generali > Configurazione Email.')",
    '        d = body()',
    "        wid = d.get('wallet_id')",
    "        if not wid: return err('wallet_id obbligatorio')",
    '        w = db.get(Wallet, int(wid))',
    "        if not w: return err('Wallet non trovato')",
    '        c = w.cliente',
    "        if not c or not c.email: return err('Il cliente non ha email configurato')",
    '        qr_url = (',
    "            'https://api.qrserver.com/v1/create-qr-code/'",
    "            '?size=200x200&data=' + w.token + '&bgcolor=ffffff'",
    '        )',
    "        scad = ('Valido fino al: ' + w.data_scadenza + '<br>') if w.data_scadenza else ''",
    "        nome = (c.nome + ' ' + (c.cognome or '')).strip()",
    "        saldo_fmt = '%.2f' % (w.saldo or 0.0)",
    '        html = (',
    '            "<html><body style=\'font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px\'>"',
    '            "<div style=\'background:#2d5a7b;padding:20px;text-align:center\'>"',
    '            "<h1 style=\'color:white;margin:0\'>Wallet Digitale</h1></div>"',
    '            "<div style=\'background:#f8fafc;padding:24px;border:1px solid #e2e8f0\'>"',
    '            "<p>Gentile <b>" + nome + "</b>,</p>"',
    '            "<p>Il tuo wallet <b>" + w.etichetta + "</b> e attivo.</p>"',
    '            "<div style=\'text-align:center;margin:16px 0\'>"',
    '            "<img src=\'" + qr_url + "\' style=\'width:180px;height:180px\'/>"',
    '            "<div style=\'font-size:28px;font-weight:900;color:#2d5a7b\'>EUR " + saldo_fmt + "</div>"',
    '            "</div>"',
    '            "<p style=\'font-size:12px;color:#64748b\'>" + scad + "Mostra il QR al pagamento.</p>"',
    '            "</div></body></html>"',
    '        )',
    "        subj = 'Wallet ' + w.etichetta + ' - Saldo EUR ' + saldo_fmt",
    '        _send_email(cfg, c.email, nome, subj, html)',
    "        return ok({'sent': True, 'to': c.email})",
    '    except Exception as e: return err(str(e))',
    '    finally: db.close()',
    '',
    '',
]

email_code = '\n'.join(email_lines)

for marker in ['# -- Clienti', '# -- Web Menu', '# -- Monitor KDS', '@app.get("/api/utenti")']:
    if marker in main:
        main = main.replace(marker, email_code + marker, 1)
        print('  + Email endpoints added before:', marker[:40])
        break

try:
    ast.parse(main)
except SyntaxError as e:
    ls = main.splitlines()
    print(f'SYNTAX ERROR line {e.lineno}: {e.msg}')
    for i, l in enumerate(ls[max(0,e.lineno-3):e.lineno+2], e.lineno-2):
        print(f'  {i}: {l[:100]}')
    sys.exit(1)

open(MAIN_PATH, 'w', encoding='utf-8').write(main)
print(f'Done! {len(main.splitlines())} lines. Run migrate_email_config.py then restart.bat')
