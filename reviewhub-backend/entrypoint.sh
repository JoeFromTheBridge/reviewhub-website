#!/usr/bin/env bash
set -e

echo "[entrypoint] Starting…"

# Ensure Flask CLI knows which app to use (harmless if already set)
export FLASK_APP=${FLASK_APP:-app_enhanced.py}

# If a DATABASE_URL is provided, wait for the DB to accept TCP connections
if [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] DATABASE_URL detected; checking DB readiness…"
  python - <<'PY'
import os, sys, time, socket
from urllib.parse import urlparse

url = urlparse(os.environ["DATABASE_URL"])
host = url.hostname or "localhost"

DEFAULT_PORTS = {
    "postgres": 5432,
    "postgresql": 5432,
    "postgresql+psycopg2": 5432,
    "mysql": 3306,
    "mysql+pymysql": 3306,
}
port = url.port or DEFAULT_PORTS.get(url.scheme, 5432)

for i in range(60):  # ~2 minutes max
    try:
        with socket.create_connection((host, port), timeout=2):
            print("[entrypoint] DB is reachable.")
            sys.exit(0)
    except Exception:
        print(f"[entrypoint] Waiting for DB at {host}:{port} … {i+1}/60")
        time.sleep(2)

print("[entrypoint] DB not reachable in time.", file=sys.stderr)
sys.exit(1)
PY
fi

# Try Alembic/Flask-Migrate if configured; otherwise fall back
if command -v flask >/dev/null 2>&1; then
  echo "[entrypoint] Attempting Flask migrations (flask db upgrade)…"
  if flask db upgrade; then
    echo "[entrypoint] Migrations applied."
    MIGRATED=1
  else
    echo "[entrypoint] No migrations or migration step failed; will try db.create_all() fallback."
  fi
fi

# Fallback: create tables with SQLAlchemy if Alembic isn’t set up
if [ -z "$MIGRATED" ]; then
  python - <<'PY'
try:
    from app_enhanced import app, db
    with app.app_context():
        db.create_all()
        print("[entrypoint] db.create_all() completed.")
except Exception as e:
    print(f"[entrypoint] db.create_all() skipped or failed: {e}")
PY
fi

# Launch app
PORT_TO_USE=${PORT:-5000}
echo "[entrypoint] Launching application on port ${PORT_TO_USE}…"
exec flask run --host=0.0.0.0 --port="${PORT_TO_USE}"
