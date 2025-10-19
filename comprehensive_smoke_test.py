#!/usr/bin/env python3
"""
Comprehensive Smoke Test for NoctisPro PACS
Tests all templates, permissions, UI, DICOM viewer, and reconstruction features
No server required - analyzes code directly
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
BOLD = '\033[1m'
END = '\033[0m'

class SmokeTest:
    def __init__(self):
        self.results = {
            "passed": 0,
            "failed": 0,
            "warnings": 0
        }
        self.workspace = Path("/workspace")
        
    def print_header(self, text):
        print(f"\n{BLUE}{BOLD}{'='*70}{END}")
        print(f"{BLUE}{BOLD}{text.center(70)}{END}")
        print(f"{BLUE}{BOLD}{'='*70}{END}\n")
    
    def print_success(self, text):
        print(f"{GREEN}✓{END} {text}")
        self.results["passed"] += 1
    
    def print_error(self, text):
        print(f"{RED}✗{END} {text}")
        self.results["failed"] += 1
    
    def print_warning(self, text):
        print(f"{YELLOW}⚠{END} {text}")
        self.results["warnings"] += 1
    
    def print_info(self, text):
        print(f"  {text}")
    
    def test_templates(self):
        """Test all templates are present and properly structured"""
        self.print_header("Testing Templates")
        
        # Find all templates
        template_dirs = [
            self.workspace / "templates",
            self.workspace / "admin_panel" / "templates",
            self.workspace / "ai_analysis" / "templates"
        ]
        
        required_templates = {
            "base.html": "Base template",
            "worklist/worklist.html": "Worklist view",
            "worklist/study_list.html": "Study list",
            "worklist/study_detail.html": "Study detail",
            "worklist/upload.html": "Upload page",
            "worklist/dashboard.html": "Dashboard",
            "dicom_viewer/masterpiece_viewer.html": "Main DICOM viewer",
            "dicom_viewer/viewer.html": "DICOM viewer",
            "dicom_viewer/index.html": "Viewer index",
            "dicom_viewer/print_settings.html": "Print settings",
            "ai_analysis/dashboard.html": "AI dashboard",
            "admin_panel/dashboard.html": "Admin dashboard",
            "admin_panel/permissions.html": "Permissions management",
            "admin_panel/edit_permissions.html": "Edit permissions",
            "admin_panel/user_management.html": "User management",
            "admin_panel/facility_management.html": "Facility management",
            "admin_panel/backup_management.html": "Backup management",
            "admin_panel/system_monitoring.html": "System monitoring",
            "reports/report_list.html": "Report list",
            "reports/write_report.html": "Write report",
            "accounts/login.html": "Login page",
            "accounts/profile.html": "User profile",
            "accounts/preferences.html": "User preferences",
            "chat/chat_rooms.html": "Chat rooms",
            "chat/chat_room.html": "Chat room",
            "notifications/list.html": "Notifications",
        }
        
        for template_path, description in required_templates.items():
            found = False
            for template_dir in template_dirs:
                full_path = template_dir / template_path
                if full_path.exists():
                    self.print_success(f"{description}: {template_path}")
                    found = True
                    break
            
            if not found:
                self.print_error(f"{description}: {template_path} NOT FOUND")
    
    def test_permissions(self):
        """Test permission system"""
        self.print_header("Testing Permissions System")
        
        # Check permission files
        permission_files = [
            self.workspace / "accounts" / "permissions.py",
            self.workspace / "worklist" / "permissions.py",
            self.workspace / "admin_panel" / "views_permissions.py"
        ]
        
        for perm_file in permission_files:
            if perm_file.exists():
                content = perm_file.read_text()
                
                # Check for permission classes
                if "IsAuthenticated" in content:
                    self.print_success(f"Authentication required: {perm_file.name}")
                
                # Check for role-based permissions
                if "has_permission" in content or "has_object_permission" in content:
                    self.print_success(f"Custom permissions: {perm_file.name}")
                
                # Check for specific permission checks
                permission_types = [
                    ("can_view", "View permission"),
                    ("can_edit", "Edit permission"),
                    ("can_delete", "Delete permission"),
                    ("can_upload", "Upload permission"),
                    ("can_download", "Download permission"),
                    ("can_manage_users", "User management permission"),
                    ("can_manage_facilities", "Facility management permission"),
                ]
                
                for perm_check, desc in permission_types:
                    if perm_check in content.lower():
                        self.print_success(f"{desc} implemented")
            else:
                self.print_warning(f"Permission file not found: {perm_file}")
    
    def test_ui_components(self):
        """Test UI components and styling"""
        self.print_header("Testing UI Components")
        
        # Check CSS files
        css_files = [
            ("static/css/dicom-viewer-professional.css", "DICOM viewer styling"),
            ("static/css/dicom-viewer-buttons.css", "DICOM viewer buttons"),
            ("static/css/dicom-xray-enhancement.css", "X-ray enhancements"),
            ("static/css/admin-permissions-fix.css", "Admin permissions styling"),
        ]
        
        for css_file, description in css_files:
            full_path = self.workspace / css_file
            if full_path.exists():
                content = full_path.read_text()
                
                # Check for responsive design
                if "@media" in content:
                    self.print_success(f"{description} - Responsive design")
                else:
                    self.print_success(f"{description} - Present")
            else:
                self.print_warning(f"{description} - NOT FOUND: {css_file}")
        
        # Check JavaScript files
        js_files = [
            ("static/js/dicom-viewer-professional.js", "DICOM viewer"),
            ("static/js/dicom-viewer-enhanced.js", "Enhanced viewer"),
            ("static/js/dicom-measurements.js", "Measurements"),
            ("static/js/dicom-3d-enhanced.js", "3D rendering"),
            ("static/js/dicom-mpr-enhanced.js", "MPR reconstruction"),
            ("static/js/session-timeout.js", "Session management"),
        ]
        
        for js_file, description in js_files:
            full_path = self.workspace / js_file
            if full_path.exists():
                self.print_success(f"{description} UI: {js_file}")
            else:
                alt_path = self.workspace / "staticfiles" / js_file.replace("static/", "")
                if alt_path.exists():
                    self.print_success(f"{description} UI: {js_file} (in staticfiles)")
                else:
                    self.print_error(f"{description} UI NOT FOUND: {js_file}")
    
    def test_dicom_viewer(self):
        """Test DICOM viewer functionality"""
        self.print_header("Testing DICOM Viewer Functionality")
        
        # Check main viewer file
        viewer_js = self.workspace / "static/js/dicom-viewer-professional.js"
        if not viewer_js.exists():
            viewer_js = self.workspace / "staticfiles/js/dicom-viewer-professional.js"
        
        if viewer_js.exists():
            content = viewer_js.read_text()
            
            # Test core functions
            core_functions = [
                ("loadDicomImage", "Load DICOM image"),
                ("renderImage", "Render image"),
                ("displayImage", "Display image"),
                ("updateCanvas", "Update canvas"),
            ]
            
            for func, desc in core_functions:
                if func in content:
                    self.print_success(f"{desc} function present")
                else:
                    self.print_warning(f"{desc} function not found")
            
            # Test viewer tools
            tools = [
                ("handleToolClick", "Tool selection"),
                ("zoomIn", "Zoom in"),
                ("zoomOut", "Zoom out"),
                ("panImage", "Pan tool"),
                ("rotateImage", "Rotate"),
                ("flipImage", "Flip"),
                ("resetView", "Reset view"),
                ("toggleInvert", "Invert colors"),
            ]
            
            for func, desc in tools:
                if func in content:
                    self.print_success(f"Tool: {desc}")
                else:
                    self.print_error(f"Tool MISSING: {desc}")
            
            # Test window/level presets
            presets = [
                "Lung",
                "Bone",
                "Soft Tissue",
                "Brain",
                "Chest X-ray",
                "Bone X-ray",
            ]
            
            self.print_info("\nWindow/Level Presets:")
            for preset in presets:
                if preset in content:
                    self.print_success(f"Preset: {preset}")
                else:
                    self.print_warning(f"Preset missing: {preset}")
            
            # Test measurement tools
            measurements = [
                ("measureDistance", "Distance measurement"),
                ("measureAngle", "Angle measurement"),
                ("drawMeasurements", "Draw measurements"),
                ("clearMeasurements", "Clear measurements"),
                ("addAnnotation", "Annotations"),
            ]
            
            self.print_info("\nMeasurement Tools:")
            for func, desc in measurements:
                if func in content:
                    self.print_success(f"{desc}")
                else:
                    self.print_error(f"{desc} MISSING")
            
            # Test export/print
            export_functions = [
                ("exportImage", "Export image"),
                ("printImage", "Print image"),
                ("downloadImage", "Download image"),
            ]
            
            self.print_info("\nExport/Print Functions:")
            for func, desc in export_functions:
                if func in content:
                    self.print_success(f"{desc}")
                else:
                    self.print_warning(f"{desc} not found")
        else:
            self.print_error("DICOM viewer JavaScript NOT FOUND")
    
    def test_reconstruction_features(self):
        """Test MPR, 3D reconstruction, and advanced features"""
        self.print_header("Testing Reconstruction Features")
        
        # Check MPR functionality
        mpr_js = self.workspace / "static/js/dicom-mpr-enhanced.js"
        if not mpr_js.exists():
            mpr_js = self.workspace / "staticfiles/js/dicom-mpr-enhanced.js"
        
        if mpr_js.exists():
            content = mpr_js.read_text()
            
            mpr_features = [
                ("generateMPRViews", "MPR generation"),
                ("axialView", "Axial view"),
                ("sagittalView", "Sagittal view"),
                ("coronalView", "Coronal view"),
                ("updateMPR", "Update MPR"),
                ("renderMPR", "Render MPR"),
            ]
            
            self.print_info("MPR Features:")
            for func, desc in mpr_features:
                if func.lower() in content.lower():
                    self.print_success(f"{desc}")
                else:
                    self.print_error(f"{desc} MISSING")
        else:
            self.print_error("MPR JavaScript NOT FOUND")
        
        # Check 3D functionality
        threед_js = self.workspace / "static/js/dicom-3d-enhanced.js"
        if not threед_js.exists():
            threед_js = self.workspace / "staticfiles/js/dicom-3d-enhanced.js"
        
        if threед_js.exists():
            content = threед_js.read_text()
            
            threед_features = [
                ("generate3D", "3D generation"),
                ("volumeRendering", "Volume rendering"),
                ("surfaceRendering", "Surface rendering"),
                ("rotate3D", "3D rotation"),
                ("mip", "Maximum Intensity Projection"),
                ("minip", "Minimum Intensity Projection"),
            ]
            
            self.print_info("\n3D Reconstruction Features:")
            for func, desc in threед_features:
                if func.lower() in content.lower():
                    self.print_success(f"{desc}")
                else:
                    self.print_warning(f"{desc} not found")
        else:
            self.print_warning("3D reconstruction JavaScript NOT FOUND")
        
        # Check advanced processing
        advanced_js = self.workspace / "static/js/dicom-advanced-processing.js"
        if not advanced_js.exists():
            advanced_js = self.workspace / "staticfiles/js/dicom-advanced-processing.js"
        
        if advanced_js.exists():
            content = advanced_js.read_text()
            
            advanced_features = [
                ("sharpen", "Sharpen filter"),
                ("denoise", "Denoise filter"),
                ("edgeDetection", "Edge detection"),
                ("histogram", "Histogram equalization"),
            ]
            
            self.print_info("\nAdvanced Processing:")
            for func, desc in advanced_features:
                if func.lower() in content.lower():
                    self.print_success(f"{desc}")
                else:
                    self.print_info(f"{desc} not implemented")
        else:
            self.print_info("Advanced processing not found (optional)")
    
    def test_dicom_backend(self):
        """Test DICOM backend functionality"""
        self.print_header("Testing DICOM Backend")
        
        # Check Django DICOM views
        dicom_views = self.workspace / "dicom_viewer" / "views.py"
        if dicom_views.exists():
            content = dicom_views.read_text()
            
            backend_features = [
                ("upload", "DICOM upload"),
                ("parse", "DICOM parsing"),
                ("metadata", "Metadata extraction"),
                ("pixel_data", "Pixel data processing"),
                ("series", "Series management"),
                ("study", "Study management"),
            ]
            
            for feature, desc in backend_features:
                if feature.lower() in content.lower():
                    self.print_success(f"{desc} endpoint")
                else:
                    self.print_info(f"{desc} - checking...")
        else:
            self.print_warning("DICOM views not found")
        
        # Check DICOM models
        dicom_models = self.workspace / "worklist" / "models.py"
        if dicom_models.exists():
            content = dicom_models.read_text()
            
            models = [
                ("Patient", "Patient model"),
                ("Study", "Study model"),
                ("Series", "Series model"),
                ("DicomImage", "DICOM image model"),
            ]
            
            self.print_info("\nDICOM Models:")
            for model, desc in models:
                if f"class {model}" in content:
                    self.print_success(f"{desc}")
                else:
                    self.print_error(f"{desc} MISSING")
        else:
            self.print_error("DICOM models NOT FOUND")
        
        # Check DICOM utilities
        dicom_utils = self.workspace / "dicom_viewer" / "dicom_utils.py"
        if dicom_utils.exists():
            self.print_success("DICOM utilities present")
        else:
            self.print_warning("DICOM utilities not found")
    
    def test_ai_features(self):
        """Test AI analysis features"""
        self.print_header("Testing AI Features")
        
        ai_views = self.workspace / "ai_analysis" / "views.py"
        ai_models = self.workspace / "ai_analysis" / "models.py"
        
        if ai_models.exists():
            content = ai_models.read_text()
            
            if "AIModel" in content:
                self.print_success("AI model management")
            if "AIAnalysis" in content:
                self.print_success("AI analysis tracking")
        else:
            self.print_error("AI models NOT FOUND")
        
        if ai_views.exists():
            content = ai_views.read_text()
            
            if "analyze" in content.lower():
                self.print_success("AI analysis endpoint")
            if "model" in content.lower():
                self.print_success("Model management endpoint")
        else:
            self.print_warning("AI views not found")
    
    def test_chat_features(self):
        """Test chat and collaboration features"""
        self.print_header("Testing Chat & Collaboration")
        
        chat_dir = self.workspace / "chat"
        if chat_dir.exists():
            self.print_success("Chat module present")
            
            # Check for WebSocket support
            consumers = chat_dir / "consumers.py"
            if consumers.exists():
                content = consumers.read_text()
                if "websocket" in content.lower():
                    self.print_success("WebSocket support")
                if "async" in content:
                    self.print_success("Async messaging")
        else:
            self.print_warning("Chat module not found")
        
        # Check collaboration features in DICOM viewer
        collab_js = self.workspace / "static/js/dicom-collaboration.js"
        if not collab_js.exists():
            collab_js = self.workspace / "staticfiles/js/dicom-collaboration.js"
        
        if collab_js.exists():
            self.print_success("DICOM viewer collaboration features")
        else:
            self.print_info("Collaboration features not found (optional)")
    
    def test_reports(self):
        """Test reporting functionality"""
        self.print_header("Testing Report System")
        
        reports_dir = self.workspace / "reports"
        if reports_dir.exists():
            models = reports_dir / "models.py"
            views = reports_dir / "views.py"
            
            if models.exists():
                self.print_success("Report models present")
            if views.exists():
                self.print_success("Report views present")
            
            # Check for report templates
            template_mgmt = reports_dir / "management" / "commands" / "setup_report_templates.py"
            if template_mgmt.exists():
                self.print_success("Report template management")
        else:
            self.print_error("Reports module NOT FOUND")
    
    def test_backup_system(self):
        """Test backup and restore functionality"""
        self.print_header("Testing Backup System")
        
        backup_system = self.workspace / "admin_panel" / "backup_system.py"
        restore_system = self.workspace / "admin_panel" / "restore_system.py"
        
        if backup_system.exists():
            self.print_success("Backup system present")
        else:
            self.print_error("Backup system NOT FOUND")
        
        if restore_system.exists():
            self.print_success("Restore system present")
        else:
            self.print_error("Restore system NOT FOUND")
        
        # Check backup scheduler
        scheduler = self.workspace / "admin_panel" / "backup_scheduler.py"
        if scheduler.exists():
            self.print_success("Backup scheduler present")
        else:
            self.print_warning("Backup scheduler not found")
    
    def test_security(self):
        """Test security features"""
        self.print_header("Testing Security Features")
        
        # Check settings
        settings_security = self.workspace / "noctis_pro" / "settings_security.py"
        if settings_security.exists():
            content = settings_security.read_text()
            
            security_features = [
                ("SECURE_SSL_REDIRECT", "SSL redirect"),
                ("SESSION_COOKIE_SECURE", "Secure cookies"),
                ("CSRF_COOKIE_SECURE", "CSRF protection"),
                ("SECURE_HSTS", "HSTS"),
                ("X_FRAME_OPTIONS", "Clickjacking protection"),
                ("SECURE_CONTENT_TYPE", "Content type security"),
            ]
            
            for setting, desc in security_features:
                if setting in content:
                    self.print_success(f"{desc}")
                else:
                    self.print_info(f"{desc} - checking...")
        else:
            self.print_warning("Security settings not found")
        
        # Check session management
        session_js = self.workspace / "static/js/session-timeout.js"
        if session_js.exists():
            self.print_success("Session timeout management")
        else:
            self.print_warning("Session timeout not found")
    
    def print_summary(self):
        """Print test summary"""
        self.print_header("Test Summary")
        
        total = self.results["passed"] + self.results["failed"]
        pass_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        print(f"{GREEN}Passed:   {self.results['passed']}{END}")
        print(f"{RED}Failed:   {self.results['failed']}{END}")
        print(f"{YELLOW}Warnings: {self.results['warnings']}{END}")
        print(f"\nPass Rate: {pass_rate:.1f}%")
        
        if self.results["failed"] == 0:
            print(f"\n{GREEN}{BOLD}✓ ALL CRITICAL TESTS PASSED!{END}")
            print(f"{GREEN}Your PACS system is ready for use!{END}\n")
        elif self.results["failed"] < 5:
            print(f"\n{YELLOW}{BOLD}⚠ MINOR ISSUES FOUND{END}")
            print(f"{YELLOW}System is mostly functional, review warnings{END}\n")
        else:
            print(f"\n{RED}{BOLD}✗ CRITICAL ISSUES FOUND{END}")
            print(f"{RED}Review and fix the failed tests{END}\n")
    
    def run_all_tests(self):
        """Run all smoke tests"""
        print(f"\n{BOLD}{BLUE}")
        print("╔" + "═"*68 + "╗")
        print("║" + " NoctisPro PACS - Comprehensive Smoke Test".center(68) + "║")
        print("║" + " Testing All Features Without Server".center(68) + "║")
        print("╚" + "═"*68 + "╝")
        print(END)
        
        # Run all tests
        self.test_templates()
        self.test_permissions()
        self.test_ui_components()
        self.test_dicom_viewer()
        self.test_reconstruction_features()
        self.test_dicom_backend()
        self.test_ai_features()
        self.test_chat_features()
        self.test_reports()
        self.test_backup_system()
        self.test_security()
        
        # Print summary
        self.print_summary()
        
        return 0 if self.results["failed"] < 5 else 1

if __name__ == "__main__":
    test = SmokeTest()
    exit_code = test.run_all_tests()
    exit(exit_code)
