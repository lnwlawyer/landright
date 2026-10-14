#!/usr/bin/env python3
"""Loopback-only UAT. Never proxies Google requests or serves checkout directories."""
import argparse
import json
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
FILES = {name: ROOT / name for name in (
    'manifest.json', 'privacy-policy.html', 'smt2.js', 'smt2/sheets-reader.mjs',
    'assets/landright.css', 'assets/chart.js',
)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=('synthetic', 'live'), default='synthetic')
    parser.add_argument('--port', type=int, default=8000)
    selection=parser.add_mutually_exclusive_group()
    selection.add_argument('--spreadsheet-id', help='Existing restricted UAT file containing synthetic data')
    selection.add_argument('--use-approved-source', action='store_true', help='Read the existing Restricted source confirmed by the administrator; browser-only, readonly')
    parser.add_argument('--oauth-client-id', help='Public Web OAuth client ID; defaults to repository config')
    args = parser.parse_args()
    original = (ROOT / 'smt2-config.example.js').read_text()
    production_id = re.search(r"spreadsheetId:\s*'([^']+)'", original).group(1)
    client_id = args.oauth_client_id or re.search(r"oauthClientId:\s*'([^']+)'", original).group(1)
    if not 1 <= args.port <= 65535:
        parser.error('Invalid port')
    if args.use_approved_source and args.mode != 'live':
        parser.error('--use-approved-source requires --mode live')
    if args.use_approved_source:
        args.spreadsheet_id = production_id
    if args.mode == 'live':
        if not args.spreadsheet_id or not re.fullmatch(r'[A-Za-z0-9_-]+', args.spreadsheet_id):
            parser.error('Live UAT requires --spreadsheet-id for an existing restricted synthetic UAT file')
        if args.spreadsheet_id == production_id and not args.use_approved_source:
            parser.error('Production spreadsheet ID is refused unless explicitly selecting --use-approved-source for readonly UAT')
        if not re.fullmatch(r'[0-9]+-[A-Za-z0-9]+\.apps\.googleusercontent\.com', client_id):
            parser.error('Invalid public OAuth client ID; never supply a client secret/token')
    config = {'oauthClientId': client_id if args.mode == 'live' else '000000000000-synthetic.apps.googleusercontent.com',
              'spreadsheetId': args.spreadsheet_id if args.mode == 'live' else 'LANDRIGHT_SYNTHETIC_UAT'}
    html = (ROOT / 'index.html').read_text()
    # No font/icon requests or public legacy CSV reads in either isolated mode.
    html = re.sub(r'\s*<link\b[^>]*https://[^>]*>', '', html)
    gis = '<script src="https://accounts.google.com/gsi/client" async defer></script>'
    html = html.replace(gis, '<script src="/uat-isolation.js"></script>' + (gis if args.mode == 'live' else '<script src="/uat-synthetic.js"></script>'))
    label = ('ข้อมูลจำลอง — ไม่ใช่ Google OAuth จริง' if args.mode == 'synthetic' else
             'OAuth จริง — อ่านแหล่ง Restricted ที่ผู้ดูแลยืนยัน แบบอ่านอย่างเดียว' if args.use_approved_source else
             'OAuth จริง — ใช้ไฟล์ UAT แยกเท่านั้น')
    html = html.replace('</head>', '<style>main{padding-bottom:64px!important}</style></head>')
    html = html.replace('<body class="bg-gray-50 font-thai">', '<body class="bg-gray-50 font-thai"><div id="uat-banner" role="status" style="position:fixed;bottom:0;right:0;z-index:9999;background:#fef3c7;color:#78350f;padding:6px;max-width:100%;font-size:12px">UAT: '+label+'</div>')
    dynamic = {
        '/': ('text/html', html.encode()), '/index.html': ('text/html', html.encode()),
        '/smt2-config.example.js': ('text/javascript', ('window.LANDRIGHT_SMT2_CONFIG='+json.dumps(config)+';').encode()),
        '/uat-isolation.js': ('text/javascript', (ROOT / 'uat/isolation.js').read_bytes()),
    }
    if args.mode == 'synthetic':
        dynamic['/uat-synthetic.js'] = ('text/javascript', (ROOT / 'uat/synthetic.js').read_bytes())
    script = "'self' 'unsafe-inline'" + (' https://accounts.google.com/gsi/client' if args.mode == 'live' else '')
    connect = "'self'" + (' https://sheets.googleapis.com https://accounts.google.com https://oauth2.googleapis.com' if args.mode == 'live' else '')
    frames = 'https://accounts.google.com' if args.mode == 'live' else "'none'"
    styles = "'self' 'unsafe-inline'" + (' https://accounts.google.com/gsi/style' if args.mode == 'live' else '')
    policy = f"default-src 'none'; script-src {script}; style-src {styles}; img-src 'self' data:; font-src 'self'; connect-src {connect}; frame-src {frames}; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # No query strings, request bodies, tokens or case data in access logs.

        def do_POST(self):
            self.send_error(405)

        def do_GET(self):
            if self.headers.get('Host', '').lower() not in (f'localhost:{args.port}', f'127.0.0.1:{args.port}'):
                self.send_error(403)
                return
            path = unquote(urlsplit(self.path).path)
            if path in dynamic:
                mime, body = dynamic[path]
            elif path.startswith('/') and path[1:] in FILES:
                file = FILES[path[1:]]
                mime, body = mimetypes.guess_type(str(file))[0] or 'application/octet-stream', file.read_bytes()
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', mime+'; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
            self.send_header('Content-Security-Policy', policy)
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'UAT mode: {args.mode}; loopback only; port {args.port}. Open index.html?view=smt2 on this machine.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
