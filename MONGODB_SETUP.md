# MongoDB Atlas Setup Instructions

## The Error You're Seeing

The SSL/TLS handshake error OR timeout means MongoDB Atlas is either:
1. **Cluster is PAUSED** (free tier clusters auto-pause after inactivity)
2. **Your IP address is NOT whitelisted**

## Quick Fix (2 minutes)

### Step 1: Resume Your Cluster (if paused)
1. Go to: https://cloud.mongodb.com
2. Click on "Database" in the left sidebar
3. If you see a "Resume" button next to your cluster → Click it
4. Wait 1-2 minutes for cluster to become active

### Step 2: Whitelist Your IP
1. Go to: https://cloud.mongodb.com
2. Click "Network Access" in the left sidebar
3. Click "Add IP Address" button
4. Choose one option:
   - **Option A (Quick Test)**: Click "Allow Access from Anywhere"
     - This adds `0.0.0.0/0` to allow all IPs
     - Good for development/testing
   - **Option B (Secure)**: Add your current IP address
     - The form will auto-detect your IP
5. Click "Confirm"
6. Wait 1-2 minutes for changes to apply

### Step 3: Test Connection
```powershell
cd E:\ChatterBox\server
.\venv\Scripts\Activate.ps1
python test_network.py
```

If you see "✅ SUCCESS" for all servers, your network is fine.

Then test the database connection:
```powershell
python -c "import asyncio; from database import connect_to_mongo; asyncio.run(connect_to_mongo())"
```

You should see: `✅ Connected to MongoDB: chatterbox`

### Step 4: Start the Server
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Alternative: Use Local MongoDB (if Atlas doesn't work)

If MongoDB Atlas continues to have issues, you can use local MongoDB:

1. Install MongoDB Community Edition: https://www.mongodb.com/try/download/community
2. Update `.env`:
   ```
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=chatterbox
   SECRET_KEY=qwertyuioopkjhgfdsazxcvbnm123456
   ```
3. Start MongoDB service on Windows
4. Start your server

## Summary

✅ Code is fixed and ready
✅ SSL/TLS configuration updated
✅ Network connectivity confirmed working
⚠️  **YOU NEED TO**: Whitelist your IP in MongoDB Atlas or resume the cluster

That's it! Once you whitelist your IP, everything will work.
