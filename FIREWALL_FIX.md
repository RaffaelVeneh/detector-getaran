# FIREWALL FIX - Connection Refused dari Laptop Kamera

## Problem
Laptop kamera (Nur Wicaksono) tidak bisa connect ke laptop server (Asya) dengan error **"Connection Refused"**.

## Root Cause
**Windows Firewall** di laptop server (Asya) BLOCK incoming connection ke port 80 dari network lain.

## Solution

### Option 1: Add Firewall Rule (RECOMMENDED)

**Di laptop SERVER (Asya), run PowerShell AS ADMINISTRATOR:**

```powershell
# Add firewall rule untuk allow HTTP dari subnet 192.168.43.x
netsh advfirewall firewall add rule name="Apache HTTP Laragon" dir=in action=allow protocol=TCP localport=80 remoteip=192.168.43.0/24 profile=any

# Verify rule created
netsh advfirewall firewall show rule name="Apache HTTP Laragon"
```

### Option 2: Temporarily Disable Firewall (TESTING ONLY)

**WARNING: TIDAK AMAN untuk production!**

```powershell
# Disable firewall (AS ADMINISTRATOR)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Test connection dari laptop kamera...

# Enable firewall kembali
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### Option 3: Allow httpd.exe in Firewall (GUI)

1. Open **Windows Defender Firewall**
2. Click **"Allow an app through firewall"**
3. Click **"Change settings"** (need admin)
4. Click **"Allow another app..."**
5. Browse to: `C:\laragon\bin\apache\httpd-2.4.62-240904-win64-VS17\bin\httpd.exe`
6. Check **"Public"** and **"Private"** networks
7. Click **OK**

## Verification

### Test dari laptop SERVER (Asya):

```powershell
# Should work (localhost)
curl http://localhost/detector-getaran/

# Should work (own IP)
curl http://192.168.43.26/detector-getaran/
```

### Test dari laptop KAMERA (Nur Wicaksono):

```powershell
# Test with curl
curl http://192.168.43.26/detector-getaran/

# Test with Python
python -c "import requests; r = requests.get('http://192.168.43.26/detector-getaran/'); print(f'Status: {r.status_code}')"
```

Expected result: **Status 200** (SUCCESS)

## Network Checklist

Jika masih gagal setelah firewall rule, check:

1. **Same WiFi/Hotspot?**
   ```powershell
   # Di kedua laptop, run:
   ipconfig | Select-String "IPv4|Wireless"
   
   # Must show same subnet: 192.168.43.x
   ```

2. **Can ping?**
   ```powershell
   # Dari laptop kamera:
   ping 192.168.43.26
   
   # Expected: Reply from 192.168.43.26
   ```

3. **Apache running?**
   ```powershell
   # Di laptop server:
   Get-Process httpd
   
   # Should show 2 httpd processes
   ```

4. **Correct port?**
   ```powershell
   # Di laptop server:
   netstat -ano | Select-String ":80 " | Select-String "LISTENING"
   
   # Should show: TCP    0.0.0.0:80    LISTENING
   ```

## Quick Test Script

Save as `test_from_camera.py` di laptop KAMERA:

```python
import requests

SERVER_IP = "192.168.43.26"  # IP laptop server (Asya)

print(f"Testing connection to {SERVER_IP}...")

try:
    response = requests.get(f"http://{SERVER_IP}/detector-getaran/", timeout=5)
    print(f"✅ SUCCESS! Status: {response.status_code}")
except requests.ConnectionError:
    print(f"❌ CONNECTION REFUSED!")
    print(f"\nPossible causes:")
    print(f"1. Firewall blocking on server laptop")
    print(f"2. Apache not running")
    print(f"3. Wrong IP address")
    print(f"4. Not on same network")
except requests.Timeout:
    print(f"❌ TIMEOUT! Server not responding.")
except Exception as e:
    print(f"❌ ERROR: {e}")
```

## Summary

**Problem:** Firewall block port 80
**Solution:** Run command di laptop SERVER (Asya) as ADMIN:

```powershell
netsh advfirewall firewall add rule name="Apache HTTP Laragon" dir=in action=allow protocol=TCP localport=80 remoteip=192.168.43.0/24 profile=any
```

**Then test from camera laptop:**
```powershell
curl http://192.168.43.26/detector-getaran/
```

Should show HTML output = SUCCESS!
