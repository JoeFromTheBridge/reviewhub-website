# reviewhub-backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Make sure FLASK_APP resolves
ENV FLASK_APP=app_enhanced.py

# Expose (Render will pass $PORT at runtime)
EXPOSE 5000

# Start the server on $PORT when provided, otherwise 5000 for local runs
CMD ["sh", "-c", "flask run --host=0.0.0.0 --port=${PORT:-5000}"]
