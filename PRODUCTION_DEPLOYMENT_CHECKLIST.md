# 📋 Production Deployment Checklist

Complete this checklist before deploying FastAPI to production.

## ✅ Pre-Deployment

### System Requirements

- [ ] Ubuntu 22.04+ or similar Linux distribution
- [ ] Python 3.10+
- [ ] PostgreSQL 13+
- [ ] Redis 6+
- [ ] Nginx (for reverse proxy)
- [ ] 4GB+ RAM available
- [ ] 20GB+ disk space

### Dependencies Installed

```bash
# Verify installations
- [ ] python3 --version  # Should be 3.10+
- [ ] psql --version     # PostgreSQL client
- [ ] redis-cli --version
- [ ] nginx -v
```

### Python Packages

```bash
# Install all requirements
- [ ] pip install -r requirements.txt
- [ ] Verify: python -c "import fastapi; print(fastapi.__version__)"
- [ ] Verify: python -c "import redis; print(redis.__version__)"
- [ ] Verify: python -c "import pydicom; print(pydicom.__version__)"
```

## ✅ Configuration

### Environment Setup

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=False`
- [ ] Configure `DATABASE_URL` with production credentials
- [ ] Configure `REDIS_URL`
- [ ] Set secure `DJANGO_SECRET_KEY`
- [ ] Set secure `JWT_SECRET_KEY`
- [ ] Update `ALLOWED_ORIGINS` for your domain

### Redis Configuration

- [ ] Redis installed and running
- [ ] Test: `redis-cli ping` returns `PONG`
- [ ] Configure `/etc/redis/redis.conf`:
  - [ ] Set `maxmemory 4gb` (adjust for your needs)
  - [ ] Set `maxmemory-policy allkeys-lru`
  - [ ] Enable persistence if needed
- [ ] Restart Redis: `sudo systemctl restart redis-server`

### PostgreSQL Setup

- [ ] PostgreSQL running
- [ ] Database created
- [ ] User has necessary permissions
- [ ] Django migrations applied: `python manage.py migrate`
- [ ] Test connection from FastAPI

### File Permissions

```bash
# Set correct permissions
- [ ] mkdir -p /workspace/media/dicom_files
- [ ] chown -R noctispro:noctispro /workspace/media
- [ ] chmod 755 /workspace/media
- [ ] chmod 755 /workspace/media/dicom_files
```

## ✅ FastAPI Service

### Systemd Service

```bash
# Install service
- [ ] sudo cp systemd/noctispro-fastapi.service /etc/systemd/system/
- [ ] sudo systemctl daemon-reload
- [ ] sudo systemctl enable noctispro-fastapi
- [ ] sudo systemctl start noctispro-fastapi
- [ ] sudo systemctl status noctispro-fastapi  # Should be "active (running)"
```

### Service Verification

```bash
# Test service
- [ ] curl http://localhost:8001/api/v1/health
- [ ] Should return: {"status": "healthy", ...}
- [ ] Check logs: sudo journalctl -u noctispro-fastapi -n 50
- [ ] No ERROR messages in logs
```

## ✅ Nginx Configuration

### Install & Configure

```bash
# Nginx setup
- [ ] sudo apt-get install nginx
- [ ] Copy nginx config to /etc/nginx/sites-available/noctispro
- [ ] sudo ln -s /etc/nginx/sites-available/noctispro /etc/nginx/sites-enabled/
- [ ] sudo nginx -t  # Should pass
- [ ] sudo systemctl reload nginx
```

### Test Nginx Routing

```bash
# Via Nginx
- [ ] curl http://localhost/api/v1/health
- [ ] Should return same as direct FastAPI connection
```

### HTTPS (Production Only)

```bash
# If deploying to internet
- [ ] Install certbot: sudo apt-get install certbot python3-certbot-nginx
- [ ] sudo certbot --nginx -d pacs.yourdomain.com
- [ ] Test HTTPS: curl https://pacs.yourdomain.com/api/v1/health
- [ ] Setup auto-renewal: sudo certbot renew --dry-run
```

## ✅ Security

### Firewall Configuration

```bash
# UFW firewall
- [ ] sudo ufw allow 22/tcp   # SSH
- [ ] sudo ufw allow 80/tcp   # HTTP
- [ ] sudo ufw allow 443/tcp  # HTTPS
- [ ] sudo ufw enable
- [ ] sudo ufw status
```

### Service Security

- [ ] FastAPI not accessible directly (only through Nginx)
- [ ] Redis bind to 127.0.0.1 only
- [ ] PostgreSQL bind to 127.0.0.1 only (if local)
- [ ] Environment variables not exposed
- [ ] `.env.production` has correct permissions (600)

### Application Security

- [ ] Rate limiting enabled: `ENABLE_RATE_LIMITING=True`
- [ ] CORS configured with production domains only
- [ ] Authentication enabled if required
- [ ] Error messages don't leak sensitive info (`DEBUG=False`)

## ✅ Performance

### Resource Allocation

- [ ] Worker count set appropriately: `WORKERS=4` (adjust for CPU cores)
- [ ] Redis max memory configured
- [ ] PostgreSQL connections pool sized correctly
- [ ] Disk space monitored

### Caching

- [ ] Redis caching enabled: `CACHE_ENABLED=True`
- [ ] Cache TTL configured appropriately
- [ ] Test cache: Make same request twice, second should be faster

### Performance Test

```bash
# Run performance test
- [ ] python test_production_fastapi.py
- [ ] All tests should PASS
- [ ] Response times < 200ms for DICOM images
- [ ] Cached response times < 50ms
```

## ✅ Monitoring

### Logging

```bash
# Verify logging
- [ ] Logs writing to journald
- [ ] sudo journalctl -u noctispro-fastapi -f  # Follow logs
- [ ] Log rotation configured
```

### Metrics

```bash
# Test metrics endpoint
- [ ] curl http://localhost:8001/api/v1/metrics
- [ ] Should return request stats, response times, etc.
```

### Health Checks

```bash
# Setup health monitoring
- [ ] Create health check script
- [ ] Setup cron job for periodic checks
- [ ] Configure alerting (email/SMS) for failures
```

## ✅ Testing

### Functional Tests

```bash
# Run test suite
- [ ] python test_production_fastapi.py
- [ ] All tests pass
```

### Django Issue Verification

- [ ] DICOM images load in < 200ms (not 3-6s)
- [ ] Images returned as Base64 PNG (not raw pixel data)
- [ ] Payload size ~50KB (not 2.5MB)
- [ ] No 404 errors on DICOM endpoints
- [ ] 'series' key in response (not 'series_list')
- [ ] Proper error messages (not generic failures)
- [ ] Cached responses very fast (< 50ms)

### Load Testing

```bash
# Optional but recommended
- [ ] Install Apache Bench: sudo apt-get install apache2-utils
- [ ] ab -n 1000 -c 10 http://localhost:8001/api/v1/health
- [ ] Should handle >500 requests/second
- [ ] No errors under load
```

## ✅ Backup & Recovery

### Backup Setup

```bash
# Database backups
- [ ] PostgreSQL backup script in place
- [ ] Scheduled via cron
- [ ] Test restore procedure

# DICOM files
- [ ] File backup strategy defined
- [ ] Backup location configured
- [ ] Test restore procedure
```

### Disaster Recovery

- [ ] Recovery plan documented
- [ ] Backup restore tested
- [ ] Service restart procedure documented

## ✅ Documentation

- [ ] API documentation accessible at `/api/v1/docs`
- [ ] Production deployment guide reviewed
- [ ] Service restart procedures documented
- [ ] Troubleshooting guide prepared
- [ ] Contact information for support updated

## ✅ Go-Live

### Final Verification

```bash
# Final checks before go-live
- [ ] All services running: sudo systemctl status noctispro-fastapi
- [ ] Health check passing: curl https://pacs.yourdomain.com/api/v1/health
- [ ] HTTPS working (if applicable)
- [ ] DNS configured correctly
- [ ] Firewall rules correct
- [ ] Monitoring active
- [ ] Backups configured
```

### Post-Deployment

```bash
# After deployment
- [ ] Monitor logs for first 24 hours
- [ ] Watch metrics dashboard
- [ ] Verify no errors
- [ ] Check performance
- [ ] User acceptance testing
```

### Rollback Plan

- [ ] Previous version backup available
- [ ] Rollback procedure documented
- [ ] Tested rollback in staging

## 📊 Success Criteria

After deployment, verify:

- [ ] ✅ DICOM images load in < 200ms
- [ ] ✅ No 404 errors
- [ ] ✅ Payload sizes ~50KB
- [ ] ✅ Success rate > 99%
- [ ] ✅ Response times < 100ms average
- [ ] ✅ No critical errors in logs
- [ ] ✅ All health checks passing

## 🎉 Deployment Complete!

Once all items are checked:

```bash
# Confirm deployment
echo "FastAPI Production Deployment Complete: $(date)" >> /var/log/noctispro-deployment.log
```

Your FastAPI service is now production-ready! 🚀

---

## 📞 Support

If issues arise:

1. Check logs: `sudo journalctl -u noctispro-fastapi -n 100`
2. Check service: `sudo systemctl status noctispro-fastapi`
3. For DICOM issues: Check `PRODUCTION_READY_SUMMARY.md`
4. For deployment: Check `PRODUCTION_FASTAPI_DEPLOYMENT.md`

## 📚 Reference Documents

- `PRODUCTION_READY_SUMMARY.md` - Overview of fixes
- `PRODUCTION_FASTAPI_DEPLOYMENT.md` - Detailed deployment guide
- `FASTAPI_INTEGRATION_SUMMARY.md` - Integration details
- `INTEGRATION_EXAMPLES.md` - Code examples
