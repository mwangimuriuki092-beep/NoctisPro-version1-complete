FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies for medical PACS
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libopenjp2-7 \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libcups2-dev \
    cups-common \
    git \
    curl \
    wget \
    netcat-openbsd \
    nginx \
    supervisor \
    cron \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Set work directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip wheel setuptools && \
    pip install --no-cache-dir -r requirements.txt || \
    pip install --no-cache-dir Django Pillow psycopg2-binary redis celery gunicorn \
    djangorestframework django-cors-headers channels daphne pydicom pynetdicom

# Development stage
FROM base AS development

# Install development dependencies
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

# Copy application code
COPY --chown=app:app . .

# Switch to app user
USER app

# Expose ports
EXPOSE 8000 11112

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Default command for development
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production stage
FROM base AS production

# Install production runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libjpeg62-turbo \
    libpng16-16 \
    libfreetype6 \
    nginx \
    supervisor \
    cron \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY --chown=app:app . .

# Create production directories
RUN mkdir -p /app/staticfiles /app/media /app/logs /app/backups \
    && chown -R app:app /app

# Create production environment
RUN echo "DJANGO_SETTINGS_MODULE=noctis_pro.settings" > /app/.env && \
    echo "DEBUG=False" >> /app/.env && \
    echo "USE_HTTPS=True" >> /app/.env

# Collect static files as root, then fix permissions
USER root
RUN python manage.py collectstatic --noinput && \
    chown -R app:app /app/staticfiles

# Create startup script
COPY docker/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh && chown app:app /app/startup.sh

# Switch to app user
USER app

# Expose ports
EXPOSE 8000 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Production startup script
CMD ["/app/startup.sh"]