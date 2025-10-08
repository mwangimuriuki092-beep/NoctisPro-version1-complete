# Frontend Template Refinement Guide

## Overview

This document describes the updates needed to integrate the frontend templates with the new Rust DICOM SCP server and enhanced backend.

## What Was Created

### 1. Enhanced System Status Template
**File**: `/workspace/templates/system_status_enhanced.html`

**Features**:
- Real-time DICOM SCP status monitoring
- Connection test button
- Database statistics
- Storage information
- Comprehensive system health checks

**Usage**:
```python
# In views.py
from django.shortcuts import render

def system_status(request):
    return render(request, 'system_status_enhanced.html')
```

### 2. DICOM SCP Status Widget (JavaScript)
**File**: `/workspace/static/js/dicom-scp-status.js`

**Features**:
- Reusable widget for any page
- Auto-refresh every 30 seconds
- Connection testing
- Visual status indicators

**Usage in Templates**:
```html
{% load static %}

<!-- Add to any template -->
<div id="dicom-scp-status-widget"></div>

<!-- Include JavaScript -->
<script src="{% static 'js/dicom-scp-status.js' %}"></script>
```

## Templates That Need Updates

### High Priority (DICOM-Related)

#### 1. Worklist Dashboard (`worklist/dashboard.html`)
**Location**: `/workspace/templates/worklist/dashboard.html`

**Required Changes**:
Add DICOM SCP status card to the dashboard.

```html
<!-- Add after existing stat cards -->
<div class="col-md-3">
    <div class="card stat-card">
        <div class="card-body">
            <div id="dicom-scp-status-widget"></div>
        </div>
    </div>
</div>

<!-- Add at bottom of page -->
{% load static %}
<script src="{% static 'js/dicom-scp-status.js' %}"></script>
```

#### 2. Upload Page (`worklist/upload.html`)
**Location**: `/workspace/templates/worklist/upload.html`

**Required Changes**:
Add DICOM SCP connection status and alternative upload method.

```html
<!-- Add to page content -->
<div class="alert alert-info">
    <h5><i class="fas fa-info-circle"></i> DICOM Upload Methods</h5>
    <p><strong>Method 1:</strong> Send directly from modality to port 11112</p>
    <p><strong>Method 2:</strong> Upload via web interface (below)</p>
    <div id="dicom-scp-status-widget"></div>
</div>

<!-- Add at bottom -->
{% load static %}
<script src="{% static 'js/dicom-scp-status.js' %}"></script>
```

#### 3. Study List (`worklist/study_list.html`)
**Location**: `/workspace/templates/worklist/study_list.html`

**Required Changes**:
Add quick status indicator in header.

```html
<!-- Add to header section -->
<div class="header-actions">
    <div class="dicom-scp-mini-status" id="scp-mini-status">
        <span id="scp-indicator" class="status-dot"></span>
        <span id="scp-text">SCP: Checking...</span>
    </div>
</div>

<script>
// Check DICOM SCP status
fetch('/dicom/api/system/status/')
    .then(r => r.json())
    .then(data => {
        const indicator = document.getElementById('scp-indicator');
        const text = document.getElementById('scp-text');
        if (data.stats.scp_server && data.stats.scp_server.connected) {
            indicator.className = 'status-dot connected';
            text.textContent = 'SCP: Connected';
        } else {
            indicator.className = 'status-dot disconnected';
            text.textContent = 'SCP: Offline';
        }
    });
</script>

<style>
.dicom-scp-mini-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 20px;
    font-size: 12px;
}
.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}
.status-dot.connected {
    background: #00ff88;
    box-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
}
.status-dot.disconnected {
    background: #ff4444;
}
</style>
```

### Medium Priority (Admin & Monitoring)

#### 4. Admin Panel Dashboard (`admin_panel/dashboard.html`)
**Location**: `/workspace/templates/admin_panel/dashboard.html`

**Required Changes**:
Add DICOM SCP monitoring section.

```html
<!-- Add new monitoring card -->
<div class="col-md-6">
    <div class="card">
        <div class="card-header">
            <h5><i class="fas fa-hospital"></i> DICOM Services</h5>
        </div>
        <div class="card-body">
            <div id="dicom-scp-status-widget"></div>
            
            <div class="mt-3">
                <h6>Recent DICOM Activity</h6>
                <div id="recent-dicom-activity">
                    <!-- Will be populated via AJAX -->
                </div>
            </div>
        </div>
    </div>
</div>

{% load static %}
<script src="{% static 'js/dicom-scp-status.js' %}"></script>
```

#### 5. System Monitoring (`admin_panel/system_monitoring.html`)
**Location**: `/workspace/templates/admin_panel/system_monitoring.html`

**Required Changes**:
Integrate with enhanced system status.

```html
<!-- Replace or enhance existing monitoring with -->
<div class="row">
    <div class="col-md-12">
        <h3>System Components Status</h3>
        <div class="component-status">
            <!-- Django -->
            <div class="component-item">
                <i class="fas fa-check-circle text-success"></i>
                Django Web Application
            </div>
            
            <!-- DICOM SCP -->
            <div class="component-item" id="dicom-scp-component">
                <i class="fas fa-spinner fa-spin text-warning"></i>
                DICOM SCP Server - Checking...
            </div>
            
            <!-- Database -->
            <div class="component-item" id="database-component">
                <i class="fas fa-spinner fa-spin text-warning"></i>
                PostgreSQL Database - Checking...
            </div>
            
            <!-- Redis -->
            <div class="component-item">
                <i class="fas fa-check-circle text-success"></i>
                Redis Cache
            </div>
            
            <!-- Celery -->
            <div class="component-item">
                <i class="fas fa-check-circle text-success"></i>
                Celery Workers
            </div>
        </div>
    </div>
</div>

<script>
// Check component status
fetch('/dicom/api/system/status/')
    .then(r => r.json())
    .then(data => {
        // Update DICOM SCP status
        const scpComponent = document.getElementById('dicom-scp-component');
        if (data.stats.scp_server && data.stats.scp_server.connected) {
            scpComponent.innerHTML = '<i class="fas fa-check-circle text-success"></i> DICOM SCP Server - Connected (Port ' + data.stats.scp_server.port + ')';
        } else {
            scpComponent.innerHTML = '<i class="fas fa-times-circle text-danger"></i> DICOM SCP Server - Disconnected';
        }
        
        // Update Database status
        const dbComponent = document.getElementById('database-component');
        dbComponent.innerHTML = `<i class="fas fa-check-circle text-success"></i> PostgreSQL Database - ${data.stats.patients} patients, ${data.stats.studies} studies`;
    })
    .catch(error => {
        console.error('Error checking status:', error);
    });
</script>
```

### Low Priority (Optional Enhancements)

#### 6. Base Template (`base.html`)
**Location**: `/workspace/templates/base.html`

**Optional Addition**:
Add global DICOM SCP status indicator to navigation bar.

```html
<!-- Add to navigation bar -->
<li class="nav-item">
    <span class="nav-link" id="global-scp-status">
        <i class="fas fa-circle text-secondary"></i> SCP
    </span>
</li>

<script>
// Global status checker
setInterval(function() {
    fetch('/dicom/api/system/status/')
        .then(r => r.json())
        .then(data => {
            const statusElem = document.getElementById('global-scp-status');
            if (data.stats.scp_server && data.stats.scp_server.connected) {
                statusElem.innerHTML = '<i class="fas fa-circle text-success"></i> SCP';
                statusElem.title = 'DICOM SCP Connected';
            } else {
                statusElem.innerHTML = '<i class="fas fa-circle text-danger"></i> SCP';
                statusElem.title = 'DICOM SCP Offline';
            }
        });
}, 60000); // Check every minute
</script>
```

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Enhanced system status page (DONE)
2. ✅ DICOM SCP status widget (DONE)
3. Update worklist dashboard
4. Update upload page

### Phase 2: Important (Do Soon)
5. Update study list
6. Update admin dashboard
7. Update system monitoring

### Phase 3: Optional (Nice to Have)
8. Add to base template
9. Add to other admin pages
10. Create dedicated DICOM monitoring page

## API Integration

All templates should integrate with these endpoints:

### 1. System Status
```javascript
fetch('/dicom/api/system/status/')
    .then(response => response.json())
    .then(data => {
        console.log('System stats:', data.stats);
        console.log('SCP status:', data.stats.scp_server);
    });
```

**Response Format**:
```json
{
  "status": "success",
  "stats": {
    "patients": 123,
    "studies": 456,
    "series": 789,
    "images": 1234,
    "storage": {
      "total_files": 1234,
      "total_size_mb": 45678
    },
    "scp_server": {
      "connected": true,
      "message": "Connection successful",
      "host": "localhost",
      "port": 11112
    }
  }
}
```

### 2. Test DICOM Connection
```javascript
fetch('/dicom/api/scp/test/', {
    method: 'POST',
    headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
    }
})
.then(response => response.json())
.then(data => {
    console.log('Test result:', data);
});
```

## Quick Update Script

To quickly update all templates, you can use this approach:

### Option 1: Include Widget Globally
Add to `base.html` footer:
```html
<script src="{% static 'js/dicom-scp-status.js' %}"></script>
```

Then in any template, just add:
```html
<div id="dicom-scp-status-widget"></div>
```

### Option 2: Template Tag (Recommended)
Create `/workspace/dicom_viewer/templatetags/dicom_tags.py`:

```python
from django import template

register = template.Library()

@register.inclusion_tag('includes/dicom_scp_widget.html')
def dicom_scp_widget():
    return {}
```

Create `/workspace/templates/includes/dicom_scp_widget.html`:
```html
{% load static %}
<div id="dicom-scp-status-widget"></div>
<script src="{% static 'js/dicom-scp-status.js' %}"></script>
```

Then use in any template:
```html
{% load dicom_tags %}
{% dicom_scp_widget %}
```

## Testing the Updates

After updating templates:

1. **Test Widget Loading**:
   - Open any page with the widget
   - Check browser console for errors
   - Verify widget appears

2. **Test Status Updates**:
   - Start DICOM SCP: `./start-dev.sh`
   - Widget should show "Connected"
   - Stop DICOM SCP: `docker-compose stop dicom_scp`
   - Widget should show "Disconnected"

3. **Test Connection Button**:
   - Click "Test Connection"
   - Should show success/failure message
   - Check network tab for API call

## Troubleshooting

### Widget Not Showing
**Problem**: Empty div, no widget appears
**Solution**: 
- Check if JavaScript file is loaded (Network tab)
- Verify container ID matches: `dicom-scp-status-widget`
- Check console for JavaScript errors

### Status Always "Checking..."
**Problem**: Widget shows "Checking..." but never updates
**Solution**:
- Verify API endpoint is accessible: `/dicom/api/system/status/`
- Check if DICOM SCP server is running
- Check browser console for CORS or permission errors

### Connection Test Fails
**Problem**: Test button shows error
**Solution**:
- Verify CSRF token is present
- Check if user is authenticated
- Verify DICOM SCP is running on port 11112

## Summary

**Status**: Templates created and ready for integration

**What's Done**:
- ✅ Enhanced system status template
- ✅ Reusable DICOM SCP status widget
- ✅ JavaScript for real-time monitoring
- ✅ API integration examples
- ✅ Implementation guide

**What Needs To Be Done**:
- Update existing templates to include the widget
- Add DICOM SCP status to dashboards
- Integrate with admin monitoring pages

**Estimated Time**: 2-3 hours to update all templates

**Quick Start**:
1. Copy `dicom-scp-status.js` to static folder (DONE)
2. Add `{% load static %}<script src="{% static 'js/dicom-scp-status.js' %}"></script>` to templates
3. Add `<div id="dicom-scp-status-widget"></div>` where you want the widget

---

**The core components are ready. Templates just need the widget added to show DICOM SCP status!**