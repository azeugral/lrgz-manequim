"""Servidor local da auditoria do provador: serve o repo (como o http.server) e grava as folhas de contato.
POST /_salva?n=<nome>.png com o PNG no corpo -> _auditoria/<nome>.png
Uso: python tools/auditoria_servidor.py 8792 (serve a raiz do repo)."""
import os, sys, re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PASTA = "_auditoria"


class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/_salva":
            self.send_error(404); return
        n = re.sub(r"[^a-z0-9_.-]", "", parse_qs(u.query).get("n", ["folha.png"])[0].lower()) or "folha.png"
        dados = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        os.makedirs(PASTA, exist_ok=True)
        open(os.path.join(PASTA, n), "wb").write(dados)
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")


porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8792
os.chdir(sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ThreadingHTTPServer(("127.0.0.1", porta), H).serve_forever()
