"""
Network connectivity test for MongoDB Atlas
"""
import socket

def test_mongodb_connectivity():
    print("=" * 60)
    print("MongoDB Atlas Network Connectivity Test")
    print("=" * 60)
    
    # MongoDB Atlas shard servers from your connection string
    servers = [
        ("ac-ipclo5r-shard-00-00.i9zdqbu.mongodb.net", 27017),
        ("ac-ipclo5r-shard-00-01.i9zdqbu.mongodb.net", 27017),
        ("ac-ipclo5r-shard-00-02.i9zdqbu.mongodb.net", 27017),
    ]
    
    for host, port in servers:
        print(f"\n🔍 Testing connection to {host}:{port}")
        try:
            # Try to create a socket connection
            sock = socket.create_connection((host, port), timeout=5)
            sock.close()
            print(f"   ✅ SUCCESS - Server is reachable!")
        except socket.timeout:
            print(f"   ❌ TIMEOUT - Server is not responding (firewall/network issue)")
        except socket.gaierror as e:
            print(f"   ❌ DNS ERROR - Cannot resolve hostname: {e}")
        except Exception as e:
            print(f"   ❌ CONNECTION FAILED - {e}")
    
    print("\n" + "=" * 60)
    print("Next Steps:")
    print("=" * 60)
    print("""
1. If all connections TIMEOUT:
   - Your network/firewall is blocking MongoDB Atlas
   - Try disabling VPN or connecting to a different network
   - Check if your antivirus/firewall is blocking port 27017

2. If connections are SUCCESSFUL but SSL fails:
   - Go to MongoDB Atlas: https://cloud.mongodb.com
   - Check if your cluster is PAUSED (resume it)
   - Network Access → Add your IP address (or 0.0.0.0/0 for testing)
   - Database Access → Verify user credentials

3. MongoDB Atlas IP Whitelist:
   - Go to: Network Access → IP Access List
   - Click "Add IP Address"
   - Add "0.0.0.0/0" temporarily to allow all connections
   - Or add your specific IP address
    """)

if __name__ == "__main__":
    test_mongodb_connectivity()
