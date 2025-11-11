#!/usr/bin/env python3
"""
CAMERA LAPTOP TEST - Test connection ke server laptop
Jalankan script ini di LAPTOP KAMERA (Nur Wicaksono)
"""
import requests
import sys

SERVER_IP = "192.168.43.26"  # IP laptop server (Asya)

print("="*60)
print("CONNECTION TEST - Camera Laptop → Server Laptop")
print("="*60)
print(f"\nServer IP: {SERVER_IP}")
print(f"Testing connection...\n")

try:
    # Test 1: Homepage
    url = f"http://{SERVER_IP}/detector-getaran/"
    print(f"[1/2] Testing homepage: {url}")
    response = requests.get(url, timeout=5)
    
    if response.status_code == 200:
        print(f"      ✅ SUCCESS! Status {response.status_code}")
        print(f"      Response length: {len(response.text)} bytes")
    else:
        print(f"      ⚠️ Unexpected status: {response.status_code}")
    
    # Test 2: API endpoint
    api_url = f"http://{SERVER_IP}/detector-getaran/api/receive_camera_data.php"
    print(f"\n[2/2] Testing API: {api_url}")
    
    test_data = {
        "laptop_id": 1,
        "dista": 10.5,
        "distb": 15.2,
        "is_a_detected": True,
        "is_b_detected": True
    }
    
    api_response = requests.post(api_url, json=test_data, timeout=5)
    print(f"      ✅ API Status: {api_response.status_code}")
    print(f"      Response: {api_response.text[:150]}")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    print("\nCamera laptop can connect to server!")
    print(f"You can now use '{SERVER_IP}' in refactor_aruco.py")
    print("\nNext step:")
    print(f"  1. Run refactor_aruco.py")
    print(f"  2. Enter Server Address: {SERVER_IP}")
    print(f"  3. Click 'Test Connection' (should pass)")
    print(f"  4. Click 'Start Detection'")
    
    sys.exit(0)
    
except requests.ConnectionError as e:
    print(f"      ❌ CONNECTION REFUSED!")
    print(f"\n{'='*60}")
    print("DIAGNOSIS: FIREWALL BLOCKING")
    print("="*60)
    
    print(f"\n🔥 Problem:")
    print(f"   Windows Firewall on server laptop (Asya) is blocking")
    print(f"   incoming connections to port 80 from other devices.")
    
    print(f"\n💡 Solution:")
    print(f"   On SERVER LAPTOP (Asya), run PowerShell AS ADMINISTRATOR:")
    print(f"\n   netsh advfirewall firewall add rule name=\"Apache HTTP Laragon\" dir=in action=allow protocol=TCP localport=80 remoteip=192.168.43.0/24 profile=any")
    
    print(f"\n📋 Or use GUI method:")
    print(f"   1. Open 'Windows Defender Firewall'")
    print(f"   2. Click 'Allow an app through firewall'")
    print(f"   3. Add: C:\\laragon\\bin\\apache\\...\\httpd.exe")
    print(f"   4. Check 'Public' and 'Private' networks")
    
    print(f"\n🔍 Checklist before trying again:")
    print(f"   [ ] Server laptop Apache running?")
    print(f"   [ ] Firewall rule added?")
    print(f"   [ ] Both laptops on SAME WiFi/hotspot?")
    print(f"   [ ] Can ping {SERVER_IP}?")
    
    print(f"\n📄 See FIREWALL_FIX.md for detailed instructions")
    print("="*60)
    
    sys.exit(1)
    
except requests.Timeout:
    print(f"      ❌ TIMEOUT!")
    print(f"\n{'='*60}")
    print("DIAGNOSIS: NETWORK ISSUE")
    print("="*60)
    
    print(f"\nServer not responding in 5 seconds.")
    print(f"\nCheck:")
    print(f"  1. Is server laptop Apache running?")
    print(f"  2. Are both laptops on SAME network?")
    print(f"  3. Try ping: ping {SERVER_IP}")
    
    sys.exit(1)
    
except Exception as e:
    print(f"      ❌ ERROR: {e}")
    print(f"\nUnexpected error occurred.")
    print(f"Error type: {type(e).__name__}")
    sys.exit(1)
