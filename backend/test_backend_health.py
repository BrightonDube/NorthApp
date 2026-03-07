#!/usr/bin/env python3
"""
Quick health check script for the backend API.
Tests Task 0.5: Verify backend is accessible and responding.
"""
import requests
import sys

# Railway backend URL
BACKEND_URL = "https://north-backend-production-5023.up.railway.app"


def test_health_endpoint() -> bool:
    """Test the /health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(f"   Status: {data.get('status')}")
            print(f"   Version: {data.get('version')}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Health check timed out - backend may be down")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend - check Railway deployment")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_api_docs() -> bool:
    """Test that API documentation is accessible"""
    print("\n🔍 Testing API documentation...")
    try:
        response = requests.get(f"{BACKEND_URL}/docs", timeout=10)
        
        if response.status_code == 200:
            print("✅ API docs accessible at /docs")
            return True
        else:
            print(f"❌ API docs returned status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Could not access API docs: {e}")
        return False


def test_chat_endpoint_auth() -> bool:
    """Test that chat endpoint requires authentication"""
    print("\n🔍 Testing chat endpoint authentication...")
    try:
        response = requests.post(
            f"{BACKEND_URL}/v1/chat/stream",
            json={
                "session_id": "test",
                "coach_id": "test",
                "message": "test"
            },
            timeout=10
        )
        
        if response.status_code == 401:
            print("✅ Chat endpoint correctly requires authentication")
            return True
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")
            print("   Expected 401 (Unauthorized)")
            return False
            
    except Exception as e:
        print(f"❌ Error testing chat endpoint: {e}")
        return False


def main():
    """Run all health checks"""
    print("=" * 60)
    print("Backend Health Check - Task 0.5")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}\n")
    
    results = []
    
    # Run tests
    results.append(("Health Endpoint", test_health_endpoint()))
    results.append(("API Documentation", test_api_docs()))
    results.append(("Chat Authentication", test_chat_endpoint_auth()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All checks passed! Backend is healthy.")
        print("\n📱 Next step: Test chat functionality in mobile app")
        print("   1. Open mobile app")
        print("   2. Navigate to any coach")
        print("   3. Send message: 'Hello, can you help me?'")
        print("   4. Verify response streams back")
        return 0
    else:
        print("\n⚠️  Some checks failed. Review errors above.")
        print("\n🔧 Troubleshooting:")
        print("   - Check Railway deployment status")
        print("   - Verify environment variables are set")
        print("   - Check Railway logs for errors")
        return 1


if __name__ == "__main__":
    sys.exit(main())
