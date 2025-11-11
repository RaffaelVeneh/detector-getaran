#!/usr/bin/env python3
"""
Script untuk mensimulasikan data dari semua tim masuk ke WebSocket server
Simulasi 16 tim: 8 Baja + 8 Beton
"""

import asyncio
import websockets
import json
import random
import time
from datetime import datetime

# Konfigurasi
WEBSOCKET_URI = "ws://localhost:8080"
FREQUENCIES = [1.5, 2.5, 3.5, 4.5, 5.5]
CATEGORIES = ['baja', 'beton']
NUM_TEAMS = 8

# Nama tim untuk setiap category
TEAM_NAMES = {
    'baja': [
        'Institut Teknologi Nasional Malang_TRISHA ABINAWA',
        'Universitas Negeri Malang_GARUDA UM',
        'Universitas Negeri Surabaya_NECHOIST',
        'Politeknik Negeri Jakarta_PNJ 1',
        'Politeknik Elektronika Negeri Surabaya_PENS TEAM',
        'Universitas Gadjah Mada_SEMAR MESEM',
        'Politeknik Negeri Bandung_POLBAN BAJA',
        'Institut Teknologi Sepuluh Nopember_ITS BAJA'
    ],
    'beton': [
        'Universitas Negeri Yogyakarta_Sahakarya',
        'Politeknik Negeri Bandung_Teras Polban',
        'Universitas Brawijaya_BETONESIA',
        'Institut Teknologi Sepuluh Nopember_ITS BETON',
        'Universitas Diponegoro_UNDIP BETON',
        'Politeknik Negeri Jakarta_PNJ BETON',
        'Universitas Sebelas Maret_UNS BETON',
        'Institut Teknologi Bandung_ITB BETON'
    ]
}

class DataSimulator:
    def __init__(self):
        self.session_id = None
        self.start_time = None
        self.is_running = False
        self.websocket = None
        self.current_category = 'baja'  # Default category
        self.current_frequency = 1.5     # Default frequency
        
    async def connect(self):
        """Connect ke WebSocket server"""
        try:
            # Disable ping timeout untuk testing (default 20 detik)
            self.websocket = await websockets.connect(
                WEBSOCKET_URI,
                ping_interval=None,  # Disable automatic ping
                ping_timeout=None    # Disable ping timeout
            )
            print(f"✅ Connected to WebSocket server: {WEBSOCKET_URI}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            return False
    
    async def start_session(self, category='baja', frequency=1.5):
        """Start recording session"""
        self.current_category = category
        self.current_frequency = frequency
        self.session_id = int(time.time())
        self.start_time = time.time()
        self.is_running = True
        
        message = {
            'type': 'session_started',
            'session_id': self.session_id,
            'timestamp': datetime.now().isoformat(),
            'category': category,
            'frequency': frequency
        }
        
        await self.websocket.send(json.dumps(message))
        print(f"\n🎬 Session started: Category={category}, Frequency={frequency}Hz")
        print(f"   Session ID: {self.session_id}")
    
    async def stop_session(self):
        """Stop recording session"""
        if not self.is_running:
            return
            
        self.is_running = False
        
        message = {
            'type': 'session_stopped',
            'session_id': self.session_id,
            'timestamp': datetime.now().isoformat()
        }
        
        await self.websocket.send(json.dumps(message))
        print(f"\n⏹️  Session stopped: {self.session_id}")
    
    def generate_displacement(self, relative_time, laptop_id):
        """
        Generate displacement data yang realistis
        Menggunakan sine wave dengan noise untuk simulasi getaran
        """
        # Base amplitude berbeda untuk setiap tim
        base_amplitude = 50 + (laptop_id * 10)
        
        # Frekuensi harmonik
        freq_factor = self.current_frequency / 1.5
        
        # Generate sine wave dengan noise
        displacement_a = base_amplitude * random.uniform(0.7, 1.3) * \
                        (0.8 + 0.2 * random.random()) * \
                        (1 - (relative_time / 60) * 0.3)  # Decay over time
        
        displacement_b = base_amplitude * random.uniform(0.6, 1.2) * \
                        (0.7 + 0.3 * random.random()) * \
                        (1 - (relative_time / 60) * 0.2)
        
        # Random polarity
        if random.random() > 0.5:
            displacement_a *= -1
        if random.random() > 0.5:
            displacement_b *= -1
        
        # Clamp to range
        displacement_a = max(-500, min(500, displacement_a))
        displacement_b = max(-500, min(500, displacement_b))
        
        return round(displacement_a, 2), round(displacement_b, 2)
    
    async def send_data(self):
        """Send simulated data untuk semua tim"""
        if not self.is_running:
            return
        
        relative_time = time.time() - self.start_time
        
        # Stop jika sudah 60 detik
        if relative_time >= 60:
            await self.stop_session()
            return
        
        data_batch = []
        
        # Generate data untuk 8 tim dalam category yang aktif
        for laptop_id in range(1, NUM_TEAMS + 1):
            disp_a, disp_b = self.generate_displacement(relative_time, laptop_id)
            
            data_item = {
                'laptop_id': laptop_id,
                'category': self.current_category,
                'nama_tim': TEAM_NAMES[self.current_category][laptop_id - 1],
                'dista': disp_a,  # Field name yang benar
                'distb': disp_b,  # Field name yang benar
                'frequency': self.current_frequency,
                'session_id': self.session_id,
                'relative_time': round(relative_time, 2),
                'timestamp': datetime.now().isoformat()
            }
            
            data_batch.append(data_item)
        
        # Send ke WebSocket server
        message = {
            'type': 'new_data',
            'data': data_batch
        }
        
        message_json = json.dumps(message)
        await self.websocket.send(message_json)
        
        # Progress indicator dengan detail
        if int(relative_time) % 5 == 0 or relative_time < 2:  # Print setiap 5 detik atau di awal
            print(f"\n📊 {int(relative_time):02d}s - Sent {len(data_batch)} teams | Sample: Tim 1 dista={data_batch[0]['dista']:.2f}")
        else:
            print(f"⏱️  {int(relative_time):02d}s - Sent data for {len(data_batch)} teams ({self.current_category})", end='\r')
    
    async def run_simulation(self, duration=60, interval=0.5, category='baja', frequency=1.5):
        """
        Run simulasi dengan interval tertentu
        
        Args:
            duration: Durasi simulasi dalam detik (max 60)
            interval: Interval pengiriman data dalam detik
            category: 'baja' atau 'beton'
            frequency: Frekuensi getaran (1.5, 2.5, 3.5, 4.5, 5.5)
        """
        if not await self.connect():
            return
        
        try:
            # Start session
            await self.start_session(category, frequency)
            
            # Send data periodically
            while self.is_running:
                await self.send_data()
                await asyncio.sleep(interval)
            
            print("\n✅ Simulation completed!")
            
        except KeyboardInterrupt:
            print("\n⚠️  Simulation interrupted by user")
            if self.is_running:
                await self.stop_session()
        except Exception as e:
            print(f"\n❌ Error during simulation: {e}")
        finally:
            if self.websocket:
                await self.websocket.close()
                print("🔌 WebSocket connection closed")

async def main():
    """Main function dengan menu interaktif"""
    print("=" * 60)
    print("   SIMULATOR DATA TIM - DETECTOR GETARAN")
    print("=" * 60)
    
    # Pilih category
    print("\n📋 Pilih Category:")
    print("   1. Baja")
    print("   2. Beton")
    category_choice = input("\nPilihan (1/2) [default: 1]: ").strip() or "1"
    category = 'beton' if category_choice == '2' else 'baja'
    
    # Pilih frequency
    print(f"\n🔊 Pilih Frekuensi:")
    for i, freq in enumerate(FREQUENCIES, 1):
        print(f"   {i}. {freq} Hz")
    freq_choice = input(f"\nPilihan (1-{len(FREQUENCIES)}) [default: 1]: ").strip() or "1"
    try:
        frequency = FREQUENCIES[int(freq_choice) - 1]
    except:
        frequency = 1.5
    
    # Interval pengiriman data
    print(f"\n⏱️  Interval Pengiriman Data:")
    interval_input = input("   Interval dalam detik [default: 0.5]: ").strip() or "0.5"
    try:
        interval = float(interval_input)
    except:
        interval = 0.5
    
    # Konfirmasi
    print("\n" + "=" * 60)
    print(f"   Category  : {category.upper()}")
    print(f"   Frequency : {frequency} Hz")
    print(f"   Interval  : {interval}s")
    print(f"   Duration  : 60 detik (1 menit)")
    print(f"   Teams     : 8 teams dari {category}")
    print("=" * 60)
    print("\nTekan ENTER untuk mulai atau Ctrl+C untuk cancel...")
    input()
    
    # Run simulator
    simulator = DataSimulator()
    await simulator.run_simulation(
        duration=60,
        interval=interval,
        category=category,
        frequency=frequency
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Simulator terminated")
