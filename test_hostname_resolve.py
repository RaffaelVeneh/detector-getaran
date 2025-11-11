"""
Quick test for hostname resolution
"""
import socket

def test_resolve(hostname):
    print(f"\n{'='*60}")
    print(f"Testing: {hostname}")
    print(f"{'='*60}")
    
    # Method 1: gethostbyname (IPv4 only)
    try:
        ip = socket.gethostbyname(hostname)
        print(f"✅ gethostbyname: {ip}")
    except Exception as e:
        print(f"❌ gethostbyname failed: {e}")
    
    # Method 2: getaddrinfo (all addresses)
    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        print(f"\n📋 getaddrinfo results:")
        
        ipv4_addrs = []
        ipv6_addrs = []
        
        for info in addr_info:
            family_name = "IPv4" if info[0] == socket.AF_INET else "IPv6"
            addr = info[4][0]
            print(f"   {family_name}: {addr}")
            
            if info[0] == socket.AF_INET:
                ipv4_addrs.append(addr)
            else:
                ipv6_addrs.append(addr)
        
        print(f"\n📊 Summary:")
        print(f"   IPv4 addresses: {len(ipv4_addrs)}")
        print(f"   IPv6 addresses: {len(ipv6_addrs)}")
        
        if ipv4_addrs:
            print(f"\n✅ Recommended IPv4: {ipv4_addrs[0]}")
        elif ipv6_addrs:
            print(f"\n⚠️  Only IPv6 available: {ipv6_addrs[0]}")
            print(f"   HTTP requests may not work with IPv6!")
            
    except Exception as e:
        print(f"❌ getaddrinfo failed: {e}")

# Test different variations
test_resolve("Asya.local")
test_resolve("Asya")
test_resolve("192.168.43.42")
