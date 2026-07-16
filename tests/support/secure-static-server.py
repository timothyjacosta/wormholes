#!/usr/bin/env python3
"""Serve the Wormholes test build with its production security headers."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

TESTS_DIR = Path(__file__).resolve().parents[1]
APP_ROOT = TESTS_DIR.parent
PORT = int(os.environ.get("PORT", "4173"))


def read_headers():
    headers = []
    for raw in (APP_ROOT / "_headers").read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line == "/*" or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        headers.append((name.strip(), value.strip()))
    return headers


SECURITY_HEADERS = read_headers()


class WormholesHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        for name, value in SECURITY_HEADERS:
            self.send_header(name, value)
        super().end_headers()


if __name__ == "__main__":
    os.chdir(APP_ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), WormholesHandler)
    print(f"Serving Wormholes with security headers on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()
