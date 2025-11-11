#!/usr/bin/env python3
"""
Simple connection test untuk debugging refactor_aruco.py
"""
import requests
import sys

def test_connection(server_address="localhost"):
    """Test connection ke server"""
    try:
        print(f"🔍 Testing connection to {server_address}...")
        
        # Test 1: Homepage
        url = f"http://{server_address}/detector-getaran/"
        print(f"\n1. Testing homepage: {url}")
        response = requests.get(url, timeout=5)
        print(f"   ✅ Status: {response.status_code}")
        
        # Test 2: API endpoint
        api_url = f"http://{server_address}/detector-getaran/api/receive_camera_data.php"
        print(f"\n2. Testing API: {api_url}")
        
        test_data = {
            "laptop_id": 1,
            "dista": 10.5,
            "distb": 15.2,
            "is_a_detected": True,
            "is_b_detected": True
        }
        
        api_response = requests.post(api_url, json=test_data, timeout=5)
        print(f"   ✅ Status: {api_response.status_code}")
        print(f"   Response: {api_response.text[:200]}")
        
        if api_response.status_code == 200:
            print("\n✅ ALL TESTS PASSED!")
            return True
        else:
            print(f"\n⚠️ API returned status {api_response.status_code}")
            return True  # Still consider success if reachable
            
    except requests.Timeout:
        print(f"\n❌ TIMEOUT: Server tidak respond dalam 5 detik")
        print("\nChecklist:")
        print("  1. Apakah Laragon sudah distart?")
        print("  2. Apakah Apache running? (cek di Laragon)")
        return False
        
    except requests.ConnectionError as e:
        print(f"\n❌ CONNECTION REFUSED: Cannot connect to server")
        print(f"   Error: {e}")
        print("\nChecklist:")
        print("  1. Apakah Laragon sudah distart?")
        print("  2. Apakah Apache running? (lihat icon Laragon)")
        print("  3. Try: http://localhost di browser")
        print("  4. Firewall blocking?")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    server = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    success = test_connection(server)
    sys.exit(0 if success else 1)
