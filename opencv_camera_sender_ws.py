import json
import time
import sys

# Check if websocket-client is installed
try:
    from websocket import create_connection, WebSocketException
except ImportError:
    print('Installing required library: websocket-client...')
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'websocket-client', '--quiet'])
    from websocket import create_connection, WebSocketException
    print('✓ Library installed successfully\n')

class CameraSenderWS:
    """
    WebSocket sender untuk kirim data dari OpenCV langsung ke WebSocket server
    
    Flow:
    1. Kamera OpenCV → detect → 5 fields (laptop_id, dista, distb, is_a_detected, is_b_detected)
    2. Kirim via WebSocket ke server
    3. Server tambahkan fields lain (frequency, timestamp, dll)
    4. Server broadcast ke admin page & user pages
    """
    
    def __init__(self, laptop_id, ws_url="ws://localhost:8080"):
        """
        Initialize WebSocket sender
        
        Args:
            laptop_id (int): ID laptop/kamera (1-8)
            ws_url (str): URL WebSocket server
        """
        self.laptop_id = laptop_id
        self.ws_url = ws_url
        self.ws = None
        self.success_count = 0
        self.fail_count = 0
        self.connected = False
        
    def connect(self):
        """
        Buka koneksi WebSocket ke server
        
        Returns:
            bool: True jika berhasil connect
        """
        try:
            print(f"Connecting to WebSocket: {self.ws_url}...")
            self.ws = create_connection(self.ws_url, timeout=5)
            self.connected = True
            print("✓ Connected to WebSocket server")
            return True
        except WebSocketException as e:
            print(f"✗ WebSocket connection error: {e}")
            self.connected = False
            return False
        except Exception as e:
            print(f"✗ Connection error: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """
        Tutup koneksi WebSocket
        """
        if self.ws:
            try:
                self.ws.close()
                print("✓ WebSocket connection closed")
            except:
                pass
            finally:
                self.connected = False
                self.ws = None
    
    def send(self, dista, distb, is_a_detected, is_b_detected):
        """
        Kirim data ke WebSocket server
        
        Args:
            dista (float): Jarak displacement A (mm)
            distb (float): Jarak displacement B (mm)
            is_a_detected (bool): Apakah sensor A mendeteksi
            is_b_detected (bool): Apakah sensor B mendeteksi
            
        Returns:
            bool: True jika berhasil kirim
        """
        # Cek koneksi
        if not self.connected or not self.ws:
            print("✗ Not connected. Call connect() first!")
            self.fail_count += 1
            return False
        
        # Prepare data - 5 fields dari kamera
        data = {
            "type": "camera_data",  # Message type untuk server
            "laptop_id": self.laptop_id,
            "dista": float(dista),
            "distb": float(distb),
            "is_a_detected": bool(is_a_detected),
            "is_b_detected": bool(is_b_detected)
        }
        
        try:
            # Kirim JSON ke WebSocket
            message = json.dumps(data)
            self.ws.send(message)
            self.success_count += 1
            return True
            
        except WebSocketException as e:
            self.fail_count += 1
            print(f"✗ WebSocket send error: {e}")
            self.connected = False
            return False
            
        except Exception as e:
            self.fail_count += 1
            print(f"✗ Error: {e}")
            return False
    
    def receive_response(self, timeout=1):
        """
        Terima response dari server (opsional)
        
        Args:
            timeout (float): Timeout dalam detik
            
        Returns:
            dict: Response dari server, None jika tidak ada
        """
        if not self.connected or not self.ws:
            return None
        
        try:
            self.ws.settimeout(timeout)
            response = self.ws.recv()
            return json.loads(response)
        except:
            return None
    
    def get_stats(self):
        """Get statistics"""
        total = self.success_count + self.fail_count
        success_rate = (self.success_count / total * 100) if total > 0 else 0
        return {
            'success': self.success_count,
            'failed': self.fail_count,
            'total': total,
            'success_rate': success_rate,
            'connected': self.connected
        }
    
    def __enter__(self):
        """Context manager support"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup"""
        self.disconnect()


# ============================================================================
# CONTOH PENGGUNAAN DALAM KODE OPENCV
# ============================================================================

if __name__ == "__main__":
    """
    Contoh penggunaan untuk testing
    """
    import time
    
    print("="*70)
    print("  OpenCV Camera Sender - WebSocket Version")
    print("="*70)
    print("  Flow:")
    print("  1. Kamera OpenCV → 5 fields (laptop_id, dista, distb, detect A/B)")
    print("  2. WebSocket → Server (port 8080)")
    print("  3. Server → Tambah fields (frequency, timestamp, dll)")
    print("  4. Server → Broadcast ke Admin & User pages")
    print("="*70)
    print()
    
    # CARA 1: Dengan context manager (otomatis connect & disconnect)
    print("Method 1: Using context manager (recommended)")
    print("-" * 70)
    
    with CameraSenderWS(laptop_id=1) as sender:
        if sender.connected:
            print(f"Laptop ID: {sender.laptop_id}")
            print(f"WebSocket: {sender.ws_url}")
            print()
            
            # Simulasi kirim 5 data
            print("Mengirim 5 data test...")
            for i in range(5):
                # CONTOH: Di kode OpenCV asli, nilai ini dari hasil deteksi
                dista = 100.5 + (i * 10)  # mm
                distb = 200.3 - (i * 5)   # mm
                is_a_detected = (i % 2 == 0)  # True/False
                is_b_detected = True
                
                # KIRIM DATA VIA WEBSOCKET
                success = sender.send(
                    dista=dista,
                    distb=distb,
                    is_a_detected=is_a_detected,
                    is_b_detected=is_b_detected
                )
                
                if success:
                    print(f"✓ Data {i+1} terkirim | distA={dista:.1f}mm, distB={distb:.1f}mm")
                else:
                    print(f"✗ Data {i+1} gagal")
                
                time.sleep(0.5)  # Interval 0.5s = 2 Hz
            
            # Tampilkan statistik
            stats = sender.get_stats()
            print()
            print("="*70)
            print("  Statistik Pengiriman")
            print("="*70)
            print(f"  Total: {stats['total']}")
            print(f"  Sukses: {stats['success']} ({stats['success_rate']:.1f}%)")
            print(f"  Gagal: {stats['failed']}")
            print(f"  Status: {'Connected' if stats['connected'] else 'Disconnected'}")
            print("="*70)
    
    print()
    print()
    
    # CARA 2: Manual connect/disconnect
    print("Method 2: Manual connection")
    print("-" * 70)
    
    sender = CameraSenderWS(laptop_id=2)
    
    if sender.connect():
        print("Mengirim 3 data test...")
        
        for i in range(3):
            success = sender.send(
                dista=50.0 + i,
                distb=30.0 - i,
                is_a_detected=True,
                is_b_detected=True
            )
            
            if success:
                print(f"✓ Data {i+1} terkirim")
            
            time.sleep(0.5)
        
        sender.disconnect()
        
        stats = sender.get_stats()
        print()
        print(f"Total sent: {stats['success']}/{stats['total']}")
    
    print()
    print("="*70)
    print("  Test selesai!")
    print("="*70)
