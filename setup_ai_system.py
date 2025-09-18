#!/usr/bin/env python
"""
Setup script for NoctisPro AI Analysis System
This script initializes the working AI models and starts processing
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')
django.setup()

from django.core.management import call_command
from ai_analysis.models import AIAnalysis
import threading
import time

def setup_ai_models():
    """Setup working AI models"""
    print("🤖 Setting up working AI models...")
    try:
        call_command('setup_working_ai_models')
        print("✅ AI models setup complete!")
        return True
    except Exception as e:
        print(f"❌ Failed to setup AI models: {e}")
        return False

def start_ai_processor():
    """Start the AI analysis processor"""
    print("🔄 Starting AI analysis processor...")
    try:
        # Run AI processor in continuous mode
        call_command('process_ai_analyses', '--continuous', '--interval=5')
    except KeyboardInterrupt:
        print("\n🛑 AI processor stopped by user")
    except Exception as e:
        print(f"❌ AI processor error: {e}")

def check_pending_analyses():
    """Check for pending analyses"""
    pending = AIAnalysis.objects.filter(status='pending').count()
    completed = AIAnalysis.objects.filter(status='completed').count()
    failed = AIAnalysis.objects.filter(status='failed').count()
    
    print(f"\n📊 AI Analysis Status:")
    print(f"   Pending: {pending}")
    print(f"   Completed: {completed}")
    print(f"   Failed: {failed}")
    
    return pending

def main():
    print("🚀 NoctisPro AI Analysis System Setup")
    print("=" * 50)
    
    # Setup AI models
    if not setup_ai_models():
        print("❌ Setup failed. Exiting.")
        return
    
    # Check current status
    pending_count = check_pending_analyses()
    
    print(f"\n🎯 AI System Ready!")
    print(f"   • Working AI models configured")
    print(f"   • Real DICOM analysis enabled")
    print(f"   • Automatic report generation active")
    print(f"   • {pending_count} analyses pending")
    
    # Ask user what to do
    print(f"\nOptions:")
    print(f"1. Start continuous AI processing (recommended)")
    print(f"2. Process pending analyses once")
    print(f"3. Exit")
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    if choice == '1':
        print(f"\n🔄 Starting continuous AI processing...")
        print(f"   Upload DICOM studies to trigger automatic analysis")
        print(f"   Press Ctrl+C to stop")
        start_ai_processor()
    
    elif choice == '2':
        print(f"\n⚡ Processing pending analyses...")
        try:
            call_command('process_ai_analyses')
            print(f"✅ Batch processing complete!")
        except Exception as e:
            print(f"❌ Processing failed: {e}")
    
    else:
        print(f"\n👋 AI system is ready. You can:")
        print(f"   • Upload DICOM studies to trigger analysis")
        print(f"   • Visit /ai/ to view AI dashboard")
        print(f"   • Run: python manage.py process_ai_analyses --continuous")

if __name__ == '__main__':
    main()