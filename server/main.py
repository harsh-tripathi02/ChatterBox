from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
from typing import Dict, Set
import json

from routes import auth, users, friends, messages, groups
from database import connect_to_mongo, close_mongo_connection
from websocket_manager import ConnectionManager

# Connection manager for WebSocket connections
manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(title="ChatterBox API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(friends.router, prefix="/api/friends", tags=["friends"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])

@app.get("/")
async def root():
    return {"message": "ChatterBox API"}

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    from auth_utils import decode_token
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return
    
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type")
            
            if message_type == "typing":
                # Handle typing indicator
                recipient_id = message_data.get("recipient_id")
                if recipient_id:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "typing",
                            "user_id": user_id,
                            "is_typing": message_data.get("is_typing", False)
                        }),
                        recipient_id
                    )
            
            elif message_type == "message":
                # Handle chat message
                recipient_id = message_data.get("recipient_id")
                group_id = message_data.get("group_id")
                content = message_data.get("content")
                
                if group_id:
                    # Group message
                    await manager.send_group_message(
                        json.dumps({
                            "type": "message",
                            "sender_id": user_id,
                            "group_id": group_id,
                            "content": content,
                            "timestamp": message_data.get("timestamp")
                        }),
                        group_id,
                        user_id
                    )
                elif recipient_id:
                    # One-to-one message
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "message",
                            "sender_id": user_id,
                            "content": content,
                            "timestamp": message_data.get("timestamp"),
                            "message_id": message_data.get("message_id")
                        }),
                        recipient_id
                    )
            
            elif message_type in ["offer", "answer", "ice-candidate"]:
                # WebRTC signaling
                recipient_id = message_data.get("recipient_id")
                if recipient_id:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": message_type,
                            "sender_id": user_id,
                            "data": message_data.get("data")
                        }),
                        recipient_id
                    )
            
            elif message_type == "call-end":
                # Call ended
                recipient_id = message_data.get("recipient_id")
                if recipient_id:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "call-end",
                            "sender_id": user_id
                        }),
                        recipient_id
                    )
            
            elif message_type == "status":
                # Message status update
                recipient_id = message_data.get("recipient_id")
                message_id = message_data.get("message_id")
                status_type = message_data.get("status")
                
                if recipient_id and message_id:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "status",
                            "message_id": message_id,
                            "status": status_type
                        }),
                        recipient_id
                    )
    
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast_user_status(user_id, "offline")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
