"""
MongoDB Connection Test Script
Run this to diagnose connection issues
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import certifi
import os
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    mongodb_url = os.getenv("MONGODB_URL")
    
    print("=" * 60)
    print("MongoDB Connection Test")
    print("=" * 60)
    print(f"\n📋 Connection String (masked):")
    # Mask password in URL
    if mongodb_url:
        masked_url = mongodb_url
        if '@' in mongodb_url:
            parts = mongodb_url.split('@')
            user_part = parts[0].split('://')[-1]
            if ':' in user_part:
                username = user_part.split(':')[0]
                masked_url = mongodb_url.replace(user_part, f"{username}:****")
        print(f"   {masked_url}")
    else:
        print("   ❌ MONGODB_URL not found in .env file!")
        return
    
    print(f"\n📁 Database Name: {os.getenv('DATABASE_NAME', 'chatterbox')}")
    print(f"🔐 SSL Certificate Path: {certifi.where()}")
    
    print("\n🔄 Attempting to connect...")
    
    try:
        # Try connection with certifi
        client = AsyncIOMotorClient(
            mongodb_url,
            server_api=ServerApi('1'),
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=15000,
        )
        
        # Test ping
        await client.admin.command('ping')
        print("✅ SUCCESS! Connected to MongoDB Atlas")
        
        # Get server info
        server_info = await client.server_info()
        print(f"\n📊 MongoDB Server Version: {server_info.get('version', 'Unknown')}")
        
        # List databases
        db_list = await client.list_database_names()
        print(f"📚 Available Databases: {', '.join(db_list)}")
        
        client.close()
        print("\n✅ Connection test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Connection FAILED!")
        print(f"Error: {str(e)}")
        print("\n🔍 Troubleshooting Steps:")
        print("   1. Check MongoDB Atlas Network Access:")
        print("      - Go to https://cloud.mongodb.com")
        print("      - Navigate to: Network Access → IP Access List")
        print("      - Add your current IP or use 0.0.0.0/0 (allow all)")
        print("\n   2. Verify your MongoDB cluster is running:")
        print("      - Go to Database → Clusters")
        print("      - Ensure cluster is active (green status)")
        print("\n   3. Check your credentials:")
        print("      - Database Access → Database Users")
        print("      - Verify username and password are correct")
        print("\n   4. Network/Firewall:")
        print("      - Ensure your firewall allows outbound connections on port 27017")
        print("      - Try disabling VPN if you're using one")

if __name__ == "__main__":
    asyncio.run(test_connection())
