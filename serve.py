from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, threading, webbrowser

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
HOST, PORT = '127.0.0.1', 8765
url = f'http://{HOST}:{PORT}/'
server = ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
print('PIXEL FORGE STUDIO is running at', url)
print('Keep this window open while using the app. Press Ctrl+C to stop.')
threading.Timer(0.8, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nStopping PIXEL FORGE STUDIO...')
finally:
    server.server_close()
