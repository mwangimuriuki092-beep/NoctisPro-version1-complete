# 🚀 NoctisPro PACS - Quick Start Card

## ⚡ Start in 3 Commands

```bash
# Development Mode (Recommended for Testing)
./start-dev.sh
docker-compose -f docker-compose.dev.yml exec django python manage.py createsuperuser
# Access: http://localhost:8000

# Production Mode
cp .env.prod.example .env.prod && nano .env.prod
./start-prod.sh
# Access: https://yourdomain.com
```

## 📊 System Status

```bash
./test-system.sh                    # Run all tests
docker-compose ps                   # Check services
docker-compose logs -f [service]    # View logs
```

## 🏥 Send DICOM Files

```bash
# Test connection
echoscu localhost 11112 -aec RUST_SCP

# Send single file
storescu localhost 11112 -aec RUST_SCP file.dcm

# Send directory
storescu -r localhost 11112 -aec RUST_SCP /path/to/dicom/
```

## 🔍 Key Endpoints

- **Web Interface**: http://localhost:8000
- **Study List**: http://localhost:8000/worklist/
- **Admin Panel**: http://localhost:8000/admin/
- **System Status API**: http://localhost:8000/dicom/api/system/status/
- **DICOM SCP**: localhost:11112

## 🛠️ Common Commands

```bash
# Start services
./start-dev.sh           # Development
./start-prod.sh          # Production

# Stop services
./stop-all.sh            # All services
docker-compose down      # Current environment

# Database
docker-compose exec postgres psql -U postgres noctis_pro
docker-compose exec django python manage.py migrate
docker-compose exec postgres pg_dump -U postgres noctis_pro > backup.sql

# Logs
docker-compose logs -f                    # All services
docker-compose logs -f django             # Django
docker-compose logs -f dicom_scp          # DICOM SCP
docker-compose logs -f celery_worker      # Celery

# Django Management
docker-compose exec django python manage.py createsuperuser
docker-compose exec django python manage.py shell
docker-compose exec django python manage.py test

# System Maintenance
docker system prune -a                    # Clean Docker
docker-compose restart [service]          # Restart service
docker-compose exec django python manage.py collectstatic
```

## 🔒 Security Checklist (Production)

- [ ] Update SECRET_KEY in .env.prod
- [ ] Change database passwords
- [ ] Configure firewall (ports 80, 443, 11112)
- [ ] Add SSL certificates to config/nginx/ssl/
- [ ] Set ALLOWED_HOSTS in .env.prod
- [ ] Enable HTTPS (USE_HTTPS=true)
- [ ] Configure regular backups
- [ ] Review security settings

## 📁 Important Files

| File | Purpose |
|------|---------|
| `.env.dev` | Development environment |
| `.env.prod` | Production environment |
| `dicom_scp_server/config.json` | DICOM SCP settings |
| `docker-compose.dev.yml` | Dev stack |
| `docker-compose.prod.yml` | Prod stack |
| `config/nginx/nginx.conf` | Nginx config |

## 🧪 Testing Workflow

```bash
# 1. Start system
./start-dev.sh

# 2. Run tests
./test-system.sh

# 3. Send test DICOM
storescu localhost 11112 -aec RUST_SCP test.dcm

# 4. Check in browser
# http://localhost:8000/worklist/

# 5. View in viewer
# Click on study > Opens viewer
```

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Services won't start | `docker-compose down -v && docker-compose up` |
| DICOM not receiving | Check `docker-compose logs dicom_scp` |
| Database error | Run `docker-compose exec django python manage.py migrate` |
| Viewer not loading | Check browser console (F12) |
| Permission denied | Run `chmod +x *.sh` |

## 📚 Full Documentation

- **Complete Guide**: `COMPLETE_SYSTEM_GUIDE.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Main README**: `README_PACS_SYSTEM.md`
- **System Summary**: `SYSTEM_REFINEMENT_COMPLETE.md`

## 🎯 Quick Goals

**Development:**
1. ✅ Start services: `./start-dev.sh`
2. ✅ Create admin: `docker-compose exec django python manage.py createsuperuser`
3. ✅ Send DICOM: `storescu localhost 11112 -aec RUST_SCP test.dcm`
4. ✅ View in browser: http://localhost:8000

**Production:**
1. ✅ Configure `.env.prod`
2. ✅ Add SSL certificates
3. ✅ Start: `./start-prod.sh`
4. ✅ Access: https://yourdomain.com

## 💡 Tips

- Use `docker-compose logs -f` to watch real-time logs
- DICOM files are stored in `/app/media/dicom_files/`
- Viewer supports Window/Level, Measurements, Annotations, MPR, 3D
- API requires authentication (JWT tokens)
- Celery processes AI analysis in background

## ⚙️ Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| Django | 8000 | HTTP |
| DICOM SCP | 11112 | DICOM |
| PostgreSQL | 5432 | PostgreSQL |
| Redis | 6379 | Redis |
| Nginx (prod) | 80/443 | HTTP/HTTPS |

## 🆘 Get Help

```bash
# View service status
docker-compose ps

# Check specific service logs
docker-compose logs [service_name]

# Enter service shell
docker-compose exec [service_name] /bin/bash

# Restart service
docker-compose restart [service_name]

# Full system reset
docker-compose down -v
./start-dev.sh
```

---

**Quick Tip**: Keep this card handy for daily operations! For detailed information, see the full documentation.

**System Status**: All ✅ Ready for deployment!