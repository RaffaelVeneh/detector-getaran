#!/usr/bin/env python3
"""
Simple Camera Simulator - Quick Testing
========================================
Versi simpel dari camera_with_monitor.py untuk testing cepat
tanpa WebSocket monitoring.

Usage:
    python quick_camera_test.py <laptop_id> [duration]
    
Examples:
    python quick_camera_test.py 1       # 30 detik default
    python quick_camera_test.py 2 60    # 60 detik
"""

import requests
import time
import random
import sys

def generate_data(laptop_id, base_time):
    """Generate realistic vibration data"""
    frequency = 1.5  # Hz
    amplitude_a = random.uniform(150, 200)
    amplitude_b = random.uniform(150, 200)
    noise_a = random.uniform(-10, 10)
    noise_b = random.uniform(-10, 10)
    
    angle = 2 * 3.14159 * frequency * base_time
    dista = amplitude_a * (1 - abs(2 * (angle % (2 * 3.14159)) / (2 * 3.14159) - 1)) + noise_a
    distb = amplitude_b * (1 - abs(2 * (angle % (2 * 3.14159)) / (2 * 3.14159) - 1)) + noise_b
    
    return {
        "laptop_id": laptop_id,
        "dista": round(dista, 2),
        "distb": round(distb, 2),
        "is_a_detected": abs(dista) > 10,
        "is_b_detected": abs(distb) > 10
    }

def start_session(base_url):
    """Start new recording session"""
    try:
        response = requests.get(f"{base_url}/start_new_session.php", timeout=5)
        if response.status_code == 200:
            print("✅ New session started")
            return True
    except Exception as e:
        print(f"❌ Failed to start session: {e}")
    return False

def send_data(laptop_id, duration=30, base_url="http://localhost/detector-getaran"):
    """Send data to API"""
    api_url = f"{base_url}/api/receive_camera_data.php"
    
    print(f"\n{'='*50}")
    print(f"  Camera Simulator - Laptop ID: {laptop_id}")
    print(f"  Duration: {duration}s | Interval: 0.5s (2 Hz)")
    print(f"{'='*50}\n")
    
    # Start session
    print("Starting new session...")
    if not start_session(base_url):
        print("Cannot start session. Exiting.")
        return
    
    time.sleep(1)
    print("Sending data...\n")
    
    sent = 0
    success = 0
    failed = 0
    start_time = time.time()
    base_time = 0
    
    try:
        while (time.time() - start_time) < duration:
            data = generate_data(laptop_id, base_time)
            sent += 1
            
            try:
                response = requests.post(
                    api_url,
                    json=data,
                    headers={'Content-Type': 'application/json'},
                    timeout=2
                )
                
                if response.status_code == 200:
                    success += 1
                    result = response.json()
                    relative_time = result['data'].get('relative_time', 0)
                    
                    # Progress
                    progress = int((base_time / duration) * 30)
                    bar = '█' * progress + '░' * (30 - progress)
                    print(f"  [{bar}] t={relative_time:2d}s | "
                          f"Sent: {sent:3d} | Success: {success:3d} | "
                          f"Failed: {failed:2d}", end='\r')
                else:
                    failed += 1
                    
            except Exception as e:
                failed += 1
            
            base_time += 0.5
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\n\n⏸️  Stopped by user")
    
    # Summary
    print(f"\n\n{'='*50}")
    print(f"  Summary:")
    print(f"  Total sent: {sent}")
    print(f"  Success:    {success} ({success/max(sent,1)*100:.1f}%)")
    print(f"  Failed:     {failed} ({failed/max(sent,1)*100:.1f}%)")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quick_camera_test.py <laptop_id> [duration]")
        print("Example: python quick_camera_test.py 1 30")
        sys.exit(1)
    
    laptop_id = int(sys.argv[1])
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    
    if laptop_id < 1 or laptop_id > 8:
        print("Error: laptop_id must be between 1 and 8")
        sys.exit(1)
    
    send_data(laptop_id, duration)
