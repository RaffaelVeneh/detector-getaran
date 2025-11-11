"""
Quick test untuk API receive_camera_data.php
Test dari laptop SERVER (localhost) atau dari laptop CLIENT (192.168.43.26)
"""
import requests
import json
import sys

# Ganti dengan IP yang sesuai:
# - Jika test dari laptop SERVER ini: "localhost" atau "192.168.43.26"
# - Jika test dari laptop CLIENT (camera): "192.168.43.26"
SERVER_IP = "localhost"  # Changed to localhost since we're on server

url = f"http://{SERVER_IP}/detector-getaran/api/receive_camera_data.php"

# Data test
test_data = {
    "laptop_id": 1,
    "dista": 10.5,
    "distb": 15.2,
    "is_a_detected": True,
    "is_b_detected": True
}

print(f"🔍 Testing API: {url}", flush=True)
print(f"📤 Sending data: {json.dumps(test_data, indent=2)}", flush=True)
print("", flush=True)

try:
    response = requests.post(url, json=test_data, timeout=5)
    print(f"📥 Response Status: {response.status_code}", flush=True)
    print(f"📥 Response Body:", flush=True)
    
    try:
        response_json = response.json()
        print(json.dumps(response_json, indent=2), flush=True)
    except Exception as e:
        print(f"JSON parse error: {e}", flush=True)
        print(response.text, flush=True)
    
    print("", flush=True)
    
    if response.status_code == 200:
        print("✅ API CONNECTION SUCCESS!", flush=True)
        print("✅ Server dapat menerima data dari camera", flush=True)
        print("", flush=True)
        print("Next step: Gunakan IP ini di camera script:", flush=True)
        print(f"   Server Address: 192.168.43.26", flush=True)
    else:
        print("⚠️  API responded but with error", flush=True)
        print(f"   Status: {response.status_code}", flush=True)
        
except requests.exceptions.ConnectionError as e:
    print(f"❌ CONNECTION FAILED!", flush=True)
    print(f"   Error: {e}", flush=True)
    print("", flush=True)
    print("Troubleshooting:", flush=True)
    print("1. Pastikan Laragon running", flush=True)
    print("2. Cek firewall", flush=True)
    print(f"3. Ping test: ping {SERVER_IP}", flush=True)
    sys.exit(1)
    
except requests.exceptions.Timeout:
    print(f"❌ TIMEOUT!", flush=True)
    print(f"   Server tidak merespons dalam 5 detik", flush=True)
    sys.exit(1)
    
except Exception as e:
    print(f"❌ ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)
