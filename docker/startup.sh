#!/bin/bash
# Production startup script for NoctisPro PACS
set -e

echo "🚀 Starting NoctisPro PACS Production Server..."

# Wait for database
echo "⏳ Waiting for database..."
while ! nc -z db 5432; do
  sleep 1
done
echo "✅ Database is ready!"

# Wait for Redis
echo "⏳ Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 1
done
echo "✅ Redis is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
python manage.py migrate --noinput

# Create superuser if it doesn't exist
echo "👤 Setting up admin user..."
python manage.py shell << EOF
from accounts.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@noctispro.local', 'admin123', is_admin=True)
    print("✅ Admin user created: admin/admin123")
else:
    print("✅ Admin user already exists")
EOF

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Setup AI models
echo "🤖 Setting up AI models..."
python manage.py setup_working_ai_models || echo "⚠️ AI models setup skipped"

# Start backup scheduler in background
echo "💾 Starting backup scheduler..."
python manage.py start_backup_scheduler --daemon &

# Start cron for scheduled backups
echo "⏰ Starting cron for scheduled backups..."
service cron start

# Start Nginx
echo "🌐 Starting Nginx..."
nginx -g "daemon on;"

# Start the main application
echo "🏥 Starting NoctisPro PACS application..."
echo "🌐 Access at: http://localhost or https://localhost"
echo "👤 Admin login: admin / admin123"

# Start with Gunicorn for production
exec gunicorn noctis_pro.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class gevent \
    --worker-connections 1000 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --timeout 300 \
    --keep-alive 5 \
    --log-level info \
    --access-logfile /app/logs/access.log \
    --error-logfile /app/logs/error.log