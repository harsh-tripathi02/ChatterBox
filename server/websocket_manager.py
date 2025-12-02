from fastapi import WebSocket
from typing import Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.group_connections: Dict[str, Set[str]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        # Broadcast user is online
        await self.broadcast_user_status(user_id, "online")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
            except Exception as e:
                print(f"Error sending message to {user_id}: {e}")

    async def broadcast_user_status(self, user_id: str, status: str):
        status_message = json.dumps({
            "type": "user_status",
            "user_id": user_id,
            "status": status
        })
        
        for uid, connection in self.active_connections.items():
            if uid != user_id:
                try:
                    await connection.send_text(status_message)
                except Exception as e:
                    print(f"Error broadcasting status to {uid}: {e}")

    async def send_group_message(self, message: str, group_id: str, sender_id: str):
        # This would need to query the database for group members
        # For simplicity, sending to all connected users in the group
        for user_id, connection in self.active_connections.items():
            if user_id != sender_id:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error sending group message to {user_id}: {e}")
