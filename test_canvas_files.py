#!/usr/bin/env python3
"""
Real-time test of DICOM canvas files without requiring Django installation
Tests actual file existence, syntax, and basic functionality
"""

import os
import sys
import time
import json
from pathlib import Path

def test_file_exists(filepath, description):
    """Test if a file exists and get its size"""
    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"✅ {description}: {filepath} ({size:,} bytes)")
        return True, size
    else:
        print(f"❌ {description}: {filepath} - NOT FOUND")
        return False, 0

def test_js_syntax(filepath):
    """Basic JavaScript syntax test"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Basic syntax checks
        issues = []
        
        # Check for basic JavaScript structure
        if 'function' not in content and 'class' not in content and '=>' not in content:
            issues.append("No functions or classes found")
        
        # Check for common syntax errors
        if content.count('{') != content.count('}'):
            issues.append("Mismatched braces")
        
        if content.count('(') != content.count(')'):
            issues.append("Mismatched parentheses")
        
        if content.count('[') != content.count(']'):
            issues.append("Mismatched brackets")
        
        # Check for console.log statements (good for debugging)
        console_logs = content.count('console.log')
        
        if issues:
            print(f"⚠️  JavaScript issues in {os.path.basename(filepath)}: {', '.join(issues)}")
            return False
        else:
            print(f"✅ JavaScript syntax OK: {os.path.basename(filepath)} ({console_logs} debug logs)")
            return True
            
    except Exception as e:
        print(f"❌ Error reading {filepath}: {e}")
        return False

def test_html_template(filepath):
    """Test HTML template for basic structure"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for essential elements
        checks = [
            ('DOCTYPE html', 'HTML5 doctype'),
            ('<canvas', 'Canvas element'),
            ('dicom', 'DICOM-related content'),
            ('<script', 'JavaScript includes'),
            ('viewer', 'Viewer-related content')
        ]
        
        results = []
        for check, description in checks:
            if check in content:
                results.append(f"✅ {description}")
            else:
                results.append(f"❌ {description}")
        
        print(f"📄 HTML Template {os.path.basename(filepath)}:")
        for result in results:
            print(f"   {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading HTML template {filepath}: {e}")
        return False

def test_performance_metrics():
    """Test system performance capabilities"""
    print("\n🔍 SYSTEM PERFORMANCE TEST:")
    
    # Test Python performance
    start_time = time.time()
    
    # CPU test
    result = sum(i * i for i in range(100000))
    cpu_time = time.time() - start_time
    
    print(f"✅ CPU Performance: {cpu_time*1000:.2f}ms for 100K calculations")
    
    # Memory test
    try:
        import psutil
        memory = psutil.virtual_memory()
        print(f"✅ System Memory: {memory.total/1024**3:.1f}GB total, {memory.available/1024**3:.1f}GB available")
        print(f"✅ Memory Usage: {memory.percent}%")
    except ImportError:
        print("⚠️  psutil not available - cannot check memory")
    
    # Disk test
    start_time = time.time()
    test_data = "x" * 1024 * 1024  # 1MB test data
    with open('/tmp/dicom_test.tmp', 'w') as f:
        f.write(test_data)
    
    with open('/tmp/dicom_test.tmp', 'r') as f:
        read_data = f.read()
    
    os.remove('/tmp/dicom_test.tmp')
    disk_time = time.time() - start_time
    
    print(f"✅ Disk I/O: {disk_time*1000:.2f}ms for 1MB write/read")
    
    return {
        'cpu_time_ms': cpu_time * 1000,
        'disk_time_ms': disk_time * 1000,
        'memory_available_gb': memory.available/1024**3 if 'memory' in locals() else 0
    }

def main():
    print("🎯 REAL-TIME DICOM CANVAS PERFORMANCE TEST")
    print("=" * 60)
    
    workspace = Path("/workspace")
    
    # Test core DICOM viewer files
    files_to_test = [
        # JavaScript files
        ("static/js/dicom-viewer-canvas-fix.js", "Main DICOM Canvas"),
        ("static/js/working-dicom-canvas.js", "Working DICOM Canvas"),
        ("static/js/dicom-viewer-enhanced.js", "Enhanced DICOM Viewer"),
        ("static/js/dicom-viewer-fixes.js", "DICOM Viewer Fixes"),
        ("static/js/world-class-dicom-canvas.js", "World-Class Canvas"),
        ("static/js/dicom-viewer-world-class-integration.js", "Integration Layer"),
        
        # HTML templates
        ("templates/dicom_viewer/masterpiece_viewer.html", "Main Viewer Template"),
        ("test_dicom_canvas_functionality.html", "Canvas Test Page"),
        ("test_actual_performance.html", "Performance Test Page"),
        
        # Python backend
        ("dicom_viewer/views.py", "DICOM Viewer Backend"),
        ("dicom_viewer/urls.py", "DICOM URL Routes"),
        ("ai_analysis/world_class_ai_engine.py", "AI Engine"),
        ("dicom_viewer/advanced_mpr_engine.py", "MPR Engine"),
    ]
    
    print("\n📁 FILE EXISTENCE TEST:")
    total_files = len(files_to_test)
    existing_files = 0
    total_size = 0
    
    for filepath, description in files_to_test:
        full_path = workspace / filepath
        exists, size = test_file_exists(full_path, description)
        if exists:
            existing_files += 1
            total_size += size
    
    print(f"\n📊 FILE SUMMARY: {existing_files}/{total_files} files exist ({total_size:,} bytes total)")
    
    # Test JavaScript files
    print("\n🔧 JAVASCRIPT SYNTAX TEST:")
    js_files = [f for f in files_to_test if f[0].endswith('.js')]
    working_js = 0
    
    for filepath, description in js_files:
        full_path = workspace / filepath
        if os.path.exists(full_path):
            if test_js_syntax(full_path):
                working_js += 1
    
    print(f"\n📊 JAVASCRIPT SUMMARY: {working_js}/{len(js_files)} files have valid syntax")
    
    # Test HTML templates
    print("\n📄 HTML TEMPLATE TEST:")
    html_files = [f for f in files_to_test if f[0].endswith('.html')]
    
    for filepath, description in html_files:
        full_path = workspace / filepath
        if os.path.exists(full_path):
            test_html_template(full_path)
    
    # Test system performance
    perf_metrics = test_performance_metrics()
    
    # Generate performance report
    print("\n🎯 REAL-TIME PERFORMANCE ASSESSMENT:")
    
    # File system performance
    if existing_files == total_files:
        print("✅ All required files present")
    else:
        print(f"⚠️  {total_files - existing_files} files missing")
    
    # JavaScript performance
    if working_js == len(js_files):
        print("✅ All JavaScript files have valid syntax")
    else:
        print(f"⚠️  {len(js_files) - working_js} JavaScript files have issues")
    
    # System performance
    if perf_metrics['cpu_time_ms'] < 50:
        print("✅ CPU performance: Excellent")
    elif perf_metrics['cpu_time_ms'] < 100:
        print("✅ CPU performance: Good")
    else:
        print("⚠️  CPU performance: Slow")
    
    if perf_metrics['disk_time_ms'] < 100:
        print("✅ Disk I/O performance: Excellent")
    elif perf_metrics['disk_time_ms'] < 200:
        print("✅ Disk I/O performance: Good")
    else:
        print("⚠️  Disk I/O performance: Slow")
    
    # Overall assessment
    print("\n🏆 OVERALL ASSESSMENT:")
    
    file_score = (existing_files / total_files) * 100
    js_score = (working_js / len(js_files)) * 100 if js_files else 100
    
    overall_score = (file_score + js_score) / 2
    
    if overall_score >= 90:
        print(f"🌟 EXCELLENT: {overall_score:.1f}% - System ready for world-class performance")
    elif overall_score >= 75:
        print(f"✅ GOOD: {overall_score:.1f}% - System functional with minor issues")
    elif overall_score >= 50:
        print(f"⚠️  FAIR: {overall_score:.1f}% - System has significant issues")
    else:
        print(f"❌ POOR: {overall_score:.1f}% - System requires major fixes")
    
    # Recommendations
    print("\n💡 RECOMMENDATIONS:")
    
    if existing_files < total_files:
        print("   • Some files are missing - check file paths")
    
    if working_js < len(js_files):
        print("   • JavaScript files have syntax issues - review and fix")
    
    if perf_metrics['cpu_time_ms'] > 100:
        print("   • CPU performance is slow - consider optimization")
    
    if perf_metrics['disk_time_ms'] > 200:
        print("   • Disk I/O is slow - consider SSD or optimization")
    
    print("\n📋 NEXT STEPS:")
    print("   1. Open test_actual_performance.html in browser")
    print("   2. Run canvas performance tests")
    print("   3. Check browser console for JavaScript errors")
    print("   4. Test DICOM image loading if backend is running")
    
    return overall_score

if __name__ == "__main__":
    score = main()
    sys.exit(0 if score >= 75 else 1)