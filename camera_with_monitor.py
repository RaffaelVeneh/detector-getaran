"""
Camera Simulator with WebSocket Monitor
========================================
Script ini mensimulasikan kamera yang:
1. Mengirim data ke API endpoint (HTTP POST)
2. Sekaligus monitor broadcast dari WebSocket server
3. Verifikasi bahwa data yang dikirim sampai ke broadcast

Author: System
Date: 2025-11-10
"""

import requests
import json
import time
import threading
import websocket
import random
from datetime import datetime
from collections import deque

class CameraSimulator:
    def __init__(self, laptop_id, api_url, ws_url):
        self.laptop_id = laptop_id
        self.api_url = api_url
        self.ws_url = ws_url
        self.sent_count = 0
        self.success_count = 0
        self.failed_count = 0
        self.broadcast_received = 0
        self.ws = None
        self.running = False
        self.recent_broadcasts = deque(maxlen=10)  # Track last 10 broadcasts
        
    def on_message(self, ws, message):
        """Handle WebSocket messages"""
        try:
            data = json.loads(message)
            if data.get('type') == 'new_data':
                self.broadcast_received += 1
                
                # Check if it's our data
                broadcast_data = data.get('data', [])
                for item in broadcast_data:
                    if item.get('laptop_id') == self.laptop_id:
                        timestamp = item.get('timestamp', 'N/A')
                        relative_time = item.get('relative_time', 0)
                        dista = item.get('dista', 0)
                        distb = item.get('distb', 0)
                        
                        print(f"  📡 BROADCAST RECEIVED: t={relative_time}s, distA={dista:.2f}mm, distB={distb:.2f}mm")
                        self.recent_broadcasts.append({
                            'time': relative_time,
                            'dista': dista,
                            'distb': distb
                        })
                        
        except json.JSONDecodeError as e:
            print(f"  ⚠️  WebSocket JSON error: {e}")
        except Exception as e:
            print(f"  ⚠️  WebSocket message error: {e}")
    
    def on_error(self, ws, error):
        """Handle WebSocket errors"""
        print(f"  ❌ WebSocket Error: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket close"""
        print(f"\n  🔌 WebSocket connection closed")
        print(f"     Total broadcasts received: {self.broadcast_received}")
    
    def on_open(self, ws):
        """Handle WebSocket open"""
        print(f"  ✅ WebSocket connected to {self.ws_url}")
        print(f"  👂 Listening for broadcasts...\n")
    
    def start_websocket(self):
        """Start WebSocket connection in separate thread"""
        def run_ws():
            self.ws = websocket.WebSocketApp(
                self.ws_url,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close,
                on_open=self.on_open
            )
            self.ws.run_forever()
        
        ws_thread = threading.Thread(target=run_ws, daemon=True)
        ws_thread.start()
        time.sleep(2)  # Wait for connection
    
    def generate_data(self, base_time):
        """Generate realistic vibration data"""
        # Simulate sinusoidal vibration with noise
        frequency = 1.5  # Hz
        amplitude_a = random.uniform(150, 200)  # mm
        amplitude_b = random.uniform(150, 200)  # mm
        noise_a = random.uniform(-10, 10)
        noise_b = random.uniform(-10, 10)
        
        angle = 2 * 3.14159 * frequency * base_time
        dista = amplitude_a * (1 - abs(2 * (angle % (2 * 3.14159)) / (2 * 3.14159) - 1)) + noise_a
        distb = amplitude_b * (1 - abs(2 * (angle % (2 * 3.14159)) / (2 * 3.14159) - 1)) + noise_b
        
        return {
            "laptop_id": self.laptop_id,
            "dista": round(dista, 2),
            "distb": round(distb, 2),
            "is_a_detected": abs(dista) > 10,
            "is_b_detected": abs(distb) > 10
        }
    
    def send_data(self, duration=60, interval=0.5):
        """
        Send data to API for specified duration
        
        Args:
            duration: Recording duration in seconds (default 60)
            interval: Time between sends in seconds (default 0.5 = 2 Hz)
        """
        print(f"\n{'='*60}")
        print(f"  📹 CAMERA SIMULATOR - Laptop ID: {self.laptop_id}")
        print(f"{'='*60}")
        print(f"  Duration: {duration}s")
        print(f"  Interval: {interval}s ({1/interval:.1f} Hz)")
        print(f"  API: {self.api_url}")
        print(f"{'='*60}\n")
        
        # Start WebSocket monitor
        print("  🔌 Starting WebSocket monitor...")
        self.start_websocket()
        
        start_time = time.time()
        base_time = 0
        self.running = True
        
        print("  📤 Starting data transmission...\n")
        
        try:
            while self.running and (time.time() - start_time) < duration:
                # Generate data
                data = self.generate_data(base_time)
                self.sent_count += 1
                
                # Send to API
                try:
                    response = requests.post(
                        self.api_url,
                        json=data,
                        headers={'Content-Type': 'application/json'},
                        timeout=2
                    )
                    
                    if response.status_code == 200:
                        self.success_count += 1
                        result = response.json()
                        relative_time = result['data'].get('relative_time', 0)
                        
                        # Progress indicator
                        progress = '█' * int((base_time / duration) * 30)
                        empty = '░' * (30 - len(progress))
                        
                        print(f"  [{progress}{empty}] t={relative_time:2d}s | "
                              f"Sent: {self.sent_count:3d} | Success: {self.success_count:3d} | "
                              f"Broadcasts: {self.broadcast_received:3d}", end='\r')
                        
                    else:
                        self.failed_count += 1
                        error_msg = response.json().get('error', 'Unknown error')
                        if 'session has ended' not in error_msg:
                            print(f"\n  ⚠️  API Error ({response.status_code}): {error_msg}")
                        
                except requests.exceptions.Timeout:
                    self.failed_count += 1
                    print(f"\n  ⏱️  Timeout at t={base_time}s")
                except requests.exceptions.RequestException as e:
                    self.failed_count += 1
                    print(f"\n  ❌ Request error: {e}")
                
                base_time += interval
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n\n  ⏸️  Stopped by user")
            self.running = False
        
        # Final report
        self.print_summary()
    
    def print_summary(self):
        """Print final summary"""
        print(f"\n\n{'='*60}")
        print(f"  📊 TRANSMISSION SUMMARY")
        print(f"{'='*60}")
        print(f"  Total sent:       {self.sent_count}")
        print(f"  Success:          {self.success_count} ({self.success_count/max(self.sent_count,1)*100:.1f}%)")
        print(f"  Failed:           {self.failed_count} ({self.failed_count/max(self.sent_count,1)*100:.1f}%)")
        print(f"  Broadcasts heard: {self.broadcast_received}")
        print(f"{'='*60}")
        
        # Broadcast vs Sent comparison
        if self.broadcast_received > 0:
            ratio = self.broadcast_received / max(self.success_count, 1) * 100
            print(f"\n  📡 Broadcast Ratio: {ratio:.1f}%")
            
            if ratio >= 95:
                print(f"  ✅ EXCELLENT: Almost all data broadcasted!")
            elif ratio >= 80:
                print(f"  ✓  GOOD: Most data broadcasted")
            elif ratio >= 50:
                print(f"  ⚠️  WARNING: Some broadcasts missed")
            else:
                print(f"  ❌ CRITICAL: Many broadcasts missing!")
        
        # Recent broadcasts
        if self.recent_broadcasts:
            print(f"\n  📋 Last {len(self.recent_broadcasts)} broadcasts:")
            for i, bc in enumerate(reversed(self.recent_broadcasts), 1):
                print(f"     {i}. t={bc['time']:2d}s | distA={bc['dista']:6.2f}mm | distB={bc['distb']:6.2f}mm")
        
        print(f"\n{'='*60}\n")


def start_new_session(base_url):
    """Start a new recording session"""
    try:
        response = requests.get(f"{base_url}/start_new_session.php")
        if response.status_code == 200:
            print(f"  ✅ New session started")
            return True
        else:
            print(f"  ❌ Failed to start session: {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Error starting session: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Camera Simulator with WebSocket Monitor',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Simulate camera 1 for 30 seconds
  python camera_with_monitor.py 1 -d 30
  
  # Simulate camera 5 for 60 seconds, 2 Hz sampling
  python camera_with_monitor.py 5 -d 60 -i 0.5
  
  # Quick 10 second test
  python camera_with_monitor.py 1 -d 10 -i 1
        """
    )
    
    parser.add_argument('laptop_id', type=int, choices=range(1, 9),
                        help='Laptop/Camera ID (1-8)')
    parser.add_argument('-d', '--duration', type=int, default=60,
                        help='Recording duration in seconds (default: 60)')
    parser.add_argument('-i', '--interval', type=float, default=0.5,
                        help='Time between sends in seconds (default: 0.5)')
    parser.add_argument('--api', default='http://localhost/detector-getaran',
                        help='Base API URL (default: http://localhost/detector-getaran)')
    parser.add_argument('--no-session', action='store_true',
                        help='Skip starting new session (assume session already started)')
    
    args = parser.parse_args()
    
    # URLs
    base_url = args.api
    api_url = f"{base_url}/api/receive_camera_data.php"
    ws_url = "ws://localhost:8080"
    
    print(f"\n{'='*60}")
    print(f"  🎬 CAMERA SIMULATOR WITH WEBSOCKET MONITOR")
    print(f"{'='*60}\n")
    
    # Start new session (unless --no-session flag)
    if not args.no_session:
        print("  🎯 Starting new recording session...")
        if not start_new_session(base_url):
            print("\n  ❌ Cannot start session. Exiting.")
            exit(1)
        
        print("  ⏳ Waiting 1 second for session initialization...\n")
        time.sleep(1)
    else:
        print("  ℹ️  Using existing session (--no-session flag)\n")
    
    # Create and run simulator
    camera = CameraSimulator(args.laptop_id, api_url, ws_url)
    camera.send_data(duration=args.duration, interval=args.interval)
    
    # Keep WebSocket alive for a bit to catch last broadcasts
    print("\n  ⏳ Waiting 2 seconds for remaining broadcasts...")
    time.sleep(2)
    
    print("  ✅ Done!")
