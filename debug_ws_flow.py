"""
Debug WebSocket Flow - Detailed
"""
import json
import time
import sys

try:
    from websocket import create_connection
except ImportError:
    print('Installing websocket-client...')
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'websocket-client', '--quiet'])
    from websocket import create_connection

print('='*70)
print('  DEBUG: WebSocket Camera Flow')
print('='*70)
print()

# Connect
print('Step 1: Connecting to WebSocket...')
try:
    ws = create_connection('ws://localhost:8080', timeout=5)
    print('✓ Connected!')
except Exception as e:
    print(f'✗ Connection failed: {e}')
    print('\nMake sure WebSocket server is running:')
    print('  php websocket_server.php')
    sys.exit(1)

print()

# Send camera data
print('Step 2: Sending camera_data...')
camera_data = {
    'type': 'camera_data',
    'laptop_id': 1,
    'dista': 5.5,
    'distb': 3.2,
    'is_a_detected': True,
    'is_b_detected': True
}

print(f'Sending: {json.dumps(camera_data, indent=2)}')
ws.send(json.dumps(camera_data))
print('✓ Sent!')
print()

# Wait for response
print('Step 3: Waiting for broadcast...')
ws.settimeout(5)

try:
    response = ws.recv()
    print(f'✓ Received response ({len(response)} bytes)')
    print()
    
    data = json.loads(response)
    print('Response data:')
    print(json.dumps(data, indent=2))
    print()
    
    # Analyze response
    print('Analysis:')
    print(f'  - Type: {data.get("type")}')
    print(f'  - Has "data" key: {"data" in data}')
    if 'data' in data:
        print(f'  - "data" is list: {isinstance(data["data"], list)}')
        print(f'  - "data" length: {len(data["data"]) if isinstance(data["data"], list) else "N/A"}')
        if isinstance(data['data'], list) and len(data['data']) > 0:
            item = data['data'][0]
            print(f'  - First item keys: {list(item.keys())}')
            print(f'  - laptop_id: {item.get("laptop_id")}')
            print(f'  - category: {item.get("category")}')
            print(f'  - frequency: {item.get("frequency")}')
    
except Exception as e:
    print(f'✗ No response or error: {e}')
    print()
    print('Possible issues:')
    print('  1. No active session (run: curl start_new_session.php)')
    print('  2. WebSocket server not processing camera_data')
    print('  3. Server error (check ws_output.log)')

ws.close()
print()
print('='*70)
print('  Debug complete')
print('='*70)
