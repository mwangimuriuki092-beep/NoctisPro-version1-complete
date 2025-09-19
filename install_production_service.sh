#!/bin/bash
# Install NoctisPro PACS as a system service with auto-startup
# Run with: sudo ./install_production_service.sh

set -e

echo "🏥 Installing NoctisPro PACS Production Service"
echo "=============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root: sudo ./install_production_service.sh"
    exit 1
fi

# Get the current directory
CURRENT_DIR=$(pwd)
INSTALL_DIR="/opt/noctispro"

echo "📁 Setting up installation directory: $INSTALL_DIR"

# Create installation directory if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p $INSTALL_DIR
    echo "✅ Created $INSTALL_DIR"
fi

# Copy files to installation directory if not already there
if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
    echo "📋 Copying application files to $INSTALL_DIR..."
    cp -r . $INSTALL_DIR/
    cd $INSTALL_DIR
fi

# Set proper permissions
chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR

# Create systemd service file
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/noctispro.service << EOF
[Unit]
Description=NoctisPro PACS Medical Imaging System
Documentation=https://noctispro.com
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStartPre=-/usr/bin/docker compose down
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart
TimeoutStartSec=300
TimeoutStopSec=120

# Restart policy for medical system reliability
Restart=on-failure
RestartSec=30

# Security settings
User=$SUDO_USER
Group=docker

# Environment
Environment=COMPOSE_PROJECT_NAME=noctispro
Environment=COMPOSE_HTTP_TIMEOUT=300
EnvironmentFile=$INSTALL_DIR/.env.production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable service for auto-start
echo "⚡ Enabling auto-start on boot..."
systemctl enable noctispro.service

# Create management script
echo "🛠️ Creating management script..."
cat > /usr/local/bin/noctispro << 'EOF'
#!/bin/bash
# NoctisPro PACS Management Script

case "$1" in
    start)
        echo "🚀 Starting NoctisPro PACS..."
        systemctl start noctispro
        ;;
    stop)
        echo "⏹️ Stopping NoctisPro PACS..."
        systemctl stop noctispro
        ;;
    restart)
        echo "🔄 Restarting NoctisPro PACS..."
        systemctl restart noctispro
        ;;
    status)
        echo "📊 NoctisPro PACS Status:"
        systemctl status noctispro
        echo ""
        echo "🐳 Docker Services:"
        cd /opt/noctispro && docker compose ps
        ;;
    logs)
        echo "📋 NoctisPro PACS Logs:"
        cd /opt/noctispro && docker compose logs -f
        ;;
    backup)
        echo "💾 Creating manual backup..."
        cd /opt/noctispro && docker compose exec web python manage.py create_medical_backup --type manual
        ;;
    update)
        echo "🔄 Updating NoctisPro PACS..."
        cd /opt/noctispro
        git pull
        docker compose build
        systemctl restart noctispro
        ;;
    *)
        echo "🏥 NoctisPro PACS Management"
        echo "Usage: noctispro {start|stop|restart|status|logs|backup|update}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the PACS system"
        echo "  stop    - Stop the PACS system"
        echo "  restart - Restart the PACS system"
        echo "  status  - Show system status"
        echo "  logs    - Show system logs"
        echo "  backup  - Create manual backup"
        echo "  update  - Update system"
        ;;
esac
EOF

chmod +x /usr/local/bin/noctispro

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $SUDO_USER
    rm get-docker.sh
    echo "✅ Docker installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
fi

# Start the service
echo "🚀 Starting NoctisPro PACS service..."
systemctl start noctispro.service

# Wait for startup
echo "⏳ Waiting for services to start..."
sleep 30

# Check status
echo "🔍 Checking service status..."
systemctl status noctispro.service --no-pager

echo ""
echo "🎉 NoctisPro PACS Production Installation Complete!"
echo "================================================="
echo ""
echo "🌐 Access URLs:"
echo "   • Main Application: http://localhost"
echo "   • Admin Panel: http://localhost/admin-panel/"
echo "   • DICOM Viewer: http://localhost/dicom-viewer/"
echo ""
echo "👤 Default Login:"
echo "   • Username: admin"
echo "   • Password: admin123"
echo ""
echo "🔧 Management Commands:"
echo "   • noctispro start    - Start system"
echo "   • noctispro stop     - Stop system"
echo "   • noctispro restart  - Restart system"
echo "   • noctispro status   - Show status"
echo "   • noctispro logs     - Show logs"
echo "   • noctispro backup   - Manual backup"
echo ""
echo "⚡ Auto-Startup: ✅ ENABLED"
echo "   System will automatically start on boot"
echo ""
echo "🏥 Production Features:"
echo "   ✅ PostgreSQL Database"
echo "   ✅ Redis Caching"
echo "   ✅ Nginx Reverse Proxy"
echo "   ✅ Automated Backups"
echo "   ✅ AI Processing"
echo "   ✅ DICOM Receiver"
echo "   ✅ SSL Ready"
echo "   ✅ Medical Compliance"
echo ""
echo "🎯 Status: PRODUCTION READY & AUTO-STARTING"