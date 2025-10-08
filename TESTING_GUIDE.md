# NoctisPro PACS - Testing Guide

## Quick System Test

Run the automated test script:

```bash
./test-system.sh
```

This will verify:
- Docker services are running
- PostgreSQL is ready
- Redis is ready
- Django is responding
- DICOM SCP is accepting connections
- Database connectivity
- Storage directories

## Manual Testing

### 1. Test Web Interface

```bash
# Open in browser
http://localhost:8000

# Expected: Login page appears
# Action: Log in with your credentials
```

### 2. Test DICOM Reception (C-STORE)

#### Using dcmtk (storescu)

```bash
# Install dcmtk if not already installed
sudo apt-get install dcmtk

# Test with C-ECHO
echoscu -v localhost 11112 -aec RUST_SCP

# Expected output: "Association accepted"

# Send a DICOM file
storescu -v localhost 11112 -aec RUST_SCP /path/to/test.dcm

# Expected output: "C-STORE completed successfully"
```

#### Using Python

```python
from pynetdicom import AE, StoragePresentationContexts
from pydicom import dcmread

# Create Application Entity
ae = AE(ae_title='TEST_SCU')
ae.requested_contexts = StoragePresentationContexts

# Associate
assoc = ae.associate('localhost', 11112, ae_title='RUST_SCP')

if assoc.is_established:
    # Read and send DICOM file
    ds = dcmread('test.dcm')
    status = assoc.send_c_store(ds)
    
    print(f'C-STORE status: 0x{status.Status:04x}')
    
    assoc.release()
else:
    print('Association rejected, aborted or never connected')
```

### 3. Test DICOM Viewer

1. **Send test DICOM files**:
   ```bash
   storescu -v localhost 11112 -aec RUST_SCP -r /path/to/dicom/folder/
   ```

2. **Access worklist**:
   - Navigate to http://localhost:8000/worklist/
   - Verify studies appear in the list

3. **Open viewer**:
   - Click on a study
   - Viewer should load with images

4. **Test viewer tools**:
   - ✓ Window/Level adjustment (drag on image)
   - ✓ Zoom (mouse wheel)
   - ✓ Pan (right-click drag)
   - ✓ Measurements (click measurement tools)
   - ✓ Series switching (click thumbnails)

### 4. Test API Endpoints

#### Get System Status
```bash
curl http://localhost:8000/dicom/api/system/status/
```

Expected response:
```json
{
  "status": "success",
  "stats": {
    "patients": 0,
    "studies": 0,
    "series": 0,
    "images": 0,
    "scp_server": {
      "connected": true,
      "host": "localhost",
      "port": 11112
    }
  }
}
```

#### Test SCP Connection
```bash
curl -X POST http://localhost:8000/dicom/api/scp/test/ \
  -H "Authorization: Bearer <your-token>"
```

#### Upload DICOM via API
```bash
curl -X POST http://localhost:8000/dicom/api/upload/ \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@test.dcm"
```

### 5. Test Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres noctis_pro

# Run queries
SELECT COUNT(*) FROM worklist_patient;
SELECT COUNT(*) FROM worklist_study;
SELECT COUNT(*) FROM worklist_series;
SELECT COUNT(*) FROM worklist_dicomimage;

# Exit
\q
```

### 6. Test Background Tasks (Celery)

```bash
# Check celery worker status
docker-compose logs celery_worker

# Expected: Should show "ready" and no errors
```

### 7. Test File Storage

```bash
# List DICOM files
docker-compose exec django find /app/media/dicom_files -name "*.dcm"

# Check file permissions
docker-compose exec django ls -la /app/media/dicom_files/

# Expected: Files should be readable
```

## Performance Testing

### Load Testing - DICOM Reception

```bash
# Send multiple files concurrently
for i in {1..10}; do
  storescu localhost 11112 -aec RUST_SCP test.dcm &
done
wait

# Check logs
docker-compose logs dicom_scp
```

### Load Testing - Web Interface

```bash
# Install apache bench
sudo apt-get install apache2-utils

# Test homepage
ab -n 100 -c 10 http://localhost:8000/

# Test API endpoint
ab -n 100 -c 10 http://localhost:8000/dicom/api/system/status/
```

## Integration Testing

### End-to-End Test

1. **Send DICOM file**:
   ```bash
   storescu -v localhost 11112 -aec RUST_SCP test.dcm
   ```

2. **Wait for processing** (check logs):
   ```bash
   docker-compose logs -f dicom_scp
   ```

3. **Verify in database**:
   ```bash
   docker-compose exec postgres psql -U postgres noctis_pro -c \
     "SELECT patient_name, study_description FROM worklist_study \
      JOIN worklist_patient ON worklist_study.patient_id = worklist_patient.id \
      ORDER BY worklist_study.created_at DESC LIMIT 5;"
   ```

4. **View in web interface**:
   - Open http://localhost:8000/worklist/
   - Find the study
   - Open viewer

5. **Verify file storage**:
   ```bash
   docker-compose exec django find /app/media/dicom_files -name "*.dcm" -mmin -5
   ```

## Troubleshooting Tests

### DICOM Not Receiving

1. **Check SCP is listening**:
   ```bash
   docker-compose exec dicom_scp netstat -tlnp | grep 11112
   ```

2. **Check firewall**:
   ```bash
   sudo ufw status
   # Should allow port 11112
   ```

3. **Test with verbose output**:
   ```bash
   storescu -v -d localhost 11112 -aec RUST_SCP test.dcm
   ```

### Database Issues

1. **Check connections**:
   ```bash
   docker-compose exec postgres psql -U postgres -c \
     "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **Run migrations**:
   ```bash
   docker-compose exec django python manage.py migrate
   ```

3. **Check table structure**:
   ```bash
   docker-compose exec postgres psql -U postgres noctis_pro -c "\dt"
   ```

### Viewer Not Loading

1. **Check browser console** (F12) for JavaScript errors

2. **Verify image exists**:
   ```bash
   docker-compose exec django python manage.py shell
   >>> from worklist.models import DicomImage
   >>> img = DicomImage.objects.first()
   >>> print(img.dicom_file.path)
   >>> import os
   >>> print(os.path.exists(img.dicom_file.path))
   ```

3. **Check nginx logs** (production):
   ```bash
   docker-compose logs nginx
   ```

## Automated Test Suite

### Run Django Tests

```bash
# Run all tests
docker-compose exec django python manage.py test

# Run specific app tests
docker-compose exec django python manage.py test dicom_viewer
docker-compose exec django python manage.py test worklist

# Run with coverage
docker-compose exec django coverage run --source='.' manage.py test
docker-compose exec django coverage report
```

### Create Test Data

```bash
# Create test patients and studies
docker-compose exec django python manage.py shell

from worklist.models import Patient, Study, Series
from django.utils import timezone
import uuid

# Create test patient
patient = Patient.objects.create(
    patient_id="TEST001",
    patient_name="Test^Patient",
    patient_birth_date="19800101",
    patient_sex="M"
)

# Create test study
study = Study.objects.create(
    patient=patient,
    study_instance_uid=f"1.2.3.{uuid.uuid4().int}",
    study_date=timezone.now().strftime("%Y%m%d"),
    study_description="Test Study",
    modality="CT"
)

print(f"Created patient {patient.patient_id} and study {study.study_instance_uid}")
```

## Continuous Integration Tests

Sample `.github/workflows/test.yml`:

```yaml
name: Test NoctisPro PACS

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and start services
        run: |
          docker-compose -f docker-compose.dev.yml up -d
          sleep 30
      
      - name: Run system tests
        run: ./test-system.sh
      
      - name: Run Django tests
        run: docker-compose exec -T django python manage.py test
      
      - name: Cleanup
        run: docker-compose down -v
```

## Test Checklist

Before deploying to production:

- [ ] All services start successfully
- [ ] Database migrations complete
- [ ] Static files collected
- [ ] DICOM SCP accepts C-ECHO
- [ ] Can send DICOM files
- [ ] Files appear in database
- [ ] Files stored correctly on disk
- [ ] Worklist displays studies
- [ ] Viewer loads images
- [ ] Measurements work
- [ ] Annotations save
- [ ] API endpoints respond
- [ ] Authentication works
- [ ] Celery processes tasks
- [ ] Backups work
- [ ] Logs are accessible

## Success Criteria

✅ **System is ready** when:
1. All automated tests pass
2. Can send and receive DICOM files
3. Can view images in web interface
4. No error logs in any service
5. Performance is acceptable
6. Database backups work

## Support

If tests fail, check:
1. Service logs: `docker-compose logs [service]`
2. System resources: `docker stats`
3. Network connectivity: `docker network ls`
4. Disk space: `df -h`

For help, see COMPLETE_SYSTEM_GUIDE.md or contact support.