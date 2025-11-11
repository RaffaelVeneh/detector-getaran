# Troubleshooting Connection Issues

## Problem: Cannot Connect to Server

### Diagnosis Results

**Test Date**: 2025-11-11

**Target Server**: Asya (192.168.43.42)

**Test Results**:
- ✅ Ping to 192.168.43.42: **SUCCESS** (Reply received, 5-11ms)
- ❌ HTTP Port 80: **CLOSED** (No response)
- ⚠️  mDNS Resolution: Asya.local returns **IPv6 only** (fe80::...)

**Conclusion**: 
**Laragon NOT RUNNING** on server laptop (Asya)

---

## Solution Steps

### Step 1: Start Laragon on Server (Laptop Asya)

1. **Open Laragon application**
2. **Click "Start All"** button
3. **Wait** for Apache and MySQL to start (green indicators)
4. **Verify** by opening browser: `http://localhost/detector-getaran/`

### Step 2: Check Server IP Address

On server laptop (Asya), run in PowerShell:
```powershell
ipconfig
```

Look for **"Wireless LAN adapter"** section:
```
IPv4 Address. . . . . . . . . . . : 192.168.43.XX
```

Note this IP address!

### Step 3: Allow Firewall Access

If Windows Firewall is ON, allow Apache:

**Option A - Quick (Disable Firewall for Private Network)**:
```powershell
Set-NetFirewallProfile -Profile Private -Enabled False
```

**Option B - Proper (Add Firewall Rule)**:
```powershell
New-NetFirewallRule -DisplayName "Laragon HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### Step 4: Test Connection from Client

On client laptop (camera laptop), run:

**Test 1: Ping**
```powershell
ping 192.168.43.42 -n 2
```
Should get: `Reply from 192.168.43.42`

**Test 2: HTTP Port**
```powershell
Test-NetConnection -ComputerName 192.168.43.42 -Port 80
```
Should get: `TcpTestSucceeded : True`

**Test 3: HTTP Request**
```powershell
curl http://192.168.43.42/detector-getaran/
```
Should get: HTML content

### Step 5: Update Camera Script

In `refactor_aruco.py`, use **IP address directly**:
```python
Server Address: 192.168.43.42
```

Or if mDNS works after fixes:
```python
Server Address: Asya.local
```

---

## Common Issues

### Issue 1: "Port 80 Closed"
**Symptom**: Ping works, but HTTP doesn't
**Cause**: Laragon not running
**Solution**: Start Laragon on server

### Issue 2: "Connection Timeout"
**Symptom**: Request hangs for 5+ seconds
**Cause**: Firewall blocking OR wrong IP
**Solution**: 
- Check firewall (disable temporarily to test)
- Verify IP with `ipconfig`
- Use IP address instead of hostname

### Issue 3: "Cannot Resolve Hostname"
**Symptom**: Python script shows "Cannot resolve Asya.local"
**Cause**: mDNS only returns IPv6, Python needs IPv4
**Solution**: Use IP address directly instead of hostname

### Issue 4: "Got IPv6 Address"
**Symptom**: Resolve works but HTTP fails
**Cause**: Windows mDNS prefers IPv6, Python requests needs IPv4
**Solution**: 
```python
# Use IP address directly
Server Address: 192.168.43.42

# Or try hostname without .local
Server Address: Asya
```

### Issue 5: "Network Unreachable"
**Symptom**: Ping fails completely
**Cause**: Different networks (not connected to same WiFi/hotspot)
**Solution**: 
- Connect both laptops to same hotspot
- Verify: `ipconfig` should show same subnet (e.g., 192.168.43.x)

---

## Quick Test Commands

**On Server Laptop (Asya)**:
```powershell
# Check if Laragon running
Get-Process -Name httpd -ErrorAction SilentlyContinue

# Check IP address
ipconfig | Select-String "IPv4"

# Test local access
curl http://localhost/detector-getaran/
```

**On Client Laptop (Camera)**:
```powershell
# Find server IP from ARP table
arp -a | Select-String "192.168"

# Test connectivity
ping [SERVER_IP] -n 2
Test-NetConnection -ComputerName [SERVER_IP] -Port 80

# Test HTTP
curl http://[SERVER_IP]/detector-getaran/
```

**In Python (Camera Script)**:
```python
import requests

# Test API endpoint
response = requests.get("http://192.168.43.42/detector-getaran/api/receive_camera_data.php")
print(f"Status: {response.status_code}")
```

---

## Network Setup Checklist

For Hotspot-based Connection:

### Server Laptop (Asya):
- [ ] Laragon installed
- [ ] Laragon running (Start All)
- [ ] Project in `C:\laragon\www\detector-getaran\`
- [ ] Browser can access `http://localhost/detector-getaran/`
- [ ] Hotspot enabled (Mobile Hotspot or WiFi router)
- [ ] Firewall allows Apache (port 80)

### Client Laptop (Camera):
- [ ] Connected to same hotspot/WiFi
- [ ] Can ping server IP
- [ ] Port 80 accessible on server
- [ ] Python installed with requests library
- [ ] Camera script has correct server IP

### Test Connection Flow:
```
Camera Laptop                    Server Laptop (Asya)
     |                                   |
     |---- Ping 192.168.43.42 --------->|
     |<--- Reply from 192.168.43.42 ----|
     |                                   |
     |---- HTTP GET /detector-getaran -->|
     |<--- 200 OK HTML response ---------|
     |                                   |
     |---- POST /api/receive_camera ---->|
     |<--- 200 OK JSON response ---------|
```

---

## Current Status

**Latest Test** (2025-11-11):
- Server IP: 192.168.43.42
- Ping: ✅ SUCCESS
- HTTP Port 80: ❌ CLOSED
- Action Required: **START LARAGON ON SERVER**

---

## Next Steps

1. **Go to server laptop (Asya)**
2. **Start Laragon** (Start All button)
3. **Wait 10-20 seconds** for services to start
4. **From client laptop, re-test**:
   ```powershell
   Test-NetConnection -ComputerName 192.168.43.42 -Port 80
   ```
5. **If True**: Connection ready! Run camera script
6. **If False**: Check firewall or try different IP

---

## Contact Info for Support

If still having issues:
1. Check both laptops are on **same network**
2. Try **disabling firewall temporarily** on server
3. Use **IP address** instead of hostname
4. Verify **Laragon green indicators** (Apache running)
