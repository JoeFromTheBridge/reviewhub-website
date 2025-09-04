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
# Needed so `flask db upgrade` knows what to run
ENV FLASK_APP=app_enhanced.py

# Expose (Render sets $PORT at runtime)
EXPOSE 5000

# Run migrations, then start Gunicorn
CMD ["sh", "-c", "flask db upgrade && gunicorn -w 2 -k gthread -b 0.0.0.0:${PORT:-5000} app_enhanced:app --timeout 120 --graceful-timeout 30 --log-level info"]
