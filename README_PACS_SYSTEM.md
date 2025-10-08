# NoctisPro PACS - Complete Medical Imaging System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://rust-lang.org)
[![Django](https://img.shields.io/badge/django-4.2+-green.svg)](https://djangoproject.com)

A complete, production-ready Picture Archiving and Communication System (PACS) with advanced DICOM support, web-based viewer, and AI analysis capabilities.

## 🌟 Features

### Core PACS Features
- ✅ **High-Performance DICOM SCP Server** (Rust)
  - C-STORE: Receive DICOM images from modalities
  - C-ECHO: Connection verification
  - Multiple transfer syntaxes (Implicit/Explicit VR, JPEG, JPEG 2000)
  - Support for CT, MR, CR, DX, US, and more
  - Concurrent connection handling
  - Automatic metadata extraction

- ✅ **Web-Based Interface** (Django)
  - Patient and study management
  - Advanced worklist with filtering
  - Real-time search
  - User authentication and permissions
  - RESTful API

- ✅ **Advanced DICOM Viewer**
  - Window/Level adjustment
  - Zoom, Pan, Rotate
  - Measurements (length, angle, area, Cobb angle)
  - Annotations with drawing tools
  - MPR (Multiplanar Reconstruction)
  - 3D rendering for CT
  - Cine loop playback
  - Multi-series comparison
  - Hanging protocols

- ✅ **AI Integration**
  - Automated analysis workflows
  - Custom AI model support
  - PyTorch and TensorFlow integration
  - Background processing with Celery
  - Results visualization

### Architecture

```
┌──────────────┐
│  Modalities  │  (CT, MR, X-Ray, US)
│  (SCU)       │
└──────┬───────┘
       │ DICOM C-STORE
       │ Port 11112
       ▼
┌──────────────────────┐
│ Rust DICOM SCP       │  High-performance receiver
│ - Receives images    │  Extracts metadata
│ - Stores files       │  Multi-threaded
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ PostgreSQL Database  │  Structured metadata
│ - Patients           │  Fast queries
│ - Studies/Series     │  Relationships
│ - Images             │
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Django Web Application                   │
│ ┌─────────────────────────────────────┐ │
│ │ Web Interface                        │ │
│ │ - Study Browser                      │ │
│ │ - DICOM Viewer                       │ │
│ │ - Reporting                          │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ REST API                             │ │
│ │ - /api/studies/                      │ │
│ │ - /api/images/                       │ │
│ │ - /dicom/api/*                       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Redis + Celery       │  Background tasks
│ - AI processing      │  Async operations
│ - Report generation  │  Task scheduling
└──────────────────────┘
```

## 🚀 Quick Start

### Development Mode (Recommended for Testing)

```bash
# 1. Clone repository
git clone <repository-url>
cd noctispro

# 2. Start all services
./start-dev.sh

# 3. Access the system
# Web Interface: http://localhost:8000
# DICOM SCP: localhost:11112

# 4. Create admin user
docker-compose -f docker-compose.dev.yml exec django python manage.py createsuperuser

# 5. Send test DICOM file
storescu localhost 11112 -aec RUST_SCP test.dcm
```

### Production Mode

```bash
# 1. Configure environment
cp .env.prod.example .env.prod
nano .env.prod  # Edit with your settings

# 2. Set up SSL certificates
mkdir -p config/nginx/ssl
cp fullchain.pem config/nginx/ssl/
cp privkey.pem config/nginx/ssl/

# 3. Start production
./start-prod.sh

# 4. Access via HTTPS
# https://yourdomain.com
```

## 📋 Requirements

### Development
- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum
- 50GB disk space

### Production
- Docker 20.10+
- Docker Compose 2.0+
- 16GB RAM minimum
- 500GB+ disk space (depending on image volume)
- SSL certificates (for HTTPS)
- Domain name (optional but recommended)

## 📦 Services

| Service | Technology | Purpose | Port |
|---------|-----------|---------|------|
| **dicom_scp** | Rust | DICOM receiver | 11112 |
| **django** | Python/Django | Web interface & API | 8000 |
| **postgres** | PostgreSQL 15 | Database | 5432 |
| **redis** | Redis 7 | Cache & message broker | 6379 |
| **celery_worker** | Python/Celery | Background tasks | - |
| **celery_beat** | Python/Celery | Task scheduler | - |
| **nginx** | Nginx | Reverse proxy (prod) | 80, 443 |

## 🔧 Configuration

### Environment Variables

See `.env.dev.example` and `.env.prod.example` for all available options.

Key variables:
```bash
# Security
SECRET_KEY=your-secret-key-here
DEBUG=false

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# DICOM
DICOM_SCP_HOST=localhost
DICOM_SCP_PORT=11112
DICOM_SCP_AE_TITLE=RUST_SCP

# Deployment
DEPLOYMENT_MODE=production
USE_HTTPS=true
DOMAIN_NAME=yourdomain.com
```

### Rust SCP Configuration

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
    "url": "postgresql://...",
    "max_connections": 10
  },
  "storage": {
    "base_path": "/app/media/dicom_files",
    "organize_by_patient": true,
    "organize_by_study": true
  }
}
```

## 📖 Documentation

- **[Complete System Guide](COMPLETE_SYSTEM_GUIDE.md)** - Comprehensive setup and usage
- **[Testing Guide](TESTING_GUIDE.md)** - Testing procedures and troubleshooting
- **[Rust SCP README](dicom_scp_server/README.md)** - DICOM SCP server details

## 🧪 Testing

```bash
# Run automated system test
./test-system.sh

# Test DICOM connection
echoscu localhost 11112 -aec RUST_SCP

# Send DICOM file
storescu localhost 11112 -aec RUST_SCP test.dcm

# Run Django tests
docker-compose exec django python manage.py test
```

## 📊 Usage Examples

### Sending DICOM Files

#### Command Line (dcmtk)
```bash
# Single file
storescu -v localhost 11112 -aec RUST_SCP file.dcm

# Entire directory
storescu -v localhost 11112 -aec RUST_SCP -r /path/to/dicom/
```

#### Python (pynetdicom)
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

### Using the API

```bash
# Get system status
curl http://localhost:8000/dicom/api/system/status/

# Get study data
curl http://localhost:8000/dicom/api/studies/<study-id>/

# Upload DICOM
curl -X POST http://localhost:8000/dicom/api/upload/ \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.dcm"
```

## 🔒 Security

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Set strong SECRET_KEY (50+ characters)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall rules
- [ ] Set up regular database backups
- [ ] Enable fail2ban for SSH protection
- [ ] Limit ALLOWED_HOSTS
- [ ] Use strong PostgreSQL password
- [ ] Enable Redis password authentication
- [ ] Regular security updates

### Firewall Setup

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 11112/tcp   # DICOM
sudo ufw enable
```

## 🔍 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f django
docker-compose logs -f dicom_scp
docker-compose logs -f celery_worker
```

### Service Status
```bash
docker-compose ps
```

### Database Queries
```bash
docker-compose exec postgres psql -U postgres noctis_pro

SELECT COUNT(*) FROM worklist_patient;
SELECT COUNT(*) FROM worklist_study;
```

## 🛠️ Maintenance

### Backup Database
```bash
docker-compose exec postgres pg_dump -U postgres noctis_pro > backup.sql
```

### Restore Database
```bash
docker-compose exec -T postgres psql -U postgres noctis_pro < backup.sql
```

### Update System
```bash
git pull
docker-compose down
docker-compose up --build -d
```

### Clean Up
```bash
# Remove old Docker images
docker system prune -a

# Clean old logs
find logs -type f -mtime +30 -delete
```

## 🐛 Troubleshooting

### DICOM Not Receiving
1. Check SCP is running: `docker-compose ps dicom_scp`
2. Test connection: `echoscu localhost 11112 -aec RUST_SCP`
3. Check logs: `docker-compose logs dicom_scp`
4. Verify firewall: `sudo ufw status`

### Viewer Not Loading
1. Check browser console (F12) for errors
2. Verify database connection
3. Check file permissions
4. Review nginx logs (production)

### Database Issues
1. Check connections: `docker-compose exec postgres pg_isready`
2. Run migrations: `docker-compose exec django python manage.py migrate`
3. Check disk space: `df -h`

## 📈 Performance

### Optimization Tips

1. **Database**:
   - Increase max_connections for high load
   - Regular VACUUM and ANALYZE
   - Add indexes for common queries

2. **DICOM SCP**:
   - Increase max_pdu_length for faster transfers
   - Use SSD storage for better I/O
   - Increase max_connections in config

3. **Celery**:
   - Increase worker concurrency
   - Use multiple worker pools
   - Monitor task queue length

4. **Caching**:
   - Enable Redis caching
   - Configure appropriate TTLs
   - Use CDN for static files

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: See docs folder
- **Issues**: GitHub Issues
- **Email**: support@example.com

## 🎯 Roadmap

- [ ] DICOM Query/Retrieve (C-FIND, C-MOVE)
- [ ] HL7 integration
- [ ] Advanced AI models
- [ ] Mobile app
- [ ] Teleradiology features
- [ ] PACS-to-PACS communication
- [ ] Advanced reporting templates
- [ ] Integration with RIS
- [ ] Cloud storage options
- [ ] Multi-site support

## ⭐ Credits

Built with:
- **Django** - Web framework
- **Rust** - High-performance DICOM server
- **PostgreSQL** - Database
- **Redis** - Caching and task queue
- **Celery** - Background tasks
- **pydicom** - DICOM processing
- **pynetdicom** - DICOM networking
- **Three.js** - 3D rendering
- **Fabric.js** - Canvas annotations

## 📸 Screenshots

*(Add screenshots of your system here)*

1. Study List
2. DICOM Viewer
3. MPR View
4. 3D Rendering
5. Measurements
6. Reports

---

**Made with ❤️ for better medical imaging**