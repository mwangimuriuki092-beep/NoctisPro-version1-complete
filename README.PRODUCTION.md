# Production Docker Compose for NoctisPro PACS

This directory contains a complete, production-ready Docker Compose setup for NoctisPro PACS.

## 🚀 Quick Links

- **[Quick Start Guide](QUICK_START_PRODUCTION.md)** - Get up and running in 5 minutes
- **[Complete Deployment Guide](PRODUCTION_DEPLOYMENT.md)** - Comprehensive 50+ page guide
- **[Setup Summary](PRODUCTION_SETUP_SUMMARY.md)** - Overview of what's included

## 📦 Files Overview

### Deployment Files
- `docker-compose.prod.yaml` - Main production configuration
- `docker-compose.monitoring.yaml` - Monitoring stack (Prometheus, Grafana)
- `.env.prod` - Environment variable template
- `deploy-production.sh` - Automated deployment script

### Documentation
- `QUICK_START_PRODUCTION.md` - Fast setup guide
- `PRODUCTION_DEPLOYMENT.md` - Complete documentation
- `PRODUCTION_SETUP_SUMMARY.md` - Feature overview

### Configuration
- `deployment/prometheus/` - Prometheus, alerts, exporters
- `deployment/loki/` - Log aggregation
- `deployment/grafana/` - Dashboards and datasources
- `deployment/nginx/` - Nginx configuration
- `deployment/postgres/` - PostgreSQL optimization
- `deployment/redis/` - Redis configuration

## ⚡ Quick Start

```bash
# 1. Copy environment template
cp .env.prod .env

# 2. Edit .env and set all passwords and secrets
nano .env

# 3. Run deployment script
./deploy-production.sh

# 4. Create admin user
docker compose -f docker-compose.prod.yaml exec django python manage.py createsuperuser
```

## 🎯 Deployment Options

### Option 1: Core Services
```bash
docker compose -f docker-compose.prod.yaml up -d
```
PostgreSQL, Redis, Django, Nginx, Celery, DICOM

### Option 2: With Monitoring
```bash
docker compose -f docker-compose.prod.yaml --profile monitoring up -d
```
Core + Prometheus, Grafana, Exporters

### Option 3: Full Stack
```bash
docker compose -f docker-compose.prod.yaml \
  --profile monitoring \
  --profile backup \
  --profile ssl \
  up -d
```
Everything: Core + Monitoring + Backups + SSL

## 📋 Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- Ubuntu 22.04 LTS or similar
- 4+ CPU cores, 8GB+ RAM, 100GB+ storage
- Domain name (for SSL/TLS)

## 🔐 Security

✅ Network isolation (frontend/backend/monitoring)  
✅ Secret management via environment variables  
✅ SSL/TLS support with Let's Encrypt  
✅ Security headers configured  
✅ Resource limits enforced  
✅ Health checks for all services  

## 📊 Monitoring

✅ Prometheus metrics collection  
✅ Grafana dashboards  
✅ 25+ alert rules  
✅ Email/Webhook notifications  
✅ Log aggregation with Loki  
✅ System, database, and application metrics  

## 💾 Backups

✅ Automated daily backups  
✅ 30-day retention (configurable)  
✅ Database dumps (compressed)  
✅ Media file backups  
✅ Disaster recovery procedures  

## 📈 Features

- **High Availability:** Health checks, auto-restart, graceful shutdown
- **Scalability:** Horizontal scaling, load balancing ready
- **Performance:** Multi-worker, connection pooling, caching
- **Observability:** Metrics, logs, traces, dashboards
- **Security:** Encryption, isolation, secrets, hardening

## 🛠️ Common Commands

```bash
# Status
docker compose -f docker-compose.prod.yaml ps

# Logs
docker compose -f docker-compose.prod.yaml logs -f

# Restart
docker compose -f docker-compose.prod.yaml restart

# Stop
docker compose -f docker-compose.prod.yaml down

# Update
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d
```

## 📞 Access Points

- **Application:** https://yourdomain.com
- **Admin Panel:** https://yourdomain.com/admin
- **DICOM Service:** yourdomain.com:11112
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000

## 📚 Documentation

1. **New to deployment?** → Start with [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md)
2. **Need detailed info?** → Read [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
3. **Want an overview?** → Check [PRODUCTION_SETUP_SUMMARY.md](PRODUCTION_SETUP_SUMMARY.md)

## 🆘 Troubleshooting

See the [Troubleshooting section](PRODUCTION_DEPLOYMENT.md#troubleshooting) in the deployment guide.

Common issues:
- Database connection errors
- 502 Bad Gateway
- Out of disk space
- SSL certificate issues

## 📖 Learn More

- [Django Documentation](https://docs.djangoproject.com/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines first.

## 📄 License

[Your License Here]

---

**Ready to deploy?** Start with the [Quick Start Guide](QUICK_START_PRODUCTION.md)!
