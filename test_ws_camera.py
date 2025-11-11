import json
import time
from websocket import create_connection

print('='*70)
print('  Test WebSocket Camera Integration')
print('='*70)
print()

# Connect to WebSocket
print('Connecting to ws://localhost:8080...')
try:
    ws = create_connection('ws://localhost:8080', timeout=5)
    print('✓ Connected!')
    print()
except Exception as e:
    print(f'✗ Connection failed: {e}')
    print()
    print('Make sure WebSocket server is running:')
    print('  php websocket_server.php')
    exit(1)

# Send test camera data
print('Sending test camera_data message...')
test_data = {
    'type': 'camera_data',
    'laptop_id': 1,
    'dista': 5.234,
    'distb': 3.456,
    'is_a_detected': True,
    'is_b_detected': True
}

ws.send(json.dumps(test_data))
print('✓ Sent:', json.dumps(test_data, indent=2))
print()

# Wait for response
print('Waiting for broadcast response...')
ws.settimeout(3)
try:
    response = ws.recv()
    response_data = json.loads(response)
    print('✓ Received broadcast:')
    print(json.dumps(response_data, indent=2))
    print()
    
    # Check format
    if response_data.get('type') == 'new_data':
        if 'data' in response_data and isinstance(response_data['data'], list):
            print('✓ Format correct: type=new_data, data is array')
            if len(response_data['data']) > 0:
                item = response_data['data'][0]
                print(f'✓ Has {len(item)} fields')
                print('  Fields:', ', '.join(item.keys()))
            else:
                print('✗ data array is empty!')
        else:
            print('✗ Format wrong: data should be array!')
    else:
        print(f'✗ Wrong type: {response_data.get(\"type\")}')
        
except Exception as e:
    print(f'✗ No response: {e}')

ws.close()
print()
print('='*70)
print('  Test complete!')
print('='*70)
