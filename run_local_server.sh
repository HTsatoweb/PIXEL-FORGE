#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to start the local server." >&2
  exit 1
fi
echo "PIXEL FORGE: http://localhost:8000/"
echo "For another device on the same Wi-Fi, use this computer's LAN IP on port 8000."
echo "Security headers are enabled. Keep this terminal open; press Ctrl+C to stop."
exec python3 server.py
