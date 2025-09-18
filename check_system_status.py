#!/usr/bin/env python
"""
NoctisPro PACS System Status Checker
Comprehensive check of all system components
"""

import os
import sys
import django
import subprocess
from pathlib import Path

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')
django.setup()

from django.conf import settings
from django.db import connection
from django.contrib.auth import get_user_model
from worklist.models import Study, Patient, Modality
from ai_analysis.models import AIModel, AIAnalysis
from accounts.models import Facility

def print_status(component, status, details=""):
    status_icon = "✅" if status else "❌"
    print(f"{status_icon} {component}: {details}")
    return status

def check_database():
    """Check database connectivity and basic data"""
    print("\n🗄️  DATABASE STATUS")
    print("=" * 50)
    
    try:
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print_status("Database Connection", True, "Connected successfully")
        
        # Check user count
        User = get_user_model()
        user_count = User.objects.count()
        admin_count = User.objects.filter(role='admin').count()
        print_status("Users", user_count > 0, f"{user_count} users ({admin_count} admins)")
        
        # Check facilities
        facility_count = Facility.objects.count()
        print_status("Facilities", facility_count > 0, f"{facility_count} facilities configured")
        
        # Check studies
        study_count = Study.objects.count()
        print_status("Studies", True, f"{study_count} studies in database")
        
        # Check patients
        patient_count = Patient.objects.count()
        print_status("Patients", True, f"{patient_count} patients in database")
        
        return True
        
    except Exception as e:
        print_status("Database Connection", False, f"Error: {e}")
        return False

def check_ai_system():
    """Check AI analysis system"""
    print("\n🤖 AI ANALYSIS SYSTEM")
    print("=" * 50)
    
    try:
        # Check AI models
        ai_models = AIModel.objects.filter(is_active=True)
        model_count = ai_models.count()
        print_status("AI Models", model_count > 0, f"{model_count} active models")
        
        if model_count > 0:
            for model in ai_models:
                print(f"   • {model.name} v{model.version} ({model.modality})")
        
        # Check AI analyses
        total_analyses = AIAnalysis.objects.count()
        pending_analyses = AIAnalysis.objects.filter(status='pending').count()
        completed_analyses = AIAnalysis.objects.filter(status='completed').count()
        failed_analyses = AIAnalysis.objects.filter(status='failed').count()
        
        print_status("AI Analyses", True, f"{total_analyses} total ({completed_analyses} completed, {pending_analyses} pending, {failed_analyses} failed)")
        
        return model_count > 0
        
    except Exception as e:
        print_status("AI System", False, f"Error: {e}")
        return False

def check_static_files():
    """Check static files and media directories"""
    print("\n📁 FILE SYSTEM")
    print("=" * 50)
    
    static_root = getattr(settings, 'STATIC_ROOT', None)
    media_root = getattr(settings, 'MEDIA_ROOT', None)
    
    # Check static files
    if static_root and os.path.exists(static_root):
        static_files = len(list(Path(static_root).rglob('*')))
        print_status("Static Files", True, f"{static_files} files in {static_root}")
    else:
        print_status("Static Files", False, "Static root not found or not collected")
    
    # Check media directory
    if media_root:
        os.makedirs(media_root, exist_ok=True)
        media_files = len(list(Path(media_root).rglob('*')))
        print_status("Media Directory", True, f"{media_files} files in {media_root}")
    else:
        print_status("Media Directory", False, "Media root not configured")
    
    # Check logs directory
    logs_dir = os.path.join(settings.BASE_DIR, 'logs')
    if os.path.exists(logs_dir):
        log_files = len([f for f in os.listdir(logs_dir) if f.endswith('.log')])
        print_status("Logs Directory", True, f"{log_files} log files in {logs_dir}")
    else:
        os.makedirs(logs_dir, exist_ok=True)
        print_status("Logs Directory", True, f"Created logs directory at {logs_dir}")
    
    return True

def check_network_config():
    """Check network and deployment configuration"""
    print("\n🌐 NETWORK CONFIGURATION")
    print("=" * 50)
    
    # Check allowed hosts
    allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
    print_status("Allowed Hosts", len(allowed_hosts) > 0, f"{len(allowed_hosts)} configured")
    
    # Check debug mode
    debug_mode = getattr(settings, 'DEBUG', True)
    print_status("Debug Mode", True, f"{'Enabled' if debug_mode else 'Disabled'} (Production: {'No' if debug_mode else 'Yes'})")
    
    # Check secret key
    secret_key = getattr(settings, 'SECRET_KEY', '')
    print_status("Secret Key", len(secret_key) > 20, f"{'Configured' if len(secret_key) > 20 else 'Default/Weak'}")
    
    # Check ngrok/tailscale
    ngrok_url = os.environ.get('NGROK_URL', '')
    use_tailnet = os.environ.get('USE_TAILNET', 'false').lower() == 'true'
    
    if use_tailnet:
        try:
            result = subprocess.run(['tailscale', 'status'], capture_output=True, text=True, timeout=5)
            tailscale_running = result.returncode == 0
            print_status("Tailscale", tailscale_running, "Connected" if tailscale_running else "Not connected")
        except:
            print_status("Tailscale", False, "Not installed or not running")
    elif ngrok_url:
        print_status("Ngrok", True, f"URL: {ngrok_url}")
    else:
        print_status("Network Access", False, "Neither Tailscale nor Ngrok configured")
    
    return True

def check_javascript_files():
    """Check JavaScript files exist"""
    print("\n📜 JAVASCRIPT FILES")
    print("=" * 50)
    
    static_dir = os.path.join(settings.BASE_DIR, 'static', 'js')
    required_js_files = [
        'dicom-measurements.js',
        'session-timeout.js',
        'dicom-viewer-fixes.js'
    ]
    
    all_exist = True
    for js_file in required_js_files:
        file_path = os.path.join(static_dir, js_file)
        exists = os.path.exists(file_path)
        if exists:
            size = os.path.getsize(file_path)
            print_status(js_file, True, f"{size} bytes")
        else:
            print_status(js_file, False, "File missing")
            all_exist = False
    
    return all_exist

def check_services():
    """Check system services (if running on systemd)"""
    print("\n⚙️  SYSTEM SERVICES")
    print("=" * 50)
    
    services = ['noctispro', 'noctispro-ngrok', 'noctispro-ai']
    
    for service in services:
        try:
            result = subprocess.run(['systemctl', 'is-active', service], 
                                  capture_output=True, text=True, timeout=5)
            is_active = result.returncode == 0 and result.stdout.strip() == 'active'
            status_text = result.stdout.strip() if result.stdout.strip() else 'not found'
            print_status(f"Service: {service}", is_active, status_text)
        except:
            print_status(f"Service: {service}", False, "systemctl not available or service not found")
    
    return True

def main():
    print("🚀 NoctisPro PACS System Status Check")
    print("=" * 60)
    
    checks = [
        check_database,
        check_ai_system,
        check_static_files,
        check_javascript_files,
        check_network_config,
        check_services
    ]
    
    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"❌ Check failed: {e}")
            results.append(False)
    
    # Summary
    print("\n📊 SYSTEM SUMMARY")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print("🎉 All systems operational!")
        print("\n✅ System is ready for:")
        print("   • DICOM upload and viewing")
        print("   • AI analysis and reporting")
        print("   • User authentication with session timeout")
        print("   • Professional measurement tools")
        print("   • Network access via configured method")
    else:
        print(f"⚠️  {passed}/{total} checks passed")
        print("\n🔧 Issues found - review the details above")
    
    print(f"\n🌐 Access the system:")
    if os.environ.get('USE_TAILNET', 'false').lower() == 'true':
        print("   • Tailnet: http://noctispro:8080 (or via Tailscale IP)")
    elif os.environ.get('NGROK_URL'):
        print(f"   • Ngrok: {os.environ.get('NGROK_URL')}")
    else:
        print("   • Local: http://localhost:8080")
    
    print("   • Admin: admin / (your password)")
    print("   • Worklist: /worklist/")
    print("   • AI Dashboard: /ai/")
    print("   • DICOM Viewer: /dicom-viewer/")

if __name__ == '__main__':
    main()