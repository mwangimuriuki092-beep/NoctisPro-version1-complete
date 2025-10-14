# FastAPI + Django + Rust Integration Guide for PACS System

## Overview

This guide explains how to integrate FastAPI with your existing Django and Rust PACS system. Each technology serves a specific purpose:

- **Django**: Main web application, admin interface, user management, authentication
- **FastAPI**: High-performance API endpoints for real-time operations, DICOM processing, AI inference
- **Rust**: Low-level DICOM SCP server for receiving DICOM from medical devices

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer / Nginx               │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │ Django  │    │ FastAPI  │    │   Rust   │
    │  :8000  │    │  :8001   │    │  :11112  │
    └─────────┘    └──────────┘    └──────────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                    ┌──────────┐
                    │PostgreSQL│
                    └──────────┘
```

## Why This Architecture?

### Django (Port 8000)
**Best for:**
- User interface and templates
- Admin dashboard
- User authentication and sessions
- ORM-heavy operations
- Background tasks with Celery

**Use cases in PACS:**
- Patient management UI
- User login and permissions
- Report generation views
- Worklist management interface

### FastAPI (Port 8001)
**Best for:**
- High-performance API endpoints
- Real-time data streaming
- Async operations
- AI model inference
- DICOM processing APIs

**Use cases in PACS:**
- DICOM metadata extraction API
- AI analysis endpoints
- Real-time image processing
- WebSocket for live updates
- Fast DICOM query/retrieve

### Rust (Port 11112)
**Best for:**
- DICOM C-STORE SCP (receiving from modalities)
- Low-level DICOM protocol handling
- High-performance file operations
- Memory-efficient image processing

**Use cases in PACS:**
- DICOM SCP server
- Direct modality connections
- High-speed DICOM transfers

## Implementation Steps

### 1. Install FastAPI Dependencies

Add to `requirements.txt`:
```python
# FastAPI and dependencies
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
httpx==0.25.1  # For inter-service communication
```

### 2. Create FastAPI Application Structure

```
fastapi_app/
├── __init__.py
├── main.py              # FastAPI application entry point
├── config.py            # Configuration
├── dependencies.py      # Shared dependencies
├── routers/
│   ├── __init__.py
│   ├── dicom.py        # DICOM-related endpoints
│   ├── ai.py           # AI analysis endpoints
│   └── viewer.py       # Viewer API endpoints
├── models/
│   ├── __init__.py
│   └── schemas.py      # Pydantic models
└── services/
    ├── __init__.py
    ├── dicom_service.py
    └── ai_service.py
```

### 3. Share Database Between Django and FastAPI

FastAPI can access the same PostgreSQL database using SQLAlchemy or async libraries.

**Option A: Using Django ORM via sync_to_async** (Recommended for tight integration)
```python
from asgiref.sync import sync_to_async
from django.apps import apps

# In FastAPI
@app.get("/api/v1/studies/{study_id}")
async def get_study(study_id: int):
    DicomStudy = apps.get_model('dicom_viewer', 'DicomStudy')
    study = await sync_to_async(DicomStudy.objects.get)(id=study_id)
    return study
```

**Option B: Using SQLAlchemy** (Better for FastAPI independence)
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# Access same database
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/noctispro"
engine = create_async_engine(DATABASE_URL)
```

### 4. Share Authentication Between Django and FastAPI

**Method 1: JWT Tokens**
```python
# Django generates JWT
from rest_framework_simplejwt.tokens import AccessToken

# FastAPI validates JWT
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Validate token against Django's secret key
    # Return user info
```

**Method 2: Session Sharing** (Simpler but requires Redis)
```python
# Both Django and FastAPI use same Redis session store
# Django creates session
# FastAPI reads session from Redis using session_id cookie
```

### 5. Communication Between Services

**Django → FastAPI**
```python
# In Django
import httpx

async def call_fastapi_endpoint():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8001/api/v1/analyze",
            json={"study_id": 123}
        )
        return response.json()
```

**FastAPI → Django**
```python
# In FastAPI
import httpx

async def call_django_endpoint():
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/studies/")
        return response.json()
```

**Rust → Django/FastAPI**
```rust
// In Rust
use reqwest;

async fn notify_django_of_new_study(study_id: &str) -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let res = client
        .post("http://localhost:8000/api/dicom/received/")
        .json(&json!({"study_id": study_id}))
        .send()
        .await?;
    Ok(())
}
```

### 6. Deployment Configuration

**Nginx Configuration** (`/etc/nginx/sites-available/noctispro`)
```nginx
server {
    listen 80;
    server_name pacs.yourdomain.com;

    # Django (UI and admin)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # FastAPI (High-performance APIs)
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket for FastAPI
    location /ws/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location /static/ {
        alias /path/to/static/;
    }
}
```

**Systemd Services**

`/etc/systemd/system/noctispro-fastapi.service`
```ini
[Unit]
Description=NoctisPro FastAPI Service
After=network.target

[Service]
User=noctispro
Group=noctispro
WorkingDirectory=/path/to/noctispro
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

**Docker Compose**
```yaml
version: '3.8'

services:
  django:
    build: .
    command: gunicorn noctis_pro.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  fastapi:
    build: .
    command: uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8001
    volumes:
      - .:/app
    ports:
      - "8001:8001"
    depends_on:
      - db
      - redis

  rust_scp:
    build: ./dicom_scp_server
    ports:
      - "11112:11112"
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: noctispro
      POSTGRES_USER: noctispro
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - django
      - fastapi
```

## Use Case Examples

### Example 1: DICOM Upload and Processing Flow

1. **User uploads DICOM** → Django handles file upload
2. **Django saves to storage** → Triggers async task
3. **Django calls FastAPI** → For fast DICOM parsing
4. **FastAPI extracts metadata** → Stores in database
5. **FastAPI triggers AI analysis** → Async processing
6. **Results stored** → Django displays in UI

### Example 2: Modality Sends DICOM

1. **Modality sends C-STORE** → Rust SCP receives
2. **Rust saves file** → Notifies Django via webhook
3. **Django creates study record** → Calls FastAPI
4. **FastAPI processes DICOM** → Extracts metadata
5. **FastAPI runs AI** → Returns results
6. **Django updates UI** → Via WebSocket

### Example 3: Real-time Viewer

1. **User opens viewer** → Django serves page
2. **Viewer requests images** → FastAPI streaming endpoint
3. **FastAPI streams frames** → Server-Sent Events or WebSocket
4. **User adjusts W/L** → FastAPI processes in real-time
5. **AI overlay requested** → FastAPI inference endpoint

## Endpoint Distribution Strategy

### Django Endpoints (Keep)
- `/` - Homepage
- `/admin/` - Django admin
- `/accounts/` - User management
- `/worklist/` - Worklist UI
- `/reports/` - Report UI
- `/dicom-viewer/` - Viewer page (HTML)

### FastAPI Endpoints (New)
- `/api/v1/dicom/upload` - Fast DICOM upload
- `/api/v1/dicom/parse` - DICOM parsing
- `/api/v1/ai/analyze` - AI inference
- `/api/v1/viewer/stream/{study_id}` - Image streaming
- `/api/v1/viewer/frames/{instance_id}` - Frame retrieval
- `/ws/viewer/{study_id}` - Real-time viewer WebSocket

### Rust Endpoints (Keep)
- Port 11112 - DICOM C-STORE SCP
- Port 11113 - DICOM C-FIND SCP (optional)
- Port 11114 - DICOM C-MOVE SCP (optional)

## Best Practices

1. **Use FastAPI for new high-performance APIs**
   - AI inference endpoints
   - Real-time data streaming
   - Heavy computational tasks

2. **Keep Django for**
   - User interface
   - Admin operations
   - Complex business logic with ORM

3. **Use Rust for**
   - DICOM protocol implementation
   - Direct modality communication
   - Performance-critical operations

4. **Share resources efficiently**
   - Single PostgreSQL database
   - Shared Redis for caching and sessions
   - Common file storage

5. **Security**
   - Use shared authentication (JWT or sessions)
   - Validate all requests
   - Use HTTPS in production
   - CORS configuration for cross-origin requests

6. **Monitoring**
   - Use same logging infrastructure
   - Centralized metrics (Prometheus)
   - Distributed tracing (OpenTelemetry)

## Performance Considerations

- **Django**: ~100-500 req/s (depends on database queries)
- **FastAPI**: ~1000-5000 req/s (async, minimal overhead)
- **Rust**: ~10000+ req/s (compiled, zero-cost abstractions)

Use each tool for what it does best:
- Django: Complex business logic, ORM operations
- FastAPI: API endpoints, real-time operations
- Rust: Protocol implementation, low-level operations

## Testing

### Test Django endpoints
```bash
curl http://localhost:8000/worklist/
```

### Test FastAPI endpoints
```bash
curl http://localhost:8001/api/v1/health
curl -X POST http://localhost:8001/api/v1/dicom/parse -F "file=@test.dcm"
```

### Test Rust SCP
```bash
# Use DICOM tool to send C-STORE
dcmsend localhost 11112 test.dcm
```

## Migration Strategy

1. **Phase 1**: Add FastAPI alongside Django
   - Create FastAPI app structure
   - Set up basic endpoints
   - Test with new features only

2. **Phase 2**: Move performance-critical APIs
   - Identify slow Django endpoints
   - Reimplement in FastAPI
   - A/B test performance

3. **Phase 3**: Optimize integration
   - Fine-tune communication
   - Optimize database queries
   - Add caching layer

4. **Phase 4**: Full production
   - Load balancing
   - Monitoring
   - Scaling as needed

## Conclusion

This architecture gives you:
- **Flexibility**: Use the right tool for each job
- **Performance**: FastAPI for speed, Django for features
- **Scalability**: Scale services independently
- **Maintainability**: Clear separation of concerns

Your PACS system will have:
- Django for user-facing features and admin
- FastAPI for high-performance APIs and real-time operations
- Rust for DICOM protocol and modality communication
