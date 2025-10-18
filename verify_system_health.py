#!/usr/bin/env python3
"""
NoctisPro PACS System Health Check
Comprehensive verification of DICOM receiving and viewing capabilities
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')

import django
django.setup()

from django.conf import settings
from worklist.models import Study, Series, DicomImage, Modality, Patient, Facility
from accounts.models import User

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SystemHealthChecker:
    """Comprehensive system health verification"""
    
    def __init__(self):
        self.checks_passed = 0
        self.checks_failed = 0
        self.warnings = []
        
    def print_header(self, text):
        """Print formatted header"""
        print("\n" + "=" * 80)
        print(f"  {text}")
        print("=" * 80)
        
    def check(self, name, condition, error_msg="", warning=False):
        """Perform a check and log result"""
        if condition:
            self.checks_passed += 1
            print(f"  ✓ {name}")
            return True
        else:
            if warning:
                self.warnings.append(f"{name}: {error_msg}")
                print(f"  ⚠ {name}: {error_msg}")
            else:
                self.checks_failed += 1
                print(f"  ✗ {name}: {error_msg}")
            return False
    
    def run_all_checks(self):
        """Run all system checks"""
        self.print_header("NOCTISPRO PACS SYSTEM HEALTH CHECK")
        
        # 1. Directory Structure
        self.check_directory_structure()
        
        # 2. Database Configuration
        self.check_database()
        
        # 3. DICOM Storage
        self.check_dicom_storage()
        
        # 4. User Accounts
        self.check_user_accounts()
        
        # 5. Facilities
        self.check_facilities()
        
        # 6. DICOM Data
        self.check_dicom_data()
        
        # 7. Configuration
        self.check_configuration()
        
        # 8. File Permissions
        self.check_permissions()
        
        # Print Summary
        self.print_summary()
        
    def check_directory_structure(self):
        """Verify directory structure"""
        self.print_header("Directory Structure")
        
        required_dirs = [
            ('Media Root', settings.MEDIA_ROOT),
            ('DICOM Root', settings.DICOM_ROOT if hasattr(settings, 'DICOM_ROOT') else settings.MEDIA_ROOT / 'dicom'),
            ('DICOM Received', settings.MEDIA_ROOT / 'dicom' / 'received'),
            ('DICOM Thumbnails', settings.MEDIA_ROOT / 'dicom' / 'thumbnails'),
            ('Static Files', settings.STATIC_ROOT),
            ('Logs', BASE_DIR / 'logs'),
        ]
        
        for name, path in required_dirs:
            path = Path(path)
            exists = path.exists() and path.is_dir()
            self.check(name, exists, f"Directory not found: {path}")
            if not exists:
                try:
                    path.mkdir(parents=True, exist_ok=True)
                    logger.info(f"Created directory: {path}")
                except Exception as e:
                    logger.error(f"Failed to create {path}: {e}")
    
    def check_database(self):
        """Check database connectivity and tables"""
        self.print_header("Database Configuration")
        
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            self.check("Database Connection", True)
        except Exception as e:
            self.check("Database Connection", False, str(e))
            return
        
        # Check essential tables
        models_to_check = [
            ('Users', User),
            ('Facilities', Facility),
            ('Patients', Patient),
            ('Studies', Study),
            ('Series', Series),
            ('DICOM Images', DicomImage),
            ('Modalities', Modality),
        ]
        
        for name, model in models_to_check:
            try:
                count = model.objects.count()
                self.check(f"{name} Table", True)
                print(f"    → {count} records")
            except Exception as e:
                self.check(f"{name} Table", False, str(e))
    
    def check_dicom_storage(self):
        """Check DICOM storage configuration"""
        self.print_header("DICOM Storage")
        
        dicom_root = settings.MEDIA_ROOT / 'dicom'
        
        # Check storage directories
        storage_dirs = [
            'received',
            'thumbnails',
            'professional',
        ]
        
        for dir_name in storage_dirs:
            dir_path = dicom_root / dir_name
            exists = dir_path.exists()
            self.check(f"DICOM/{dir_name}", exists, f"Missing: {dir_path}")
            
            if exists:
                # Check write permissions
                test_file = dir_path / '.test_write'
                try:
                    test_file.touch()
                    test_file.unlink()
                    self.check(f"  Write Permission", True)
                except Exception as e:
                    self.check(f"  Write Permission", False, str(e))
        
        # Check for existing DICOM files
        total_files = 0
        for root, dirs, files in os.walk(dicom_root):
            total_files += len([f for f in files if f.endswith('.dcm')])
        
        print(f"  → Total DICOM files: {total_files}")
    
    def check_user_accounts(self):
        """Check user accounts"""
        self.print_header("User Accounts")
        
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        admin_users = User.objects.filter(is_admin=True).count()
        radiologists = User.objects.filter(role='radiologist').count()
        
        self.check("Users Exist", total_users > 0, "No users found")
        print(f"    → Total users: {total_users}")
        print(f"    → Active users: {active_users}")
        print(f"    → Administrators: {admin_users}")
        print(f"    → Radiologists: {radiologists}")
        
        if total_users == 0:
            print("  ⚠ No users found. Create a superuser with: python manage.py createsuperuser")
    
    def check_facilities(self):
        """Check facility configuration"""
        self.print_header("Facilities")
        
        total_facilities = Facility.objects.count()
        active_facilities = Facility.objects.filter(is_active=True).count()
        
        self.check("Facilities Exist", total_facilities > 0, 
                  "No facilities configured", warning=True)
        
        if total_facilities > 0:
            print(f"    → Total facilities: {total_facilities}")
            print(f"    → Active facilities: {active_facilities}")
            
            # List facilities with AE titles
            for facility in Facility.objects.all()[:5]:
                ae_title = getattr(facility, 'ae_title', 'N/A')
                status = "Active" if facility.is_active else "Inactive"
                print(f"    → {facility.name} (AET: {ae_title}) - {status}")
    
    def check_dicom_data(self):
        """Check DICOM data in database"""
        self.print_header("DICOM Data")
        
        # Count studies
        total_studies = Study.objects.count()
        recent_studies = Study.objects.filter(
            upload_date__gte=datetime.now().date()
        ).count() if Study.objects.exists() else 0
        
        self.check("Studies Present", total_studies >= 0, warning=True)
        print(f"    → Total studies: {total_studies}")
        print(f"    → Recent studies (today): {recent_studies}")
        
        if total_studies > 0:
            # Count series and images
            total_series = Series.objects.count()
            total_images = DicomImage.objects.count()
            
            print(f"    → Total series: {total_series}")
            print(f"    → Total images: {total_images}")
            
            # Check for studies with images
            studies_with_images = Study.objects.filter(
                series__images__isnull=False
            ).distinct().count()
            print(f"    → Studies with images: {studies_with_images}")
            
            # Show recent study
            latest_study = Study.objects.order_by('-upload_date').first()
            if latest_study:
                print(f"    → Latest study: {latest_study.accession_number} "
                      f"({latest_study.modality.code if latest_study.modality else 'N/A'})")
    
    def check_configuration(self):
        """Check system configuration"""
        self.print_header("Configuration")
        
        # Django settings
        self.check("DEBUG Mode", hasattr(settings, 'DEBUG'))
        print(f"    → DEBUG = {getattr(settings, 'DEBUG', 'Unknown')}")
        
        # DICOM settings
        dicom_port = getattr(settings, 'DICOM_SCP_PORT', None)
        dicom_aet = getattr(settings, 'DICOM_SCP_AE_TITLE', None)
        
        self.check("DICOM Port Configured", dicom_port is not None)
        if dicom_port:
            print(f"    → DICOM Port: {dicom_port}")
        
        self.check("DICOM AE Title Configured", dicom_aet is not None)
        if dicom_aet:
            print(f"    → DICOM AE Title: {dicom_aet}")
        
        # Media settings
        self.check("MEDIA_ROOT Set", hasattr(settings, 'MEDIA_ROOT'))
        self.check("MEDIA_URL Set", hasattr(settings, 'MEDIA_URL'))
    
    def check_permissions(self):
        """Check file permissions"""
        self.print_header("File Permissions")
        
        # Check media directory permissions
        media_root = Path(settings.MEDIA_ROOT)
        if media_root.exists():
            is_writable = os.access(media_root, os.W_OK)
            self.check("MEDIA_ROOT Writable", is_writable, 
                      "Cannot write to MEDIA_ROOT")
        
        # Check log directory
        log_dir = BASE_DIR / 'logs'
        if log_dir.exists():
            is_writable = os.access(log_dir, os.W_OK)
            self.check("Logs Writable", is_writable,
                      "Cannot write to logs directory")
    
    def print_summary(self):
        """Print check summary"""
        self.print_header("SUMMARY")
        
        total_checks = self.checks_passed + self.checks_failed
        pass_rate = (self.checks_passed / total_checks * 100) if total_checks > 0 else 0
        
        print(f"  Total Checks: {total_checks}")
        print(f"  ✓ Passed: {self.checks_passed}")
        print(f"  ✗ Failed: {self.checks_failed}")
        print(f"  ⚠ Warnings: {len(self.warnings)}")
        print(f"  Success Rate: {pass_rate:.1f}%")
        
        if self.checks_failed == 0:
            print("\n  🎉 All critical checks passed! System is operational.")
        else:
            print("\n  ⚠ Some checks failed. Please review and fix issues above.")
        
        if self.warnings:
            print("\n  Warnings:")
            for warning in self.warnings:
                print(f"    - {warning}")
        
        print("\n" + "=" * 80 + "\n")


def main():
    """Main function"""
    try:
        checker = SystemHealthChecker()
        checker.run_all_checks()
        
        # Return appropriate exit code
        sys.exit(0 if checker.checks_failed == 0 else 1)
        
    except Exception as e:
        logger.error(f"System health check failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
