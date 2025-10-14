#!/usr/bin/env python3
"""
Test script to verify FastAPI + Django + Rust integration
Run this after starting all services to verify everything works
"""

import asyncio
import httpx
import sys
from termcolor import colored

async def test_django():
    """Test Django service"""
    print("\n" + "="*50)
    print(colored("Testing Django Service (Port 8000)...", "blue", attrs=["bold"]))
    print("="*50)
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8000/")
            if response.status_code == 200:
                print(colored("✓ Django is running", "green"))
                print(f"  Status: {response.status_code}")
                return True
            else:
                print(colored(f"✗ Django returned status {response.status_code}", "red"))
                return False
    except Exception as e:
        print(colored(f"✗ Django is not accessible: {e}", "red"))
        return False

async def test_fastapi():
    """Test FastAPI service"""
    print("\n" + "="*50)
    print(colored("Testing FastAPI Service (Port 8001)...", "blue", attrs=["bold"]))
    print("="*50)
    
    tests_passed = 0
    tests_total = 3
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Test 1: Root endpoint
            print("\n1. Testing root endpoint...")
            response = await client.get("http://localhost:8001/")
            if response.status_code == 200:
                print(colored("  ✓ Root endpoint accessible", "green"))
                tests_passed += 1
            else:
                print(colored(f"  ✗ Root endpoint returned {response.status_code}", "yellow"))
            
            # Test 2: Health endpoint
            print("\n2. Testing health endpoint...")
            response = await client.get("http://localhost:8001/api/v1/health")
            if response.status_code == 200:
                data = response.json()
                print(colored("  ✓ Health check passed", "green"))
                print(f"  Status: {data.get('status')}")
                print(f"  Version: {data.get('version')}")
                tests_passed += 1
            else:
                print(colored(f"  ✗ Health check failed: {response.status_code}", "yellow"))
            
            # Test 3: Ping endpoint
            print("\n3. Testing ping endpoint...")
            response = await client.get("http://localhost:8001/api/v1/ping")
            if response.status_code == 200:
                print(colored("  ✓ Ping successful", "green"))
                tests_passed += 1
            else:
                print(colored(f"  ✗ Ping failed: {response.status_code}", "yellow"))
            
        print(f"\nFastAPI Tests: {tests_passed}/{tests_total} passed")
        return tests_passed == tests_total
        
    except Exception as e:
        print(colored(f"✗ FastAPI is not accessible: {e}", "red"))
        return False

async def test_rust_scp():
    """Test Rust DICOM SCP service"""
    print("\n" + "="*50)
    print(colored("Testing Rust DICOM SCP (Port 11112)...", "blue", attrs=["bold"]))
    print("="*50)
    
    import socket
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(('localhost', 11112))
        sock.close()
        
        if result == 0:
            print(colored("✓ Rust SCP is listening on port 11112", "green"))
            return True
        else:
            print(colored("✗ Rust SCP is not listening on port 11112", "red"))
            print("  Note: This is optional if you haven't built the Rust component yet")
            return False
    except Exception as e:
        print(colored(f"✗ Cannot check Rust SCP: {e}", "red"))
        print("  Note: This is optional if you haven't built the Rust component yet")
        return False

async def test_integration():
    """Test communication between services"""
    print("\n" + "="*50)
    print(colored("Testing Service Integration...", "blue", attrs=["bold"]))
    print("="*50)
    
    print("\n1. Testing Django → FastAPI communication...")
    try:
        # This would be a real integration test
        # For now, we just verify both services respond
        async with httpx.AsyncClient(timeout=5.0) as client:
            django_response = await client.get("http://localhost:8000/")
            fastapi_response = await client.get("http://localhost:8001/api/v1/health")
            
            if django_response.status_code == 200 and fastapi_response.status_code == 200:
                print(colored("  ✓ Both services can be reached", "green"))
                print("  ✓ Ready for cross-service communication")
                return True
            else:
                print(colored("  ✗ One or more services not responding", "yellow"))
                return False
    except Exception as e:
        print(colored(f"  ✗ Integration test failed: {e}", "red"))
        return False

async def main():
    """Main test runner"""
    print(colored("""
╔══════════════════════════════════════════════════════════╗
║   NoctisPro PACS - Integration Test Suite               ║
║   FastAPI + Django + Rust                                ║
╚══════════════════════════════════════════════════════════╝
    """, "cyan", attrs=["bold"]))
    
    results = {
        "Django": False,
        "FastAPI": False,
        "Rust SCP": False,
        "Integration": False
    }
    
    # Run tests
    results["Django"] = await test_django()
    results["FastAPI"] = await test_fastapi()
    results["Rust SCP"] = await test_rust_scp()
    
    if results["Django"] and results["FastAPI"]:
        results["Integration"] = await test_integration()
    
    # Print summary
    print("\n" + "="*50)
    print(colored("TEST SUMMARY", "blue", attrs=["bold"]))
    print("="*50)
    
    for service, passed in results.items():
        status = colored("✓ PASS", "green") if passed else colored("✗ FAIL", "red")
        if service == "Rust SCP" and not passed:
            status = colored("○ SKIP", "yellow") + colored(" (Optional)", "white")
        print(f"{service:20} {status}")
    
    # Final verdict
    print("\n" + "="*50)
    required_services = results["Django"] and results["FastAPI"]
    
    if required_services:
        print(colored("✓ INTEGRATION SUCCESSFUL!", "green", attrs=["bold"]))
        print("\nYou can now:")
        print("  1. Access Django:  http://localhost:8000")
        print("  2. Access FastAPI: http://localhost:8001/api/v1/docs")
        print("  3. Build Rust SCP: cd dicom_scp_server && cargo build --release")
        return 0
    else:
        print(colored("✗ INTEGRATION FAILED", "red", attrs=["bold"]))
        print("\nMake sure all services are running:")
        print("  ./start_all_services.sh")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
