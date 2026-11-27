#!/usr/bin/env python3
"""Local PIXEL FORGE server with baseline browser security headers."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; "
    "font-src 'self' data:; "
    "connect-src 'self'; "
    "worker-src 'self' blob:; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)

class PixelForgeHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
        self.send_header('X-Frame-Options', 'DENY')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Keep a conventional local-server log without request body or file contents.
        super().log_message(fmt, *args)

if __name__ == '__main__':
    os.chdir(ROOT)
    host, port = '0.0.0.0', 8000
    print(f'PIXEL FORGE STUDIO: http://localhost:{port}/')
    print(f'Phone on the same Wi-Fi: http://<PC-LAN-IP>:{port}/')
    print('Security headers enabled. Press Ctrl+C to stop.')
    ThreadingHTTPServer((host, port), PixelForgeHandler).serve_forever()
