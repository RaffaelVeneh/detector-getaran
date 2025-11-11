#!/usr/bin/env python3
"""Simple API test - Check if receive_camera_data.php works"""
import sys
import json

try:
    import requests
    print("✓ requests module loaded")
except ImportError:
    print("✗ requests not installed. Run: pip install requests")
    sys.exit(1)

# Test data
url = "http://localhost/detector-getaran/api/receive_camera_data.php"
data = {
    "laptop_id": 1,
    "dista": 10.5,
    "distb": 15.2,
    "is_a_detected": True,
    "is_b_detected": True
}

print(f"\n{'='*60}")
print("API TEST")
print(f"{'='*60}")
print(f"URL: {url}")
print(f"Data: {json.dumps(data, indent=2)}")
print(f"{'='*60}\n")

try:
    print("Sending request...")
    response = requests.post(url, json=data, timeout=10)
    
    print(f"\n✓ Response received")
    print(f"  Status Code: {response.status_code}")
    print(f"  Headers: {dict(response.headers)}")
    print(f"\n  Response Body:")
    print(f"  {'-'*58}")
    
    try:
        response_json = response.json()
        print(json.dumps(response_json, indent=4))
    except:
        print(response.text)
    
    print(f"  {'-'*58}")
    
    if response.status_code == 200:
        print(f"\n{'='*60}")
        print("✅ SUCCESS - API WORKS!")
        print(f"{'='*60}\n")
        sys.exit(0)
    else:
        print(f"\n{'='*60}")
        print(f"⚠️  API RESPONDED WITH ERROR {response.status_code}")
        print(f"{'='*60}\n")
        sys.exit(1)
        
except requests.exceptions.ConnectionError as e:
    print(f"\n✗ Connection Error: {e}")
    print("\nTroubleshooting:")
    print("  1. Is Laragon running?")
    print("  2. Check: http://localhost/detector-getaran/")
    sys.exit(1)
    
except requests.exceptions.Timeout:
    print(f"\n✗ Timeout - server took too long to respond")
    sys.exit(1)
    
except Exception as e:
    print(f"\n✗ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
