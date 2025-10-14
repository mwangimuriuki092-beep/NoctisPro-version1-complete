# NoctisPro PACS - Complete System Guide

## Overview

NoctisPro PACS is a complete Picture Archiving and Communication System with:

- **Rust DICOM SCP Server**: High-performance DICOM receiver
- **Django Backend**: Web interface and REST API
- **PostgreSQL Database**: Metadata storage
- **Redis**: Caching and async task queue
- **Celery**: Background task processing
- **DICOM Viewer**: Advanced web-based medical image viewer

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   DICOM Modalities                       │
│              (CT, MR, X-Ray, Ultrasound)                │
└───────────────────┬─────────────────────────────────────┘
                    │ C-STORE (Port 11112)
                    ▼
┌─────────────────────────────────────────────────────────┐
│           Rust DICOM SCP Server                         │
│  - Receives DICOM files                                 │
│  - Extracts metadata                                     │
│  - Stores to filesystem & database                      │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                         │
│  - Patients, Studies, Series, Images                    │
│  - Metadata, Annotations, Reports                       │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Django Application                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Web Interface (Port 8000/443)                   │   │
│  │  - Study List & Search                           │   │
│  │  - DICOM Viewer                                  │   │
│  │  - Reports & AI Analysis                         │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  REST API                                        │   │
│  │  - Study/Series/Image endpoints                  │   │
│  │  - DICOM operations                              │   │
│  │  - Upload/Download                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                Redis + Celery                            │
│  - Background Tasks                                      │
│  - AI Analysis Processing                                │
│  - Report Generation                                     │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Development Mode

1. **Prerequisites**:
   ```bash
   - Docker & Docker Compose
   - Git
   ```

2. **Clone and Setup**:
   ```bash
   git clone <repository>
   cd noctispro
   ./start-dev.sh
   ```

3. **Access**:
   - Web Interface: http://localhost:8000
   - DICOM SCP: localhost:11112
   - Admin: http://localhost:8000/admin

4. **Default Login**:
   - Username: admin
   - Password: (create via `docker-compose exec django python manage.py createsuperuser`)

### Production Mode

1. **Prerequisites**:
   ```bash
   - Docker & Docker Compose
   - SSL Certificates (for HTTPS)
   - Domain name (optional)
   ```

2. **Configure Environment**:
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with your settings
   nano .env.prod
   ```

3. **SSL Certificates**:
   ```bash
   # Place your SSL certificates in:
   mkdir -p config/nginx/ssl
   cp /path/to/fullchain.pem config/nginx/ssl/
   cp /path/to/privkey.pem config/nginx/ssl/
   ```

4. **Start Production**:
   ```bash
   ./start-prod.sh
   ```

5. **Access**:
   - Web Interface: https://yourdomain.com
   - DICOM SCP: yourdomain.com:11112

## Configuration

### Environment Variables

#### Django Settings
```bash
DEBUG=false                              # Enable debug mode
SECRET_KEY=<random-50-chars>            # Django secret key
DATABASE_URL=postgresql://...            # PostgreSQL connection
REDIS_URL=redis://...                    # Redis connection
ALLOWED_HOSTS=domain1.com,domain2.com   # Allowed hosts
```

#### DICOM Settings
```bash
DICOM_SCP_HOST=localhost                # SCP server hostname
DICOM_SCP_PORT=11112                    # SCP server port
DICOM_SCP_AE_TITLE=RUST_SCP            # SCP AE Title
DICOM_SCU_AE_TITLE=DJANGO_SCU          # SCU AE Title
```

#### Deployment Settings
```bash
DEPLOYMENT_MODE=production              # local/production/tailnet
USE_HTTPS=true                          # Enable HTTPS
DOMAIN_NAME=yourdomain.com             # Your domain
TIME_ZONE=UTC                           # Timezone
```

### Rust SCP Server Configuration

Edit `dicom_scp_server/config.json`:

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 11112,
    "ae_title": "RUST_SCP",
    "max_pdu_length": 16384
  },
  "database": {
    "url": "postgresql://user:pass@host:5432/db",
    "max_connections": 10
  },
  "storage": {
    "base_path": "/var/pacs/storage",
    "organize_by_patient": true,
    "organize_by_study": true
  }
}
```

## DICOM Operations

### Sending DICOM Files

#### Using storescu (dcmtk)
```bash
# Install dcmtk
sudo apt-get install dcmtk

# Send single file
storescu -v localhost 11112 -aec RUST_SCP file.dcm

# Send directory
storescu -v localhost 11112 -aec RUST_SCP -r /path/to/dicom/
```

#### Using Python (pynetdicom)
```python
from pynetdicom import AE, StoragePresentationContexts
from pydicom import dcmread

ae = AE(ae_title='MY_SCU')
ae.requested_contexts = StoragePresentationContexts

assoc = ae.associate('localhost', 11112, ae_title='RUST_SCP')
if assoc.is_established:
    ds = dcmread('file.dcm')
    status = assoc.send_c_store(ds)
    assoc.release()
```

#### Via Web Interface
1. Navigate to http://localhost:8000/worklist/
2. Click "Upload DICOM"
3. Select files
4. Click "Upload"

### Viewing DICOM Images

1. **Navigate to Study List**:
   - Go to http://localhost:8000/worklist/

2. **Open Viewer**:
   - Click on any study
   - Viewer opens with all series

3. **Viewer Features**:
   - Window/Level adjustment
   - Zoom/Pan
   - Measurements (length, angle, area)
   - Annotations
   - MPR (Multiplanar Reconstruction)
   - 3D rendering (for CT)
   - Cine loop
   - Compare studies

## API Usage

### Authentication

```bash
# Get JWT token
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Use token
curl http://localhost:8000/api/studies/ \
  -H "Authorization: Bearer <token>"
```

### Endpoints

#### Get System Status
```bash
GET /dicom/api/system/status/
```

#### Get Study Data
```bash
GET /dicom/api/studies/<study_id>/
```

#### Get Series Images
```bash
GET /dicom/api/series/<series_id>/images/
```

#### Upload DICOM
```bash
POST /dicom/api/upload/
Content-Type: multipart/form-data
file: <dicom-file>
```

#### Test SCP Connection
```bash
POST /dicom/api/scp/test/
```

## Database Management

### Backups

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres noctis_pro > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres noctis_pro < backup.sql
```

### Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec django \
  python manage.py migrate

# Create migration
docker-compose -f docker-compose.prod.yml exec django \
  python manage.py makemigrations
```

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f django
docker-compose -f docker-compose.prod.yml logs -f dicom_scp
docker-compose -f docker-compose.prod.yml logs -f celery_worker
```

### Service Status

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check specific service
docker-compose -f docker-compose.prod.yml ps django
```

### System Statistics

Access the admin panel: http://localhost:8000/admin/

Or use the API:
```bash
GET /dicom/api/system/status/
```

## Troubleshooting

### DICOM SCP Not Receiving Files

1. **Check SCP is running**:
   ```bash
   docker-compose ps dicom_scp
   ```

2. **Test connection**:
   ```bash
   echoscu -v localhost 11112 -aec RUST_SCP
   ```

3. **Check logs**:
   ```bash
   docker-compose logs -f dicom_scp
   ```

4. **Verify firewall**:
   ```bash
   sudo ufw allow 11112/tcp
   ```

### Viewer Not Loading Images

1. **Check database connection**:
   ```bash
   docker-compose exec django python manage.py dbshell
   ```

2. **Verify files exist**:
   ```bash
   docker-compose exec django ls -la /app/media/dicom_files/
   ```

3. **Check browser console** for JavaScript errors

### Database Issues

1. **Reset database**:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

2. **Check connections**:
   ```bash
   docker-compose exec postgres psql -U postgres -c "\l"
   ```

## Security

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Set strong SECRET_KEY
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Regular backups
- [ ] Update software regularly
- [ ] Use strong database passwords
- [ ] Limit ALLOWED_HOSTS
- [ ] Enable rate limiting
- [ ] Configure fail2ban

### Firewall Configuration

```bash
# Allow web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow DICOM
sudo ufw allow 11112/tcp

# Enable firewall
sudo ufw enable
```

## Performance Tuning

### Database Optimization

```bash
# Increase PostgreSQL connections
# Edit docker-compose.yml:
environment:
  POSTGRES_MAX_CONNECTIONS: 100
```

### Celery Workers

```bash
# Increase worker concurrency
# Edit docker-compose.yml:
command: celery -A noctis_pro worker -l info --concurrency=8
```

### Rust SCP Server

```bash
# Increase PDU length for faster transfers
# Edit config.json:
"max_pdu_length": 32768
```

## Maintenance

### Update System

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

### Clean Up

```bash
# Remove old images
docker system prune -a

# Clean logs
docker-compose -f docker-compose.prod.yml exec django \
  find /app/logs -type f -mtime +30 -delete
```

## Support

For issues, questions, or contributions:
- GitHub: [Repository URL]
- Documentation: [Documentation URL]
- Email: support@example.com

## License

[Your License Here]