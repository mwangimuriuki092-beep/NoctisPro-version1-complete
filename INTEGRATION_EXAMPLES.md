# FastAPI + Django + Rust Integration Examples

This document provides practical examples of how the three services work together in the NoctisPro PACS system.

## Quick Start

### Development Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run database migrations
python manage.py migrate

# 3. Create superuser
python manage.py createsuperuser

# 4. Start all services
chmod +x start_all_services.sh
./start_all_services.sh
```

### Production Setup (Docker)

```bash
# 1. Build and start all services
docker-compose -f docker-compose.fastapi.yml up -d

# 2. Run migrations
docker-compose exec django python manage.py migrate

# 3. Create superuser
docker-compose exec django python manage.py createsuperuser

# 4. Check service status
docker-compose ps
```

## Example Workflows

### Workflow 1: Upload DICOM via Web Interface

**User Action**: Upload DICOM file through Django web interface

```
1. User uploads file to Django (http://localhost:8000/dicom-viewer/upload/)
2. Django saves file and triggers background task
3. Django calls FastAPI to parse DICOM metadata
4. FastAPI extracts metadata and returns to Django
5. Django saves metadata to database
6. Django displays study in worklist
```

**Code Example (Django view):**

```python
# In dicom_viewer/views.py
import httpx

async def upload_dicom_view(request):
    if request.method == 'POST':
        file = request.FILES['dicom_file']
        
        # Save file temporarily
        file_path = save_uploaded_file(file)
        
        # Call FastAPI for fast parsing
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'http://localhost:8001/api/v1/dicom/parse',
                json={'file_path': file_path}
            )
            metadata = response.json()['metadata']
        
        # Create study in Django
        study = DicomStudy.objects.create(
            patient_id=metadata['patient_id'],
            patient_name=metadata['patient_name'],
            # ... other fields
        )
        
        return redirect('worklist')
```

### Workflow 2: Modality Sends DICOM to Rust SCP

**Modality Action**: CT scanner sends images via DICOM C-STORE

```
1. Modality sends C-STORE to Rust SCP (port 11112)
2. Rust receives and validates DICOM
3. Rust saves file to shared storage
4. Rust notifies Django via HTTP POST
5. Django creates study record
6. Django triggers FastAPI for AI analysis
7. FastAPI processes and returns results
8. Django displays in UI with AI overlay
```

**Code Example (Rust notification):**

```rust
// In dicom_scp_server/src/scp.rs
async fn on_dicom_received(&self, file_path: &str) -> Result<()> {
    let client = reqwest::Client::new();
    
    let response = client
        .post("http://django:8000/api/dicom/received/")
        .json(&json!({
            "file_path": file_path,
            "timestamp": Utc::now(),
        }))
        .send()
        .await?;
    
    Ok(())
}
```

**Code Example (Django receiver):**

```python
# In dicom_viewer/views.py
from django.views.decorators.csrf import csrf_exempt
import httpx

@csrf_exempt
async def dicom_received_webhook(request):
    data = json.loads(request.body)
    file_path = data['file_path']
    
    # Call FastAPI to parse
    async with httpx.AsyncClient() as client:
        response = await client.post(
            'http://localhost:8001/api/v1/dicom/parse',
            json={'file_path': file_path}
        )
        metadata = response.json()['metadata']
    
    # Create study
    study = await sync_to_async(DicomStudy.objects.create)(
        patient_id=metadata['patient_id'],
        # ... other fields
    )
    
    # Trigger AI analysis via FastAPI
    async with httpx.AsyncClient() as client:
        await client.post(
            'http://localhost:8001/api/v1/ai/analyze',
            json={'study_id': study.id, 'model_type': 'general'}
        )
    
    return JsonResponse({'status': 'success'})
```

### Workflow 3: Real-time Viewer with AI Overlay

**User Action**: Open DICOM viewer with AI analysis

```
1. User opens viewer (Django serves HTML)
2. Frontend connects to FastAPI WebSocket
3. FastAPI streams image frames
4. Frontend requests AI analysis
5. FastAPI runs inference in background
6. FastAPI streams AI results via WebSocket
7. Frontend displays with overlay
```

**Code Example (Frontend JavaScript):**

```javascript
// Connect to FastAPI WebSocket
const ws = new WebSocket('ws://localhost:8001/ws/viewer/123');

ws.onopen = () => {
    // Request first frame
    ws.send(JSON.stringify({
        command: 'get_frame',
        frame: 0
    }));
    
    // Request AI analysis
    fetch('http://localhost:8001/api/v1/ai/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            study_id: 123,
            model_type: 'general'
        })
    });
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'frame') {
        // Display image
        updateViewer(data.data);
    } else if (data.type === 'ai_result') {
        // Add AI overlay
        addAIOverlay(data.findings);
    }
};

// Adjust window/level
function adjustWindowLevel(window, level) {
    ws.send(JSON.stringify({
        command: 'adjust_wl',
        window: window,
        level: level
    }));
}
```

### Workflow 4: Batch AI Processing

**Admin Action**: Trigger AI analysis for all pending studies

```
1. Admin clicks "Process All" in Django admin
2. Django queries all unprocessed studies
3. Django sends batch request to FastAPI
4. FastAPI queues each study for processing
5. FastAPI processes studies asynchronously
6. FastAPI updates Django database via API
7. Django displays progress in admin dashboard
```

**Code Example (Django admin action):**

```python
# In ai_analysis/admin.py
import httpx

@admin.action(description='Trigger AI analysis for selected studies')
async def trigger_ai_analysis(modeladmin, request, queryset):
    async with httpx.AsyncClient() as client:
        for study in queryset:
            response = await client.post(
                'http://localhost:8001/api/v1/ai/analyze',
                json={
                    'study_id': study.id,
                    'model_type': 'general',
                    'priority': 'high'
                }
            )
    
    messages.success(request, f'{queryset.count()} studies queued for AI analysis')
```

## API Integration Examples

### Example 1: Call FastAPI from Django

```python
import httpx
from asgiref.sync import async_to_sync

# Async version
async def get_ai_analysis_async(study_id):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f'http://localhost:8001/api/v1/ai/analysis/{study_id}'
        )
        return response.json()

# Sync version (for use in Django views)
def get_ai_analysis(study_id):
    return async_to_sync(get_ai_analysis_async)(study_id)
```

### Example 2: Call Django from FastAPI

```python
from fastapi import APIRouter
import httpx

router = APIRouter()

@router.post("/notify-django")
async def notify_django_of_completion(analysis_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            'http://localhost:8000/api/ai/completed/',
            json={'analysis_id': analysis_id}
        )
        return response.json()
```

### Example 3: Access Django ORM from FastAPI

```python
from fastapi import APIRouter
from asgiref.sync import sync_to_async
from django.apps import apps

router = APIRouter()

@router.get("/studies/{study_id}")
async def get_study(study_id: int):
    DicomStudy = apps.get_model('dicom_viewer', 'DicomStudy')
    
    @sync_to_async
    def get_study_data():
        study = DicomStudy.objects.get(id=study_id)
        return {
            'id': study.id,
            'patient_id': study.patient_id,
            'patient_name': study.patient_name,
            'modality': study.modality,
        }
    
    return await get_study_data()
```

### Example 4: Rust HTTP Client

```rust
use reqwest::Client;
use serde_json::json;

pub async fn notify_django(study_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    
    let response = client
        .post("http://localhost:8000/api/dicom/received/")
        .json(&json!({
            "study_id": study_id,
            "source": "rust_scp",
        }))
        .send()
        .await?;
    
    println!("Django response: {}", response.status());
    Ok(())
}
```

## Testing Examples

### Test FastAPI Endpoints

```bash
# Health check
curl http://localhost:8001/api/v1/health

# Upload DICOM
curl -X POST http://localhost:8001/api/v1/dicom/upload \
  -F "file=@test.dcm"

# Get AI analysis
curl http://localhost:8001/api/v1/ai/analysis/1

# Trigger AI analysis
curl -X POST http://localhost:8001/api/v1/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"study_id": 1, "model_type": "general"}'
```

### Test Django Endpoints

```bash
# Get worklist
curl http://localhost:8000/worklist/

# API endpoint
curl http://localhost:8000/api/studies/
```

### Test Rust SCP

```bash
# Send DICOM using dcmtk tools
dcmsend localhost 11112 test.dcm

# Or use storescu
storescu localhost 11112 test.dcm
```

## Performance Comparison

### Django Endpoint (Traditional)
```python
# Processing time: ~200-500ms per request
def upload_dicom(request):
    file = request.FILES['dicom']
    ds = pydicom.dcmread(file)
    # Process synchronously
    # Database operations
    # Return response
```

### FastAPI Endpoint (High Performance)
```python
# Processing time: ~50-100ms per request
@app.post("/dicom/upload")
async def upload_dicom(file: UploadFile):
    content = await file.read()
    # Async processing
    # Non-blocking operations
    # Return immediately
```

### Rust SCP (Ultra Performance)
```rust
// Processing time: ~10-20ms per DICOM
// Handles 100+ concurrent connections
// Zero-copy operations
```

## Best Practices

1. **Use Django for**: Web UI, admin, user management, complex business logic
2. **Use FastAPI for**: API endpoints, real-time operations, AI inference, streaming
3. **Use Rust for**: DICOM protocol, modality communication, high-performance tasks

4. **Communication**:
   - Django → FastAPI: HTTP/REST for async operations
   - FastAPI → Django: Webhooks for notifications
   - Rust → Django/FastAPI: HTTP POST for events

5. **Database**:
   - Share same PostgreSQL database
   - Django manages migrations
   - FastAPI uses read-only or specific tables
   - Rust writes minimal data, notifies Django

6. **Authentication**:
   - Django handles user auth
   - Share JWT tokens or sessions
   - FastAPI validates tokens
   - Rust trusts internal network

## Monitoring

```bash
# Check all services
curl http://localhost:8000/  # Django
curl http://localhost:8001/api/v1/health  # FastAPI
netstat -an | grep 11112  # Rust SCP

# View logs
tail -f logs/django.log
tail -f logs/fastapi.log
tail -f logs/rust_scp.log

# Docker logs
docker-compose logs -f django
docker-compose logs -f fastapi
docker-compose logs -f rust_scp
```

## Conclusion

This integration gives you:
- **Django**: Mature web framework with excellent ORM and admin
- **FastAPI**: High-performance async API for real-time operations
- **Rust**: Ultra-fast DICOM protocol implementation

Each tool is used for what it does best, creating a powerful, scalable PACS system.
