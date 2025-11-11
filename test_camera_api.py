#!/usr/bin/env python3

import requests
import time
import random
from datetime import datetime

# Konfigurasi
API_ENDPOINT = "http://localhost/detector-getaran/api/receive_camera_data.php"
LAPTOP_ID = 1  # Ganti sesuai tim yang mau di-simulate

def generate_displacement():
    """Generate displacement random (simulasi pembacaan kamera)"""
    # Displacement antara -500 hingga 500 mm
    dista = round(random.uniform(-200, 200), 2)
    distb = round(random.uniform(-200, 200), 2)
    return dista, distb

def send_camera_data(laptop_id, dista, distb, is_a_detected=True, is_b_detected=True):

    payload = {
        "laptop_id": laptop_id,
        "dista": dista,
        "distb": distb,
        "is_a_detected": is_a_detected,
        "is_b_detected": is_b_detected
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=payload, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                enriched = data.get('data', {})
                print(f"   Data sent successfully!")
                print(f"   Laptop: {enriched.get('laptop_id')} - {enriched.get('nama_tim')}")
                print(f"   Category: {enriched.get('category')}, Freq: {enriched.get('frequency')} Hz")
                print(f"   Time: {enriched.get('relative_time')}s")
                print(f"   Disp A: {enriched.get('dista')} mm, Disp B: {enriched.get('distb')} mm")
                return True
            else:
                print(f"Server error: {data.get('error')}")
                return False
        else:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            print(f"HTTP {response.status_code}: {error_data.get('error', response.text)}")
            if 'message' in error_data:
                print(f"   {error_data['message']}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"Connection failed. Is server running?")
        return False
    except requests.exceptions.Timeout:
        print(f"Request timeout")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def simulate_camera(laptop_id, duration=60, interval=0.5):
    """
    Simulate kamera mengirim data secara berkala
    
    Args:
        laptop_id: ID laptop/tim (1-8)
        duration: Durasi simulasi dalam detik (default 60)
        interval: Interval pengiriman dalam detik (default 0.5)
    """
    print("=" * 70)
    print("   CAMERA DATA SIMULATOR")
    print("=" * 70)
    print(f"   Laptop ID: {laptop_id}")
    print(f"   API Endpoint: {API_ENDPOINT}")
    print(f"   Duration: {duration}s, Interval: {interval}s")
    print(f"   Press Ctrl+C to stop")
    print("=" * 70)
    print()
    
    start_time = time.time()
    count = 0
    success_count = 0
    
    try:
        while True:
            elapsed = time.time() - start_time
            
            if elapsed >= duration:
                print(f"\n Duration reached ({duration}s)")
                break
            
            # Generate data (simulate kamera baca displacement)
            dista, distb = generate_displacement()
            
            # Kirim ke server
            count += 1
            print(f"\n [{count}] Sending data... (elapsed: {elapsed:.1f}s)")
            
            if send_camera_data(laptop_id, dista, distb):
                success_count += 1
            
            # Tunggu interval berikutnya
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\n\n  Interrupted by user")
    
    # Summary
    print("\n" + "=" * 70)
    print("   SUMMARY")
    print("=" * 70)
    print(f"   Total sent: {count}")
    print(f"   Success: {success_count}")
    print(f"   Failed: {count - success_count}")
    print(f"   Duration: {elapsed:.1f}s")
    print("=" * 70)

if __name__ == "__main__":
    import sys
    
    # Ambil laptop_id dari argument atau pakai default
    laptop_id = int(sys.argv[1]) if len(sys.argv) > 1 else LAPTOP_ID
    
    if laptop_id < 1 or laptop_id > 8:
        print("laptop_id harus 1-8")
        sys.exit(1)
    
    simulate_camera(laptop_id)
