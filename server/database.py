from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "chatterbox")

client = None
database = None

async def connect_to_mongo():
    global client, database
    try:
        # Simplified connection without ServerApi for better compatibility
        # Remove all TLS/SSL enforcement - let the connection string handle it
        client = AsyncIOMotorClient(MONGODB_URL)
        database = client[DATABASE_NAME]
        
        # Test connection with timeout
        await asyncio.wait_for(client.admin.command('ping'), timeout=10.0)
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
    except asyncio.TimeoutError:
        print(f"❌ MongoDB connection timeout")
        print("\n⚠️  Your cluster might be paused or IP not whitelisted")
        print("   Go to: https://cloud.mongodb.com")
        print("   1. Resume your cluster if paused")
        print("   2. Network Access → Add 0.0.0.0/0 to whitelist\n")
        raise
    except Exception as e:
        print(f"❌ Could not connect to MongoDB: {str(e)[:200]}")
        print("\n⚠️  Quick fixes:")
        print("   1. Check MongoDB Atlas cluster is RUNNING (not paused)")
        print("   2. Network Access → IP Whitelist → Add 0.0.0.0/0")
        print("   3. Verify username/password in .env file")
        print(f"   4. Go to: https://cloud.mongodb.com\n")
        raise

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

def get_database():
    return database
