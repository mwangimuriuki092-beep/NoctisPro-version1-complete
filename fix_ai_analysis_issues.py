#!/usr/bin/env python3
"""
Quick fix script for AI analysis and DICOM viewer issues
"""

import os
import sys
import django
import subprocess
import time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')
sys.path.append('/workspace')

try:
    django.setup()
except Exception as e:
    print(f"Django setup failed: {e}")
    sys.exit(1)

from django.core.management import call_command
from django.db import connection
from ai_analysis.models import AIAnalysis


def fix_database_issues():
    """Fix database locking and performance issues"""
    print("🔧 Fixing database issues...")
    
    try:
        # Run the database fix command
        call_command('fix_database_locks', '--optimize-db', '--max-analyses=20, --retry-failed')
        print("✅ Database issues fixed")
        return True
    except Exception as e:
        print(f"❌ Database fix failed: {e}")
        return False


def check_ai_analysis_status():
    """Check current AI analysis status"""
    print("📊 Checking AI analysis status...")
    
    try:
        pending = AIAnalysis.objects.filter(status='pending').count()
        processing = AIAnalysis.objects.filter(status='processing').count()
        completed = AIAnalysis.objects.filter(status='completed').count()
        failed = AIAnalysis.objects.filter(status='failed').count()
        
        print(f"   • Pending: {pending}")
        print(f"   • Processing: {processing}")
        print(f"   • Completed: {completed}")
        print(f"   • Failed: {failed}")
        
        return {
            'pending': pending,
            'processing': processing,
            'completed': completed,
            'failed': failed
        }
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        return None


def restart_services():
    """Restart relevant services"""
    print("🔄 Restarting services...")
    
    try:
        # Collect static files
        call_command('collectstatic', '--noinput', verbosity=0)
        print("✅ Static files collected")
        
        # Clear any cached data
        from django.core.cache import cache
        cache.clear()
        print("✅ Cache cleared")
        
        return True
    except Exception as e:
        print(f"❌ Service restart failed: {e}")
        return False


def main():
    """Main fix routine"""
    print("🏥 NoctisPro AI Analysis & DICOM Viewer Fix")
    print("=" * 50)
    
    # Check initial status
    initial_status = check_ai_analysis_status()
    
    # Fix database issues
    if not fix_database_issues():
        print("❌ Critical: Database fixes failed")
        return False
    
    # Wait a moment for changes to take effect
    time.sleep(2)
    
    # Check final status
    print("\n📊 Final status check...")
    final_status = check_ai_analysis_status()
    
    # Restart services
    if not restart_services():
        print("⚠️ Warning: Service restart had issues")
    
    # Summary
    print("\n📋 Fix Summary:")
    print("=" * 30)
    
    if initial_status and final_status:
        pending_change = final_status['pending'] - initial_status['pending']
        failed_change = final_status['failed'] - initial_status['failed']
        completed_change = final_status['completed'] - initial_status['completed']
        
        print(f"   • Pending analyses: {initial_status['pending']} → {final_status['pending']} ({pending_change:+d})")
        print(f"   • Failed analyses: {initial_status['failed']} → {final_status['failed']} ({failed_change:+d})")
        print(f"   • Completed analyses: {initial_status['completed']} → {final_status['completed']} ({completed_change:+d})")
    
    print("\n✅ Fix routine completed!")
    print("\n🔍 Next steps:")
    print("   1. Refresh your browser")
    print("   2. Try loading a DICOM study")
    print("   3. Check if images display properly")
    print("   4. Monitor the console for any remaining errors")
    
    return True


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Fix interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fix failed with error: {e}")
        sys.exit(1)