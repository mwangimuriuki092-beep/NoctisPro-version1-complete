# 🚀 Quick Start - Deploy NoctisPro PACS in 5 Minutes

## One-Line Production Deployment

```bash
sudo ./deploy_production_docker.sh
```

That's it! Your system will be ready at `http://your-server-ip`

---

## What You Get

✅ **Complete PACS System** - Medical imaging platform  
✅ **Docker Containerized** - Easy to manage and scale  
✅ **PostgreSQL Database** - Production-grade data storage  
✅ **Redis Caching** - Fast performance  
✅ **AI Analysis** - Automated image analysis  
✅ **Automated Backups** - Daily/weekly/monthly  
✅ **Auto-Restart** - Starts on system boot  

---

## Prerequisites

- Ubuntu Server 22.04 LTS
- 4GB RAM minimum (8GB+ recommended)
- 20GB storage minimum
- Root/sudo access
- Internet connection

---

## Step-by-Step (if you prefer manual)

### 1. Clone Repository

```bash
git clone <repository-url> /opt/noctispro
cd /opt/noctispro
```

### 2. Deploy

```bash
sudo chmod +x deploy_production_docker.sh
sudo ./deploy_production_docker.sh
```

### 3. Wait (~5-10 minutes)

The script will:
- Install Docker and Docker Compose
- Build the application containers
- Set up the database
- Create admin user
- Start all services

### 4. Access the System

**URL**: `http://your-server-ip`  
**Username**: `admin`  
**Password**: `admin123`

⚠️ **IMPORTANT**: Change the admin password immediately!

---

## First Steps After Login

1. **Change Admin Password**
   ```bash
   docker exec -it noctispro-web python manage.py changepassword admin
   ```

2. **Create Users**  
   Go to: Admin Panel → Users → Add User

3. **Upload DICOM Files**  
   Go to: Worklist → Upload

4. **View Images**  
   Go to: DICOM Viewer

5. **Check AI Analysis**  
   Go to: AI Dashboard

---

## Management Commands

```bash
# Start services
docker compose -f docker-compose.production.yml up -d

# Stop services
docker compose -f docker-compose.production.yml down

# View logs
docker compose -f docker-compose.production.yml logs -f

# Check status
docker compose -f docker-compose.production.yml ps

# Restart a service
docker compose -f docker-compose.production.yml restart web
```

---

## Need More Details?

📚 **Complete Guide**: [DOCKER_DEPLOYMENT_UBUNTU_22.04.md](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md)

Includes:
- Manual installation steps
- SSL/TLS configuration
- Security hardening
- Backup procedures
- Troubleshooting
- Performance tuning

---

## Quick Troubleshooting

### Services won't start?

```bash
# Check logs
docker compose -f docker-compose.production.yml logs -f

# Check if ports are in use
sudo netstat -tulpn | grep -E ':80|:443'
```

### Can't access the web interface?

```bash
# Check if containers are running
docker compose -f docker-compose.production.yml ps

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
```

### Database errors?

```bash
# Run migrations
docker exec -it noctispro-web python manage.py migrate

# Check database
docker compose -f docker-compose.production.yml logs db
```

---

## System Requirements Checklist

- [ ] Ubuntu Server 22.04 installed
- [ ] At least 4GB RAM available
- [ ] At least 20GB disk space available
- [ ] Internet connection active
- [ ] Ports 80 and 443 available
- [ ] Root/sudo access available

---

## What Happens During Deployment?

1. ✅ Installs Docker Engine
2. ✅ Installs Docker Compose
3. ✅ Creates application directory
4. ✅ Generates environment configuration
5. ✅ Creates Docker volumes for data persistence
6. ✅ Builds application containers
7. ✅ Starts PostgreSQL database
8. ✅ Starts Redis cache
9. ✅ Runs database migrations
10. ✅ Creates admin user (admin/admin123)
11. ✅ Collects static files
12. ✅ Starts web application
13. ✅ Starts AI worker
14. ✅ Starts backup service
15. ✅ Configures auto-start on boot

---

## Production Checklist

After deployment:

- [ ] Changed admin password
- [ ] Created additional users
- [ ] Tested DICOM upload
- [ ] Tested DICOM viewer
- [ ] Verified AI analysis works
- [ ] Set up SSL/TLS certificates
- [ ] Configured firewall
- [ ] Tested backups
- [ ] Documented custom settings

---

## Support

**Having issues?**

1. Check logs: `docker compose -f docker-compose.production.yml logs -f`
2. Verify services: `docker compose -f docker-compose.production.yml ps`
3. Read full guide: [DOCKER_DEPLOYMENT_UBUNTU_22.04.md](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md)

---

## Ready to Deploy?

```bash
cd /opt/noctispro
sudo ./deploy_production_docker.sh
```

🏥 **Your medical imaging platform will be ready in minutes!**
