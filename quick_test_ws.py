"""
Quick Test Script - WebSocket Camera Sender
Untuk test dari terminal Laragon dengan mudah
"""
import json
import time
import sys

# Check if websocket-client is installed
try:
    from websocket import create_connection
except ImportError:
    print('Installing required library: websocket-client...')
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'websocket-client', '--quiet'])
    print('✓ Library installed, please run the script again.')
    print()
    print('Run: python quick_test_ws.py')
    sys.exit(0)

def test_websocket_camera():
    print('='*70)
    print('  Quick Test - WebSocket Camera Sender')
    print('='*70)
    print()
    
    # Step 1: Connect
    print('[1/4] Connecting to WebSocket server...')
    try:
        ws = create_connection('ws://localhost:8080', timeout=5)
        print('      ✓ Connected to ws://localhost:8080')
    except Exception as e:
        print(f'      ✗ Failed: {e}')
        print()
        print('      Pastikan WebSocket server running:')
        print('      php websocket_server.php')
        return False
    
    print()
    
    # Step 2: Send test data
    print('[2/4] Sending test camera data...')
    test_data = {
        'type': 'camera_data',
        'laptop_id': 1,
        'dista': 5.5,
        'distb': 3.2,
        'is_a_detected': True,
        'is_b_detected': True
    }
    
    try:
        ws.send(json.dumps(test_data))
        print(f'      ✓ Sent: laptop_id=1, distA=5.5mm, distB=3.2mm')
    except Exception as e:
        print(f'      ✗ Failed to send: {e}')
        ws.close()
        return False
    
    print()
    
    # Step 3: Wait for broadcast
    print('[3/4] Waiting for broadcast response...')
    ws.settimeout(3)
    try:
        response = ws.recv()
        data = json.loads(response)
        
        if data.get('type') == 'new_data' and isinstance(data.get('data'), list):
            print('      ✓ Received correct format')
            if len(data['data']) > 0:
                item = data['data'][0]
                print(f"      ✓ laptop_id: {item.get('laptop_id')}")
                print(f"      ✓ category: {item.get('category')}")
                print(f"      ✓ frequency: {item.get('frequency')} Hz")
                print(f"      ✓ session_id: {item.get('session_id')}")
                print(f"      ✓ Fields count: {len(item)}/11")
            else:
                print('      ✗ Data array is empty')
        else:
            print('      ✗ Wrong format received')
            print(f'      Received: {json.dumps(data, indent=2)}')
    except Exception as e:
        print(f'      ✗ No response: {e}')
        print('      Pastikan session sudah di-start!')
        ws.close()
        return False
    
    print()
    
    # Step 4: Close
    print('[4/4] Closing connection...')
    ws.close()
    print('      ✓ Connection closed')
    
    print()
    print('='*70)
    print('  ✓ TEST PASSED - WebSocket camera integration working!')
    print('='*70)
    return True

if __name__ == '__main__':
    success = test_websocket_camera()
    exit(0 if success else 1)
