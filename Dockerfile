# Multi-tier Flask Backend Dockerfile
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_PORT=5000 \
    FLASK_APP=app.app:app

# Set working directory
WORKDIR /app

# Install system dependencies (curl for healthcheck, build tools for mysqlclient/cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for enhanced security
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Set file permissions for the non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the Flask web port
EXPOSE 5000

# Container Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start Flask application using Gunicorn production WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "60", "--access-logfile", "-", "--error-logfile", "-", "app.app:app"]
