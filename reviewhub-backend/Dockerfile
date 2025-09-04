# reviewhub-backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Ensure unbuffered logs (so Render shows them live)
ENV PYTHONUNBUFFERED=1
# So `flask db upgrade` knows where the app is (and flask CLI exists)
ENV FLASK_APP=app_enhanced.py

# Expose (Render sets $PORT at runtime)
EXPOSE 5000

# If migrations/ exists, run them; else create tables once, then start Gunicorn
CMD ["sh", "-c", "if [ -d migrations ]; then echo 'Running Alembic migrations...'; flask db upgrade; else echo 'No migrations/ folder — creating tables via SQLAlchemy...'; python -c \"from app_enhanced import app, db; from contextlib import closing; ctx=app.app_context(); ctx.push(); db.create_all(); print('db.create_all() complete'); ctx.pop()\"; fi && gunicorn -w 2 -k gthread -b 0.0.0.0:${PORT:-5000} app_enhanced:app --timeout 120 --graceful-timeout 30 --log-level info"]
